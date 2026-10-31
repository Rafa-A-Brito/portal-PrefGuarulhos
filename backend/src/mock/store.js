import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { mockRuntime } from "../config/runtime.js";
import { hashPassword } from "../utils/password.js";
import { SituacaoPatrimonio } from "../config/prismaTypes.js";

if (!mockRuntime) throw new Error("Fixtures disponíveis somente com MOCK_DATA=true.");
export const fixtureId = n => `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const createdAt = new Date("2026-01-10T12:00:00Z");
export const dates = () => ({ createdAt: new Date(createdAt), updatedAt: new Date(createdAt) });
export const store = { users: [], sessions: [], refreshTokens: [], patrimonios: [], categorias: [], regioes: [],
    exposicoes: [], novidades: [], audit: [], views: [] };

for (const [i, role, email, password, isActive] of [
    [1, "ADMIN", "admin@demo.invalid", "AdminDemo!2026", true],
    [2, "EDITOR", "editor@demo.invalid", "EditorDemo!2026", true],
    [3, "EDITOR", "inativo@demo.invalid", "InativoDemo!2026", false],
]) store.users.push({ id: fixtureId(i), name: `Pessoa fictícia ${role} ${i}`, role, email, isActive,
    passwordHash: await hashPassword(password), tokenVersion: 0, ...dates() });

for (const [i, nome, slug] of [[10, "Arquitetura fictícia", "arquitetura"], [11, "Cultura fictícia", "cultura"],
    [12, "Natureza fictícia", "natureza"]]) store.categorias.push({ id: fixtureId(i), nome, slug, descricao: "Categoria de demonstração." });
for (const [i, nome, slug] of [[20, "Centro (demonstração)", "centro-demo"], [21, "Norte (demonstração)", "norte-demo"],
    [22, "Leste (demonstração)", "leste-demo"]]) store.regioes.push({ id: fixtureId(i), nome, slug, descricao: "Região fictícia para testes.", ativo: true, ...dates() });

await Promise.all(["patrimonios", "referencias", "exposicoes", "novidades", "imagens", "documentos"]
    .map(dir => mkdir(path.join(mockRuntime.uploadRoot, dir), { recursive: true })));
async function asset(folder, id, ext) {
    await copyFile(new URL(`./assets/demonstracao.${ext}`, import.meta.url), path.join(mockRuntime.uploadRoot, folder, `${id}.${ext}`));
    return `/uploads/${folder}/${id}.${ext}`;
}
for (let i = 0; i < 20; i++) {
    const id = fixtureId(100 + i), status = i < 12 ? "PUBLICADO" : i < 17 ? "RASCUNHO" : "ARQUIVADO";
    const imageId = fixtureId(200 + i), docId = fixtureId(300 + i);
    store.patrimonios.push({ id, nome: `Espaço imaginário ${String(i + 1).padStart(2, "0")} — demonstração`,
        slug: `espaco-imaginario-${i + 1}-demo`, numeroExibicao: i + 1, ordemExibicao: i,
        descricao: "Patrimônio inteiramente fictício, criado para demonstrar o Memória Viva Guarulhos.",
        descricaoResumida: `Exemplo fictício ${i + 1} para navegação e testes.`,
        historia: i % 4 ? "História inventada de um espaço cultural imaginário. Não representa fatos históricos." : null,
        importanciaCultural: i % 3 ? "Conteúdo ilustrativo sem valor documental." : null,
        categoriaId: store.categorias[i % 3].id, categoriasAdicionais: i % 4 ? [] : [store.categorias[(i + 1) % 3].id],
        regiaoId: i % 5 ? fixtureId([20, 20, 21, 22][i % 4]) : null,
        situacao: Object.values(SituacaoPatrimonio)[i % 6], status, createdBy: fixtureId(1), updatedBy: null,
        publicadoEm: i < 12 ? new Date(createdAt) : null, arquivadoEm: i >= 17 ? new Date(createdAt) : null, ...dates(),
        localizacao: i === 19 ? null : { id: fixtureId(400 + i), patrimonioId: id, endereco: `Via imaginária ${i + 1} (demonstração)`,
            numero: String(i + 10), complemento: null, bairro: ["Centro", "Gopoúva", "Taboão", "Pimentas"][i % 4],
            cidade: "Guarulhos", uf: "SP", cep: null,
            latitude: [-23.4543, -23.458, -23.407, -23.444][i % 4] + Math.floor(i / 4) * 0.0003,
            longitude: [-46.5333, -46.550, -46.524, -46.411][i % 4] + Math.floor(i / 4) * 0.0003 },
        imagens: i % 6 === 5 ? [] : [{ id: imageId, patrimonioId: id, url: await asset("patrimonios", imageId, "png"),
            titulo: "Ilustração de demonstração", textoAlternativo: "Desenho fictício de um espaço cultural", credito: "Projeto — demonstração", fonte: null, ordem: 0, principal: true, ...dates() }],
        documentos: i % 3 ? [] : [{ id: docId, patrimonioId: id, titulo: "Documento fictício.txt", descricao: "Demonstração; não é documento oficial.",
            url: await asset("referencias", docId, "txt"), tipo: "ARQUIVO", mimeType: "text/plain", fonte: null, dataDocumento: null, ...dates() }],
        detalhes: [{ id: fixtureId(500 + i), icone: "historia", titulo: "Memória imaginária", texto: "Seção inteiramente fictícia para testes da interface.", ordem: 0 }],
        fatos: [{ id: fixtureId(600 + i), rotulo: "Acervo", valor: "Fictício — demonstração", ordem: 0 }],
        ligacoes: [{ id: fixtureId(700 + i), patrimonioDestinoId: fixtureId(100 + (i + 1) % 20), texto: "Outro espaço imaginário", ordem: 0 }], rotas: [],
    });
}
for (let i = 0; i < 24; i++) {
    const status = i < 20 ? "PUBLICADO" : i < 22 ? "RASCUNHO" : "ARQUIVADO";
    const common = { status, createdBy: fixtureId(1), updatedBy: null, ...dates(),
        publicadoEm: status === "PUBLICADO" ? new Date(createdAt.getTime() + i * 86400000) : null,
        arquivadoEm: status === "ARQUIVADO" ? new Date(createdAt) : null };
    store.exposicoes.push({ id: fixtureId(800 + i), slug: `exposicao-imaginaria-${i + 1}`, titulo: `Exposição imaginária ${i + 1} (demo)`,
        artista: "Coletivo fictício", local: "Galeria imaginária em Guarulhos", periodo: "Período ilustrativo", bio: "Biografia inventada exclusivamente para demonstração.",
        ctaSaibaMais: null, imagemUrl: await asset("exposicoes", fixtureId(800 + i), "png"), ...common });
    store.novidades.push({ id: fixtureId(900 + i), slug: `novidade-imaginaria-${i + 1}`, titulo: `Novidade imaginária ${i + 1} (demo)`,
        tipo: i % 2 ? "EVENTO" : "NOTICIA", tag: "Demonstração", data: `2026-02-${String(i + 1).padStart(2, "0")}`,
        resumo: "Resumo fictício para testes.", texto: "Notícia ou evento inventado; não corresponde à agenda oficial.", quando: null, local: null,
        bloco: null, cta: null, fontes: [], imagemUrl: i % 3 ? await asset("novidades", fixtureId(900 + i), "png") : null, ...common });
}
store.audit.push({ id: fixtureId(1000), userId: fixtureId(1), action: "PATRIMONIO_CREATE", entity: "Patrimonio",
    entityId: fixtureId(100), createdAt, oldValues: null, newValues: { nome: "Espaço imaginário 01 — demonstração" } });
store.audit.push({ id: fixtureId(1001), userId: fixtureId(1), action: "PATRIMONIO_PUBLISH", entity: "Patrimonio",
    entityId: fixtureId(100), createdAt, oldValues: { status: "RASCUNHO" }, newValues: { status: "PUBLICADO" } });
store.audit.push({ id: fixtureId(1002), userId: fixtureId(1), action: "REGIAO_CREATE", entity: "RegiaoPatrimonio",
    entityId: fixtureId(20), createdAt, oldValues: null, newValues: { nome: "Centro (demonstração)", slug: "centro-demo", ativo: true } });
