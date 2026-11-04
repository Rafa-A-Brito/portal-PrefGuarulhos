BEGIN READ ONLY;
DO $test$
BEGIN
    IF (SELECT count(*) FROM pg_constraint WHERE conrelid IN ('feedback'::regclass,'feedback_recibo'::regclass) AND contype='p') <> 2 THEN
        RAISE EXCEPTION 'PKs de Feedback ausentes';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname='feedback_recibo_feedback_id_fkey' AND contype='f' AND confdeltype='n' AND convalidated) THEN
        RAISE EXCEPTION 'FK SET NULL ausente';
    END IF;
    IF (SELECT count(*) FROM pg_constraint WHERE conname IN ('feedback_mensagem_check','feedback_aviso_check','feedback_prazo_check',
        'feedback_recibo_chave_check','feedback_recibo_conteudo_check','feedback_recibo_versao_check','feedback_recibo_prazo_check') AND contype='c' AND convalidated) <> 7 THEN
        RAISE EXCEPTION 'CHECKs de Feedback ausentes';
    END IF;
    IF (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN ('feedback_data_id_idx','feedback_tipo_data_id_idx',
        'feedback_expiracao_idx','feedback_recibo_expiracao_idx','feedback_recibo_registro_key')) <> 5 THEN
        RAISE EXCEPTION 'Índices de Feedback ausentes';
    END IF;
    IF has_table_privilege('portal_api','feedback','DELETE') OR has_table_privilege('portal_api','feedback','UPDATE') OR
        has_table_privilege('portal_api','feedback_recibo','DELETE') OR has_table_privilege('portal_api','feedback_recibo','UPDATE') THEN
        RAISE EXCEPTION 'API com privilégios excessivos';
    END IF;
    IF has_column_privilege('portal_feedback_operador','feedback','mensagem','SELECT') OR has_table_privilege('portal_metricas_operador','feedback','SELECT') THEN
        RAISE EXCEPTION 'Operador com leitura indevida';
    END IF;
END;
$test$;
SELECT 'integrity_feedback_passed' AS result;
ROLLBACK;
