import { randomUUID } from "node:crypto";
import { store } from "./store.js";
import { getRow } from "./catalog.js";
import { clone, find, role, editable, audit } from "./helpers.js";
import { caminhoArquivoUpload } from "../utils/arquivoUpload.js";
import { apagarArquivoGerenciado } from "../utils/arquivos.js";
import { referenciaBodySchema, updateReferenciaSchema } from "../schemas/referenciaSchema.js";
import { updateImagemSchema } from "../schemas/imagemSchema.js";
import BadRequestError from "../errors/BadRequestError.js";

export async function listMediaOwners(model, url, editorial) {
    if (editorial) return (model === "exposicao" ? store.exposicoes : store.novidades)
        .filter(r => r.imagemUrl === url).map(r => ({ status: r.status }));
    const key = model === "patrimonioImagem" ? "imagens" : "documentos";
    return store.patrimonios.flatMap(p => p[key].filter(r => r.url === url).map(() => ({ patrimonio: { status: p.status } })));
}
function shared(url, excludedId) {
    return [...store.patrimonios.flatMap(p => [...p.imagens, ...p.documentos]),
        ...store.exposicoes, ...store.novidades].some(r => r.id !== excludedId && (r.url ?? r.imagemUrl) === url);
}
export async function removeFile(row) {
    const url = row.url ?? row.imagemUrl;
    if (!shared(url, row.id)) await apagarArquivoGerenciado(caminhoArquivoUpload(url));
}
const mediaConfig = key => key === "imagens" ? ["IMAGEM", "PatrimonioImagem"] : ["DOCUMENTO", "PatrimonioDocumento"];
function add(key, id, data, file, user) {
    const p = getRow(id); key === "imagens" ? role(user) : editable(p, user);
    if (!file) throw new BadRequestError("Envie um arquivo.");
    const principaisSubstituidas = key === "imagens" && data.principal ? p.imagens.filter(r => r.principal).map(r => r.id) : undefined;
    const row = { id: randomUUID(), patrimonioId: id, titulo: null,
        ...(key === "imagens" ? { textoAlternativo: file.originalname, credito: null, fonte: null, ordem: 0, principal: false }
            : { descricao: null, fonte: null, dataDocumento: null, mimeType: file.mimetype }),
        ...data, url: file.url, createdAt: new Date(), updatedAt: new Date() };
    if (key === "imagens" && row.principal) p.imagens.forEach(r => { r.principal = false; });
    p[key].push(row);
    const [prefix, entity] = mediaConfig(key);
    audit(user, `${prefix}_CREATE`, entity, row.id, null, { ...row, principaisSubstituidas });
    return clone(row);
}
function update(key, id, itemId, data, user) {
    const p = getRow(id); key === "imagens" ? role(user) : editable(p, user);
    const row = find(p[key], itemId, "Mídia não encontrada neste patrimônio.", key === "imagens" ? "IMAGEM_NOT_FOUND" : "DOCUMENTO_NOT_FOUND"), before = clone(row);
    const principais = key === "imagens" && data.principal ? p.imagens.filter(r => r.principal).map(r => r.id) : undefined;
    if (principais) p.imagens.forEach(r => { r.principal = false; });
    Object.assign(row, data, { updatedAt: new Date() });
    const [prefix, entity] = mediaConfig(key);
    audit(user, `${prefix}_UPDATE`, entity, itemId, { ...before, principais }, { ...row, ...(principais && { principais: [itemId] }) });
    return clone(row);
}
async function remove(key, id, itemId, user) {
    role(user, true); const p = getRow(id), row = find(p[key], itemId, "Mídia não encontrada neste patrimônio.");
    await removeFile(row);
    p[key] = p[key].filter(r => r.id !== itemId);
    const [prefix, entity] = mediaConfig(key);
    audit(user, `${prefix}_DELETE`, entity, itemId, row);
    return { ...clone(row), arquivoRemovido: true };
}
export async function createImagem(id, data, file, user) { return add("imagens", id, data, file, user); }
export async function updateImagem(id, itemId, data, user) { return update("imagens", id, itemId, data, user); }
export async function deleteImagem(id, itemId, user) { return remove("imagens", id, itemId, user); }
export async function createDocumento(id, data, file, user) { return add("documentos", id, data, file, user); }
export async function updateDocumento(id, itemId, data, user) { return update("documentos", id, itemId, data, user); }
export async function deleteDocumento(id, itemId, user) { return remove("documentos", id, itemId, user); }
function parent(key, itemId) {
    const p = store.patrimonios.find(p => p[key].some(r => r.id === itemId));
    if (!p) find([], itemId, "Imagem não encontrada.", "IMAGEM_NOT_FOUND");
    return p.id;
}
export async function criarImagemPatrimonio(id, file, input, user) {
    const data = {};
    for (const [key, max] of [["titulo", 200], ["textoAlternativo", 300], ["credito", 200], ["fonte", 500]]) {
        const value = typeof input[key] === "string" ? input[key].trim() : "";
        if (value.length > max) throw new BadRequestError(`${key} deve ter no máximo ${max} caracteres.`);
        data[key] = value || null;
    }
    data.textoAlternativo ||= data.titulo || file?.originalname.slice(0, 300);
    data.principal = String(input.principal ?? "false") === "true";
    data.ordem = Number.isInteger(Number(input.ordem)) ? Number(input.ordem) : 0;
    if (data.ordem < 0) throw new BadRequestError("A ordem da imagem não pode ser negativa.");
    return createImagem(id, data, file, user);
}
export async function atualizarImagemPatrimonio(itemId, input, user) {
    return updateImagem(parent("imagens", itemId), itemId, updateImagemSchema.parse(input), user);
}
export async function removerImagemPatrimonio(itemId, user) {
    await deleteImagem(parent("imagens", itemId), itemId, user); return { id: itemId };
}
const referenceDto = d => ({ id: d.id, descricao: d.descricao ?? "", nomeArquivo: d.tipo === "ARQUIVO" ? d.titulo : null, url: d.url, tipo: d.tipo });
export async function criarReferenciaPatrimonio(id, file, input, user) {
    const data = referenciaBodySchema.parse(input), p = getRow(id); editable(p, user);
    if (Boolean(file) === Boolean(data.url)) throw new BadRequestError("Envie um arquivo ou um link, nunca ambos.");
    if (file) return referenceDto(add("documentos", id, { titulo: file.originalname, descricao: data.descricao || null, tipo: "ARQUIVO" }, file, user));
    const row = { id: randomUUID(), patrimonioId: id, titulo: new URL(data.url).hostname.slice(0, 200), descricao: data.descricao || null,
        url: data.url, tipo: "LINK", mimeType: null, fonte: data.url.length <= 500 ? data.url : null, dataDocumento: null, createdAt: new Date(), updatedAt: new Date() };
    p.documentos.push(row); audit(user, "DOCUMENTO_CREATE", "PatrimonioDocumento", row.id, null, row);
    return referenceDto(row);
}
export async function atualizarReferenciaPatrimonio(id, itemId, input, user) {
    return referenceDto(update("documentos", id, itemId, updateReferenciaSchema.parse(input), user));
}
export async function removerReferenciaPatrimonio(id, itemId, user) {
    await remove("documentos", id, itemId, user); return { id: itemId };
}
