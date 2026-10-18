-- Recuperação de senha por e-mail e invalidação de sessões antigas após trocar a senha
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpiraEm" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessoesValidasApartir" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "User_resetTokenHash_key" ON "User"("resetTokenHash");
