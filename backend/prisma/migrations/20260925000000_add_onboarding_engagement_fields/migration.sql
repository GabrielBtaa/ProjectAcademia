-- Instrumentação de onboarding e engajamento (roadmap: tempo de onboarding,
-- e-mail de reengajamento, motivo de cancelamento).
-- Usa IF NOT EXISTS porque algumas dessas colunas podem já ter sido criadas por outra via.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "primeiroAlunoCadastradoEm" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "automacaoConfiguradaEm" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ultimoAcessoEm" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ultimoEmailReengajamentoEm" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "motivoCancelamento" TEXT;
