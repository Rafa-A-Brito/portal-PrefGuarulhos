// Consolidações já aprovadas em C2. Não são registros novos nem dados do catálogo da equipe.
export const LEGADOS_EDITORIAIS = [
    { id: "7ef1d2a6-cb0e-4827-b8e3-378877a2aec5", slug: "casarao-da-nossa-historia", canonico: "casa-jose-mauricio" },
    { id: "c6d445ab-7259-4196-b422-26d2a5069858", slug: "casarao-do-sitio-ponte-alta", canonico: "casarao-da-familia-albertis" },
];
export const legadoEditorial = patrimonio => LEGADOS_EDITORIAIS.find(l => l.id === patrimonio.id || l.slug === patrimonio.slug);
export const destinoPublicoWhere = {
    status: "PUBLICADO",
    id: { notIn: LEGADOS_EDITORIAIS.map(l => l.id) },
    slug: { notIn: LEGADOS_EDITORIAIS.map(l => l.slug) },
};
