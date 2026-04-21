import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLANOS = [
  { nome: "Mensal", duracao: 1, valor: 89.9, descricao: "Acesso ilimitado por 1 mês" },
  { nome: "Trimestral", duracao: 3, valor: 239.7, descricao: "Acesso ilimitado por 3 meses" },
  { nome: "Semestral", duracao: 6, valor: 429.0, descricao: "Acesso ilimitado por 6 meses" },
  { nome: "Anual", duracao: 12, valor: 779.0, descricao: "Acesso ilimitado por 12 meses" },
];

async function main() {
  const count = await prisma.plano.count();
  if (count > 0) return;

  await prisma.plano.createMany({ data: PLANOS });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
