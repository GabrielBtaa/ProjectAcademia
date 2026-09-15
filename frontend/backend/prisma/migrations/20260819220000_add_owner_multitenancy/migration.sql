-- Adiciona ownerId (nullable por enquanto) para isolar dados por conta
ALTER TABLE "Plano" ADD COLUMN "ownerId" INTEGER;
ALTER TABLE "Aluno" ADD COLUMN "ownerId" INTEGER;

-- Atribui todos os registros existentes à primeira conta cadastrada
-- (a conta original, antes do multi-tenancy existir)
UPDATE "Plano" SET "ownerId" = (SELECT id FROM "User" ORDER BY id ASC LIMIT 1);
UPDATE "Aluno" SET "ownerId" = (SELECT id FROM "User" ORDER BY id ASC LIMIT 1);

-- Agora torna obrigatório
ALTER TABLE "Plano" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Aluno" ALTER COLUMN "ownerId" SET NOT NULL;

-- Chaves estrangeiras
ALTER TABLE "Plano" ADD CONSTRAINT "Plano_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CPF passa a ser único por conta, não globalmente
-- (duas academias diferentes podem ter alunos com o mesmo CPF cadastrado)
DROP INDEX IF EXISTS "Aluno_cpf_key";
CREATE UNIQUE INDEX "Aluno_cpf_ownerId_key" ON "Aluno"("cpf", "ownerId");
