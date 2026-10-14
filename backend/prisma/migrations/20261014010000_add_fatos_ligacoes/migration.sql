-- D1B: estrutura editorial vazia. Não modifica patrimônio ou dados existentes.
CREATE TABLE "patrimonio_fatos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patrimonio_id" UUID NOT NULL,
    "rotulo" VARCHAR(200) NOT NULL,
    "valor" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    CONSTRAINT "patrimonio_fatos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "patrimonio_fatos_ordem_check" CHECK ("ordem" >= 0),
    CONSTRAINT "patrimonio_fatos_texto_check" CHECK ("rotulo" ~ '\S' AND "valor" ~ '\S' AND char_length("valor") <= 10000),
    CONSTRAINT "patrimonio_fatos_patrimonio_id_fkey" FOREIGN KEY ("patrimonio_id") REFERENCES "patrimonio"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "patrimonio_fatos_patrimonio_id_ordem_key" ON "patrimonio_fatos"("patrimonio_id", "ordem");

CREATE TABLE "patrimonio_ligacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patrimonio_origem_id" UUID NOT NULL,
    "patrimonio_destino_id" UUID NOT NULL,
    "texto" VARCHAR(2000) NOT NULL,
    "ordem" INTEGER NOT NULL,
    CONSTRAINT "patrimonio_ligacoes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "patrimonio_ligacoes_ordem_check" CHECK ("ordem" >= 0),
    CONSTRAINT "patrimonio_ligacoes_texto_check" CHECK ("texto" ~ '\S'),
    CONSTRAINT "patrimonio_ligacoes_distintos_check" CHECK ("patrimonio_origem_id" <> "patrimonio_destino_id"),
    CONSTRAINT "patrimonio_ligacoes_origem_fkey" FOREIGN KEY ("patrimonio_origem_id") REFERENCES "patrimonio"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patrimonio_ligacoes_destino_fkey" FOREIGN KEY ("patrimonio_destino_id") REFERENCES "patrimonio"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "patrimonio_ligacoes_origem_destino_key" ON "patrimonio_ligacoes"("patrimonio_origem_id", "patrimonio_destino_id");
CREATE UNIQUE INDEX "patrimonio_ligacoes_origem_ordem_key" ON "patrimonio_ligacoes"("patrimonio_origem_id", "ordem");
CREATE INDEX "patrimonio_ligacoes_destino_idx" ON "patrimonio_ligacoes"("patrimonio_destino_id");
