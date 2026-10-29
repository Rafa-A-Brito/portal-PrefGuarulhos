import { MOCK_DATA } from "./runtime.js";

// Schemas HTTP também funcionam numa instalação sem client Prisma gerado.
const types = MOCK_DATA ? {
    Prisma: {},
    SituacaoPatrimonio: Object.fromEntries([
        "PRESERVADO", "EM_RESTAURACAO", "NECESSITA_RESTAURACAO", "EM_RUINAS", "DEMOLIDO", "NAO_INFORMADO",
    ].map(value => [value, value])),
    StatusPublicacao: { RASCUNHO: "RASCUNHO", PUBLICADO: "PUBLICADO", ARQUIVADO: "ARQUIVADO" },
} : await import("@prisma/client");

export const { Prisma, SituacaoPatrimonio, StatusPublicacao } = types;
