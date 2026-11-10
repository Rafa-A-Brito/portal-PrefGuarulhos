CREATE TABLE login_accesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ(3) NOT NULL,
    browser_key CHAR(64), network_key CHAR(64), region_key CHAR(64),
    fingerprint CHAR(64) NOT NULL,
    suspicious BOOLEAN NOT NULL DEFAULT false,
    notice_at TIMESTAMPTZ(3),
    delivery_state VARCHAR(16) NOT NULL DEFAULT 'none',
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ(3), lease UUID,
    CONSTRAINT login_accesses_delivery_check CHECK (delivery_state IN ('none','pending','sending','sent','failed'))
);
CREATE INDEX login_accesses_user_id_created_at_idx ON login_accesses(user_id, created_at);
CREATE INDEX login_accesses_expires_at_idx ON login_accesses(expires_at);
CREATE INDEX login_accesses_delivery_state_available_at_idx ON login_accesses(delivery_state, available_at);
