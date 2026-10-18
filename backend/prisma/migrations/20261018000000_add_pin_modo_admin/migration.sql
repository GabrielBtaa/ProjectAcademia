-- PIN para voltar do modo recepcionista ao modo administrador (com bloqueio por tentativas)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pinAdminHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pinFalhas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pinBloqueadoAte" TIMESTAMP(3);
