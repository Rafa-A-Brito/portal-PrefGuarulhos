-- Fase 1.1: preparada para revisão. Nenhum backfill ou alteração do acervo.
CREATE TYPE "estado_sonda_metricas" AS ENUM ('DISPONIVEL', 'DESATIVADA', 'FALHA');
CREATE TABLE "visualizacoes_unicas_dia" (
    "dia" DATE NOT NULL,
    "patrimonio_id" UUID NOT NULL,
    "chave_visitante" CHAR(64) NOT NULL,
    CONSTRAINT "visualizacoes_unicas_dia_pkey" PRIMARY KEY ("dia", "patrimonio_id", "chave_visitante"),
    CONSTRAINT "visualizacoes_unicas_dia_patrimonio_id_fkey" FOREIGN KEY ("patrimonio_id") REFERENCES "patrimonio"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "visualizacoes_chave_hex" CHECK ("chave_visitante" ~ '^[a-f0-9]{64}$')
);
CREATE INDEX "visualizacoes_unicas_dia_patrimonio_id_dia_idx" ON "visualizacoes_unicas_dia"("patrimonio_id", "dia");
CREATE TABLE "visualizacoes_totais_dia" (
    "dia" DATE NOT NULL,
    "patrimonio_id" UUID NOT NULL,
    "quantidade" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "visualizacoes_totais_dia_pkey" PRIMARY KEY ("dia", "patrimonio_id"),
    CONSTRAINT "visualizacoes_totais_dia_patrimonio_id_fkey" FOREIGN KEY ("patrimonio_id") REFERENCES "patrimonio"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "visualizacoes_quantidade_positiva" CHECK ("quantidade" >= 0)
);
CREATE INDEX "visualizacoes_totais_dia_patrimonio_id_dia_idx" ON "visualizacoes_totais_dia"("patrimonio_id", "dia");
CREATE TABLE "sondas_metricas" (
    "janela_inicio" TIMESTAMPTZ(0) NOT NULL PRIMARY KEY,
    "observado_em" TIMESTAMPTZ(3) NOT NULL,
    "estado" "estado_sonda_metricas" NOT NULL,
    "versao_regra" INTEGER NOT NULL,
    CONSTRAINT "sondas_janela_alinhada" CHECK (mod(extract(epoch FROM "janela_inicio"), 300) = 0),
    CONSTRAINT "sondas_versao_positiva" CHECK ("versao_regra" > 0)
);
