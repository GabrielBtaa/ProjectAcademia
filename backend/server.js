import "./lib/load-env.js";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./lib/prisma.js";

const app = express();

const corsOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : true;

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }
    req.user = user;
    next();
  });
}

// Função para criar usuário admin se não existir
async function ensureAdminUser() {
  try {
    // Criar tabela User se não existir
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" SERIAL NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "nome" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'USER',

        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
    `;

    // Criar índice único no email se não existir
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
    `;

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
      console.log("Usuário administrador criado");
    }
  } catch (error) {
    console.error("Erro ao criar admin:", error);
  }
}

function toDateOnly(d) {
  return d.toISOString().slice(0, 10);
}

function avatarFromNome(nome) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first[0] + last).toUpperCase();
}

function serializePlano(p) {
  return {
    id: p.id,
    nome: p.nome,
    duracao: p.duracao,
    valor: Number(p.valor),
    descricao: p.descricao,
  };
}

function serializeAluno(a) {
  return {
    id: a.id,
    nome: a.nome,
    cpf: a.cpf,
    whatsapp: a.whatsapp,
    dataNascimento: toDateOnly(a.dataNascimento),
    dataVencimento: toDateOnly(a.dataVencimento),
    dataCadastro: toDateOnly(a.dataCadastro),
    status: a.status,
    planoId: a.planoId,
    plano: a.plano?.nome,
    avatar: a.avatar || avatarFromNome(a.nome),
  };
}

app.get("/api/health", async (req, res) => {
  try {
    await ensureAdminUser();
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, message: "Backend rodando", db: true });
  } catch {
    res.status(503).json({ ok: false, message: "Backend rodando", db: false });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password, nome } = req.body || {};

  if (!email || !password || !nome) {
    return res.status(400).json({ error: "Email, senha e nome são obrigatórios" });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nome,
        role: "usuario"
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/api/auth/verify", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
});

app.get("/api/planos", async (req, res) => {
  try {
    const planos = await prisma.plano.findMany({ orderBy: { id: "asc" } });
    res.json(planos.map(serializePlano));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar planos" });
  }
});

app.post("/api/planos", async (req, res) => {
  const { nome, duracao, valor, descricao } = req.body || {};
  if (!nome || !duracao || !valor) {
    return res.status(400).json({ error: "Nome, duração e valor são obrigatórios" });
  }
  try {
    const created = await prisma.plano.create({
      data: {
        nome: String(nome),
        duracao: Number(duracao),
        valor: Number(valor),
        descricao: descricao ? String(descricao) : null,
      },
    });
    res.status(201).json(serializePlano(created));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar plano" });
  }
});

app.put("/api/planos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, duracao, valor, descricao } = req.body || {};
  if (!Number.isFinite(id) || !nome || !duracao || !valor) {
    return res.status(400).json({ error: "ID, nome, duração e valor são obrigatórios" });
  }
  try {
    const updated = await prisma.plano.update({
      where: { id },
      data: {
        nome: String(nome),
        duracao: Number(duracao),
        valor: Number(valor),
        descricao: descricao ? String(descricao) : null,
      },
    });
    res.json(serializePlano(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar plano" });
  }
});

app.delete("/api/planos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
  try {
    await prisma.plano.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir plano" });
  }
});

app.get("/api/alunos", async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany({
      include: { plano: true },
      orderBy: { id: "asc" },
    });
    res.json(alunos.map(serializeAluno));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar alunos" });
  }
});

app.post("/api/alunos", async (req, res) => {
  const { nome, cpf, whatsapp, dataNascimento, planoId, dataVencimento, status } = req.body || {};
  if (!nome || !cpf || !whatsapp || !dataNascimento || !planoId || !dataVencimento) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }
  try {
    const created = await prisma.aluno.create({
      data: {
        nome: String(nome),
        cpf: String(cpf),
        whatsapp: String(whatsapp),
        dataNascimento: new Date(String(dataNascimento) + "T12:00:00"),
        dataVencimento: new Date(String(dataVencimento) + "T12:00:00"),
        planoId: Number(planoId),
        status: status || "ativo",
        avatar: avatarFromNome(String(nome)),
      },
      include: { plano: true },
    });
    res.status(201).json(serializeAluno(created));
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(400).json({ error: "CPF já cadastrado" });
    }
    console.error(e);
    res.status(500).json({ error: "Erro ao criar aluno" });
  }
});

app.put("/api/alunos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
  const { nome, cpf, whatsapp, dataNascimento, planoId, dataVencimento, status } = req.body || {};
  if (!nome || !cpf || !whatsapp || !dataNascimento || !planoId || !dataVencimento) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }
  try {
    const updated = await prisma.aluno.update({
      where: { id },
      data: {
        nome: String(nome),
        cpf: String(cpf),
        whatsapp: String(whatsapp),
        dataNascimento: new Date(String(dataNascimento) + "T12:00:00"),
        dataVencimento: new Date(String(dataVencimento) + "T12:00:00"),
        planoId: Number(planoId),
        status: status || "ativo",
        avatar: avatarFromNome(String(nome)),
      },
      include: { plano: true },
    });
    res.json(serializeAluno(updated));
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(400).json({ error: "CPF já cadastrado" });
    }
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Aluno não encontrado" });
    }
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar aluno" });
  }
});

app.delete("/api/alunos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
  try {
    await prisma.aluno.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Aluno não encontrado" });
    }
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir aluno" });
  }
});

app.get("/api/pagamentos", async (req, res) => {
  try {
    const pagamentos = await prisma.pagamento.findMany({
      include: {
        aluno: {
          include: { plano: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(pagamentos.map((p) => ({
      ...p,
      valor: Number(p.valor),
    })));
  } catch (e) {
    console.error(e);
    if (e.code === "P2021") {
      return res.json([]);
    }
    res.status(500).json({ error: "Erro ao buscar pagamentos" });
  }
});

app.post("/api/pagamentos", async (req, res) => {
  const { valor, data, status, metodo, alunoId } = req.body;
  if (!valor || !data || !alunoId) {
    return res.status(400).json({ error: "Valor, data e alunoId são obrigatórios" });
  }
  try {
    const created = await prisma.pagamento.create({
      data: {
        valor: Number(valor),
        data: new Date(String(data) + "T12:00:00"),
        status: status || "pendente",
        metodo: metodo || "PIX",
        alunoId: Number(alunoId),
      },
      include: {
        aluno: {
          include: { plano: true },
        },
      },
    });
    res.status(201).json({ ...created, valor: Number(created.valor) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API em http://localhost:${PORT}`);
});
