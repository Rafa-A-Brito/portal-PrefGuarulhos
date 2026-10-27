-- Revisar/executar com o proprietário (portal_migrator) após migrations.
-- portal_metricas_operador deve ser criado previamente, LOGIN, sem superuser,
-- sem CREATEDB/CREATEROLE, sem membership no migrator. Senha fora deste arquivo.
BEGIN;
REVOKE ALL ON _prisma_migrations FROM portal_api, portal_metricas_operador;
REVOKE ALL ON visualizacoes_unicas_dia, visualizacoes_totais_dia,
    sondas_metricas, operacao_metricas, dias_metricas_conferidos FROM portal_api;
GRANT SELECT, INSERT ON visualizacoes_unicas_dia TO portal_api;
GRANT SELECT, INSERT, UPDATE ON visualizacoes_totais_dia TO portal_api;
GRANT SELECT ON sondas_metricas, operacao_metricas, dias_metricas_conferidos TO portal_api;
GRANT USAGE ON SCHEMA public TO portal_metricas_operador;
GRANT SELECT, DELETE ON visualizacoes_unicas_dia, visualizacoes_totais_dia TO portal_metricas_operador;
GRANT SELECT, INSERT, UPDATE, DELETE ON sondas_metricas, operacao_metricas, dias_metricas_conferidos TO portal_metricas_operador;
COMMIT;
-- Separadamente, administrador do cluster: GRANT CONNECT ON DATABASE <destino> TO portal_metricas_operador;
-- GRANT EXECUTE ON FUNCTION pg_catalog.pg_control_system() TO portal_metricas_operador;
-- Não alterar os default privileges existentes: reaplicar este escopo após futuras migrations V2.
