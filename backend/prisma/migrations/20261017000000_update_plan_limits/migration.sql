-- Novos limites de alunos por plano: starter 150, pro 250, business 350.
-- Atualiza quem já assina (só contas que ainda estão com o limite antigo do próprio plano).
UPDATE "User" SET "maxAlunos" = 150 WHERE "subscriptionTier" = 'starter'  AND "maxAlunos" = 50;
UPDATE "User" SET "maxAlunos" = 250 WHERE "subscriptionTier" = 'pro'      AND "maxAlunos" = 100;
UPDATE "User" SET "maxAlunos" = 350 WHERE "subscriptionTier" = 'business' AND "maxAlunos" = 250;
