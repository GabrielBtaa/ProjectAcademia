-- Rastreia quando foi o último disparo automático (WhatsApp/e-mail) bem-sucedido,
-- para o robô conseguir "se recuperar" sozinho caso o GitHub Actions atrase e perca
-- a hora exata configurada, sem enviar duplicado no mesmo dia.
ALTER TABLE "User" ADD COLUMN "ultimoEnvioAutomaticoEm" TIMESTAMP(3);
