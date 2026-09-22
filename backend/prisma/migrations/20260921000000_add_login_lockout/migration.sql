-- Suporte a bloqueio temporário de conta após várias tentativas de login incorretas
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- Lista de tokens (JWT) revogados no logout, até a data em que expirariam naturalmente
CREATE TABLE "TokenRevogado" (
  "jti" TEXT NOT NULL PRIMARY KEY,
  "expiraEm" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "TokenRevogado_expiraEm_idx" ON "TokenRevogado" ("expiraEm");
