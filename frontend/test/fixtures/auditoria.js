// Dados inteiramente sintéticos; contrato conferido pelos serviços real e demo
// em backend/test/auditoriaInterface.test.js, sem conexão PostgreSQL.
export const idAuditoriaFixture = n => `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const responsavelFixture = { id: idAuditoriaFixture(1), name: "Ana — nome atual", email: "ana@example.test" };
export const eventosAuditoria = [
  { id: idAuditoriaFixture(10), userId: responsavelFixture.id, user: responsavelFixture, action: "USER_UPDATE", entity: "User",
    entityId: idAuditoriaFixture(2), createdAt: "2026-10-31T15:20:00.000Z", resumo: "Usuário: edição", registro: { id: idAuditoriaFixture(2) },
    oldValues: { name: "Nome anterior", isActive: false }, newValues: { name: "Nome alterado", isActive: true } },
  { id: idAuditoriaFixture(11), userId: null, user: null, action: "REGIAO_UPDATE", entity: "RegiaoPatrimonio",
    entityId: idAuditoriaFixture(3), createdAt: "2026-10-30T15:20:00.000Z", resumo: "Região: edição", registro: { id: idAuditoriaFixture(3) },
    oldValues: { descricao: null, ativo: true }, newValues: { descricao: "", ativo: false } },
  { id: idAuditoriaFixture(12), userId: responsavelFixture.id, user: responsavelFixture, action: "FATO_REORDER", entity: "PatrimonioFato",
    entityId: idAuditoriaFixture(4), createdAt: "2026-10-29T15:20:00.000Z", resumo: "Fato: reordenação", registro: { id: idAuditoriaFixture(4), patrimonioId: idAuditoriaFixture(4) },
    oldValues: { itens: [{ id: idAuditoriaFixture(5), ordem: 0 }] }, newValues: { itens: [{ id: idAuditoriaFixture(5), ordem: 1 }] } },
  { id: idAuditoriaFixture(13), userId: responsavelFixture.id, user: responsavelFixture, action: "USER_PASSWORD_CHANGE", entity: "User",
    entityId: responsavelFixture.id, createdAt: "2026-10-28T15:20:00.000Z", resumo: "Usuário: troca de senha", registro: { id: responsavelFixture.id },
    oldValues: null, newValues: null },
];
export function listaAuditoriaFixture(itens = eventosAuditoria, pagina = 1, total = itens.length, limite = 20) {
  return { itens: itens.map(e => Object.fromEntries(["id", "userId", "user", "action", "entity", "entityId", "createdAt", "resumo"].map(k => [k, e[k]]))),
    paginacao: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) } };
}
