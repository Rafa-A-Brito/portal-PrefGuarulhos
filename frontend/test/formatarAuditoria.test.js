import { describe, expect, it } from "vitest";
import { ACOES_AUDITORIA, filtrosAuditoria, formatarAuditoria, dataHoraAuditoria } from "../src/features/admin/formatarAuditoria";
import { eventosAuditoria as eventos, idAuditoriaFixture as id } from "./fixtures/auditoria";

describe("datas civis de São Paulo", () => {
  it.each([
    ["2026-10-31", "2026-10-31T03:00:00.000Z", "2026-11-01T02:59:59.999Z"],
    ["2018-11-04", "2018-11-04T03:00:00.000Z", "2018-11-05T01:59:59.999Z"],
    ["2019-02-16", "2019-02-16T02:00:00.000Z", "2019-02-17T02:59:59.999Z"],
    ["2024-02-29", "2024-02-29T03:00:00.000Z", "2024-03-01T02:59:59.999Z"],
  ])("limites inclusivos %s, sem offset fixo", (dia, inicio, fim) => {
    expect(filtrosAuditoria({ inicio: dia, fim: dia })).toEqual({ inicio, fim });
  });
  it("valida calendário, intervalo e UUID; não transmite campos inexistentes", () => {
    expect(() => filtrosAuditoria({ inicio: "2026-02-30" })).toThrow();
    expect(() => filtrosAuditoria({ inicio: "2026-03-01", fim: "2026-02-28" })).toThrow();
    expect(() => filtrosAuditoria({ userId: "nome" })).toThrow();
    expect(filtrosAuditoria({ userId: id(1), entityId: id(2), busca: "não enviar" })).toEqual({ userId: id(1), entityId: id(2) });
    expect(dataHoraAuditoria("2026-11-01T02:59:59Z")).toContain("31/10/2026");
    expect(dataHoraAuditoria("inválida")).toBe("Data não disponível");
  });
});
describe("narrativa determinística e valores permitidos", () => {
  it("distingue ator atual, alvo e troca da própria senha", () => {
    const f = formatarAuditoria(eventos[0]);
    expect(f.frase).toContain("Ana — nome atual alterou usuário " + id(2));
    expect(f.linhas[0]).toEqual({ campo: "Nome", anterior: "Nome anterior", novo: "Nome alterado" });
    expect(formatarAuditoria(eventos[3]).frase).toContain("alterou sua senha");
    expect(formatarAuditoria({ ...eventos[3], entityId: id(2) }).frase).toContain("alterou a senha de usuário " + id(2));
  });
  it("responsável ausente não inventa identidade; código desconhecido é neutro", () => {
    expect(formatarAuditoria(eventos[1]).frase).toContain("Responsável não disponível");
    const f = formatarAuditoria({ ...eventos[0], action: "D1C_EDITORIAL_IMPORT", oldValues: { password: "segredo" } });
    expect(f.frase).toMatch(/^Atividade administrativa registrada/); expect(f.linhas).toEqual([]);
    expect(formatarAuditoria({ ...eventos[0], entity: "Novidade" }).acao).toBe("Ação não identificada");
  });
  it("omissão, null, vazio, zero e false têm significados distintos", () => {
    const f = formatarAuditoria({ ...eventos[0], action: "PATRIMONIO_UPDATE", entity: "Patrimonio",
      oldValues: { historia: null, ordemExibicao: 0, localizacao: { numero: "" } },
      newValues: { historia: "", numeroExibicao: 0, localizacao: { latitude: null } } });
    expect(f.linhas).toContainEqual({ campo: "História", anterior: "Sem valor", novo: "Texto vazio" });
    expect(f.linhas).toContainEqual({ campo: "Ordem de exibição", anterior: "0", novo: "Novo valor não disponível" });
    expect(f.linhas).toContainEqual({ campo: "Número de exibição", anterior: "Valor anterior não disponível", novo: "0" });
    expect(f.linhas).toContainEqual({ campo: "Localização · Número", anterior: "Texto vazio", novo: "Novo valor não disponível" });
    expect(formatarAuditoria(eventos[1]).linhas).toContainEqual({ campo: "Ativa", anterior: "Sim", novo: "Não" });
  });
  it("reordenação identifica patrimônio pai e só mostra IDs/ordens permitidos", () => {
    const f = formatarAuditoria({ ...eventos[2], newValues: { itens: [{ id: id(5), ordem: 0, token: "segredo" }] } });
    expect(f.frase).toContain("do patrimônio " + id(4)); expect(f.reordena).toBe(true);
    expect(f.linhas[0].novo).toBe(`ID: ${id(5)} · Ordem: 0`); expect(JSON.stringify(f)).not.toContain("segredo");
  });
  it("não apresenta credenciais, estruturas desconhecidas ou parâmetros de URLs", () => {
    const f = formatarAuditoria({ ...eventos[0], action: "DOCUMENTO_UPDATE", entity: "PatrimonioDocumento",
      oldValues: { fonte: "https://user:pass@example.test/doc?token=antigo#privado" },
      newValues: { fonte: "https://example.test/doc?token=novo", url: "file:///privado", passwordHash: "segredo", dados: { token: "segredo" } } });
    expect(f.linhas.find(l => l.campo === "Fonte")).toEqual({ campo: "Fonte", anterior: "https://example.test/doc", novo: "https://example.test/doc" });
    expect(JSON.stringify(f)).not.toMatch(/token=|segredo|user:pass|file:|privado/);
    const senha = formatarAuditoria({ ...eventos[3], oldValues: { name: "não mostrar", password: "segredo" }, newValues: { name: "também não" } });
    expect(senha.linhas).toEqual([]); expect(senha.aviso).toContain("nunca");
  });
  it("valores sanitizados iguais mantêm a ocorrência; strings maliciosas ficam texto", () => {
    const f = formatarAuditoria({ ...eventos[0], oldValues: { name: "<img src=x onerror=alert(1)>" }, newValues: { name: "<img src=x onerror=alert(1)>" } });
    expect(f.linhas[0].novo).toContain("<img"); expect(f.aviso).toContain("ocorrência");
  });
  it.each(Object.keys(ACOES_AUDITORIA))("código conhecido %s gera verbo somente com entidade correta", action => {
    const entity = ({ USER: "User", PATRIMONIO: "Patrimonio", REGIAO: "RegiaoPatrimonio", IMAGEM: "PatrimonioImagem", DOCUMENTO: "PatrimonioDocumento", FATO: "PatrimonioFato", LIGACAO: "PatrimonioLigacao", EXPOSICAO: "Exposicao", NOVIDADE: "Novidade" })[action.split("_")[0]];
    expect(formatarAuditoria({ ...eventos[0], action, entity }).acao).not.toBe("Ação não identificada");
  });
});
