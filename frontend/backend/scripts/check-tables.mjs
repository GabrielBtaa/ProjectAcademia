import { prisma } from '../lib/prisma.js';

async function main() {
  try {
    const tables = await prisma.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('Pagamento','Aluno','User','Plano')"
    );
    console.log(tables);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();