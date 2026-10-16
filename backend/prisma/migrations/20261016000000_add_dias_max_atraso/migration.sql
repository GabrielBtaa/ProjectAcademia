-- Depois de quantos dias de atraso o sistema para de enviar cobrança ao aluno
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whatsappDiasMaxAtraso" INTEGER NOT NULL DEFAULT 5;
