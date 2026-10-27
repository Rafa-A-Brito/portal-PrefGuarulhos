BEGIN READ ONLY;
DO $test$
BEGIN
    IF (SELECT count(*) FROM pg_constraint WHERE conrelid IN
        ('visualizacoes_unicas_dia'::regclass,'visualizacoes_totais_dia'::regclass,
         'sondas_metricas'::regclass,'operacao_metricas'::regclass,'dias_metricas_conferidos'::regclass)
        AND contype='p') <> 5 THEN
        RAISE EXCEPTION 'PKs operacionais ausentes';
    END IF;
    IF (SELECT count(*) FROM pg_constraint WHERE conrelid IN
        ('visualizacoes_unicas_dia'::regclass,'visualizacoes_totais_dia'::regclass)
        AND contype='f' AND confrelid='patrimonio'::regclass AND confdeltype='r' AND convalidated) <> 2 THEN
        RAISE EXCEPTION 'FKs Restrict não validadas';
    END IF;
    IF (SELECT count(*) FROM pg_constraint WHERE conname IN
        ('visualizacoes_chave_hex','visualizacoes_quantidade_positiva',
         'sondas_janela_alinhada','sondas_versao_positiva','operacao_limites','operacao_metricas_id_check')
        AND convalidated AND contype='c') <> 6 THEN
        RAISE EXCEPTION 'Checks operacionais ausentes';
    END IF;
    IF (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN
        ('visualizacoes_unicas_dia_patrimonio_id_dia_idx','visualizacoes_totais_dia_patrimonio_id_dia_idx')) <> 2 THEN
        RAISE EXCEPTION 'Índices de patrimônio/dia ausentes';
    END IF;
    IF EXISTS(SELECT 1 FROM visualizacoes_totais_dia WHERE quantidade < 0) THEN
        RAISE EXCEPTION 'Quantidade negativa';
    END IF;
END;
$test$;
SELECT 'integrity_metricas_passed' AS result;
ROLLBACK;
