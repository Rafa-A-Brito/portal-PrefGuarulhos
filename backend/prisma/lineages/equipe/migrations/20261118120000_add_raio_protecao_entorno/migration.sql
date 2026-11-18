-- Raio documental opcional em metros; sem backfill de medidas n?o confirmadas.
ALTER TABLE "patrimonio" ADD COLUMN "raio_protecao_entorno_metros" DECIMAL(12,3);
ALTER TABLE "patrimonio" ADD CONSTRAINT "patrimonio_raio_protecao_entorno_positivo"
CHECK ("raio_protecao_entorno_metros" > 0 AND "raio_protecao_entorno_metros" <> 'NaN'::numeric);
