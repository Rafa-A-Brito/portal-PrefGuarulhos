#!/bin/sh
# Somente bootstrap de volume novo quando este arquivo for montado explicitamente.
(
set -eu
: "${METRICAS_DB_PASSWORD:?METRICAS_DB_PASSWORD obrigatória para o papel operacional}"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 \
  --set operacao_password="$METRICAS_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE portal_metricas_operador LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'operacao_password') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO portal_metricas_operador', current_database()) \gexec
GRANT EXECUTE ON FUNCTION pg_catalog.pg_control_system() TO portal_metricas_operador;
SQL
)
