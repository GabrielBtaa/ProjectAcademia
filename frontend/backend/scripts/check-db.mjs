import "../lib/load-env.js";
import { PrismaClient } from "@prisma/client";

function maskUrl(url) {
  return url.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@)/i, "$1***$3");
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "DATABASE_URL não encontrada.\n" +
      "Crie o arquivo backend/backend/.env com DATABASE_URL=... (veja .env.example)"
  );
  process.exit(1);
}

console.log("DATABASE_URL (mascarada):", maskUrl(process.env.DATABASE_URL));

const prisma = new PrismaClient({ log: ["error"] });

try {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log("Conexão OK com o Postgres (Supabase).");
} catch (e) {
  const msg = e.message || String(e);
  console.error("\nFalha ao conectar:\n", msg, "\n");

  if (/certificate|SSL|TLS|self signed/i.test(msg)) {
    console.error(
      "Dica: acrescente no final da URL: ?sslmode=require (ou confirme se o Supabase já inclui sslmode)."
    );
  }
  if (/P1001|Can't reach database|ECONNREFUSED|ENOTFOUND|getaddrinfo/i.test(msg)) {
    console.error(
      "Dica: host ou rede — confira se a URL é a de Direct (porta 5432, host db.xxxxx.supabase.co).\n" +
        "Se estiver na rede escolar/empresa, firewall pode bloquear a porta 5432."
    );
  }
  if (/password authentication failed|28P01/i.test(msg)) {
    console.error(
      "Dica: senha errada ou usuário errado. No Supabase use a senha do banco (Database password), não a senha da conta.\n" +
        "Caracteres especiais na senha precisam estar codificados na URL (ex.: @ vira %40)."
    );
  }
  if (/pgbouncer|prepared statements|26000/i.test(msg)) {
    console.error(
      'Dica: se a URL usa pooler na porta 6543 (Transaction), acrescente ?pgbouncer=true na DATABASE_URL\n' +
        "ou use a string \"Direct connection\" na porta 5432."
    );
  }

  process.exit(1);
} finally {
  await prisma.$disconnect();
}
