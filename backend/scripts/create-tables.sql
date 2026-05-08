-- Criar enums se não existirem
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM('admin', 'usuario');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StatusAluno" AS ENUM('ativo', 'inadimplente', 'inativo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StatusPagamento" AS ENUM('pendente', 'confirmado', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabelas se não existirem
CREATE TABLE IF NOT EXISTS "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'usuario',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Plano" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "duracao" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Plano_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Aluno" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "dataNascimento" DATE NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "status" "StatusAluno" NOT NULL DEFAULT 'ativo',
    "avatar" TEXT,
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planoId" INTEGER NOT NULL,

    CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Pagamento" (
    "id" SERIAL NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" DATE NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'pendente',
    "alunoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- Criar índices únicos se não existirem
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Aluno_cpf_key" ON "Aluno"("cpf");

-- Criar índices de chave estrangeira se não existirem
CREATE INDEX IF NOT EXISTS "Aluno_planoId_idx" ON "Aluno"("planoId");
CREATE INDEX IF NOT EXISTS "Pagamento_alunoId_idx" ON "Pagamento"("alunoId");

-- Adicionar chaves estrangeiras se não existirem
DO $$ BEGIN
    ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;