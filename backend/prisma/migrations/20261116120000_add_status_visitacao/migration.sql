-- Visitação é independente da conservação e da publicação.
CREATE TYPE "status_visitacao" AS ENUM (
    'ABERTO', 'ACESSO_PARCIAL', 'TEMPORARIAMENTE_FECHADO',
    'SEM_VISITACAO_PUBLICA', 'NAO_INFORMADO'
);

ALTER TABLE "patrimonio"
    ADD COLUMN "status_visitacao" "status_visitacao" NOT NULL DEFAULT 'NAO_INFORMADO',
    ADD COLUMN "motivo_restricao" TEXT,
    ADD COLUMN "previsao_reabertura" DATE;
