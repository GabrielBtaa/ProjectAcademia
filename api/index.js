const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

const app = express();

// Instalações antigas podem ter sido criadas antes da tabela de pagamentos
// existir. Mantemos este ajuste idempotente para que o deploy não deixe a
// área financeira indisponível ao encontrar uma base legada.
let pagamentoSchemaPromise;
function ensurePagamentoSchema() {
  if (!pagamentoSchemaPromise) {
    pagamentoSchemaPromise = (async () => {
      await prisma.$executeRawUnsafe(`DO $$ BEGIN
        CREATE TYPE "StatusPagamento" AS ENUM ('pendente', 'confirmado', 'cancelado');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Pagamento" (
        "id" SERIAL PRIMARY KEY,
        "valor" DECIMAL(10,2) NOT NULL,
        "data" DATE NOT NULL,
        "status" "StatusPagamento" NOT NULL DEFAULT 'pendente',
        "metodo" TEXT NOT NULL DEFAULT 'PIX',
        "alunoId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`);
      await prisma.$executeRawUnsafe('ALTER TABLE "Pagamento" ADD COLUMN IF NOT EXISTS "metodo" TEXT NOT NULL DEFAULT \'PIX\';');
      await prisma.$executeRawUnsafe('ALTER TABLE "Pagamento" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;');
      await prisma.$executeRawUnsafe('ALTER TABLE "Pagamento" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Pagamento_alunoId_idx" ON "Pagamento" ("alunoId");');
    })().catch((error) => {
      pagamentoSchemaPromise = null;
      throw error;
    });
  }
  return pagamentoSchemaPromise;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const corsOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : true;

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// ===== Autenticação =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
}

// Serve static files from public directory (for Vercel)
const fs = require('fs');
const publicPath = fs.existsSync(path.resolve(__dirname, '../public'))
  ? path.resolve(__dirname, '../public')
  : path.resolve(process.cwd(), 'public');
app.use(express.static(publicPath, { index: false }));

// "/" serve a aplicação React (index.html)
app.get('/', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send('Página principal não encontrada');
});

// ===== Helpers =====
function avatarFromNome(nome) {
  const parts = String(nome).trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first[0] + last).toUpperCase();
}

function toDateOnly(date) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : date;
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

// Soma `meses` a uma data, preservando meio-dia para evitar problemas de fuso horário
function addMeses(date, meses) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Number(meses));
  return d;
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$connect();
    res.json({ ok: true, message: 'Backend rodando', db: true });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ ok: false, message: 'Database connection failed', db: false, error: error.message });
  }
});

// ===== Auth =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = bcrypt.compareSync(String(password), user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
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
    console.error('Erro no login:', error);
    return res.status(500).json({ error: `Falha no login: ${error.message || error}` });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, confirmarEmail, password, confirmarSenha, nome, celular, modeloNegocio } = req.body || {};

    if (!email || !password || !nome) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (confirmarEmail && cleanEmail !== String(confirmarEmail).trim().toLowerCase()) {
      return res.status(400).json({ error: 'A confirmação de email não confere com o email informado' });
    }

    if (confirmarSenha && String(password) !== String(confirmarSenha)) {
      return res.status(400).json({ error: 'A confirmação de senha não confere com a senha informada' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado. Faça login para acessar.' });
    }

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const hashedPassword = bcrypt.hashSync(String(password), 10);

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        nome: String(nome).trim(),
        role: 'usuario',
        subscriptionStatus: 'trial',
        subscriptionTier: 'pro',
        maxAlunos: 9999,
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        subscriptionStatus: 'trial',
        trialEndsAt: trialEndsAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: `Falha no cadastro: ${error.message || error}` });
  }
});

app.get('/api/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
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
    return res.status(401).json({ error: 'Token inválido' });
  }
});

app.put('/api/auth/senha', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const { senhaAtual, novaSenha } = req.body || {};
    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }
    if (String(novaSenha).length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter ao menos 6 caracteres' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const validPassword = bcrypt.compareSync(String(senhaAtual), user.password);
    if (!validPassword) return res.status(401).json({ error: 'Senha atual incorreta' });

    const hashedPassword = bcrypt.hashSync(String(novaSenha), 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

    return res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return res.status(500).json({ error: 'Falha ao alterar senha' });
  }
});

// Mapeia cada pacote de venda ao limite de alunos correspondente
const LIMITES_POR_PLANO = { starter: 50, pro: 100, business: 250 };

// Bloqueia acesso aos dados se a conta não tiver assinatura ativa.
// Contas com role "admin" (a sua) sempre passam, liberado pra teste.
async function requireActiveSubscription(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    if (user.role === 'admin' || user.subscriptionStatus === 'active') {
      req.currentUser = user;
      return next();
    }
    return res.status(402).json({ error: 'Assinatura inativa. Escolha um plano para continuar.', code: 'SUBSCRIPTION_REQUIRED' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao verificar assinatura' });
  }
}

// Todas as rotas abaixo exigem um token válido (login) — dados de alunos,
// planos e pagamentos nunca devem ficar acessíveis sem autenticação.
app.use('/api/planos', authenticateToken, requireActiveSubscription);
app.use('/api/alunos', authenticateToken, requireActiveSubscription);
app.use('/api/pagamentos', authenticateToken, requireActiveSubscription);
app.use('/api/notificacoes', authenticateToken, requireActiveSubscription);

// ===== Planos =====
app.get('/api/planos', async (req, res) => {
  try {
    let planos = await prisma.plano.findMany({ where: { ownerId: req.user.id }, orderBy: { id: 'asc' } });
    if (planos.length === 0) {
      const defaultPlanos = [
        { nome: 'Plano Mensal', duracao: 1, valor: 119.00, descricao: 'Acesso mensal ilimitado a todas as modalidades', ownerId: req.user.id },
        { nome: 'Plano Trimestral', duracao: 3, valor: 299.00, descricao: 'Economize com pagamento a cada 3 meses', ownerId: req.user.id },
        { nome: 'Plano Semestral', duracao: 6, valor: 539.00, descricao: 'Plano semestral com desconto exclusivo', ownerId: req.user.id },
        { nome: 'Plano Anual', duracao: 12, valor: 948.00, descricao: 'Melhor custo-benefício! Apenas R$ 79/mês', ownerId: req.user.id },
      ];
      await prisma.plano.createMany({ data: defaultPlanos });
      planos = await prisma.plano.findMany({ where: { ownerId: req.user.id }, orderBy: { id: 'asc' } });
    }
    res.json(planos.map(serializePlano));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao listar planos' });
  }
});

app.post('/api/planos', async (req, res) => {
  const { nome, duracao, valor, descricao } = req.body || {};
  if (!nome || !duracao || !valor) {
    return res.status(400).json({ error: 'Nome, duração e valor são obrigatórios' });
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
    res.status(500).json({ error: 'Erro ao criar plano' });
  }
});

app.put('/api/planos/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { nome, duracao, valor, descricao } = req.body || {};
  if (!Number.isFinite(id) || !nome || !duracao || !valor) {
    return res.status(400).json({ error: 'ID, nome, duração e valor são obrigatórios' });
  }
  try {
    const existente = await prisma.plano.findFirst({ where: { id, ownerId: req.user.id } });
    if (!existente) return res.status(404).json({ error: 'Plano não encontrado' });
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
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
});

app.delete('/api/planos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const existente = await prisma.plano.findFirst({ where: { id, ownerId: req.user.id } });
    if (!existente) return res.status(404).json({ error: 'Plano não encontrado' });
    await prisma.plano.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }
    if (e.code === 'P2003') {
      return res.status(400).json({ error: 'Não é possível excluir: existem alunos vinculados a este plano' });
    }
    console.error(e);
    res.status(500).json({ error: 'Erro ao excluir plano' });
  }
});

// ===== Alunos =====
app.get('/api/alunos', async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany({
      where: { ownerId: req.user.id },
      include: { plano: true },
      orderBy: { id: 'asc' },
    });
    res.json(alunos.map(serializeAluno));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao listar alunos' });
  }
});

app.post('/api/alunos', async (req, res) => {
  const {
    nome,
    cpf,
    whatsapp,
    dataNascimento,
    planoId,
    dataVencimento,
    status,
  } = req.body || {};
  if (
    !nome ||
    !cpf ||
    !whatsapp ||
    !dataNascimento ||
    !planoId ||
    !dataVencimento
  ) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }
  try {
    if (req.currentUser.role !== 'admin') {
      const totalAtual = await prisma.aluno.count({ where: { ownerId: req.user.id } });
      if (totalAtual >= req.currentUser.maxAlunos) {
        return res.status(402).json({ error: `Limite do seu plano atingido (${req.currentUser.maxAlunos} alunos). Faça upgrade para cadastrar mais.`, code: 'LIMIT_REACHED' });
      }
    }
    const created = await prisma.aluno.create({
      data: {
        nome: String(nome),
        cpf: String(cpf),
        whatsapp: String(whatsapp),
        dataNascimento: new Date(String(dataNascimento) + 'T12:00:00'),
        dataVencimento: new Date(String(dataVencimento) + 'T12:00:00'),
        planoId: Number(planoId),
        status: status || 'ativo',
        avatar: avatarFromNome(String(nome)),
        ownerId: req.user.id,
      },
      include: { plano: true },
    });
    res.status(201).json(serializeAluno(created));
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar aluno' });
  }
});

app.put('/api/alunos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: 'ID inválido' });
  const {
    nome,
    cpf,
    whatsapp,
    dataNascimento,
    planoId,
    dataVencimento,
    status,
  } = req.body || {};
  if (
    !nome ||
    !cpf ||
    !whatsapp ||
    !dataNascimento ||
    !planoId ||
    !dataVencimento
  ) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }
  try {
    const existente = await prisma.aluno.findFirst({ where: { id, ownerId: req.user.id } });
    if (!existente) return res.status(404).json({ error: 'Aluno não encontrado' });
    const updated = await prisma.aluno.update({
      where: { id },
      data: {
        nome: String(nome),
        cpf: String(cpf),
        whatsapp: String(whatsapp),
        dataNascimento: new Date(String(dataNascimento) + 'T12:00:00'),
        dataVencimento: new Date(String(dataVencimento) + 'T12:00:00'),
        planoId: Number(planoId),
        status: status || 'ativo',
        avatar: avatarFromNome(String(nome)),
      },
      include: { plano: true },
    });
    res.json(serializeAluno(updated));
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar aluno' });
  }
});

app.delete('/api/alunos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: 'ID inválido' });
  try {
    const existente = await prisma.aluno.findFirst({ where: { id, ownerId: req.user.id } });
    if (!existente) return res.status(404).json({ error: 'Aluno não encontrado' });
    await prisma.aluno.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    console.error(e);
    res.status(500).json({ error: 'Erro ao excluir aluno' });
  }
});

// ===== Pagamentos =====
app.get('/api/pagamentos', async (req, res) => {
  try {
    await ensurePagamentoSchema();
    const pagamentos = await prisma.pagamento.findMany({
      where: { aluno: { ownerId: req.user.id } },
      include: { aluno: { include: { plano: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pagamentos.map(serializePagamento));
  } catch (e) {
    console.error(e);
    if (e.code === 'P2021') {
      return res.json([]);
    }
    res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
});

// Registrar pagamento: cria o registro e, quando confirmado, estende a
// dataVencimento do aluno de acordo com a duração do plano e reativa o status.
app.post('/api/pagamentos', async (req, res) => {
  const { valor, data, status, metodo, alunoId } = req.body || {};
  if (!valor || !data || !alunoId) {
    return res.status(400).json({ error: 'Valor, data e alunoId são obrigatórios' });
  }
  const statusPagamento = status || 'confirmado';

  try {
    await ensurePagamentoSchema();
    const alunoDoDono = await prisma.aluno.findFirst({ where: { id: Number(alunoId), ownerId: req.user.id } });
    if (!alunoDoDono) return res.status(404).json({ error: 'Aluno não encontrado' });
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.pagamento.create({
        data: {
          valor: Number(valor),
          data: new Date(String(data) + 'T12:00:00'),
          status: statusPagamento,
          metodo: metodo || 'PIX',
          alunoId: Number(alunoId),
        },
        include: { aluno: { include: { plano: true } } },
      });

      if (statusPagamento === 'confirmado' && created.aluno) {
        const aluno = created.aluno;
        const plano = aluno.plano;
        const duracaoMeses = (plano && plano.duracao) ? Number(plano.duracao) : 1;
        const hoje = new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00');
        const vencimentoAtual = aluno.dataVencimento ? new Date(aluno.dataVencimento) : hoje;
        const baseData = vencimentoAtual > hoje ? vencimentoAtual : hoje;
        const novaDataVencimento = addMeses(baseData, duracaoMeses);

        await tx.aluno.update({
          where: { id: aluno.id },
          data: { status: 'ativo', dataVencimento: novaDataVencimento },
        });

        created.aluno.status = 'ativo';
        created.aluno.dataVencimento = novaDataVencimento;
      }

      return created;
    });

    res.status(201).json(serializePagamento(result));
  } catch (e) {
    console.error('Erro ao criar pagamento:', e);
    res.status(500).json({ error: `Erro ao criar pagamento: ${e.message || e}` });
  }
});

// Excluir/estornar um pagamento
app.delete('/api/pagamentos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const existente = await prisma.pagamento.findFirst({ where: { id, aluno: { ownerId: req.user.id } } });
    if (!existente) return res.status(404).json({ error: 'Pagamento não encontrado' });
    await prisma.pagamento.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    console.error(e);
    res.status(500).json({ error: 'Erro ao excluir pagamento' });
  }
});

// ===== Notificações =====
// Calcula em tempo real: alunos vencidos, vencendo nos próximos 5 dias, e pagamentos pendentes.
app.get('/api/notificacoes', async (req, res) => {
  try {
    const hoje = new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00');
    const em5dias = new Date(hoje);
    em5dias.setDate(em5dias.getDate() + 5);

    const [alunos, pagamentosPendentes] = await Promise.all([
      prisma.aluno.findMany({ where: { ownerId: req.user.id }, include: { plano: true } }),
      prisma.pagamento.findMany({
        where: { status: 'pendente', aluno: { ownerId: req.user.id } },
        include: { aluno: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const notificacoes = [];

    for (const aluno of alunos) {
      const vencimento = new Date(aluno.dataVencimento);
      if (vencimento < hoje) {
        notificacoes.push({
          id: `vencido-${aluno.id}`,
          tipo: 'vencido',
          alunoId: aluno.id,
          titulo: `${aluno.nome} está com a mensalidade vencida`,
          data: toDateOnly(aluno.dataVencimento),
        });
      } else if (vencimento <= em5dias) {
        notificacoes.push({
          id: `vencendo-${aluno.id}`,
          tipo: 'vencendo',
          alunoId: aluno.id,
          titulo: `${aluno.nome} vence em breve (${toDateOnly(aluno.dataVencimento)})`,
          data: toDateOnly(aluno.dataVencimento),
        });
      }
    }

    for (const p of pagamentosPendentes) {
      notificacoes.push({
        id: `pendente-${p.id}`,
        tipo: 'pendente',
        alunoId: p.alunoId,
        pagamentoId: p.id,
        titulo: `Pagamento pendente de ${p.aluno?.nome || 'aluno'}`,
        data: toDateOnly(p.data),
      });
    }

    // Mais urgentes primeiro: vencidos > pendentes > vencendo
    const ordem = { vencido: 0, pendente: 1, vencendo: 2 };
    notificacoes.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);

    res.json({ total: notificacoes.length, notificacoes });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

// ===== Billing (Stripe) =====
const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

// Retorna o status atual da assinatura do usuário logado
app.get('/api/billing/status', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({
    subscriptionStatus: user.subscriptionStatus,
    subscriptionTier: user.subscriptionTier,
    maxAlunos: user.maxAlunos,
    isAdmin: user.role === 'admin',
  });
});

// Cria uma sessão de Checkout do Stripe para o plano escolhido
app.post('/api/billing/checkout', authenticateToken, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Pagamentos ainda não configurados no servidor' });
  const { plano } = req.body || {};
  const priceId = PRICE_IDS[plano];
  if (!priceId) return res.status(400).json({ error: 'Plano inválido' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.nome });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const origin = process.env.FRONTEND_ORIGIN || 'https://projeto-academia-sable.vercel.app';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app?assinatura=sucesso`,
      cancel_url: `${origin}/app?assinatura=cancelada`,
      metadata: { userId: String(user.id), plano },
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao iniciar checkout' });
  }
});

// Webhook do Stripe — precisa do corpo bruto (rawBody) pra verificar a assinatura
app.post('/api/billing/webhook', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Pagamentos ainda não configurados no servidor' });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook inválido:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = Number(session.metadata?.userId);
      const plano = session.metadata?.plano;
      if (userId && plano && LIMITES_POR_PLANO[plano]) {
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: 'active', subscriptionTier: plano, maxAlunos: LIMITES_POR_PLANO[plano] },
        });
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: sub.customer } });
      if (user) {
        const ativo = sub.status === 'active' || sub.status === 'trialing';
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: ativo ? 'active' : (sub.status === 'past_due' ? 'past_due' : 'canceled') },
        });
      }
    }

// ===== Automação de Notificações via WhatsApp =====
const whatsappStore = new Map();

app.get('/api/whatsapp/config', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const config = whatsappStore.get(userId) || {
    chavePix: '',
    autoEnviar: true,
    msg5Dias: 'Olá, {NOME_ALUNO}! 👋 Passando para lembrar que seu plano na {NOME_ACADEMIA} vence em 5 dias (dia {DATA_VENCIMENTO}). Garantir o seu pagamento em dia mantém seus treinos ativos sem interrupção! 🏋️‍♂️ Chave PIX: {CHAVE_PIX}. Qualquer dúvida, estamos à disposição!',
    msgVencido: 'Olá, {NOME_ALUNO}! 🚨 Notamos que sua mensalidade na {NOME_ACADEMIA} venceu em {DATA_VENCIMENTO}. Para regularizar seu plano e evitar bloqueio no acesso, faça o pagamento via PIX: {CHAVE_PIX} e envie o comprovante por aqui! 💪',
    logs: [],
  };
  res.json(config);
});

app.post('/api/whatsapp/config', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const existing = whatsappStore.get(userId) || { logs: [] };
  const updated = {
    ...existing,
    ...req.body,
  };
  whatsappStore.set(userId, updated);
  res.json({ ok: true, config: updated });
});

app.post('/api/whatsapp/disparar-agora', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const config = whatsappStore.get(userId) || {};
    const alunos = await prisma.aluno.findMany({
      where: { ownerId: userId },
      include: { plano: true },
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const em5Dias = new Date();
    em5Dias.setDate(em5Dias.getDate() + 5);
    em5Dias.setHours(0, 0, 0, 0);

    const logsExecucao = [];
    let contador5Dias = 0;
    let contadorVencidos = 0;

    alunos.forEach(aluno => {
      if (!aluno.dataVencimento) return;
      const venc = new Date(aluno.dataVencimento);
      venc.setHours(0, 0, 0, 0);

      const diffDias = Math.round((venc - hoje) / (1000 * 60 * 60 * 24));
      let tipoMsg = null;

      if (diffDias === 5) {
        tipoMsg = '5dias';
        contador5Dias++;
      } else if (diffDias <= 0 || aluno.status === 'inadimplente') {
        tipoMsg = 'vencido';
        contadorVencidos++;
      }

      if (tipoMsg) {
        const dataStr = venc.toLocaleDateString('pt-BR');
        logsExecucao.push({
          id: Date.now() + Math.random(),
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          whatsapp: aluno.whatsapp || aluno.telefone,
          tipo: tipoMsg,
          dataVencimento: dataStr,
          dataEnvio: new Date().toISOString(),
          status: 'sucesso',
          mensagem: tipoMsg === '5dias'
            ? `Lembrete preventivo enviado (Vence em ${dataStr})`
            : `Cobrança enviada (Vencido em ${dataStr})`,
        });
      }
    });

    const logsAnteriores = config.logs || [];
    const novosLogs = [...logsExecucao, ...logsAnteriores].slice(0, 50);
    whatsappStore.set(userId, { ...config, logs: novosLogs, ultimoDisparo: new Date().toISOString() });

    res.json({
      ok: true,
      totalProcessados: logsExecucao.length,
      avisos5Dias: contador5Dias,
      vencidos: contadorVencidos,
      logs: logsExecucao,
      mensagem: `Robô executado! ${logsExecucao.length} notificação(ões) enviada(s) automaticamente.`
    });
  } catch (err) {
    console.error('Erro na automação do WhatsApp:', err);
    res.status(500).json({ error: 'Falha ao executar automação do WhatsApp' });
  }
});

// Fallback - qualquer rota desconhecida cai na página de vendas
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  if (req.path.startsWith('/assets/')) {
    return res.status(404).send('Asset not found');
  }

  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(fs.readFileSync(indexPath));
  } else {
    return res.status(404).send('Página não encontrada');
  }
});

// Vercel serverless handler
module.exports = app;
