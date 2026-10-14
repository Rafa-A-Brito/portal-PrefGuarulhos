-- CreateTable
CREATE TABLE "patrimonio_detalhes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patrimonio_id" UUID NOT NULL,
    "icone" TEXT,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "patrimonio_detalhes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_hero" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pagina" TEXT NOT NULL,
    "eyebrow" TEXT,
    "titulo" TEXT NOT NULL,
    "subtitulo" TEXT,
    "imagemUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_hero_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patrimonio_detalhes_patrimonio_id_ordem_idx" ON "patrimonio_detalhes"("patrimonio_id", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "site_hero_pagina_key" ON "site_hero"("pagina");

-- AddForeignKey
ALTER TABLE "patrimonio_detalhes" ADD CONSTRAINT "patrimonio_detalhes_patrimonio_id_fkey" FOREIGN KEY ("patrimonio_id") REFERENCES "patrimonio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
