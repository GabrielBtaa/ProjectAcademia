-- Cada academia conecta o próprio WhatsApp: guarda o nome da instância dela no Evolution API
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whatsappInstancia" TEXT;
