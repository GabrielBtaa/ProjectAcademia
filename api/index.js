const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

app.use(cors());
app.use(express.json());

// Serve static files from public directory (for Vercel)
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

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

// Auth routes
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
    const { email, password, nome } = req.body || {};

    if (!email || !password || !nome) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = bcrypt.hashSync(String(password), 10);
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        nome: String(nome).trim(),
        role: 'usuario'
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

// Planos
app.get('/api/planos', async (req, res) => {
  try {
    const planos = await prisma.plano.findMany({ orderBy: { id: 'asc' } });
    res.json(planos.map(p => ({
      id: p.id,
      nome: p.nome,
      duracao: p.duracao,
      valor: Number(p.valor),
      descricao: p.descricao,
    })));
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
    res.json(alunos.map(a => ({
      id: a.id,
      nome: a.nome,
      cpf: a.cpf,
      whatsapp: a.whatsapp,
      dataNascimento: a.dataNascimento.toISOString().slice(0, 10),
      dataVencimento: a.dataVencimento.toISOString().slice(0, 10),
      dataCadastro: a.dataCadastro.toISOString().slice(0, 10),
      status: a.status,
      planoId: a.planoId,
      plano: a.plano?.nome,
      avatar: a.avatar || a.nome.split(' ').map(n => n[0]).join('').toUpperCase(),
    })));
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
        avatar: String(nome).split(' ').map(n => n[0]).join('').toUpperCase(),
      },
      include: { plano: true },
    });
    res.status(201).json({
      id: created.id,
      nome: created.nome,
      cpf: created.cpf,
      whatsapp: created.whatsapp,
      dataNascimento: created.dataNascimento.toISOString().slice(0, 10),
      dataVencimento: created.dataVencimento.toISOString().slice(0, 10),
      dataCadastro: created.dataCadastro.toISOString().slice(0, 10),
      status: created.status,
      planoId: created.planoId,
      plano: created.plano?.nome,
      avatar: created.avatar,
    });
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
        avatar: String(nome).split(' ').map(n => n[0]).join('').toUpperCase(),
      },
      include: { plano: true },
    });
    res.json({
      id: updated.id,
      nome: updated.nome,
      cpf: updated.cpf,
      whatsapp: updated.whatsapp,
      dataNascimento: updated.dataNascimento.toISOString().slice(0, 10),
      dataVencimento: updated.dataVencimento.toISOString().slice(0, 10),
      dataCadastro: updated.dataCadastro.toISOString().slice(0, 10),
      status: updated.status,
      planoId: updated.planoId,
      plano: updated.plano?.nome,
      avatar: updated.avatar,
    });
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
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  const fs = require('fs');
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html');
    res.send(fs.readFileSync(indexPath));
  } else {
    res.status(404).send('Not found');
  }
});

// Vercel serverless handler
module.exports = app;

