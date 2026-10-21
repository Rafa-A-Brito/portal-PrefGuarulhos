#!/bin/sh
# Apenas na primeira inicialização de um volume NOVO. Nunca altera volumes existentes.
(
set -eu
: "${API_DB_PASSWORD:?API_DB_PASSWORD obrigatória}"
: "${MIGRATION_DB_PASSWORD:?MIGRATION_DB_PASSWORD obrigatória}"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 \
  --set api_password="$API_DB_PASSWORD" --set migration_password="$MIGRATION_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE portal_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'migration_password') \gexec
SELECT format('CREATE ROLE portal_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'api_password') \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO portal_migrator;
GRANT USAGE ON SCHEMA public TO portal_api;
SELECT format('GRANT CONNECT ON DATABASE %I TO portal_api, portal_migrator', current_database()) \gexec
ALTER DEFAULT PRIVILEGES FOR ROLE portal_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO portal_api;
ALTER DEFAULT PRIVILEGES FOR ROLE portal_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO portal_api;
SQL
)
