// Instrumentação exclusiva do ensaio: nunca importada pelo servidor publicado.
import express from "express";
import app from "../../src/app.js";
import env from "../../src/config/env.js";
import prisma from "../../src/config/prisma.js";
const fixture = express();
fixture.set("trust proxy", env.TRUST_PROXY_IPS.split(","));
fixture.get("/api/context", (req, res) => res.json({ ip: req.ip, protocol: req.protocol,
    forwarded: req.get("forwarded") ?? null, realIp: req.get("x-real-ip") }));
fixture.use(app);
const server = fixture.listen(0, "127.0.0.1", () => process.send({ port: server.address().port }));
process.on("message", message => {
    if (message === "stop") server.close(async () => { await prisma.$disconnect(); process.exit(0); });
});
