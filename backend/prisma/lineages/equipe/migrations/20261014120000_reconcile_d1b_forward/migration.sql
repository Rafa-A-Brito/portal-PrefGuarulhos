-- Exclusivo da trilha equipe: preserva tabelas, IDs, dados e migrations aplicadas.
-- Falha integralmente se os dados existentes exigirem reconciliacao editorial.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM patrimonio WHERE descricao IS NULL) THEN
    RAISE EXCEPTION 'R1: descricao NULL exige decisao documental; nenhum texto sera inventado';
  END IF;
  IF EXISTS (SELECT 1 FROM patrimonio_fatos WHERE char_length(rotulo) > 200
      OR char_length(valor) > 10000 OR rotulo !~ '\S' OR valor !~ '\S') THEN
    RAISE EXCEPTION 'R1: fatos fora do contrato D1B; reconciliar antes do upgrade';
  END IF;
  IF EXISTS (SELECT 1 FROM patrimonio_ligacoes WHERE char_length(texto) > 2000 OR texto !~ '\S') THEN
    RAISE EXCEPTION 'R1: ligacoes fora do contrato D1B; reconciliar antes do upgrade';
  END IF;
END $$;
ALTER TABLE patrimonio ALTER COLUMN descricao SET NOT NULL;
ALTER TABLE patrimonio_fatos
  ALTER COLUMN rotulo TYPE VARCHAR(200),
  ADD CONSTRAINT patrimonio_fatos_texto_check
    CHECK (rotulo ~ '\S' AND valor ~ '\S' AND char_length(valor) <= 10000);
ALTER TABLE patrimonio_ligacoes
  ALTER COLUMN texto TYPE VARCHAR(2000),
  ADD CONSTRAINT patrimonio_ligacoes_texto_check CHECK (texto ~ '\S');
-- Regiao, numeracao e secoes previamente existentes ficam inativos, sem DROP.
COMMIT;
