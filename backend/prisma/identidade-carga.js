import { slugify } from "../src/utils/slug.js";
import { LEGADOS_EDITORIAIS } from "../src/utils/identidadeEditorial.js";
export const LEGACY_SLUG_ALIASES = new Map([
    ["centro-municipal-de-educacao-adamastor", "antiga-fabrica-adamastor"],
    [
        "antiga-igreja-matriz-colonial-de-n-sra-da-conceicao-demolida",
        "antiga-igreja-matriz-colonial-de-nossa-senhora-da-conceicao",
    ],
    ["parque-bosque-maia", "bosque-maia"],
    ["casarao-da-familia-albertis-demolido-em-2023", "casarao-da-familia-albertis"],
    ["casarao-lima-demolido-em-2026", "casarao-lima"],
    ["casarao-saraceni-demolido-em-2010", "casarao-saraceni"],
    ["e-e-capistrano-de-abreu", "escola-estadual-capistrano-de-abreu"],
    ["e-e-conselheiro-crispiniano", "escola-estadual-conselheiro-crispiniano"],
    ["estacao-ferroviaria-de-guarulhos", "estacao-ferroviaria-central-de-guarulhos"],
    [
        "igreja-de-nossa-senhora-de-bonsucesso",
        "igreja-de-nossa-senhora-de-bonsucesso-e-nucleo-historico",
    ],
    [
        "igreja-de-n-sra-do-rosario-dos-homens-pretos",
        "igreja-de-nossa-senhora-do-rosario-dos-homens-pretos",
    ],
    ["locomotiva-maria-fumaca-n-33-e-vagao", "locomotiva-maria-fumaca-n-33-vagao-e-caixa-d-agua"],
    ["reserva-e-represa-do-cabucu", "represa-do-cabucu"],
    ["complexo-sanatorio-padre-bento", "sanatorio-padre-bento"],
]);


export function slugsDaFonte(item) {
    const slug = slugify(item.nome);
    return new Set([slug, LEGACY_SLUG_ALIASES.get(slug), ...(item.aliases || [])].filter(Boolean));
}
export function candidatosDaFonte(item, existing, boundIds = []) {
    const slugs = slugsDaFonte(item);
    const ids = [...boundIds, ...(item.bindingIds || [])];
    const direct = existing.filter(row => slugs.has(row.slug) || ids.includes(row.id));
    if (direct.length) return direct;
    // Consolidações aprovadas só são fallback quando o canônico ainda não existe.
    const consolidated = LEGADOS_EDITORIAIS.filter(row => slugs.has(row.canonico));
    return existing.filter(row => consolidated.some(legacy => row.id === legacy.id || row.slug === legacy.slug));
}
export function chaveDaFonte(item) {
    const slug = slugify(item.nome);
    return "canonical/" + (LEGACY_SLUG_ALIASES.get(slug) || slug);
}
export function vincularFonte(source, bindings) {
    return source.map(item => ({ ...item, bindingIds: [...new Set(bindings
        .filter(binding => binding.newValues?.sourceKey === chaveDaFonte(item)).map(binding => binding.entityId))] }));
}
export function slugCanonicoLegado(slug) {
    return LEGADOS_EDITORIAIS.find(row => row.slug === slug)?.canonico || slug;
}
