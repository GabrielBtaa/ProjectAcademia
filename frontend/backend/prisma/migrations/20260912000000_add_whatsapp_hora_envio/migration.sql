-- Adiciona o horário (0-23) configurável para o disparo automático de cobranças no WhatsApp
ALTER TABLE "User" ADD COLUMN "whatsappHoraEnvio" INTEGER NOT NULL DEFAULT 9;
