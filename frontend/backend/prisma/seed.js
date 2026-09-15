import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PLANOS = [
  { nome: "Mensal", duracao: 1, valor: 89.9, descricao: "Acesso ilimitado por 1 mês" },
  { nome: "Trimestral", duracao: 3, valor: 239.7, descricao: "Acesso ilimitado por 3 meses" },
  { nome: "Semestral", duracao: 6, valor: 429.0, descricao: "Acesso ilimitado por 6 meses" },
  { nome: "Anual", duracao: 12, valor: 779.0, descricao: "Acesso ilimitado por 12 meses" },
];

async function main() {
  // Criar planos se não existirem
  const countPlanos = await prisma.plano.count();
  if (countPlanos === 0) {
    await prisma.plano.createMany({ data: PLANOS });
  }

  // Criar usuário administrador se não existir
  const adminExists = await prisma.user.findFirst({
    where: { email: "admin@academia.com" }
  });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: "admin@academia.com",
        password: hashedPassword,
        role: "admin",
        nome: "Administrador"
      }
    });
    console.log("Usuário administrador criado: admin@academia.com / admin123");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
