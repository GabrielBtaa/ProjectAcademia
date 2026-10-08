const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

const app = express();

// A Vercel roda a API atrás de um proxy reverso, que define o header X-Forwarded-For
// com o IP real de quem fez a requisição. Sem isso, o express-rate-limit não confia
// nesse header (por segurança, já que ele pode ser falsificado em outros ambientes) e
// lança um erro a cada requisição. "1" diz pra confiar apenas no primeiro proxy à frente
// (o da própria Vercel), que é o cenário correto aqui.
app.set('trust proxy', 1);

// Captura de erros em produção (opcional — só ativa se SENTRY_DSN estiver configurado).
// Sem a env var, isso é um no-op completo e não afeta nada.
let Sentry = null;
if (process.env.SENTRY_DSN) {
  Sentry = require('@sentry/node');
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}
// Loga no console (sempre) e manda pro Sentry também, se configurado. Usar esta função
// nos pontos mais críticos (login, pagamentos, cron) em vez de console.error puro.
function logErro(contexto, erro) {
  console.error(contexto, erro);
  if (Sentry) Sentry.captureException(erro, { extra: { contexto } });
}

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

// SEGURANÇA: nunca usar um segredo padrão previsível para assinar JWTs — isso permitiria
// que qualquer pessoa forje tokens válidos. Se a env var não estiver configurada, geramos
// um segredo aleatório em memória (o efeito colateral é que reiniciar o processo derruba
// sessões existentes, o que é um problema muito menor do que um segredo conhecido).
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
if (!process.env.JWT_SECRET) {
  console.error('[SEGURANÇA] JWT_SECRET não definido nas variáveis de ambiente — usando um segredo aleatório temporário. Configure JWT_SECRET na Vercel o quanto antes.');
}

// SEGURANÇA: nunca cair para "aceitar qualquer origem" — isso equivale a Origin: *
// em uma API que usa cookies/tokens. Se a variável não estiver configurada, usamos
// como allowlist só os domínios oficiais conhecidos do projeto.
const corsOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : ['https://projeto-academia-sable.vercel.app'];

if (!process.env.FRONTEND_ORIGIN) {
  console.error('[SEGURANÇA] FRONTEND_ORIGIN não definido — usando allowlist padrão restrita. Configure FRONTEND_ORIGIN na Vercel.');
}

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// Health check público (sem autenticação) para serviços de monitoramento externo
// (UptimeRobot, BetterStack, etc.) confirmarem que a API e o banco estão respondendo.
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: 'connected', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ok: false, db: 'disconnected', error: e.message });
  }
});

// SEGURANÇA: limita tentativas de login por IP (defesa básica contra brute-force
// distribuído). O bloqueio real, por conta, é feito abaixo via failedLoginAttempts/
// lockedUntil no banco — necessário porque funções serverless não compartilham
// memória entre execuções, então um limitador só em memória não seria confiável aqui.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

const MAX_TENTATIVAS_LOGIN = 5;
const DURACAO_BLOQUEIO_MS = 15 * 60 * 1000; // 15 minutos
// Hash "fantasma" usado para equalizar o tempo de resposta quando o e-mail não existe,
// evitando que a diferença de tempo (com bcrypt x sem bcrypt) revele quais e-mails
// estão cadastrados (timing attack de enumeração de usuários).
const HASH_FANTASMA = bcrypt.hashSync('senha_que_nunca_sera_usada', 10);

// ===== Autenticação =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    if (user?.jti) {
      try {
        const revogado = await prisma.tokenRevogado.findUnique({ where: { jti: user.jti } });
        if (revogado) {
          return res.status(401).json({ error: 'Sessão encerrada. Faça login novamente.' });
        }
      } catch (e) {
        console.error('Erro ao checar token revogado:', e);
        // Falha na checagem não deve travar todo o sistema; segue autenticado.
      }
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
    email: a.email || '',
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
app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    // Mensagem de erro sempre genérica (login e "conta bloqueada" usam o mesmo texto
    // de credenciais inválidas quando possível) para não revelar se o e-mail existe.
    const ERRO_GENERICO = { error: 'E-mail ou senha inválidos.' };

    if (user?.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      // Conta temporariamente bloqueada por excesso de tentativas — aqui sim avisamos
      // explicitamente, já que isso só é possível para contas que de fato existem e
      // o valor informativo para o dono legítimo da conta supera o pequeno vazamento.
      return res.status(429).json({ error: 'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em alguns minutos.' });
    }

    // Sempre roda o bcrypt (contra um hash real ou um "fantasma"), mesmo quando o
    // e-mail não existe, para que o tempo de resposta não denuncie quais contas existem.
    const validPassword = bcrypt.compareSync(String(password), user ? user.password : HASH_FANTASMA);

    if (!user || !validPassword) {
      if (user) {
        const tentativas = user.failedLoginAttempts + 1;
        const bloquear = tentativas >= MAX_TENTATIVAS_LOGIN;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: bloquear ? 0 : tentativas,
            lockedUntil: bloquear ? new Date(Date.now() + DURACAO_BLOQUEIO_MS) : null,
          },
        });
      }
      return res.status(401).json(ERRO_GENERICO);
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
    }
    // Não bloqueia o login por causa disso — atualização de "presença" é best-effort.
    prisma.user.update({ where: { id: user.id }, data: { ultimoAcessoEm: new Date() } }).catch(() => {});

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, jti },
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
    logErro('Erro no login', error);
    return res.status(500).json({ error: 'Erro interno. Tente novamente em instantes.' });
  }
});

// Invalida o token atual no servidor (logout real, não só "esquecer" o token no cliente).
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    if (req.user?.jti && req.user?.exp) {
      await prisma.tokenRevogado.upsert({
        where: { jti: req.user.jti },
        update: {},
        create: { jti: req.user.jti, expiraEm: new Date(req.user.exp * 1000) },
      });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao encerrar sessão' });
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
        trialEndsAt,
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, jti: crypto.randomUUID() },
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
    if (user.subscriptionStatus === 'trial') {
      const aindaValido = user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
      if (aindaValido) {
        req.currentUser = user;
        return next();
      }
      // Trial expirou: marca como inativo pra não checar de novo toda hora
      await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: 'inactive' } });
    }
    return res.status(402).json({ error: 'Seu período de teste acabou. Escolha um plano para continuar.', code: 'SUBSCRIPTION_REQUIRED' });
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

// ===== Importação de alunos via CSV =====
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB é mais que suficiente para uma planilha de alunos
});

// Parser de CSV simples e robusto (sem dependência externa), lida com campos entre aspas
// contendo vírgula, e aceita separador ; ou , (comum em CSV exportado do Excel PT-BR).
function parseCsvTexto(texto) {
  const linhasBrutas = texto.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
  if (linhasBrutas.length === 0) return { cabecalho: [], linhas: [] };

  const separador = linhasBrutas[0].includes(';') && !linhasBrutas[0].includes(',') ? ';' : ',';

  function parseLinha(linha) {
    const campos = [];
    let atual = '';
    let dentroAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') {
        dentroAspas = !dentroAspas;
      } else if (c === separador && !dentroAspas) {
        campos.push(atual.trim());
        atual = '';
      } else {
        atual += c;
      }
    }
    campos.push(atual.trim());
    return campos;
  }

  const cabecalho = parseLinha(linhasBrutas[0]).map(h => h.toLowerCase().trim());
  const linhas = linhasBrutas.slice(1).map(parseLinha);
  return { cabecalho, linhas };
}

// Aceita DD/MM/AAAA (padrão brasileiro) ou AAAA-MM-DD (ISO)
function parseDataFlexivel(str) {
  if (!str) return null;
  const s = str.trim();
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, d, m, a] = br;
    return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, a, m, d] = iso;
    return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

app.post('/api/alunos/importar-csv', uploadCsv.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado (campo esperado: "arquivo")' });
    }

    const texto = req.file.buffer.toString('utf-8');
    const { cabecalho, linhas } = parseCsvTexto(texto);

    const colunasEsperadas = ['nome', 'cpf', 'whatsapp', 'email', 'datanascimento', 'plano', 'datavencimento'];
    const indice = {};
    for (const col of colunasEsperadas) indice[col] = cabecalho.indexOf(col);

    if (indice.nome === -1 || indice.cpf === -1 || indice.whatsapp === -1 || indice.datanascimento === -1 || indice.plano === -1 || indice.datavencimento === -1) {
      return res.status(400).json({
        error: 'Cabeçalho do CSV inválido. Colunas obrigatórias: nome, cpf, whatsapp, dataNascimento, plano, dataVencimento (email é opcional).',
      });
    }

    // Limite do plano de assinatura: conta quantos alunos já existem + quantos essa
    // importação tentaria criar, e corta antes de estourar o limite do tier contratado.
    const usuario = await prisma.user.findUnique({ where: { id: req.user.id } });
    const totalAtual = await prisma.aluno.count({ where: { ownerId: req.user.id } });
    const limite = usuario?.maxAlunos ?? 9999;

    const planosDoUsuario = await prisma.plano.findMany({ where: { ownerId: req.user.id } });
    const planoPorNome = new Map(planosDoUsuario.map(p => [p.nome.trim().toLowerCase(), p]));

    const cpfsVistosNoArquivo = new Set();
    const relatorio = [];
    let criados = 0;

    for (let i = 0; i < linhas.length; i++) {
      const numeroLinha = i + 2; // +2: linha 1 é o cabeçalho, e planilhas contam a partir de 1
      const campos = linhas[i];
      const nome = campos[indice.nome]?.trim();
      const cpf = campos[indice.cpf]?.replace(/\D/g, '');
      const whatsapp = campos[indice.whatsapp]?.replace(/\D/g, '');
      const email = indice.email !== -1 ? campos[indice.email]?.trim() : '';
      const nomePlano = campos[indice.plano]?.trim();
      const dataNascStr = parseDataFlexivel(campos[indice.datanascimento]);
      const dataVencStr = parseDataFlexivel(campos[indice.datavencimento]);

      const erros = [];
      if (!nome) erros.push('nome é obrigatório');
      if (!cpf || cpf.length !== 11) erros.push('CPF inválido (precisa ter 11 dígitos)');
      if (!whatsapp) erros.push('WhatsApp é obrigatório');
      if (!dataNascStr) erros.push('data de nascimento inválida (use DD/MM/AAAA)');
      if (!dataVencStr) erros.push('data de vencimento inválida (use DD/MM/AAAA)');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.push('e-mail inválido');

      const plano = nomePlano ? planoPorNome.get(nomePlano.toLowerCase()) : null;
      if (!nomePlano) erros.push('plano é obrigatório');
      else if (!plano) erros.push(`plano "${nomePlano}" não encontrado (confira o nome exato de um plano já cadastrado)`);

      if (cpf) {
        if (cpfsVistosNoArquivo.has(cpf)) erros.push('CPF duplicado dentro do próprio arquivo');
        cpfsVistosNoArquivo.add(cpf);
      }

      if (erros.length > 0) {
        relatorio.push({ linha: numeroLinha, nome: nome || '(vazio)', status: 'erro', motivo: erros.join('; ') });
        continue;
      }

      if (totalAtual + criados >= limite) {
        relatorio.push({ linha: numeroLinha, nome, status: 'erro', motivo: `Limite de ${limite} alunos do seu plano atingido — linha não importada` });
        continue;
      }

      try {
        await prisma.aluno.create({
          data: {
            nome,
            cpf,
            whatsapp,
            email: email || null,
            dataNascimento: new Date(dataNascStr + 'T12:00:00'),
            dataVencimento: new Date(dataVencStr + 'T12:00:00'),
            planoId: plano.id,
            status: 'ativo',
            avatar: avatarFromNome(nome),
            ownerId: req.user.id,
          },
        });
        criados++;
        relatorio.push({ linha: numeroLinha, nome, status: 'sucesso', motivo: null });
      } catch (e) {
        const motivo = e.code === 'P2002' ? 'CPF já cadastrado nesta conta' : (e.message || 'erro ao salvar');
        relatorio.push({ linha: numeroLinha, nome, status: 'erro', motivo });
      }
    }

    if (criados > 0) marcarPrimeiroAlunoSeNecessario(req.user.id);

    res.json({
      totalLinhas: linhas.length,
      criados,
      comErro: relatorio.filter(r => r.status === 'erro').length,
      relatorio,
    });
  } catch (e) {
    console.error('Erro ao importar CSV:', e);
    res.status(500).json({ error: 'Erro ao processar o arquivo CSV' });
  }
});

// Marca o timestamp do primeiro aluno cadastrado (só na primeira vez) — usado para medir
// o tempo de onboarding (roadmap item 2). Best-effort: nunca deve travar o fluxo principal.
async function marcarPrimeiroAlunoSeNecessario(ownerId) {
  try {
    const usuario = await prisma.user.findUnique({ where: { id: ownerId }, select: { primeiroAlunoCadastradoEm: true } });
    if (usuario && !usuario.primeiroAlunoCadastradoEm) {
      await prisma.user.update({ where: { id: ownerId }, data: { primeiroAlunoCadastradoEm: new Date() } });
    }
  } catch (e) {
    console.error('Erro ao marcar primeiro aluno cadastrado:', e);
  }
}

app.post('/api/alunos', async (req, res) => {
  const {
    nome,
    cpf,
    whatsapp,
    email,
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
        email: email ? String(email) : null,
        dataNascimento: new Date(String(dataNascimento) + 'T12:00:00'),
        dataVencimento: new Date(String(dataVencimento) + 'T12:00:00'),
        planoId: Number(planoId),
        status: status || 'ativo',
        avatar: avatarFromNome(String(nome)),
        ownerId: req.user.id,
      },
      include: { plano: true },
    });
    marcarPrimeiroAlunoSeNecessario(req.user.id);
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
    email,
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
        email: email !== undefined ? (email ? String(email) : null) : undefined,
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
// ===== Dados da Academia (por conta) =====
app.get('/api/conta/academia', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({
    nomeAcademia: user.nomeAcademia || '',
    cnpjAcademia: user.cnpjAcademia || '',
    telefoneAcademia: user.telefoneAcademia || '',
    enderecoAcademia: user.enderecoAcademia || '',
    chavePix: user.chavePix || '',
    whatsappMsg5Dias: user.whatsappMsg5Dias || '',
    whatsappMsgVencido: user.whatsappMsgVencido || '',
    whatsappAutoEnviar: user.whatsappAutoEnviar,
    whatsappHoraEnvio: typeof user.whatsappHoraEnvio === 'number' ? user.whatsappHoraEnvio : 9,
    emailAutoEnviar: user.emailAutoEnviar,
  });
});

app.put('/api/conta/academia', authenticateToken, async (req, res) => {
  const { nomeAcademia, cnpjAcademia, telefoneAcademia, enderecoAcademia, chavePix, whatsappMsg5Dias, whatsappMsgVencido, whatsappAutoEnviar, whatsappHoraEnvio, emailAutoEnviar } = req.body || {};

  let horaEnvioValida;
  if (whatsappHoraEnvio !== undefined) {
    const h = Number(whatsappHoraEnvio);
    if (!Number.isInteger(h) || h < 0 || h > 23) {
      return res.status(400).json({ error: 'whatsappHoraEnvio deve ser um número inteiro entre 0 e 23' });
    }
    horaEnvioValida = h;
  }

  try {
    const usuarioAntes = await prisma.user.findUnique({ where: { id: req.user.id }, select: { automacaoConfiguradaEm: true } });
    const ligandoAutomacaoAgora = (whatsappAutoEnviar === true || emailAutoEnviar === true) && !usuarioAntes?.automacaoConfiguradaEm;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        nomeAcademia: nomeAcademia ?? undefined,
        cnpjAcademia: cnpjAcademia ?? undefined,
        telefoneAcademia: telefoneAcademia ?? undefined,
        enderecoAcademia: enderecoAcademia ?? undefined,
        chavePix: chavePix ?? undefined,
        whatsappMsg5Dias: whatsappMsg5Dias ?? undefined,
        whatsappMsgVencido: whatsappMsgVencido ?? undefined,
        whatsappAutoEnviar: typeof whatsappAutoEnviar === 'boolean' ? whatsappAutoEnviar : undefined,
        whatsappHoraEnvio: horaEnvioValida,
        emailAutoEnviar: typeof emailAutoEnviar === 'boolean' ? emailAutoEnviar : undefined,
        automacaoConfiguradaEm: ligandoAutomacaoAgora ? new Date() : undefined,
      },
    });
    res.json({
      nomeAcademia: updated.nomeAcademia || '',
      cnpjAcademia: updated.cnpjAcademia || '',
      telefoneAcademia: updated.telefoneAcademia || '',
      enderecoAcademia: updated.enderecoAcademia || '',
      chavePix: updated.chavePix || '',
      whatsappMsg5Dias: updated.whatsappMsg5Dias || '',
      whatsappMsgVencido: updated.whatsappMsgVencido || '',
      whatsappAutoEnviar: updated.whatsappAutoEnviar,
      whatsappHoraEnvio: updated.whatsappHoraEnvio,
      emailAutoEnviar: updated.emailAutoEnviar,
      automacaoConfiguradaAgora: ligandoAutomacaoAgora,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao salvar dados da academia' });
  }
});

// Métricas da plataforma como um todo (todos os clientes), não da academia de um cliente.
// Protegido por uma env var própria (PLATFORM_ADMIN_EMAIL) — nenhum cliente, mesmo com
// role 'admin' na própria academia dele, consegue ver dados de negócio de outros clientes.
const PRECOS_POR_PLANO = { starter: 250, pro: 400, business: 600 }; // ajuste conforme seus preços reais

app.get('/api/plataforma/metricas', authenticateToken, async (req, res) => {
  if (!process.env.PLATFORM_ADMIN_EMAIL || req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Acesso restrito' });
  }
  try {
    const todos = await prisma.user.findMany({
      select: { subscriptionStatus: true, subscriptionTier: true, createdAt: true, cancelamentoAgendado: true, motivoCancelamento: true },
    });

    const ativos = todos.filter(u => u.subscriptionStatus === 'active');
    const trial = todos.filter(u => u.subscriptionStatus === 'trial');
    const cancelados = todos.filter(u => u.subscriptionStatus === 'canceled');

    const mrr = ativos.reduce((soma, u) => soma + (PRECOS_POR_PLANO[u.subscriptionTier] || 0), 0);

    const porTier = {};
    for (const u of ativos) {
      porTier[u.subscriptionTier] = (porTier[u.subscriptionTier] || 0) + 1;
    }

    const umMesAtras = new Date();
    umMesAtras.setMonth(umMesAtras.getMonth() - 1);
    const novosUltimoMes = todos.filter(u => new Date(u.createdAt) >= umMesAtras).length;
    const canceladosUltimoMes = cancelados.filter(u => u.cancelamentoAgendado).length; // aproximação simples

    const motivosCancelamento = cancelados.filter(u => u.motivoCancelamento).map(u => u.motivoCancelamento);

    res.json({
      totalContas: todos.length,
      assinantesAtivos: ativos.length,
      emTrial: trial.length,
      cancelados: cancelados.length,
      mrrEstimado: mrr,
      assinantesPorTier: porTier,
      novosUltimoMes,
      canceladosUltimoMes,
      motivosCancelamento,
    });
  } catch (e) {
    console.error('Erro ao calcular métricas da plataforma:', e);
    res.status(500).json({ error: 'Erro ao calcular métricas' });
  }
});

app.get('/api/billing/status', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const trialExpirado = user.subscriptionStatus === 'trial' && (!user.trialEndsAt || new Date(user.trialEndsAt) <= new Date());
  res.json({
    subscriptionStatus: trialExpirado ? 'inactive' : user.subscriptionStatus,
    subscriptionTier: user.subscriptionTier,
    maxAlunos: user.maxAlunos,
    isAdmin: user.role === 'admin',
    trialEndsAt: user.trialEndsAt,
    cancelamentoAgendado: user.cancelamentoAgendado,
    assinaturaRenovaEm: user.assinaturaRenovaEm,
    temAssinaturaStripe: !!user.stripeSubscriptionId,
    isPlatformOwner: !!process.env.PLATFORM_ADMIN_EMAIL && user.email === process.env.PLATFORM_ADMIN_EMAIL,
  });
});

// Cancela a assinatura ao final do período já pago (o acesso continua liberado
// até a data de renovação — não bloqueia na hora, já que o mês já foi pago).
app.post('/api/billing/cancelar', authenticateToken, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Pagamentos ainda não configurados no servidor' });
  const { motivo } = req.body || {};
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user?.stripeSubscriptionId) {
    return res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada para esta conta' });
  }
  try {
    const sub = await stripe.subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: true });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        cancelamentoAgendado: true,
        assinaturaRenovaEm: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
        motivoCancelamento: motivo ? String(motivo).slice(0, 500) : undefined,
      },
    });
    res.json({ ok: true, assinaturaRenovaEm: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao cancelar assinatura' });
  }
});

// Desfaz um cancelamento agendado (a pessoa mudou de ideia antes do fim do período)
app.post('/api/billing/reativar', authenticateToken, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Pagamentos ainda não configurados no servidor' });
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user?.stripeSubscriptionId) {
    return res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada para esta conta' });
  }
  try {
    await stripe.subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: false });
    await prisma.user.update({ where: { id: user.id }, data: { cancelamentoAgendado: false } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao reativar assinatura' });
  }
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
          data: {
            subscriptionStatus: 'active',
            subscriptionTier: plano,
            maxAlunos: LIMITES_POR_PLANO[plano],
            stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
            cancelamentoAgendado: false,
          },
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
          data: {
            subscriptionStatus: ativo ? 'active' : (sub.status === 'past_due' ? 'past_due' : 'canceled'),
            cancelamentoAgendado: !!sub.cancel_at_period_end,
            assinaturaRenovaEm: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          },
        });
      }
    }

    res.json({ received: true });
  } catch (e) {
    logErro('Erro ao processar webhook de pagamento', e);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

// ===== Automação de Notificações via WhatsApp (Evolution API) =====
async function enviarWhatsApp(numero, texto) {
  const url = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instancia = process.env.EVOLUTION_INSTANCE;
  if (!url || !apiKey || !instancia) {
    throw new Error('Evolution API não configurada (faltam variáveis de ambiente)');
  }
  const resp = await fetch(`${url.replace(/\/$/, '')}/message/sendText/${instancia}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ number: numero, text: texto }),
  });
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    throw new Error(`Evolution API respondeu ${resp.status}: ${corpo}`);
  }
  return resp.json().catch(() => ({}));
}

// Envia e-mail via Resend (https://resend.com). Requer RESEND_API_KEY e RESEND_FROM_EMAIL
// nas variáveis de ambiente. O "from" precisa ser de um domínio verificado na Resend
// (ou "onboarding@resend.dev" apenas para testes).
async function enviarEmail(destino, assunto, textoHtml) {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !remetente) {
    throw new Error('Resend não configurada (faltam RESEND_API_KEY / RESEND_FROM_EMAIL)');
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: remetente,
      to: [destino],
      subject: assunto,
      html: textoHtml,
    }),
  });
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    throw new Error(`Resend respondeu ${resp.status}: ${corpo}`);
  }
  return resp.json().catch(() => ({}));
}

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

// Roda o disparo de notificações (5 dias antes + vencidos) para um usuário específico.
// Usado tanto pelo botão manual quanto pelo robô automático diário (cron).
async function dispararNotificacoesParaUsuario(userId, origem = 'manual') {
  const usuario = await prisma.user.findUnique({ where: { id: userId } });
  const config = {
    nomeAcademia: usuario?.nomeAcademia,
    chavePix: usuario?.chavePix,
    msg5Dias: usuario?.whatsappMsg5Dias,
    msgVencido: usuario?.whatsappMsgVencido,
    emailAutoEnviar: usuario?.emailAutoEnviar,
    whatsappAutoEnviar: usuario?.whatsappAutoEnviar,
  };
  // No disparo manual, o clique do usuário já é a autorização — envia pelos canais disponíveis.
  // No disparo automático (cron), respeita o que está habilitado nas configurações.
  const enviarWhatsappHabilitado = origem === 'manual' || config.whatsappAutoEnviar;
  const enviarEmailHabilitado = origem === 'manual' || config.emailAutoEnviar;
  const alunos = await prisma.aluno.findMany({
    where: { ownerId: userId },
    include: { plano: true },
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const logsExecucao = [];
  let contador5Dias = 0;
  let contadorVencidos = 0;

  for (const aluno of alunos) {
    if (!aluno.dataVencimento || !aluno.whatsapp) continue;
    const venc = new Date(aluno.dataVencimento);
    venc.setHours(0, 0, 0, 0);
    const diffDias = Math.round((venc - hoje) / (1000 * 60 * 60 * 24));

    let tipoMsg = null;
    if (diffDias === 5) tipoMsg = '5dias';
    else if (diffDias <= 0) tipoMsg = 'vencido';
    if (!tipoMsg) continue;

    const dataStr = venc.toLocaleDateString('pt-BR');
    const nomeAcademia = config.nomeAcademia || 'sua academia';
    const chavePix = config.chavePix || '[Solicitar PIX]';
    const modelo = tipoMsg === '5dias'
      ? (config.msg5Dias || 'Olá, {NOME_ALUNO}! Passando para lembrar que seu plano na {NOME_ACADEMIA} vence em 5 dias (dia {DATA_VENCIMENTO}). Chave PIX: {CHAVE_PIX}.')
      : (config.msgVencido || 'Olá, {NOME_ALUNO}! Sua mensalidade na {NOME_ACADEMIA} venceu em {DATA_VENCIMENTO}. Chave PIX: {CHAVE_PIX}.');

    const texto = modelo
      .replace(/\{NOME_ALUNO\}/g, aluno.nome)
      .replace(/\{NOME_ACADEMIA\}/g, nomeAcademia)
      .replace(/\{DATA_VENCIMENTO\}/g, dataStr)
      .replace(/\{CHAVE_PIX\}/g, chavePix);

    const numeroLimpo = String(aluno.whatsapp).replace(/\D/g, '');
    const numero = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;

    const logBase = {
      id: Date.now() + Math.random(),
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      whatsapp: aluno.whatsapp,
      tipo: tipoMsg,
      dataVencimento: dataStr,
      dataEnvio: new Date().toISOString(),
    };

    try {
      if (!enviarWhatsappHabilitado) throw new Error('Envio automático de WhatsApp desativado nas configurações');
      await enviarWhatsApp(numero, texto);
      logsExecucao.push({ ...logBase, status: 'sucesso', mensagem: tipoMsg === '5dias' ? `Lembrete enviado (vence ${dataStr})` : `Cobrança enviada (venceu ${dataStr})` });
      if (tipoMsg === '5dias') contador5Dias++; else contadorVencidos++;
    } catch (erroEnvio) {
      logsExecucao.push({ ...logBase, status: 'erro', mensagem: erroEnvio.message });
    }

    // E-mail: só tenta se o aluno tiver e-mail cadastrado e o envio por e-mail estiver liberado.
    if (aluno.email && enviarEmailHabilitado) {
      const assunto = tipoMsg === '5dias'
        ? `Lembrete: sua mensalidade na ${nomeAcademia} vence em 5 dias`
        : `Mensalidade vencida na ${nomeAcademia}`;
      const html = `<p>${texto.replace(/\n/g, '<br/>')}</p>`;
      try {
        await enviarEmail(aluno.email, assunto, html);
        logsExecucao.push({ ...logBase, id: Date.now() + Math.random(), canal: 'email', status: 'sucesso', mensagem: `E-mail enviado para ${aluno.email}` });
      } catch (erroEmail) {
        logsExecucao.push({ ...logBase, id: Date.now() + Math.random(), canal: 'email', status: 'erro', mensagem: erroEmail.message });
      }
    }
  }

  const antigo = whatsappStore.get(userId) || {};
  const logsAnteriores = antigo.logs || [];
  const novosLogs = [...logsExecucao, ...logsAnteriores].slice(0, 50);
  whatsappStore.set(userId, { ...antigo, logs: novosLogs, ultimoDisparo: new Date().toISOString() });

  return { logsExecucao, contador5Dias, contadorVencidos };
}

app.post('/api/whatsapp/disparar-agora', authenticateToken, async (req, res) => {
  try {
    const { logsExecucao, contador5Dias, contadorVencidos } = await dispararNotificacoesParaUsuario(req.user.id);
    res.json({
      ok: true,
      totalProcessados: logsExecucao.length,
      avisos5Dias: contador5Dias,
      vencidos: contadorVencidos,
      logs: logsExecucao,
      mensagem: `${logsExecucao.filter(l => l.status === 'sucesso').length} mensagem(ns) enviada(s), ${logsExecucao.filter(l => l.status === 'erro').length} com erro.`
    });
  } catch (err) {
    console.error('Erro na automação do WhatsApp:', err);
    res.status(500).json({ error: 'Falha ao executar automação do WhatsApp' });
  }
});

// Robô automático diário — chamado pelo Vercel Cron (não pelo usuário).
// Protegido por CRON_SECRET: só a própria Vercel (com o header certo) pode chamar.
// Dispara um e-mail de reengajamento para contas sem acesso há mais de 7 dias (e que
// ainda não receberam um e-mail de reengajamento nos últimos 14 dias, pra não ser chato).
app.get('/api/cron/reengajamento', async (req, res) => {
  const auth = req.headers.authorization;
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  try {
    const DIAS_INATIVIDADE = 7;
    const DIAS_ENTRE_EMAILS = 14;
    const limiteInatividade = new Date(Date.now() - DIAS_INATIVIDADE * 24 * 60 * 60 * 1000);
    const limiteUltimoEmail = new Date(Date.now() - DIAS_ENTRE_EMAILS * 24 * 60 * 60 * 1000);

    const candidatos = await prisma.user.findMany({
      where: {
        subscriptionStatus: { in: ['active', 'trial'] },
        OR: [
          { ultimoAcessoEm: { lt: limiteInatividade } },
          { ultimoAcessoEm: null, createdAt: { lt: limiteInatividade } },
        ],
        AND: [
          { OR: [{ ultimoEmailReengajamentoEm: null }, { ultimoEmailReengajamentoEm: { lt: limiteUltimoEmail } }] },
        ],
      },
    });

    const resultados = [];
    for (const u of candidatos) {
      try {
        await enviarEmail(
          u.email,
          'Sentimos sua falta no GymFlow 👋',
          `<p>Olá${u.nome ? `, ${u.nome}` : ''}!</p>
           <p>Notamos que faz um tempo que você não acessa o GymFlow. Sua academia continua cadastrada e pronta pra uso.</p>
           <p>Lembre-se: com a automação de cobrança ativada, o sistema lembra e cobra seus alunos inadimplentes sozinho — é só configurar uma vez.</p>
           <p>Qualquer dúvida, estamos à disposição.</p>`
        );
        await prisma.user.update({ where: { id: u.id }, data: { ultimoEmailReengajamentoEm: new Date() } });
        resultados.push({ userId: u.id, status: 'enviado' });
      } catch (e) {
        resultados.push({ userId: u.id, status: 'erro', motivo: e.message });
      }
    }

    res.json({ ok: true, candidatos: candidatos.length, resultados });
  } catch (err) {
    logErro('Erro no robô de reengajamento', err);
    res.status(500).json({ error: 'Falha no robô de reengajamento' });
  }
});

app.get('/api/cron/whatsapp-diario', async (req, res) => {
  const auth = req.headers.authorization;
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  try {
    // O robô roda de hora em hora (GitHub Actions), mas o GitHub NÃO garante que a
    // execução comece exatamente no minuto 0 — em horários de pico pode atrasar vários
    // minutos, ou raramente pular uma execução inteira. Por isso NÃO exigimos que a
    // hora atual seja EXATAMENTE igual à configurada: verificamos se a hora configurada
    // já passou hoje E se ainda não foi enviado hoje. Isso faz o robô "se recuperar"
    // sozinho na próxima execução, mesmo que tenha perdido a hora certa por atraso.
    const OFFSET_BRASILIA = 3; // UTC-3 (Brasil não usa horário de verão desde 2019)
    const agora = new Date();
    const horaAtualBrasilia = (agora.getUTCHours() - OFFSET_BRASILIA + 24) % 24;
    // "Hoje" no fuso de Brasília, como string AAAA-MM-DD, para comparar dia sem hora/fuso.
    const agoraBrasilia = new Date(agora.getTime() - OFFSET_BRASILIA * 60 * 60 * 1000);
    const hojeBrasiliaStr = agoraBrasilia.toISOString().slice(0, 10);

    const todosAutoEnviar = await prisma.user.findMany({
      where: { OR: [{ whatsappAutoEnviar: true }, { emailAutoEnviar: true }] },
    });
    const usuarios = todosAutoEnviar.filter(u => {
      const horaConfigurada = typeof u.whatsappHoraEnvio === 'number' ? u.whatsappHoraEnvio : 9;
      if (horaAtualBrasilia < horaConfigurada) return false; // ainda não chegou a hora hoje

      if (!u.ultimoEnvioAutomaticoEm) return true;
      const ultimoEnvioBrasilia = new Date(new Date(u.ultimoEnvioAutomaticoEm).getTime() - OFFSET_BRASILIA * 60 * 60 * 1000);
      const ultimoEnvioStr = ultimoEnvioBrasilia.toISOString().slice(0, 10);
      return ultimoEnvioStr !== hojeBrasiliaStr; // só dispara se ainda não enviou hoje
    });

    const resultados = [];
    for (const u of usuarios) {
      try {
        const r = await dispararNotificacoesParaUsuario(u.id, 'cron');
        await prisma.user.update({ where: { id: u.id }, data: { ultimoEnvioAutomaticoEm: agora } });
        resultados.push({ userId: u.id, enviados: r.logsExecucao.filter(l => l.status === 'sucesso').length });
      } catch (e) {
        resultados.push({ userId: u.id, erro: e.message });
      }
    }
    res.json({ ok: true, horaAtualBrasilia, hojeBrasiliaStr, contasElegiveis: usuarios.length, contasComAutoEnvio: todosAutoEnviar.length, resultados });
  } catch (err) {
    logErro('Erro no robô diário de notificações', err);
    res.status(500).json({ error: 'Falha no robô diário' });
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
