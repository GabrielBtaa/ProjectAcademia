import { prisma } from './lib/prisma.js';

async function test() {
  try {
    const pagamentos = await prisma.pagamento.findMany();
    console.log('Pagamentos:', pagamentos);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();