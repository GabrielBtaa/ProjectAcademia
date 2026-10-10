-- Controle manual de acesso pelo dono da plataforma: liberar sem pagamento ou bloquear
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "acessoLiberadoManual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bloqueadoPorAdmin" BOOLEAN NOT NULL DEFAULT false;
