import assert from "node:assert/strict";
import { test } from "node:test";
import SwaggerParser from "@apidevtools/swagger-parser";
import openapi from "../src/docs/openapi.js";

test("especificação OpenAPI válida, com referências, rotas e autenticação corretas", async () => {
    await SwaggerParser.validate(structuredClone(openapi));
    assert.equal(openapi.openapi, "3.0.3");
    assert.deepEqual(openapi.servers, [{ url: "/" }]);

    const operations = Object.entries(openapi.paths).flatMap(([path, methods]) =>
        Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`)
    );
    assert.deepEqual(
        operations.sort(),
        [
            "GET /api",
            "GET /api/health",
            "GET /api/docs",
            "GET /api/docs.json",
            "POST /api/auth/login",
            "PATCH /api/auth/senha",
            "POST /api/admins",
            "GET /api/categorias",
            "GET /api/patrimonios",
            "GET /api/patrimonios/{slug}",
            "POST /api/admin/patrimonios",
            "GET /api/admin/patrimonios",
            "GET /api/admin/patrimonios/{id}",
            "PATCH /api/admin/patrimonios/{id}",
            "PATCH /api/admin/patrimonios/{id}/publicar",
            "PATCH /api/admin/patrimonios/{id}/arquivar",
            ...["exposicoes", "novidades"].flatMap((recurso) => [
                `GET /api/${recurso}`,
                `GET /api/admin/${recurso}`,
                `POST /api/admin/${recurso}`,
                `GET /api/admin/${recurso}/{id}`,
                `PATCH /api/admin/${recurso}/{id}`,
                `PATCH /api/admin/${recurso}/{id}/publicar`,
                `PATCH /api/admin/${recurso}/{id}/arquivar`,
                `DELETE /api/admin/${recurso}/{id}`,
            ]),
        ].sort()
    );

    for (const [path, methods] of Object.entries(openapi.paths)) {
        for (const operation of Object.values(methods)) {
            assert.equal(
                Boolean(operation.security),
                path === "/api/admins" ||
                    path === "/api/auth/senha" ||
                    path.startsWith("/api/admin/")
            );
        }
    }
    assert.equal(openapi.components.schemas.AdminRequest.properties.password.writeOnly, true);
    assert.equal(openapi.components.schemas.LoginRequest.properties.password.writeOnly, true);
    assert.equal(
        openapi.components.schemas.ChangePasswordRequest.properties.novaSenha.writeOnly,
        true
    );
    assert.equal(JSON.stringify(openapi).includes("passwordHash"), false);
    assert.equal(openapi.components.schemas.PatrimonioResumo.properties.imagens.maxItems, 1);
});

test("Swagger UI e JSON respondem sem consultar o banco", async () => {
    process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/docs_test";
    process.env.JWT_SECRET = "docs-test-secret-with-at-least-32-characters";
    const { default: app } = await import("../src/app.js");
    const server = app.listen(0);

    try {
        await new Promise((resolve) => server.once("listening", resolve));
        const base = `http://127.0.0.1:${server.address().port}`;
        const jsonResponse = await fetch(`${base}/api/docs.json`);
        assert.equal(jsonResponse.status, 200);
        assert.match(jsonResponse.headers.get("content-type"), /application\/json/);
        const json = await jsonResponse.json();
        assert.equal(json.openapi, "3.0.3");
        assert.ok(json.paths["/api/patrimonios/{slug}"]);

        const uiResponse = await fetch(`${base}/api/docs`);
        assert.equal(uiResponse.status, 200);
        assert.match(uiResponse.headers.get("content-type"), /text\/html/);
        const html = await uiResponse.text();
        assert.match(html, /Swagger UI/);
        const initResponse = await fetch(`${base}/api/docs/swagger-ui-init.js`);
        assert.equal(initResponse.status, 200);
        assert.match(await initResponse.text(), /persistAuthorization/);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test("OpenAPI documenta coordenadas nulas no PATCH e os contratos de Exposições/Novidades", () => {
    const schemas = openapi.components.schemas;
    for (const campo of ["latitude", "longitude"]) {
        assert.equal(schemas.LocalizacaoPatch.properties[campo].nullable, true);
        assert.notEqual(schemas.LocalizacaoRequest.properties[campo].nullable, true);
    }
    assert.match(schemas.LocalizacaoPatch.description, /juntas/);
    assert.match(schemas.LocalizacaoPatch.description, /null/);

    const expoPost = openapi.paths["/api/admin/exposicoes"].post.requestBody.content;
    assert.deepEqual(Object.keys(expoPost), ["multipart/form-data"]);
    assert.ok(schemas.ExposicaoCreateMultipart.required.includes("imagem"));
    assert.equal(schemas.ExposicaoCreateMultipart.properties.imagem.format, "binary");
    assert.equal(schemas.ExposicaoPatch.required, undefined);
    assert.equal(schemas.ExposicaoPatch.properties.imagemUrl, undefined);

    const novidadePost = openapi.paths["/api/admin/novidades"].post.requestBody.content;
    assert.ok(novidadePost["application/json"]);
    assert.ok(novidadePost["multipart/form-data"]);
    assert.ok(schemas.NovidadeCreate.required.includes("data"));
    assert.equal(schemas.NovidadeCreate.properties.data.format, "date");
    assert.equal(schemas.Novidade.properties.data.format, "date");
    assert.equal(schemas.NovidadeCreateMultipart.required.includes("imagem"), false);
    assert.ok(schemas.NovidadeCreate.oneOf[0].required.includes("resumo"));
    assert.equal(schemas.NovidadePatch.properties.imagemUrl.nullable, true);
    assert.deepEqual(schemas.NovidadePatch.properties.imagemUrl.enum, [null]);

    for (const recurso of ["exposicoes", "novidades"]) {
        const publico = openapi.paths[`/api/${recurso}`].get;
        assert.equal(publico.security, undefined);
        assert.equal(publico.parameters.some((param) => param.name === "status"), false);
        const admin = openapi.paths[`/api/admin/${recurso}`];
        assert.ok(admin.get.parameters.some((param) => param.name === "status"));
        const detalhe = openapi.paths[`/api/admin/${recurso}/{id}`];
        assert.equal(detalhe.get.parameters[0].schema.format, "uuid");
        assert.ok(detalhe.patch.requestBody.content["application/json"]);
        assert.ok(detalhe.patch.requestBody.content["multipart/form-data"]);
        assert.match(detalhe.delete.description, /ADMIN.*PUBLICADO/);
    }
    for (const nome of ["Exposicao", "Novidade"]) {
        assert.equal(schemas[nome].properties.createdBy, undefined);
        assert.ok(schemas[`${nome}Admin`].properties.createdBy);
        assert.equal(schemas[`${nome}Patch`].properties.slug, undefined);
    }
});
