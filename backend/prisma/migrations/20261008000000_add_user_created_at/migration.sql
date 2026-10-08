-- Data de criação da conta (usada nas métricas da plataforma e no e-mail de reengajamento).
-- Contas já existentes recebem a data desta migration como valor inicial.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
