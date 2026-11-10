import { randomUUID } from "node:crypto";
import prisma from "../config/prisma.js";
import { security, securityDigest } from "../config/authSecurity.js";

// O lock também protege criação/expiração: FOR UPDATE sozinho não trava chave ausente.
export async function lockAccount(tx, key) {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

export function criarControleConta({ db = prisma, config = security, clock } = {}) {
    async function transact(key, callback) {
        return db.$transaction(async tx => {
            await lockAccount(tx, key);
            await tx.$queryRaw`SELECT key FROM login_account_limits WHERE key = ${key} FOR UPDATE`;
            const [row] = await tx.$queryRaw`SELECT clock_timestamp() AS now`;
            return callback(tx, clock ? clock() : row.now);
        });
    }
    const retry = (state, now) => Math.max(0, Math.ceil(((state?.blockedUntil?.getTime() ?? 0) - now.getTime()) / 1000));
    return {
        async begin(email) {
            const key = securityDigest("login-account", email.trim().toLowerCase());
            return transact(key, async (tx, now) => {
                let state = await tx.loginAccountLimit.findUnique({ where: { key } });
                if (state && state.expiresAt <= now) {
                    await tx.loginAccountLimit.delete({ where: { key } }); state = null;
                }
                if (!state) state = await tx.loginAccountLimit.create({ data: {
                    key, generation: randomUUID(), expiresAt: new Date(+now + config.LOGIN_ACCOUNT_TTL_SECONDS * 1000),
                } });
                return { key, generation: state.generation, revision: state.revision, retryAfter: retry(state, now) };
            });
        },
        async finish(ticket, success) {
            return transact(ticket.key, async (tx, now) => {
                const state = await tx.loginAccountLimit.findUnique({ where: { key: ticket.key } });
                if (!state || state.generation !== ticket.generation || state.expiresAt <= now) return 0;
                // Revisões de falhas são atribuídas na conclusão. O sucesso só limpa
                // o prefixo observado na admissão, preservando conclusões concorrentes.
                const revision = state.revision + (success ? 0n : 1n);
                const cleared = success && ticket.revision > state.cleared ? ticket.revision : state.cleared;
                const failures = Number(revision - cleared);
                let blockedUntil = state.blockedUntil;
                if (success && failures < config.LOGIN_ACCOUNT_FAILURES) blockedUntil = null;
                if (!success && failures >= config.LOGIN_ACCOUNT_FAILURES && !retry(state, now)) {
                    const wait = Math.min(config.LOGIN_ACCOUNT_MAX_WAIT_SECONDS,
                        config.LOGIN_ACCOUNT_WAIT_SECONDS * 2 ** Math.min(30, failures - config.LOGIN_ACCOUNT_FAILURES));
                    blockedUntil = new Date(+now + wait * 1000);
                }
                await tx.loginAccountLimit.update({ where: { key: ticket.key }, data: {
                    revision, cleared, blockedUntil, expiresAt: new Date(+now + config.LOGIN_ACCOUNT_TTL_SECONDS * 1000),
                } });
                return retry({ blockedUntil }, now);
            });
        },
    };
}

export const loginAccounts = criarControleConta();
