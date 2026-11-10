import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import prisma from "../config/prisma.js";
import { security, securityDigest } from "../config/authSecurity.js";
import { logFailure } from "../utils/logger.js";

// Sinais aproximados, sem UA completo, endereço IP ou versão do navegador no banco.
export function accessSignals({ ip = "", userAgent = "" } = {}) {
    const ua = userAgent.slice(0, 1024);
    const browser = /Edg\//i.test(ua) ? "edge" : /OPR\//i.test(ua) ? "opera" : /Firefox\//i.test(ua) ? "firefox" :
        /Chrome\//i.test(ua) ? "chrome" : /Safari\//i.test(ua) ? "safari" : null;
    const os = /Android/i.test(ua) ? "android" : /iPhone|iPad/i.test(ua) ? "ios" : /Windows/i.test(ua) ? "windows" :
        /Macintosh|Mac OS/i.test(ua) ? "mac" : /Linux/i.test(ua) ? "linux" : "other";
    if (ip.startsWith("::ffff:") && isIP(ip.slice(7)) === 4) ip = ip.slice(7);
    let network = null;
    if (isIP(ip) === 4) network = ip.split(".").slice(0, 3).join(".") + "/24";
    if (isIP(ip) === 6) {
        const [left, right = ""] = ip.split("::");
        const a = left ? left.split(":") : [], b = right ? right.split(":") : [];
        network = [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b]
            .slice(0, 3).map(s => parseInt(s, 16).toString(16)).join(":") + "/48";
    }
    return { browserKey: browser ? securityDigest("access-browser", browser + ":" + os) : null,
        networkKey: network ? securityDigest("access-network", network) : null };
}

export async function configuredLocation(ip) {
    if (!security.AUTH_LOCATION_URL || !isIP(ip ?? "")) return null;
    // Contrato privado opcional: POST {ip} -> {regionCode: "BR-SP"}.
    const response = await fetch(security.AUTH_LOCATION_URL, { method: "POST", redirect: "error",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ ip }), signal: AbortSignal.timeout(2000) });
    if (!response.ok) throw new Error("Localização indisponível.");
    const { regionCode } = await response.json();
    return typeof regionCode === "string" && /^[A-Z0-9-]{2,32}$/.test(regionCode) ? regionCode : null;
}

export async function configuredTransport({ to, idempotencyKey, occurredAt }) {
    const response = await fetch(security.AUTH_ALERT_URL, { method: "POST", redirect: "error",
        headers: { "content-type": "application/json", authorization: "Bearer " + security.AUTH_ALERT_TOKEN,
            "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ to, subject: "Memória Viva Guarulhos: acesso incomum",
            text: `Identificamos um login em ${occurredAt.toISOString()} com mudanças no navegador e na rede ou região aproximada. Se não reconhecer este acesso, altere sua senha pelo portal. Este aviso é informativo.` }),
        signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Provedor de e-mail indisponível.");
}

export function criarRegistroAcessos({ db = prisma, config = security, locate = configuredLocation,
    transport = configuredTransport, clock } = {}) {
    const nowIn = async tx => clock ? clock() : (await tx.$queryRaw`SELECT clock_timestamp() AS now`)[0].now;
    return {
        async record(userId, rawSignals) {
            const signals = accessSignals(rawSignals);
            let region = null;
            try { region = await locate(rawSignals.ip); }
            catch (error) { logFailure("warn", "LOGIN_LOCATION_FAILED", { userId }, error); }
            const regionKey = region ? securityDigest("access-region", region) : null;
            const fingerprint = securityDigest("access-fingerprint", [signals.browserKey, signals.networkKey, regionKey].join(":"));
            return db.$transaction(async tx => {
                // Mesmo lock de usuário das sessões; serializa referência e reserva de aviso entre instâncias.
                const users = await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
                if (!users.length) return null;
                const now = await nowIn(tx);
                const history = { userId, expiresAt: { gt: now } };
                const known = await tx.loginAccess.findFirst({ where: history });
                const newSignal = async (field, value) => value && !(await tx.loginAccess.findFirst({
                    where: { ...history, [field]: value }, select: { id: true },
                }));
                const newBrowser = await newSignal("browserKey", signals.browserKey);
                const newNetwork = await newSignal("networkKey", signals.networkKey);
                const hasRegion = regionKey && await tx.loginAccess.findFirst({ where: { ...history, regionKey: { not: null } }, select: { id: true } });
                const newRegion = hasRegion && await newSignal("regionKey", regionKey);
                // Primeiro acesso vira referência. Uma mudança de rede isolada não alerta.
                const suspicious = !!(known && newBrowser && (newNetwork || newRegion));
                const cooldown = new Date(+now - config.AUTH_ALERT_COOLDOWN_SECONDS * 1000);
                const duplicateSince = new Date(+now - 86400000);
                const recent = suspicious && await tx.loginAccess.findFirst({ where: { ...history, OR: [
                    { deliveryState: { in: ["pending", "sending"] } },
                    { noticeAt: { gt: cooldown } }, { fingerprint, suspicious: true, createdAt: { gt: duplicateSince } },
                ] }, select: { id: true } });
                const queue = config.AUTH_ALERT_ENABLED && suspicious && !recent;
                return tx.loginAccess.create({ data: { userId, ...signals, regionKey, fingerprint, suspicious,
                    createdAt: now, expiresAt: new Date(+now + config.AUTH_ACCESS_RETENTION_DAYS * 86400000),
                    noticeAt: queue ? now : null, deliveryState: queue ? "pending" : "none", availableAt: queue ? now : null } });
            });
        },
        async deliver() {
            if (!config.AUTH_ALERT_ENABLED) return false;
            const claimed = await db.$transaction(async tx => {
                const now = await nowIn(tx);
                const rows = await tx.$queryRaw`SELECT id FROM login_accesses
                    WHERE delivery_state IN ('pending', 'sending') AND available_at <= ${now}
                    AND expires_at > ${now} AND attempts < 3
                    ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1`;
                if (!rows.length) return null;
                return tx.loginAccess.update({ where: { id: rows[0].id }, data: {
                    deliveryState: "sending", lease: randomUUID(), attempts: { increment: 1 },
                    availableAt: new Date(+now + 60000),
                }, include: { user: { select: { email: true } } } });
            });
            if (!claimed) return false;
            try {
                // Destinatário consultado do cadastro, nunca do corpo do login ou de headers.
                await transport({ to: claimed.user.email, idempotencyKey: claimed.id, occurredAt: claimed.createdAt });
                await db.$transaction(async tx => {
                    const now = await nowIn(tx);
                    await tx.loginAccess.updateMany({ where: { id: claimed.id, lease: claimed.lease }, data: {
                        deliveryState: "sent", lease: null, availableAt: null, noticeAt: now,
                        // Mantém o recibo ao menos até terminar o intervalo após a entrega.
                        expiresAt: new Date(Math.max(+claimed.expiresAt, +now + config.AUTH_ALERT_COOLDOWN_SECONDS * 1000)),
                    } });
                });
            } catch (error) {
                logFailure("warn", "LOGIN_ALERT_DELIVERY_FAILED", { userId: claimed.userId }, error);
                await db.loginAccess.updateMany({ where: { id: claimed.id, lease: claimed.lease }, data: {
                    deliveryState: claimed.attempts >= 3 ? "failed" : "pending", lease: null,
                    availableAt: new Date(+claimed.availableAt + 840000),
                } });
            }
            return true;
        },
        async cleanup() {
            // Lotes limitados e SKIP LOCKED evitam pausas longas e concorrência entre workers.
            await db.$executeRaw`DELETE FROM login_accesses WHERE id IN
                (SELECT id FROM login_accesses WHERE expires_at <= clock_timestamp() LIMIT 1000 FOR UPDATE SKIP LOCKED)`;
            await db.$executeRaw`DELETE FROM login_account_limits WHERE key IN
                (SELECT key FROM login_account_limits WHERE expires_at <= clock_timestamp() LIMIT 1000 FOR UPDATE SKIP LOCKED)`;
            await db.$executeRaw`UPDATE login_accesses SET delivery_state = 'failed', lease = NULL
                WHERE delivery_state = 'sending' AND attempts >= 3 AND available_at <= clock_timestamp()`;
        },
    };
}

export const loginAccesses = criarRegistroAcessos();
export function scheduleAccess(userId, signals) {
    setImmediate(() => { loginAccesses.record(userId, signals).catch(error => logFailure("warn", "LOGIN_ACCESS_RECORD_FAILED", { userId }, error)); });
}

export function startAccessWorker() {
    let busy = false, nextCleanup = 0;
    const tick = async () => {
        if (busy) return;
        busy = true;
        try {
            if (Date.now() >= nextCleanup) { await loginAccesses.cleanup(); nextCleanup = Date.now() + 60000; }
            for (let i = 0; i < 10; i++) {
                if (!(await loginAccesses.deliver())) break;
            }
        } catch (error) { logFailure("warn", "LOGIN_ACCESS_WORKER_FAILED", {}, error); }
        finally { busy = false; }
    };
    const timer = setInterval(tick, 10000); timer.unref();
    void tick();
    return () => clearInterval(timer);
}
