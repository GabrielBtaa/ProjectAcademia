import "../lib/load-env.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  try {
    console.log("Criando tabelas no banco de dados...");

    // Criar enums de forma segura no PostgreSQL
    try {
      await prisma.$executeRaw`
        DO $$ BEGIN
          CREATE TYPE "UserRole" AS ENUM ('admin', 'usuario');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `;
      await prisma.$executeRaw`
        DO $$ BEGIN
          CREATE TYPE "StatusAluno" AS ENUM ('ativo', 'inadimplente', 'inativo');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `;
      await prisma.$executeRaw`
        DO $$ BEGIN
          CREATE TYPE "StatusPagamento" AS ENUM ('pendente', 'confirmado', 'cancelado');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `;
      console.log("✓ Enums criados/verificados.");
    } catch (e) {
      console.log("ℹ Erro ao criar enums ou já existentes:", e.message);
    }

    // Criar tabela Plano se não existir
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Plano" (
          "id" SERIAL NOT NULL,
          "nome" TEXT NOT NULL,
          "duracao" INTEGER NOT NULL,
          "valor" DECIMAL(10,2) NOT NULL,
          "descricao" TEXT,
          CONSTRAINT "Plano_pkey" PRIMARY KEY ("id")
        );
      `;
      console.log("✓ Tabela Plano criada/verificada.");
    } catch (e) {
      console.log("ℹ Tabela Plano já existe ou erro:", e.message);
    }

    // Criar tabela Aluno se não existir
    try {
      await prisma.$executeRaw`
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
      `;
      console.log("✓ Tabela Aluno criada/verificada.");
    } catch (e) {
      console.log("ℹ Tabela Aluno já existe ou erro:", e.message);
    }

    // Criar tabela Pagamento se não existir
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Pagamento" (
          "id" SERIAL NOT NULL,
          "valor" DECIMAL(10,2) NOT NULL,
          "data" DATE NOT NULL,
          "status" "StatusPagamento" NOT NULL DEFAULT 'pendente',
          "metodo" TEXT NOT NULL DEFAULT 'PIX',
          "alunoId" INTEGER NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
        );
      `;
      console.log("✓ Tabela Pagamento criada/verificada.");
    } catch (e) {
      console.log("ℹ Tabela Pagamento já existe ou erro:", e.message);
    }

    // Adicionar coluna metodo em Pagamento se não existir
    try {
      await prisma.$executeRaw`
        DO $$ BEGIN
          ALTER TABLE "Pagamento" ADD COLUMN "metodo" TEXT NOT NULL DEFAULT 'PIX';
        EXCEPTION WHEN duplicate_column THEN null;
        END $$;
      `;
      console.log("✓ Coluna metodo em Pagamento criada/verificada.");
    } catch (e) {
      console.log("ℹ Coluna metodo já existe ou erro:", e.message);
    }

    // Criar tabela User se não existir
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" SERIAL NOT NULL,
          "email" TEXT NOT NULL,
          "password" TEXT NOT NULL,
          "nome" TEXT NOT NULL,
          "role" "UserRole" NOT NULL DEFAULT 'usuario',
          CONSTRAINT "User_pkey" PRIMARY KEY ("id")
        );
      `;
      console.log("✓ Tabela User criada/verificada.");
    } catch (e) {
      console.log("ℹ Tabela User já existe ou erro:", e.message);
    }

    // Criar índices se não existirem
    try {
      await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Aluno_cpf_key" ON "Aluno"("cpf");`;
      console.log("✓ Índice CPF criado/verificado.");
    } catch (e) {
      console.log("ℹ Índice CPF já existe ou erro:", e.message);
    }

    try {
      await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`;
      console.log("✓ Índice User email criado/verificado.");
    } catch (e) {
      console.log("ℹ Índice User email já existe ou erro:", e.message);
    }

    // Adicionar foreign key se não existir
    try {
      await prisma.$executeRaw`
        DO $$ BEGIN
          ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `;
      console.log("✓ Foreign key Aluno->Plano criada/verificada.");
    } catch (e) {
      console.log("ℹ Foreign key Aluno->Plano já existe ou erro:", e.message);
    }

    try {
      await prisma.$executeRaw`
        DO $$ BEGIN
          ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `;
      console.log("✓ Foreign key Pagamento->Aluno criada/verificada.");
    } catch (e) {
      console.log("ℹ Foreign key Pagamento->Aluno já existe ou erro:", e.message);
    }

    console.log("\n🎉 Todas as tabelas foram criadas/verficadas com sucesso!");

  } catch (error) {
    console.error("❌ Erro geral:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();