// Testes automáticos dos fluxos críticos (login, acesso/cobrança, admin, indicação, LGPD).
// Rodam sem banco de dados: o Prisma é substituído por um banco falso em memória.
// Executar com:  npm test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste';
process.env.PLATFORM_ADMIN_EMAIL = 'dono@teste.com';
delete process.env.STRIPE_SECRET_KEY;
delete process.env.RESEND_API_KEY;

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ---------- banco falso em memória ----------
const db = { users: [], revogados: new Map(), alunos: [], planos: [] };
let seq = 1;
const clone = (o) => (o ? { ...o } : o);
const casa = (obj, where = {}) => Object.entries(where).every(([k, v]) => obj[k] === v);
function aplicar(obj, data) {
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && 'increment' in v) obj[k] = (obj[k] || 0) + v.increment;
    else obj[k] = v;
  }
}
// Igual ao Prisma de verdade: com `select`, só voltam os campos pedidos (senha incluída só se pedida)
function comSelect(obj, select) {
  if (!obj || !select) return clone(obj);
  const saida = {};
  for (const [k, v] of Object.entries(select)) {
    if (k === '_count') saida._count = { alunos: db.alunos.filter(a => a.ownerId === obj.id).length };
    else if (v) saida[k] = obj[k];
  }
  return saida;
}
const fakePrisma = {
  user: {
    findUnique: async ({ where, select }) => comSelect(db.users.find(u => casa(u, where)), select),
    findMany: async ({ select } = {}) => db.users.map(u => comSelect(u, select) || { ...u, _count: { alunos: db.alunos.filter(a => a.ownerId === u.id).length } }),
    count: async ({ where } = {}) => db.users.filter(u => casa(u, where)).length,
    create: async ({ data }) => {
      const u = {
        id: seq++, role: 'usuario', failedLoginAttempts: 0, lockedUntil: null, createdAt: new Date(),
        acessoLiberadoManual: false, bloqueadoPorAdmin: false, indicacaoRecompensada: false,
        indicacoesConvertidas: 0, creditosIndicacaoPendentes: 0, stripeCustomerId: null, stripeSubscriptionId: null,
        codigoIndicacao: null, indicadoPorUserId: null, maxAlunos: 9999, ...data,
      };
      db.users.push(u);
      return clone(u);
    },
    update: async ({ where, data }) => {
      const u = db.users.find(x => casa(x, where));
      if (!u) throw Object.assign(new Error('não encontrado'), { code: 'P2025' });
      aplicar(u, data);
      return clone(u);
    },
    updateMany: async ({ where, data }) => {
      const alvos = db.users.filter(u => casa(u, where));
      alvos.forEach(u => aplicar(u, data));
      return { count: alvos.length };
    },
    delete: async ({ where }) => {
      db.users = db.users.filter(u => !casa(u, where));
      return {};
    },
  },
  tokenRevogado: {
    findUnique: async ({ where }) => (db.revogados.has(where.jti) ? { jti: where.jti } : null),
    upsert: async ({ where, create }) => { db.revogados.set(where.jti, create); return create; },
  },
  aluno: {
    findMany: async ({ where } = {}) => db.alunos.filter(a => casa(a, where)),
    count: async ({ where } = {}) => db.alunos.filter(a => casa(a, where)).length,
    deleteMany: async ({ where }) => { db.alunos = db.alunos.filter(a => !casa(a, where)); return {}; },
  },
  plano: {
    findMany: async ({ where } = {}) => db.planos.filter(p => casa(p, where)),
    deleteMany: async ({ where }) => { db.planos = db.planos.filter(p => !casa(p, where)); return {}; },
  },
  $queryRaw: async () => [{ '?column?': 1 }],
  $transaction: async (ops) => Promise.all(ops),
};

// Faz o require('@prisma/client') do app devolver o banco falso
const carregarOriginal = Module._load;
Module._load = function (request, ...resto) {
  if (request === '@prisma/client') return { PrismaClient: function () { return fakePrisma; } };
  return carregarOriginal.call(this, request, ...resto);
};
const app = require('../api/index.js');
Module._load = carregarOriginal;

// ---------- utilidades ----------
let servidor;
let base;
test.before(async () => {
  await new Promise(resolve => { servidor = app.listen(0, resolve); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => servidor.close());

const SENHA = 'senha123';
const hash = bcrypt.hashSync(SENHA, 4);
const emDias = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

async function criarUsuario(dados = {}) {
  const n = seq;
  return fakePrisma.user.create({
    data: { email: `u${n}@teste.com`, password: hash, nome: `Usuário ${n}`, subscriptionStatus: 'trial', subscriptionTier: 'starter', trialEndsAt: emDias(10), ...dados },
  });
}
const tokenDe = (u) => jwt.sign({ id: u.id, email: u.email, role: u.role, jti: `jti-${u.id}-${Math.random()}` }, process.env.JWT_SECRET, { expiresIn: '1h' });
const chamar = (metodo, caminho, { token, corpo } = {}) =>
  fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

// ---------- health ----------
test('health check responde ok', async () => {
  const r = await chamar('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).ok, true);
});

// ---------- LOGIN ----------
test('login: exige e-mail e senha', async () => {
  const r = await chamar('POST', '/api/auth/login', { corpo: { email: 'x@x.com' } });
  assert.equal(r.status, 400);
});

test('login: e-mail inexistente e senha errada dão a MESMA mensagem (sem enumeração)', async () => {
  const u = await criarUsuario();
  const a = await chamar('POST', '/api/auth/login', { corpo: { email: 'naoexiste@teste.com', password: 'qualquer1' } });
  const b = await chamar('POST', '/api/auth/login', { corpo: { email: u.email, password: 'errada123' } });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.deepEqual(await a.json(), await b.json());
});

test('login: senha correta devolve token e não vaza a senha', async () => {
  const u = await criarUsuario();
  const r = await chamar('POST', '/api/auth/login', { corpo: { email: u.email, password: SENHA } });
  assert.equal(r.status, 200);
  const dados = await r.json();
  assert.ok(dados.token);
  assert.equal(dados.user.password, undefined);
});

test('login: 5 senhas erradas bloqueiam a conta, mesmo com a senha certa depois', async () => {
  const u = await criarUsuario();
  for (let i = 0; i < 5; i++) {
    const r = await chamar('POST', '/api/auth/login', { corpo: { email: u.email, password: 'errada123' } });
    assert.equal(r.status, 401);
  }
  const r = await chamar('POST', '/api/auth/login', { corpo: { email: u.email, password: SENHA } });
  assert.equal(r.status, 429);
});

// ---------- LOGOUT / TOKEN ----------
test('logout revoga o token no servidor', async () => {
  const u = await criarUsuario();
  const token = tokenDe(u);
  assert.equal((await chamar('GET', '/api/alunos', { token })).status, 200);
  assert.equal((await chamar('POST', '/api/auth/logout', { token })).status, 200);
  assert.equal((await chamar('GET', '/api/alunos', { token })).status, 401);
});

test('rotas protegidas rejeitam requisição sem token', async () => {
  assert.equal((await chamar('GET', '/api/alunos')).status, 401);
});

// ---------- ACESSO / COBRANÇA ----------
test('acesso: teste válido libera', async () => {
  const u = await criarUsuario();
  assert.equal((await chamar('GET', '/api/alunos', { token: tokenDe(u) })).status, 200);
});

test('acesso: teste expirado bloqueia com SUBSCRIPTION_REQUIRED', async () => {
  const u = await criarUsuario({ trialEndsAt: emDias(-1) });
  const r = await chamar('GET', '/api/alunos', { token: tokenDe(u) });
  assert.equal(r.status, 402);
  assert.equal((await r.json()).code, 'SUBSCRIPTION_REQUIRED');
});

test('acesso: assinatura ativa libera', async () => {
  const u = await criarUsuario({ subscriptionStatus: 'active', trialEndsAt: emDias(-30) });
  assert.equal((await chamar('GET', '/api/alunos', { token: tokenDe(u) })).status, 200);
});

test('acesso: assinatura cancelada/atrasada bloqueia', async () => {
  for (const status of ['canceled', 'past_due']) {
    const u = await criarUsuario({ subscriptionStatus: status, trialEndsAt: emDias(-30) });
    assert.equal((await chamar('GET', '/api/alunos', { token: tokenDe(u) })).status, 402);
  }
});

test('acesso: liberação manual (cortesia) libera mesmo sem pagamento', async () => {
  const u = await criarUsuario({ subscriptionStatus: 'inactive', trialEndsAt: emDias(-30), acessoLiberadoManual: true });
  assert.equal((await chamar('GET', '/api/alunos', { token: tokenDe(u) })).status, 200);
});

test('acesso: bloqueio do admin vale até para quem está pagando', async () => {
  const u = await criarUsuario({ subscriptionStatus: 'active', bloqueadoPorAdmin: true });
  const r = await chamar('GET', '/api/alunos', { token: tokenDe(u) });
  assert.equal(r.status, 402);
  assert.equal((await r.json()).code, 'BLOCKED_BY_ADMIN');
});

test('billing/status reflete bloqueio e cortesia', async () => {
  const bloqueado = await criarUsuario({ bloqueadoPorAdmin: true });
  const cortesia = await criarUsuario({ subscriptionStatus: 'inactive', trialEndsAt: emDias(-5), acessoLiberadoManual: true });
  const s1 = await (await chamar('GET', '/api/billing/status', { token: tokenDe(bloqueado) })).json();
  const s2 = await (await chamar('GET', '/api/billing/status', { token: tokenDe(cortesia) })).json();
  assert.equal(s1.subscriptionStatus, 'blocked');
  assert.equal(s2.subscriptionStatus, 'active');
});

// ---------- ADMIN DA PLATAFORMA ----------
test('admin SaaS: cliente comum não acessa (403)', async () => {
  const u = await criarUsuario();
  assert.equal((await chamar('GET', '/api/plataforma/usuarios', { token: tokenDe(u) })).status, 403);
  assert.equal((await chamar('GET', '/api/plataforma/metricas', { token: tokenDe(u) })).status, 403);
});

test('admin SaaS: dono lista contas sem vazar senha e controla acesso', async () => {
  const dono = await criarUsuario({ email: 'dono@teste.com', role: 'admin' });
  const cliente = await criarUsuario();
  const tk = tokenDe(dono);

  const lista = await (await chamar('GET', '/api/plataforma/usuarios', { token: tk })).json();
  assert.ok(lista.length >= 2);
  assert.ok(lista.every(u => u.password === undefined));
  assert.ok(lista.every(u => u.stripeCustomerId === undefined));

  const r = await chamar('POST', `/api/plataforma/usuarios/${cliente.id}/acesso`, { token: tk, corpo: { acao: 'bloquear' } });
  assert.equal(r.status, 200);
  assert.equal((await chamar('GET', '/api/alunos', { token: tokenDe(cliente) })).status, 402);

  await chamar('POST', `/api/plataforma/usuarios/${cliente.id}/acesso`, { token: tk, corpo: { acao: 'desbloquear' } });
  assert.equal((await chamar('GET', '/api/alunos', { token: tokenDe(cliente) })).status, 200);
});

test('admin SaaS: não deixa alterar conta admin nem ação inválida', async () => {
  const dono = await criarUsuario({ email: 'dono@teste.com', role: 'admin' });
  const tk = tokenDe(dono);
  const r = await chamar('POST', `/api/plataforma/usuarios/${dono.id}/acesso`, { token: tk, corpo: { acao: 'bloquear' } });
  assert.equal(r.status, 400);
  const cliente = await criarUsuario();
  const r2 = await chamar('POST', `/api/plataforma/usuarios/${cliente.id}/acesso`, { token: tk, corpo: { acao: 'inventada' } });
  assert.equal(r2.status, 400);
});

// ---------- CADASTRO / INDICAÇÃO ----------
const cadastro = (extra = {}) => ({
  email: `novo${seq}@teste.com`, confirmarEmail: `novo${seq}@teste.com`,
  password: 'abc12345', confirmarSenha: 'abc12345', nome: 'Maria Teste', celular: '11999999999', modeloNegocio: 'academia', ...extra,
});

test('cadastro: cria conta com teste de 30 dias mesmo sem e-mail configurado', async () => {
  const r = await chamar('POST', '/api/auth/register', { corpo: cadastro() });
  assert.ok([200, 201].includes(r.status));
  const dados = await r.json();
  assert.ok(dados.token);
});

test('cadastro: valida senha curta, confirmação diferente e e-mail repetido', async () => {
  assert.equal((await chamar('POST', '/api/auth/register', { corpo: cadastro({ password: '123', confirmarSenha: '123' }) })).status, 400);
  assert.equal((await chamar('POST', '/api/auth/register', { corpo: cadastro({ confirmarSenha: 'outra123' }) })).status, 400);
  const existente = await criarUsuario();
  assert.equal((await chamar('POST', '/api/auth/register', { corpo: cadastro({ email: existente.email, confirmarEmail: existente.email }) })).status, 400);
});

test('indicação: código válido registra quem indicou; inválido é ignorado', async () => {
  const indicador = await criarUsuario({ codigoIndicacao: 'ABCD2345' });
  const e1 = `ind${seq}@teste.com`;
  await chamar('POST', '/api/auth/register', { corpo: cadastro({ email: e1, confirmarEmail: e1, indicacao: 'abcd2345' }) });
  assert.equal(db.users.find(u => u.email === e1).indicadoPorUserId, indicador.id);

  const e2 = `ind${seq}@teste.com`;
  const r = await chamar('POST', '/api/auth/register', { corpo: cadastro({ email: e2, confirmarEmail: e2, indicacao: 'NAOEXISTE' }) });
  assert.ok([200, 201].includes(r.status));
  assert.equal(db.users.find(u => u.email === e2).indicadoPorUserId, null);
});

test('indicação: recompensa só uma vez e fica pendente se o indicador ainda não assina', async () => {
  const { concederRecompensaIndicacao } = app.__internals;
  const indicador = await criarUsuario();
  const indicado = await criarUsuario({ indicadoPorUserId: indicador.id });

  await concederRecompensaIndicacao(await fakePrisma.user.findUnique({ where: { id: indicado.id } }));
  let i = db.users.find(u => u.id === indicador.id);
  assert.equal(i.indicacoesConvertidas, 1);
  assert.equal(i.creditosIndicacaoPendentes, 1);

  // reenvio do webhook do Stripe não pode premiar de novo
  await concederRecompensaIndicacao(await fakePrisma.user.findUnique({ where: { id: indicado.id } }));
  i = db.users.find(u => u.id === indicador.id);
  assert.equal(i.indicacoesConvertidas, 1);
  assert.equal(i.creditosIndicacaoPendentes, 1);
});

test('indicação: GET /api/indicacao gera código único e estável', async () => {
  const u = await criarUsuario();
  const a = await (await chamar('GET', '/api/indicacao', { token: tokenDe(u) })).json();
  const b = await (await chamar('GET', '/api/indicacao', { token: tokenDe(u) })).json();
  assert.match(a.codigo, /^[A-Z2-9]{8}$/);
  assert.equal(a.codigo, b.codigo);
});

// ---------- LGPD: exportar e excluir ----------
test('LGPD: exportar devolve os dados da conta sem a senha', async () => {
  const u = await criarUsuario({ nomeAcademia: 'Academia X' });
  db.planos.push({ id: 1, nome: 'Mensal', ownerId: u.id });
  const r = await chamar('GET', '/api/conta/exportar', { token: tokenDe(u) });
  assert.equal(r.status, 200);
  const dados = await r.json();
  assert.equal(dados.conta.nomeAcademia, 'Academia X');
  assert.equal(dados.conta.password, undefined);
});

test('LGPD: excluir conta exige confirmação e senha corretas, e apaga tudo', async () => {
  const u = await criarUsuario();
  db.planos.push({ id: 99, nome: 'Mensal', ownerId: u.id });
  db.alunos.push({ id: 99, nome: 'Aluno', ownerId: u.id });
  const tk = tokenDe(u);

  assert.equal((await chamar('DELETE', '/api/conta', { token: tk, corpo: { senha: SENHA } })).status, 400);
  assert.equal((await chamar('DELETE', '/api/conta', { token: tk, corpo: { senha: 'errada', confirmacao: 'EXCLUIR' } })).status, 401);
  assert.ok(db.users.find(x => x.id === u.id), 'conta não pode sumir com senha errada');

  const r = await chamar('DELETE', '/api/conta', { token: tk, corpo: { senha: SENHA, confirmacao: 'EXCLUIR' } });
  assert.equal(r.status, 200);
  assert.equal(db.users.find(x => x.id === u.id), undefined);
  assert.equal(db.alunos.filter(a => a.ownerId === u.id).length, 0);
  assert.equal(db.planos.filter(p => p.ownerId === u.id).length, 0);
});

test('LGPD: conta admin não pode ser excluída pelo próprio endpoint', async () => {
  const adm = await criarUsuario({ role: 'admin' });
  const r = await chamar('DELETE', '/api/conta', { token: tokenDe(adm), corpo: { senha: SENHA, confirmacao: 'EXCLUIR' } });
  assert.equal(r.status, 400);
});

// ---------- utilitários ----------
test('importação CSV: separador ; e vírgula entre aspas', () => {
  const { parseCsvTexto } = app.__internals;
  const a = parseCsvTexto('nome;cpf\nMaria;123');
  assert.deepEqual(a.cabecalho, ['nome', 'cpf']);
  assert.deepEqual(a.linhas[0], ['Maria', '123']);
  const b = parseCsvTexto('nome,obs\n"Silva, João",ok');
  assert.deepEqual(b.linhas[0], ['Silva, João', 'ok']);
});

test('datas: aceita DD/MM/AAAA e AAAA-MM-DD, rejeita lixo', () => {
  const { parseDataFlexivel } = app.__internals;
  assert.equal(parseDataFlexivel('05/03/1990'), '1990-03-05');
  assert.equal(parseDataFlexivel('1990-3-5'), '1990-03-05');
  assert.equal(parseDataFlexivel('ontem'), null);
  assert.equal(parseDataFlexivel(''), null);
});

test('e-mails: nome do aluno é escapado (sem HTML injetado)', () => {
  const { escapeHtml } = app.__internals;
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
});
