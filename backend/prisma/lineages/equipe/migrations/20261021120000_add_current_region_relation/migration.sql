-- Compatibilidade aditiva com o schema atual. O enum em local.regiao,
-- as secoes antigas e a numeracao existente permanecem intactos.
BEGIN;
CREATE TABLE "regioes_patrimonio" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nome" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "descricao" VARCHAR(2000),
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "regioes_patrimonio_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "regioes_patrimonio_nome_check" CHECK ("nome" ~ '\S'),
  CONSTRAINT "regioes_patrimonio_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "regioes_patrimonio_descricao_check" CHECK ("descricao" IS NULL OR "descricao" ~ '\S')
);
CREATE UNIQUE INDEX "regioes_patrimonio_slug_key" ON "regioes_patrimonio" ("slug");
ALTER TABLE "patrimonio"
  ADD COLUMN "regiao_id" UUID,
  ADD CONSTRAINT "patrimonio_regiao_id_fkey" FOREIGN KEY ("regiao_id")
    REFERENCES "regioes_patrimonio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "patrimonio_regiao_id_idx" ON "patrimonio" ("regiao_id");
CREATE INDEX "patrimonio_ordem_exibicao_nome_id_idx" ON "patrimonio" ("ordem_exibicao", "name", "id");
COMMIT;
