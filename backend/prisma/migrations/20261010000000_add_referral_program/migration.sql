-- Programa de indicação: código único por conta, quem indicou e controle de recompensas
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "codigoIndicacao" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "indicadoPorUserId" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "indicacaoRecompensada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "indicacoesConvertidas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditosIndicacaoPendentes" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS "User_codigoIndicacao_key" ON "User"("codigoIndicacao");
