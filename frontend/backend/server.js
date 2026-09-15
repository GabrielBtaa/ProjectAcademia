import "./lib/load-env.js";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./lib/prisma.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? require("stripe")(process.env.STRIPE_SECRET_KEY)
  : null;

const app = express();

const corsOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : true;

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

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

function serializePagamento(p) {
  return {
    id: p.id,
    valor: Number(p.valor),
    data: toDateOnly(p.data),
    status: p.status,
    metodo: p.metodo,
    alunoId: p.alunoId,
    aluno: p.aluno
      ? {
          id: p.aluno.id,
          nome: p.aluno.nome,
          status: p.aluno.status,
          dataVencimento: toDateOnly(p.aluno.dataVencimento),
          plano: p.aluno.plano ? { id: p.aluno.plano.id, nome: p.aluno.plano.nome } : undefined,
        }
      : undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
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
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nome,
        role: "usuario",
        subscriptionStatus: "trial",
        subscriptionTier: "pro",
        maxAlunos: 9999,
        trialEndsAt,
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

app.put("/api/auth/senha", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token não fornecido" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const { senhaAtual, novaSenha } = req.body || {};
    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
    }
    if (String(novaSenha).length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter ao menos 6 caracteres" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const validPassword = bcrypt.compareSync(String(senhaAtual), user.password);
    if (!validPassword) return res.status(401).json({ error: "Senha atual incorreta" });

    const hashedPassword = bcrypt.hashSync(String(novaSenha), 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

    return res.json({ ok: true });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    return res.status(500).json({ error: "Falha ao alterar senha" });
  }
});

const LIMITES_POR_PLANO = { starter: 50, pro: 100, business: 250 };

async function requireActiveSubscription(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(401).json({ error: "Usuário não encontrado" });
    if (user.role === "admin" || user.subscriptionStatus === "active") {
      req.currentUser = user;
      return next();
    }
    if (user.subscriptionStatus === "trial") {
      const aindaValido = user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
      if (aindaValido) {
        req.currentUser = user;
        return next();
      }
      await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: "inactive" } });
    }
    return res.status(402).json({ error: "Seu período de teste acabou. Escolha um plano para continuar.", code: "SUBSCRIPTION_REQUIRED" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao verificar assinatura" });
  }
}

// Todas as rotas abaixo exigem um token válido (login) — dados de alunos,
// planos e pagamentos nunca devem ficar acessíveis sem autenticação.
app.use("/api/planos", authenticateToken, requireActiveSubscription);
app.use("/api/alunos", authenticateToken, requireActiveSubscription);
app.use("/api/pagamentos", authenticateToken, requireActiveSubscription);
app.use("/api/notificacoes", authenticateToken, requireActiveSubscription);

app.get("/api/planos", async (req, res) => {
  try {
    const planos = await prisma.plano.findMany({ where: { ownerId: req.user.id }, orderBy: { id: "asc" } });
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
        ownerId: req.user.id,
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
    const existente = await prisma.plano.findFirst({ where: { id, ownerId: req.user.id } });
    if (!existente) return res.status(404).json({ error: "Plano não encontrado" });
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
    const existente = await prisma.plano.findFirst({ where: { id, ownerId: req.user.id } });
    if (!existente) return res.status(404).json({ error: "Plano não encontrado" });
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
      where: { ownerId: req.user.id },
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
    if (req.currentUser.role !== "admin") {
      const totalAtual = await prisma.aluno.count({ where: { ownerId: req.user.id } });
      if (totalAtual >= req.currentUser.maxAlunos) {
        return res.status(402).json({ error: `Limite do seu plano atingido (${req.currentUser.maxAlunos} alunos). Faça upgrade para cadastrar mais.`, code: "LIMIT_REACHED" });
      }
    }
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
        ownerId: req.user.id,
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
    const existente = await prisma.aluno.findFirst({ where: { id, ownerId: req.user.id } });
    if (!existente) return res.status(404).json({ error: "Aluno não encontrado" });
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
    const existente = await prisma.aluno.findFirst({ where: { id, ownerId: req.user.id } });
    if (!existente) return res.status(404).json({ error: "Aluno não encontrado" });
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
      where: { aluno: { ownerId: req.user.id } },
      include: {
        aluno: {
          include: { plano: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(pagamentos.map(serializePagamento));
  } catch (e) {
    console.error(e);
    if (e.code === "P2021") {
      return res.json([]);
    }
    res.status(500).json({ error: "Erro ao buscar pagamentos" });
  }
});

function addMeses(date, meses) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Number(meses));
  return d;
}

// Registrar pagamento: cria o registro e, quando confirmado, estende a
// dataVencimento do aluno de acordo com a duração do plano e reativa o status.
app.post("/api/pagamentos", async (req, res) => {
  const { valor, data, status, metodo, alunoId } = req.body || {};
  if (!valor || !data || !alunoId) {
    return res.status(400).json({ error: "Valor, data e alunoId são obrigatórios" });
  }
  const statusPagamento = status || "confirmado";

  try {
    const alunoDoDono = await prisma.aluno.findFirst({ where: { id: Number(alunoId), ownerId: req.user.id } });
    if (!alunoDoDono) return res.status(404).json({ error: "Aluno não encontrado" });
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.pagamento.create({
        data: {
          valor: Number(valor),
          data: new Date(String(data) + "T12:00:00"),
          status: statusPagamento,
          metodo: metodo || "PIX",
          alunoId: Number(alunoId),
        },
        include: { aluno: { include: { plano: true } } },
      });

      if (statusPagamento === "confirmado") {
        const aluno = created.aluno;
        const plano = aluno.plano;
        const hoje = new Date(new Date().toISOString().slice(0, 10) + "T12:00:00");
        const vencimentoAtual = new Date(aluno.dataVencimento);
        const baseData = vencimentoAtual > hoje ? vencimentoAtual : hoje;
        const novaDataVencimento = addMeses(baseData, plano.duracao);

        await tx.aluno.update({
          where: { id: aluno.id },
          data: { status: "ativo", dataVencimento: novaDataVencimento },
        });

        created.aluno.status = "ativo";
        created.aluno.dataVencimento = novaDataVencimento;
      }

      return created;
    });

    res.status(201).json(serializePagamento(result));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

// Excluir/estornar um pagamento
app.delete("/api/pagamentos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
  try {
    const existente = await prisma.pagamento.findFirst({ where: { id, aluno: { ownerId: req.user.id } } });
    if (!existente) return res.status(404).json({ error: "Pagamento não encontrado" });
    await prisma.pagamento.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Pagamento não encontrado" });
    }
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir pagamento" });
  }
});

// ===== Notificações =====
app.get("/api/notificacoes", async (req, res) => {
  try {
    const hoje = new Date(new Date().toISOString().slice(0, 10) + "T12:00:00");
    const em5dias = new Date(hoje);
    em5dias.setDate(em5dias.getDate() + 5);

    const [alunos, pagamentosPendentes] = await Promise.all([
      prisma.aluno.findMany({ where: { ownerId: req.user.id }, include: { plano: true } }),
      prisma.pagamento.findMany({
        where: { status: "pendente", aluno: { ownerId: req.user.id } },
        include: { aluno: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const notificacoes = [];

    for (const aluno of alunos) {
      const vencimento = new Date(aluno.dataVencimento);
      if (vencimento < hoje) {
        notificacoes.push({
          id: `vencido-${aluno.id}`,
          tipo: "vencido",
          alunoId: aluno.id,
          titulo: `${aluno.nome} está com a mensalidade vencida`,
          data: toDateOnly(aluno.dataVencimento),
        });
      } else if (vencimento <= em5dias) {
        notificacoes.push({
          id: `vencendo-${aluno.id}`,
          tipo: "vencendo",
          alunoId: aluno.id,
          titulo: `${aluno.nome} vence em breve (${toDateOnly(aluno.dataVencimento)})`,
          data: toDateOnly(aluno.dataVencimento),
        });
      }
    }

    for (const p of pagamentosPendentes) {
      notificacoes.push({
        id: `pendente-${p.id}`,
        tipo: "pendente",
        alunoId: p.alunoId,
        pagamentoId: p.id,
        titulo: `Pagamento pendente de ${p.aluno?.nome || "aluno"}`,
        data: toDateOnly(p.data),
      });
    }

    const ordem = { vencido: 0, pendente: 1, vencendo: 2 };
    notificacoes.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);

    res.json({ total: notificacoes.length, notificacoes });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar notificações" });
  }
});

// ===== Billing (Stripe) =====
const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

app.get("/api/conta/academia", authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  res.json({
    nomeAcademia: user.nomeAcademia || "",
    cnpjAcademia: user.cnpjAcademia || "",
    telefoneAcademia: user.telefoneAcademia || "",
    enderecoAcademia: user.enderecoAcademia || "",
  });
});

app.put("/api/conta/academia", authenticateToken, async (req, res) => {
  const { nomeAcademia, cnpjAcademia, telefoneAcademia, enderecoAcademia } = req.body || {};
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        nomeAcademia: nomeAcademia ?? undefined,
        cnpjAcademia: cnpjAcademia ?? undefined,
        telefoneAcademia: telefoneAcademia ?? undefined,
        enderecoAcademia: enderecoAcademia ?? undefined,
      },
    });
    res.json({
      nomeAcademia: updated.nomeAcademia || "",
      cnpjAcademia: updated.cnpjAcademia || "",
      telefoneAcademia: updated.telefoneAcademia || "",
      enderecoAcademia: updated.enderecoAcademia || "",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao salvar dados da academia" });
  }
});

app.get("/api/billing/status", authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  const trialExpirado = user.subscriptionStatus === "trial" && (!user.trialEndsAt || new Date(user.trialEndsAt) <= new Date());
  res.json({
    subscriptionStatus: trialExpirado ? "inactive" : user.subscriptionStatus,
    subscriptionTier: user.subscriptionTier,
    maxAlunos: user.maxAlunos,
    isAdmin: user.role === "admin",
    trialEndsAt: user.trialEndsAt,
  });
});

app.post("/api/billing/checkout", authenticateToken, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Pagamentos ainda não configurados no servidor" });
  const { plano } = req.body || {};
  const priceId = PRICE_IDS[plano];
  if (!priceId) return res.status(400).json({ error: "Plano inválido" });
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.nome });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }
    const origin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app?assinatura=sucesso`,
      cancel_url: `${origin}/app?assinatura=cancelada`,
      metadata: { userId: String(user.id), plano },
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao iniciar checkout" });
  }
});

app.post("/api/billing/webhook", async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Pagamentos ainda não configurados no servidor" });
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook inválido:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = Number(session.metadata?.userId);
      const plano = session.metadata?.plano;
      if (userId && plano && LIMITES_POR_PLANO[plano]) {
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: "active", subscriptionTier: plano, maxAlunos: LIMITES_POR_PLANO[plano] },
        });
      }
    }
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: sub.customer } });
      if (user) {
        const ativo = sub.status === "active" || sub.status === "trialing";
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: ativo ? "active" : (sub.status === "past_due" ? "past_due" : "canceled") },
        });
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error("Erro ao processar webhook:", e);
    res.status(500).json({ error: "Erro ao processar webhook" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API em http://localhost:${PORT}`);
});
