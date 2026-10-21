import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { assertTestDatabase } from "../scripts/assert-test-db.js";

test("PostgreSQL: sessoes renovaveis, rotacao, replay, limites e concorrencia", { skip: !process.env.TEST_DATABASE_URL }, async t => {
    assertTestDatabase(); process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_TTL_SECONDS = "300"; process.env.AUTH_SESSION_TTL_SECONDS = "28800";
    const { default: prisma } = await import("../src/config/prisma.js");
    const { default: app } = await import("../src/app.js");
    const auth = await import("../src/services/authService.js");
    const { hashPassword } = await import("../src/utils/password.js");
    const { verifyToken } = await import("../src/utils/token.js");
    let password = "SenhaInicial123!";
    const user = await prisma.user.create({ data: { email: randomUUID()+"@example.test", name: "Sessao", role: "ADMIN", passwordHash: await hashPassword(password) } });
    const server = app.listen(0); await new Promise(r => server.once("listening",r));
    const base = "http://127.0.0.1:" + server.address().port + "/api";
    const login = options => auth.login({ email: user.email, password }, options);
    const protectedRequest = token => fetch(base+"/auth/senha", { method: "PATCH", headers: { authorization: "Bearer "+token, "content-type":"application/json" }, body: "{}" });
    const post = (route, body) => fetch(base+route, { method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body) });
    const logs = [], originalLog = console.error; console.error = (...args) => logs.push(JSON.stringify(args));
    const raw = [];
    try {
        await t.test("JWT 300s, contrato sem cache, refresh sem JWT, acesso expirado antes do handler", async () => {
            const response = await post("/auth/login",{ email:user.email,password });
            assert.equal(response.status,200); assert.equal(response.headers.get("cache-control"),"no-store");
            const pair = (await response.json()).data; raw.push(pair.refreshToken);
            const payload = verifyToken(pair.token); assert.equal(payload.exp-payload.iat,300);
            assert.equal(Date.parse(pair.sessionExpiresAt)-payload.iat*1000 >= 28800000, true);
            const expired = jwt.sign({ ...payload, exp: Math.floor(Date.now()/1000)-1 }, process.env.JWT_SECRET,{algorithm:"HS256"});
            const rejected = await protectedRequest(expired); assert.equal(rejected.status,401);
            assert.equal((await rejected.json()).error.code,"ACCESS_TOKEN_EXPIRED");
            const refreshed = await post("/auth/refresh",{refreshToken:pair.refreshToken});
            assert.equal(refreshed.status,200);assert.equal(refreshed.headers.get("cache-control"),"no-store");
            const next=(await refreshed.json()).data;raw.push(next.refreshToken);
            assert.notEqual(next.refreshToken,pair.refreshToken);assert.equal(next.sessionExpiresAt,pair.sessionExpiresAt);
            assert.equal((await protectedRequest(next.token)).status,400); // autenticação aceita, validação do corpo rejeita.
            const missingSid=jwt.sign({tokenVersion:0},process.env.JWT_SECRET,{algorithm:"HS256",subject:user.id,expiresIn:300});
            assert.equal((await protectedRequest(missingSid)).status,401);
            const invalid=await post("/auth/refresh",{refreshToken:expired});assert.equal(invalid.status,400);
        });
        await t.test("reutilizacao e duas rotacoes concorrentes revogam a familia",async()=>{
            const pair=await login();raw.push(pair.refreshToken);
            const results=await Promise.allSettled([auth.refresh(pair.refreshToken),auth.refresh(pair.refreshToken)]);
            assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
            const next=results.find(r=>r.status==="fulfilled").value;raw.push(next.refreshToken);
            assert.equal((await protectedRequest(next.token)).status,401);
            await assert.rejects(auth.refresh(next.refreshToken),{statusCode:401});
        });
        await t.test("rotacao revertida integralmente se a insercao falhar",async()=>{
            const pair=await login();const original=prisma.$transaction;
            prisma.$transaction=callback=>original.call(prisma,async tx=>{
                const create=tx.refreshToken.create;tx.refreshToken.create=async()=>{throw new Error("commit fixture");};
                try{return await callback(tx);}finally{tx.refreshToken.create=create;}
            });
            try{await assert.rejects(auth.refresh(pair.refreshToken),/commit fixture/);}finally{prisma.$transaction=original;}
            const row=await prisma.refreshToken.findUnique({where:{tokenHash:createHash("sha256").update(pair.refreshToken).digest("hex")}});
            assert.equal(row.usedAt,null);assert.ok((await auth.refresh(pair.refreshToken)).token);
        });
        await t.test("limite absoluto 8h com relogio controlado nao desliza",async()=>{
            const start=Date.now();const pair=await login({now:()=>start});
            const next=await auth.refresh(pair.refreshToken,{now:()=>start+28700000});
            assert.equal(next.sessionExpiresAt,pair.sessionExpiresAt);
            const payload=jwt.decode(next.token);assert.ok(payload.exp*1000<=start+28800000);
            await assert.rejects(auth.refresh(next.refreshToken,{now:()=>start+28800001}),{statusCode:401});
        });
        await t.test("logout idempotente por refresh e concorrente com renovacao",async()=>{
            const pair=await login();const outcomes=await Promise.allSettled([auth.refresh(pair.refreshToken),auth.logout(pair.refreshToken)]);
            assert.equal(outcomes[1].status,"fulfilled");
            await auth.logout(pair.refreshToken);await auth.logout("x".repeat(43));
            const result=await protectedRequest(pair.token);assert.equal(result.status,401);
            if(outcomes[0].status==="fulfilled")await assert.rejects(auth.refresh(outcomes[0].value.refreshToken),{statusCode:401});
            assert.equal((await post("/auth/logout",{refreshToken:pair.refreshToken})).status,200);
        });
        await t.test("conta inativa e versao alterada impedem renovar",async()=>{
            const pair=await login();await prisma.user.update({where:{id:user.id},data:{isActive:false}});
            await assert.rejects(auth.refresh(pair.refreshToken),{statusCode:401});
            const inactive=await protectedRequest(pair.token);assert.notEqual((await inactive.json()).error.code,"ACCESS_TOKEN_EXPIRED");
            await prisma.user.update({where:{id:user.id},data:{isActive:true,tokenVersion:{increment:1}}});
            await assert.rejects(auth.refresh(pair.refreshToken),{statusCode:401});
        });
        await t.test("troca de senha e renovacao concorrentes nao reativam sessoes",async()=>{
            const a=await login(),b=await login();const nextPassword="NovaSenhaSegura123!";
            const results=await Promise.allSettled([auth.refresh(a.refreshToken),auth.changePassword(user.id,{senhaAtual:password,novaSenha:nextPassword})]);
            assert.equal(results[1].status,"fulfilled");password=nextPassword;
            for(const pair of [a,b,...(results[0].status==="fulfilled"?[results[0].value]:[])]){
                await assert.rejects(auth.refresh(pair.refreshToken),{statusCode:401});assert.equal((await protectedRequest(pair.token)).status,401);
            }
            assert.equal(await prisma.authSession.count({where:{userId:user.id,revokedAt:null}}),0);
            assert.ok((await login()).token);
        });
        const rows=await prisma.refreshToken.findMany({where:{session:{userId:user.id}}});
        for(const row of rows){assert.match(row.tokenHash,/^[0-9a-f]{64}$/);for(const value of raw)assert.ok(!JSON.stringify(row).includes(value));}
        for(const value of raw)assert.ok(!logs.join("").includes(value));
    } finally {console.error=originalLog;await prisma.user.delete({where:{id:user.id}});await new Promise(r=>server.close(r));await prisma.$disconnect();}
});
