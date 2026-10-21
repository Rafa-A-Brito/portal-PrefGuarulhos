import assert from "node:assert/strict";
import { test, after } from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import express from "express";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "multipart-security-"));
process.env.UPLOAD_DIR = root;
process.env.UPLOAD_ROOT = root;
process.env.UPLOAD_MAX_IMAGE_BYTES = "64";
process.env.UPLOAD_MAX_DOCUMENT_BYTES = "64";
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/security_test";
process.env.JWT_SECRET = "security-multipart-fixture-with-32-characters";
const { uploadImagem } = await import("../src/middlewares/uploadImage.js");
const { default: uploadArquivo } = await import("../src/middlewares/upload.js");
const { default: uploadReferencia } = await import("../src/middlewares/uploadReferencia.js");
const { default: multipart } = await import("../src/middlewares/multipart.js");
const app = express();
const saved = (req, res) => res.json({ file: req.file, body: req.body });
app.post("/imagem", uploadImagem("patrimonios", { aceitarArquivo: true }), saved);
app.post("/documento", uploadArquivo("documento"), saved);
app.post("/referencia", uploadReferencia, saved);
app.post("/body", multipart({ maxFileSize: 64, overhead: 32, fieldSize: 200,
    selecionar: () => { throw new Error("sem arquivo"); }, validar: () => {} }), saved);
app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message }));
const server = app.listen(0);
await new Promise(resolve => server.once("listening", resolve));
const base = "http://127.0.0.1:" + server.address().port;
for (const folder of ["imagens", "documentos", "patrimonios", "referencias"]) await fs.mkdir(path.join(root, folder));
const sentinel = path.join(root, "patrimonios", "anterior.png");
await fs.writeFile(sentinel, "preservar");
after(async () => {
    await new Promise(resolve => server.close(resolve));
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("multipart-security-"));
    await fs.rm(root, { recursive: true, force: true });
});
const image = (field = "imagem", bytes = Buffer.from([255, 216, 255, 1])) => {
    const form = new FormData(); form.append(field, new Blob([bytes], { type: "image/jpeg" }), "teste.jpg"); return form;
};
async function clean() {
    assert.equal(await fs.readFile(sentinel, "utf8"), "preservar");
    for (const folder of ["imagens", "documentos", "referencias"]) assert.deepEqual(await fs.readdir(path.join(root, folder)), []);
    assert.deepEqual(await fs.readdir(path.join(root, "patrimonios")), ["anterior.png"]);
}

test("campos, campos duplicados, quantidade e partes rejeitadas limpam somente a tentativa", async () => {
    for (const type of ["duplicado", "grande", "quantidade", "arquivo extra"]) {
        const body = image();
        if (type === "duplicado") { body.append("titulo", "a"); body.append("titulo", "b"); }
        if (type === "grande") body.append("texto", "x".repeat(256 * 1024 + 1));
        if (type === "quantidade") for (let i = 0; i < 25; i++) body.append("campo" + i, "a");
        if (type === "arquivo extra") body.append("arquivo", new Blob(["extra"]), "extra.txt");
        assert.equal((await fetch(base + "/imagem", { method: "POST", body })).status, 400);
        await clean();
    }
});

test("limites de arquivo e GIF diferem entre imagem e arquivo; bytes preservados", async () => {
    const bytes = Buffer.concat([Buffer.from([255, 216, 255]), Buffer.alloc(80)]);
    assert.equal((await fetch(base + "/imagem", { method: "POST", body: image("arquivo", bytes) })).status, 413);
    const response = await fetch(base + "/imagem", { method: "POST", body: image("imagem", bytes) });
    assert.equal(response.status, 200);
    const { file } = await response.json();
    assert.deepEqual(await fs.readFile(file.path), bytes);
    await fs.unlink(file.path);
    for (const field of ["imagem", "arquivo"]) {
        const form = new FormData(); form.append(field, new Blob(["GIF89a123"], { type: "image/gif" }), "a.gif");
        const result = await fetch(base + "/imagem", { method: "POST", body: form });
        assert.equal(result.status, field === "imagem" ? 200 : 415);
        if (result.ok) await fs.unlink((await result.json()).file.path);
    }
    await clean();
});

test("limite exato é aceito e assinatura falsa é rejeitada", async () => {
    const bytes = Buffer.concat([Buffer.from([255, 216, 255]), Buffer.alloc(61)]);
    const result = await fetch(base + "/imagem", { method: "POST", body: image("arquivo", bytes) });
    assert.equal(result.status, 200);
    await fs.unlink((await result.json()).file.path);
    assert.equal((await fetch(base + "/imagem", { method: "POST", body: image("imagem", Buffer.from("falso")) })).status, 400);
    await clean();
});

test("multipart malformado após arquivo e referência com campo inválido são limpos", async () => {
    const raw = '--boundary\r\nContent-Disposition: form-data; name="imagem"; filename="a.jpg"\r\nContent-Type: image/jpeg\r\n\r\n';
    const body = Buffer.concat([Buffer.from(raw), Buffer.from([255, 216, 255, 1]), Buffer.from('\r\n--boundary\r\n')]);
    assert.equal((await fetch(base + "/imagem", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=boundary" }, body })).status, 400);
    const form = new FormData(); form.append("arquivo", new Blob(["texto"], { type: "text/plain" }), "a.txt"); form.append("extra", "a");
    assert.equal((await fetch(base + "/referencia", { method: "POST", body: form })).status, 400);
    await clean();
});

test("corpo chunked e Content-Length excessivo têm limite no backend", async () => {
    const raw = '--b\r\nContent-Disposition: form-data; name="campo"\r\n\r\n' + 'x'.repeat(100) + '\r\n--b--\r\n';
    for (const chunked of [false, true]) {
        const status = await new Promise((resolve, reject) => {
            const req = http.request(base + "/body", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=b",
                ...(chunked ? { "Transfer-Encoding": "chunked" } : { "Content-Length": Buffer.byteLength(raw) }) } }, res => { res.resume(); resolve(res.statusCode); });
            req.on("error", reject); req.end(raw);
        });
        assert.equal(status, 413);
    }
    await clean();
});

test("aborto durante gravação fecha descritores e remove arquivo parcial", async () => {
    const req = http.request(base + "/imagem", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=b" } });
    req.on("error", () => {});
    req.write('--b\r\nContent-Disposition: form-data; name="imagem"; filename="a.jpg"\r\nContent-Type: image/jpeg\r\n\r\n');
    req.write(Buffer.concat([Buffer.from([255, 216, 255]), Buffer.alloc(65536)]));
    for (let i = 0; i < 100 && (await fs.readdir(path.join(root, "patrimonios"))).length === 1; i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal((await fs.readdir(path.join(root, "patrimonios"))).length, 2);
    req.destroy();
    for (let i = 0; i < 100 && (await fs.readdir(path.join(root, "patrimonios"))).length !== 1; i++) await new Promise(resolve => setTimeout(resolve, 10));
    await clean();
});
