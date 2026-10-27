-- Controle operacional separado: nenhuma alteração das migrations anteriores.
CREATE TABLE "operacao_metricas" (
    "id" INTEGER PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
    "inicio_observacao" TIMESTAMPTZ(3),
    "recibos_antes_de" DATE,
    "agregados_antes_de" DATE,
    "ultima_retencao_em" TIMESTAMPTZ(3),
    CONSTRAINT "operacao_limites" CHECK ("agregados_antes_de" <= "recibos_antes_de")
);
-- Selo de conferência permite retomar uma purga interrompida entre lotes.
CREATE TABLE "dias_metricas_conferidos" (
    "dia" DATE PRIMARY KEY,
    "conferido_em" TIMESTAMPTZ(3) NOT NULL
);
