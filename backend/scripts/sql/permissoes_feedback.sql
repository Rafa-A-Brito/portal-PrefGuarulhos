-- Executar pelo proprietário somente em destino autorizado, após bootstrap e migrations.
BEGIN;
REVOKE ALL ON feedback, feedback_recibo FROM PUBLIC, portal_api, portal_metricas_operador, portal_feedback_operador;
GRANT SELECT, INSERT ON feedback, feedback_recibo TO portal_api;
GRANT USAGE ON SCHEMA public TO portal_feedback_operador;
-- Limpeza não lê mensagem, tipo, aviso, HMAC ou usuários.
GRANT SELECT (id, expira_em), DELETE ON feedback TO portal_feedback_operador;
GRANT SELECT (chave_digest, expira_em), DELETE ON feedback_recibo TO portal_feedback_operador;
REVOKE ALL ON _prisma_migrations FROM portal_feedback_operador;
COMMIT;
