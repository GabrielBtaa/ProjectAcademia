-- Instrumentação de onboarding e engajamento (roadmap: tempo de onboarding,
-- e-mail de reengajamento, motivo de cancelamento)
ALTER TABLE "User" ADD COLUMN "primeiroAlunoCadastradoEm" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "automacaoConfiguradaEm" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "ultimoAcessoEm" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "ultimoEmailReengajamentoEm" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "motivoCancelamento" TEXT;
