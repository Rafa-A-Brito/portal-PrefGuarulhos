BEGIN;
CREATE TABLE "auth_sessions" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL,
 "token_version" INTEGER NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expires_at" TIMESTAMPTZ(3) NOT NULL, "revoked_at" TIMESTAMPTZ(3),
 CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
 CONSTRAINT "auth_sessions_version_check" CHECK ("token_version" >= 0),
 CONSTRAINT "auth_sessions_expiration_check" CHECK ("expires_at" > "created_at")
);
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");
CREATE TABLE "refresh_tokens" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "session_id" UUID NOT NULL,
 "token_hash" VARCHAR(64) NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "used_at" TIMESTAMPTZ(3), CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id") ON DELETE CASCADE,
 CONSTRAINT "refresh_tokens_hash_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");
COMMIT;
