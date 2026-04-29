// API para Vercel Serverless
// Usa o Prisma gerado no diretório backend

import { PrismaClient } from '@prisma/client'

// Criar cliente Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

export default async function handler(req, res) {
  // Configuração de CORS
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Health check
    if (req.url === '/api/health' || req.url === '/health') {
      await prisma.$queryRaw`SELECT 1`
      return res.json({ ok: true, message: 'Backend rodando', db: true })
    }

    // Listar planos
    if (req.url === '/api/planos' || req.url === '/planos') {
      const planos = await prisma.plano.findMany({ orderBy: { id: 'asc' } })
      return res.json(planos.map(p => ({
        id: p.id,
        nome: p.nome,
        duracao: p.duracao,
        valor: Number(p.valor),
        descricao: p.descricao,
      })))
    }

    // Listar alunos
    if (req.url === '/api/alunos' || req.url === '/alunos') {
      const alunos = await prisma.aluno.findMany({
        include: { plano: true },
        orderBy: { id: 'asc' },
      })
      return res.json(alunos.map(a => ({
        id: a.id,
        nome: a.nome,
        cpf: a.cpf,
        whatsapp: a.whatsapp,
        dataNascimento: a.dataNascimento?.toISOString().slice(0, 10),
        dataVencimento: a.dataVencimento?.toISOString().slice(0, 10),
        dataCadastro: a.dataCadastro?.toISOString().slice(0, 10),
        status: a.status,
        planoId: a.planoId,
        plano: a.plano?.nome,
        avatar: a.avatar,
      })))
    }

    // Rota não encontrada
    return res.status(404).json({ error: 'Rota não encontrada' })

  } catch (error) {
    console.error('Erro:', error)
    return res.status(500).json({ error: 'Erro interno', details: error.message })
  }
}

export default async function handler(req, res) {
  // Configuração de CORS
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Health check
    if (req.url === '/api/health' || req.url === '/health') {
      await prisma.$queryRaw`SELECT 1`
      return res.json({ ok: true, message: 'Backend rodando', db: true })
    }

    // Listar planos
    if (req.url === '/api/planos' || req.url === '/planos') {
      const planos = await prisma.plano.findMany({ orderBy: { id: 'asc' } })
      return res.json(planos.map(p => ({
        id: p.id,
        nome: p.nome,
        duracao: p.duracao,
        valor: Number(p.valor),
        descricao: p.descricao,
      })))
    }

    // Listar alunos
    if (req.url === '/api/alunos' || req.url === '/alunos') {
      const alunos = await prisma.aluno.findMany({
        include: { plano: true },
        orderBy: { id: 'asc' },
      })
      return res.json(alunos.map(a => ({
        id: a.id,
        nome: a.nome,
        cpf: a.cpf,
        whatsapp: a.whatsapp,
        dataNascimento: a.dataNascimento?.toISOString().slice(0, 10),
        dataVencimento: a.dataVencimento?.toISOString().slice(0, 10),
        dataCadastro: a.dataCadastro?.toISOString().slice(0, 10),
        status: a.status,
        planoId: a.planoId,
        plano: a.plano?.nome,
        avatar: a.avatar,
      })))
    }

    // Rota não encontrada
    return res.status(404).json({ error: 'Rota não encontrada' })

  } catch (error) {
    console.error('Erro:', error)
    return res.status(500).json({ error: 'Erro interno', details: error.message })
  }
}