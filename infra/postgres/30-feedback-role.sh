#!/bin/sh
# Montar somente no PostgreSQL descartável F2, nunca no Compose normal.
(
set -eu
: "${FEEDBACK_DB_PASSWORD:?senha operacional exclusiva obrigatoria}"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 \
  --set feedback_password="$FEEDBACK_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE portal_feedback_operador LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'feedback_password') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO portal_feedback_operador', current_database()) \gexec
GRANT EXECUTE ON FUNCTION pg_catalog.pg_control_system() TO portal_feedback_operador;
SQL
)
