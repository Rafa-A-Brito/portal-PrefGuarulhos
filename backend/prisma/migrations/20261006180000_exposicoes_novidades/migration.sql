-- Migration aditiva; revisar e aplicar pelo fluxo normal de deploy.
CREATE TYPE "tipo_novidade" AS ENUM ('NOTICIA', 'EVENTO');

CREATE TABLE "exposicao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(220) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "artista" VARCHAR(200) NOT NULL,
    "local" VARCHAR(250) NOT NULL,
    "periodo" VARCHAR(200) NOT NULL,
    "bio" TEXT NOT NULL,
    "imagem_url" TEXT NOT NULL,
    "cta_saiba_mais" TEXT,
    "status" "status_publicacao" NOT NULL DEFAULT 'RASCUNHO',
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "published_at" TIMESTAMPTZ(3),
    "arquivado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exposicao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "exposicao_slug_key" ON "exposicao"("slug");
CREATE INDEX "exposicao_status_published_at_idx" ON "exposicao"("status", "published_at");
CREATE INDEX "exposicao_created_by_idx" ON "exposicao"("created_by");
ALTER TABLE "exposicao" ADD CONSTRAINT "exposicao_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "exposicao_updated_by_idx" ON "exposicao"("updated_by");
ALTER TABLE "exposicao" ADD CONSTRAINT "exposicao_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "novidade" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(220) NOT NULL,
    "tipo" "tipo_novidade" NOT NULL,
    "tag" VARCHAR(100) NOT NULL,
    "data" DATE NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "resumo" VARCHAR(2000),
    "texto" TEXT NOT NULL,
    "quando" VARCHAR(250),
    "local" VARCHAR(250),
    "imagem_url" TEXT,
    "bloco_dia" VARCHAR(30),
    "bloco_mes" VARCHAR(30),
    "bloco_legenda" VARCHAR(150),
    "cta_rotulo" VARCHAR(150),
    "cta_url" TEXT,
    "fontes" JSONB NOT NULL DEFAULT '[]',
    "status" "status_publicacao" NOT NULL DEFAULT 'RASCUNHO',
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "published_at" TIMESTAMPTZ(3),
    "arquivado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "novidade_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "novidade_slug_key" ON "novidade"("slug");
CREATE INDEX "novidade_status_published_at_idx" ON "novidade"("status", "published_at");
CREATE INDEX "novidade_status_tipo_data_idx" ON "novidade"("status", "tipo", "data");
CREATE INDEX "novidade_status_data_idx" ON "novidade"("status", "data");
CREATE INDEX "novidade_created_by_idx" ON "novidade"("created_by");
ALTER TABLE "novidade" ADD CONSTRAINT "novidade_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "novidade_updated_by_idx" ON "novidade"("updated_by");
ALTER TABLE "novidade" ADD CONSTRAINT "novidade_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
