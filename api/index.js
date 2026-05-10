import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../backend/lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const corsOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : true;

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

// Serve static files from public directory (for Vercel)
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Utility functions
function toDateOnly(d) {
  return d.toISOString().slice(0, 10);
}

function avatarFromNome(nome) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
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

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$connect();
    res.json({ ok: true, message: 'Backend rodando', db: true });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ ok: false, message: 'Database connection failed', db: false, error: error.message });
  }
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
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
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nome } = req.body || {};

    if (!email || !password || !nome) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nome,
        role: 'USER'
      }
    });

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
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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

// Planos
app.get('/api/planos', async (req, res) => {
  try {
    const planos = await prisma.plano.findMany({ orderBy: { id: 'asc' } });
    res.json(planos.map(serializePlano));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao listar planos' });
  }
});

// Alunos
app.get('/api/alunos', async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany({
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

// Pagamentos
app.get('/api/pagamentos', async (req, res) => {
  try {
    const pagamentos = await prisma.pagamento.findMany({
      include: { aluno: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pagamentos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
});

app.post('/api/pagamentos', async (req, res) => {
  const { valor, data, status, alunoId } = req.body;
  if (!valor || !data || !alunoId) {
    return res.status(400).json({ error: 'Valor, data e alunoId são obrigatórios' });
  }
  try {
    const created = await prisma.pagamento.create({
      data: {
        valor: Number(valor),
        data: new Date(String(data) + 'T12:00:00'),
        status: status || 'pendente',
        alunoId: Number(alunoId),
      },
      include: { aluno: true },
    });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
});

// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Vercel serverless handler
export default function handler(req, res) {
  app(req, res);
}

