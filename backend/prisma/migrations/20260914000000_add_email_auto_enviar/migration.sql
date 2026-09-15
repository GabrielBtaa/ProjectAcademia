-- Adiciona o toggle de ativação do envio automático de notificações por e-mail
ALTER TABLE "User" ADD COLUMN "emailAutoEnviar" BOOLEAN NOT NULL DEFAULT false;
