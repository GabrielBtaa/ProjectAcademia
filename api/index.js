// API simples para teste
export default function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';

  if (url.includes('health')) {
    return res.json({ ok: true, message: 'API funcionando', timestamp: new Date().toISOString() });
  }

  if (url.includes('planos')) {
    return res.json([
      { id: 1, nome: 'Mensal', duracao: 30, valor: 100, descricao: 'Plano mensal' },
      { id: 2, nome: 'Trimestral', duracao: 90, valor: 270, descricao: 'Plano trimestral' },
      { id: 3, nome: 'Anual', duracao: 365, valor: 900, descricao: 'Plano anual' },
    ]);
  }

  if (url.includes('alunos')) {
    return res.json([
      { id: 1, nome: 'João Silva', cpf: '123.456.789-00', whatsapp: '(11) 99999-9999', status: 'ativo', plano: 'Mensal', avatar: 'JS' },
      { id: 2, nome: 'Maria Santos', cpf: '987.654.321-00', whatsapp: '(11) 98888-8888', status: 'ativo', plano: 'Trimestral', avatar: 'MS' },
    ]);
  }

  return res.json({ message: 'API do Projeto Academia', version: '1.0.0' });
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