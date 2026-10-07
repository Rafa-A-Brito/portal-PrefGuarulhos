import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { assertTestDatabase } from "./assert-test-db.js";

assertTestDatabase();
if (!process.env.TEST_JWT_SECRET || process.env.TEST_JWT_SECRET.length < 32) throw new Error("TEST_JWT_SECRET obrigatório.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }) });
const bases = [
    "http://127.0.0.1:" + (process.env.TEST_BACKEND_PORT || 3334),
    "http://127.0.0.1:" + (process.env.TEST_FRONTEND_PORT || 8091),
];
let author, category, patrimonio;
const contentRecords = [];
try {
    author = await prisma.user.create({ data: { name: "E2E uploads", email: randomUUID() + "@example.test", passwordHash: "fixture-sem-login", role: "ADMIN", isActive: true } });
    category = await prisma.categoria.create({ data: { nome: "E2E " + randomUUID(), slug: "e2e-" + randomUUID() } });
    patrimonio = await prisma.patrimonio.create({ data: { nome: "Patrimônio E2E", slug: "e2e-" + randomUUID(), descricao: "Teste", descricaoResumida: "Teste", createdBy: author.id, categoriaId: category.id } });
    const token = jwt.sign({}, process.env.TEST_JWT_SECRET, { subject: author.id, expiresIn: 900 });
    async function request(base, route, method, body, expected) {
        const response = await fetch(base + "/api" + route, { method, headers: { authorization: "Bearer " + token }, body });
        const result = await response.json();
        assert.equal(response.status, expected, JSON.stringify(result));
        return result.data;
    }
    for (const base of bases) {
        for (const resource of ["patrimonios", "exposicoes", "novidades"]) {
            const body = new FormData();
            // 10 MB exatos para comprovar a margem multipart de nginx.
            const payload = resource === "patrimonios" ? Buffer.alloc(10 * 1024 * 1024, 65) : Buffer.from("imagem-e2e");
            body.append("imagem", new Blob([payload], { type: "image/png" }), "teste.png");
            let route;
            if (resource === "patrimonios") route = "/admin/patrimonios/" + patrimonio.id + "/imagens";
            else {
                route = "/admin/" + resource;
                const data = resource === "exposicoes"
                    ? { titulo: "Mostra " + randomUUID(), artista: "Artista", local: "Centro", periodo: "Outubro", bio: "Biografia" }
                    : { titulo: "Novidade " + randomUUID(), tipo: "NOTICIA", tag: "Cultura", data: "2026-10-07", resumo: "Resumo", texto: "Texto" };
                for (const [key, value] of Object.entries(data)) body.append(key, value);
            }
            const item = await request(base, route, "POST", body, 201);
            if (resource !== "patrimonios") contentRecords.push({ model: resource === "exposicoes" ? "exposicao" : "novidade", id: item.id });
            const imageUrl = resource === "patrimonios" ? item.url : item.imagemUrl;
            const publicImage = await fetch(base + imageUrl);
            assert.equal(publicImage.status, 200);
            assert.match(publicImage.headers.get("content-type"), /image\/png/);
            assert.equal(publicImage.headers.get("expires"), null);
            assert.deepEqual(Buffer.from(await publicImage.arrayBuffer()), payload);
            const deleteRoute = resource === "patrimonios" ? "/admin/patrimonios/imagens/" + item.id : route + "/" + item.id;
            await request(base, deleteRoute, "DELETE", undefined, 200);
            assert.equal((await fetch(base + imageUrl)).status, 404);
            console.log("E2E aprovado:", base, resource, "POST/GET/DELETE, bytes e cache.");
        }
        const tooLarge = new FormData();
        tooLarge.append("imagem", new Blob([Buffer.alloc(10 * 1024 * 1024 + 1)], { type: "image/png" }), "grande.png");
        await request(base, "/admin/patrimonios/" + patrimonio.id + "/imagens", "POST", tooLarge, 413);
    }
} finally {
    for (const item of contentRecords) {
        if (await prisma[item.model].findUnique({ where: { id: item.id } })) await prisma[item.model].delete({ where: { id: item.id } });
    }
    if (patrimonio) await prisma.patrimonio.delete({ where: { id: patrimonio.id } });
    if (category) await prisma.categoria.delete({ where: { id: category.id } });
    if (author) await prisma.user.delete({ where: { id: author.id } });
    await prisma.$disconnect();
}
