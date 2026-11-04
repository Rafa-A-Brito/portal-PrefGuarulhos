BEGIN;
CREATE TYPE tipo_feedback AS ENUM ('ELOGIO', 'SUGESTAO', 'PROBLEMA');
CREATE TABLE feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo tipo_feedback NOT NULL,
    mensagem varchar(2000) NOT NULL,
    aviso_versao varchar(40) NOT NULL,
    created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em timestamptz(3) NOT NULL,
    CONSTRAINT feedback_mensagem_check CHECK (char_length(btrim(mensagem)) BETWEEN 1 AND 2000),
    CONSTRAINT feedback_aviso_check CHECK (char_length(btrim(aviso_versao)) > 0),
    CONSTRAINT feedback_prazo_check CHECK (expira_em > created_at)
);
CREATE INDEX feedback_data_id_idx ON feedback (created_at DESC, id DESC);
CREATE INDEX feedback_tipo_data_id_idx ON feedback (tipo, created_at DESC, id DESC);
CREATE INDEX feedback_expiracao_idx ON feedback (expira_em, id);
CREATE TABLE feedback_recibo (
    chave_digest char(64) PRIMARY KEY,
    conteudo_digest char(64) NOT NULL,
    versao_chave varchar(40) NOT NULL,
    feedback_id uuid,
    recebido_em timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em timestamptz(3) NOT NULL,
    CONSTRAINT feedback_recibo_registro_key UNIQUE (feedback_id),
    CONSTRAINT feedback_recibo_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT feedback_recibo_chave_check CHECK (chave_digest ~ '^[0-9a-f]{64}$'),
    CONSTRAINT feedback_recibo_conteudo_check CHECK (conteudo_digest ~ '^[0-9a-f]{64}$'),
    CONSTRAINT feedback_recibo_versao_check CHECK (char_length(btrim(versao_chave)) > 0),
    CONSTRAINT feedback_recibo_prazo_check CHECK (expira_em > recebido_em)
);
CREATE INDEX feedback_recibo_expiracao_idx ON feedback_recibo (expira_em);
REVOKE ALL ON feedback, feedback_recibo FROM PUBLIC;
-- Fecha os grants padrão do bootstrap atomicamente com a criação das tabelas.
-- Também funciona em descartáveis sem esses papéis (migrations históricas).
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'portal_api') THEN
        REVOKE ALL ON feedback, feedback_recibo FROM portal_api;
        GRANT SELECT, INSERT ON feedback, feedback_recibo TO portal_api;
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'portal_metricas_operador') THEN
        REVOKE ALL ON feedback, feedback_recibo FROM portal_metricas_operador;
    END IF;
END $$;
COMMIT;
