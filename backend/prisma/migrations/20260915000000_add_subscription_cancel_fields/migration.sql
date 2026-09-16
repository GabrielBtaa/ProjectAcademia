-- Guarda o ID da assinatura no Stripe (necessário para poder cancelar depois),
-- se já existe um cancelamento agendado para o fim do período pago, e quando renova.
ALTER TABLE "User" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "cancelamentoAgendado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "assinaturaRenovaEm" TIMESTAMP(3);
