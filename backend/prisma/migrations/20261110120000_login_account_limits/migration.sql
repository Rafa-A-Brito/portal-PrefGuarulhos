CREATE TABLE login_account_limits (
    key CHAR(64) PRIMARY KEY,
    generation UUID NOT NULL,
    revision BIGINT NOT NULL DEFAULT 0,
    cleared BIGINT NOT NULL DEFAULT 0,
    blocked_until TIMESTAMPTZ(3),
    expires_at TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT login_account_revision_check CHECK (revision >= cleared AND cleared >= 0)
);
CREATE INDEX login_account_limits_expires_at_idx ON login_account_limits(expires_at);
