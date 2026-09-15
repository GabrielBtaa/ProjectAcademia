import "../lib/load-env.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Dropando tabela User...");
    await prisma.$executeRaw`DROP TABLE IF EXISTS "User" CASCADE;`;
    console.log("✓ Tabela User dropada");

    console.log("Criando enum UserRole...");
    try {
      await prisma.$executeRaw`DROP TYPE IF EXISTS "UserRole" CASCADE;`;
    } catch (e) {
      // Pode não existir
    }
    await prisma.$executeRaw`CREATE TYPE "UserRole" AS ENUM ('admin', 'usuario');`;
    console.log("✓ Enum UserRole criado");

    console.log("Criando tabela User correta...");
    await prisma.$executeRaw`
      CREATE TABLE "User" (
        "id" SERIAL NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "nome" TEXT NOT NULL,
        "role" "UserRole" NOT NULL DEFAULT 'usuario',
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
    `;
    console.log("✓ Tabela User criada");

    await prisma.$executeRaw`CREATE UNIQUE INDEX "User_email_key" ON "User"("email");`;
    console.log("✓ Índice User email criado");

  } catch (error) {
    console.error("Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();