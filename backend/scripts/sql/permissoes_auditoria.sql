-- S3-A1: aplicação EXPLÍCITA pelo proprietário/DBA, após conferir destino e backup.
-- Não faz parte do startup, Compose ou migrations. Não executar com portal_api.
-- psql -X --set ON_ERROR_STOP=1 --file scripts/sql/permissoes_auditoria.sql
-- Revisar/reaplicar após provisionamento, restore, recriação da tabela ou grants.
-- Defaults das demais tabelas são preservados: não existe DENY por tabela no PG.
BEGIN;
SET LOCAL search_path = pg_catalog;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $precondicoes$
DECLARE
    api pg_roles%ROWTYPE;
    tabela pg_class%ROWTYPE;
BEGIN
    SELECT * INTO STRICT api FROM pg_roles WHERE rolname = 'portal_api';
    SELECT * INTO STRICT tabela FROM pg_class WHERE oid = 'public.audit_log'::regclass;
    IF tabela.relkind <> 'r' OR tabela.relowner = api.oid
       OR api.rolsuper OR api.rolcreatedb OR api.rolcreaterole
       OR api.rolreplication OR api.rolbypassrls OR NOT api.rolcanlogin THEN
        RAISE EXCEPTION 'AuditLog: papel/ownership incompatível; revisão do DBA necessária';
    END IF;
    -- Rejeita inclusive NOINHERIT/SET FALSE: não altera memberships globalmente.
    -- Sem primeira aresta não há caminho transitivo para recuperar privilégios.
    IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member = api.oid)
       OR EXISTS (SELECT 1 FROM pg_database WHERE datname = current_database() AND datdba = api.oid)
       OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public' AND nspowner = api.oid)
       OR has_schema_privilege(api.oid, 'public', 'CREATE') THEN
        RAISE EXCEPTION 'AuditLog: membership ou poder de DDL da API; revisar sem ampliar este script';
    END IF;
    IF NOT has_schema_privilege(api.oid, 'public', 'USAGE') THEN
        RAISE EXCEPTION 'AuditLog: falta USAGE no schema; revisar provisionamento';
    END IF;
END
$precondicoes$;

LOCK TABLE public.audit_log IN ACCESS EXCLUSIVE MODE;
REVOKE ALL PRIVILEGES ON TABLE public.audit_log FROM PUBLIC, portal_api;
-- REVOKE na tabela não basta para remover grants independentes por coluna.
-- Sem CASCADE: concessões dependentes exigem revisão, em vez de alteração ampla.
DO $colunas$
DECLARE
    colunas text;
BEGIN
    SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO colunas
    FROM pg_attribute
    WHERE attrelid = 'public.audit_log'::regclass AND attnum > 0 AND NOT attisdropped;
    EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE public.audit_log FROM PUBLIC, portal_api', colunas);
END
$colunas$;
GRANT SELECT, INSERT ON TABLE public.audit_log TO portal_api;

DO $poscondicoes$
BEGIN
    IF NOT has_table_privilege('portal_api', 'public.audit_log', 'SELECT')
       OR NOT has_table_privilege('portal_api', 'public.audit_log', 'INSERT')
       OR has_table_privilege('portal_api', 'public.audit_log', 'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
       OR has_any_column_privilege('portal_api', 'public.audit_log', 'UPDATE,REFERENCES')
       OR has_table_privilege('portal_api', 'public.audit_log', 'SELECT WITH GRANT OPTION,INSERT WITH GRANT OPTION')
       OR EXISTS (
           SELECT 1 FROM pg_class c, LATERAL aclexplode(c.relacl) a
           WHERE c.oid = 'public.audit_log'::regclass AND a.grantee = 0
       ) THEN
        RAISE EXCEPTION 'AuditLog: privilégios efetivos incompatíveis; transação cancelada';
    END IF;
END
$poscondicoes$;
COMMIT;
