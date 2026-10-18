// Testes automáticos dos fluxos críticos (login, acesso/cobrança, admin, indicação, LGPD).
// Rodam sem banco de dados: o Prisma é substituído por um banco falso em memória.
// Executar com:  npm test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste';
process.env.PLATFORM_ADMIN_EMAIL = 'dono@teste.com';
delete process.env.STRIPE_SECRET_KEY;
delete process.env.RESEND_API_KEY;
process.env.EVOLUTION_API_URL = 'http://evolution.test';
process.env.EVOLUTION_API_KEY = 'chave-global';

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


// ---------- Evolution API falso (WhatsApp) ----------
const fetchReal = globalThis.fetch;
const chamadasEvolution = [];
let estadoEvolution = 'close';
globalThis.fetch = async (url, opts = {}) => {
  const alvo = String(url);
  if (!alvo.startsWith('http://evolution.test')) return fetchReal(url, opts);
  const caminho = alvo.replace('http://evolution.test', '');
  const metodo = opts.method || 'GET';
  chamadasEvolution.push({ metodo, caminho, corpo: opts.body ? JSON.parse(opts.body) : null, apikey: opts.headers?.apikey });
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
  if (metodo === 'POST' && caminho === '/instance/create') return json({ instance: { instanceName: 'x' } }, 201);
  if (caminho.startsWith('/instance/connectionState/')) return json({ instance: { state: estadoEvolution } });
  if (caminho.startsWith('/instance/connect/')) return json({ base64: 'data:image/png;base64,QRFAKE', code: 'abc' });
  if (caminho.startsWith('/instance/logout/') || caminho.startsWith('/instance/delete/')) return json({ status: 'SUCCESS' });
  if (caminho.startsWith('/message/sendText/')) return json({ key: { id: '1' } }, 201);
  return json({ error: 'rota desconhecida' }, 404);
};
const chamadasDe = (inicio) => chamadasEvolution.filter(c => c.caminho.startsWith(inicio));

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
    body: corpo && metodo !== 'GET' ? JSON.stringify(corpo) : undefined,
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


// ---------- WHATSAPP POR ACADEMIA ----------
test('WhatsApp: conectar cria a instância própria do cliente e devolve o QR', async () => {
  const u = await criarUsuario();
  estadoEvolution = 'close';
  const antes = chamadasDe('/instance/create').length;
  const r = await chamar('POST', '/api/whatsapp/conectar', { token: tokenDe(u) });
  assert.equal(r.status, 200);
  const dados = await r.json();
  assert.equal(dados.estado, 'connecting');
  assert.equal(dados.qrcode, 'data:image/png;base64,QRFAKE');
  assert.equal(db.users.find(x => x.id === u.id).whatsappInstancia, `gymflow-${u.id}`);
  const criacoes = chamadasDe('/instance/create').slice(antes);
  assert.equal(criacoes.length, 1);
  assert.equal(criacoes[0].corpo.instanceName, `gymflow-${u.id}`);
  assert.equal(criacoes[0].apikey, 'chave-global');

  // segunda chamada reaproveita a instância (não cria outra) e devolve novo QR
  await chamar('POST', '/api/whatsapp/conectar', { token: tokenDe(u) });
  assert.equal(chamadasDe('/instance/create').slice(antes).length, 1);
});

test('WhatsApp: já conectado não pede novo QR', async () => {
  const u = await criarUsuario({ whatsappInstancia: 'gymflow-x' });
  estadoEvolution = 'open';
  const antes = chamadasDe('/instance/connect/').length;
  const dados = await (await chamar('POST', '/api/whatsapp/conectar', { token: tokenDe(u) })).json();
  assert.equal(dados.estado, 'open');
  assert.equal(chamadasDe('/instance/connect/').length, antes);
});

test('WhatsApp: cada cliente tem a sua instância (isolamento)', async () => {
  estadoEvolution = 'close';
  const a = await criarUsuario();
  const b = await criarUsuario();
  await chamar('POST', '/api/whatsapp/conectar', { token: tokenDe(a) });
  await chamar('POST', '/api/whatsapp/conectar', { token: tokenDe(b) });
  const ia = db.users.find(x => x.id === a.id).whatsappInstancia;
  const ib = db.users.find(x => x.id === b.id).whatsappInstancia;
  assert.notEqual(ia, ib);
});

test('WhatsApp: status reflete o estado real do Evolution', async () => {
  const sem = await criarUsuario();
  assert.equal((await (await chamar('GET', '/api/whatsapp/status', { token: tokenDe(sem) })).json()).estado, 'sem_instancia');
  const com = await criarUsuario({ whatsappInstancia: 'gymflow-y' });
  estadoEvolution = 'open';
  assert.equal((await (await chamar('GET', '/api/whatsapp/status', { token: tokenDe(com) })).json()).estado, 'open');
  estadoEvolution = 'close';
  assert.equal((await (await chamar('GET', '/api/whatsapp/status', { token: tokenDe(com) })).json()).estado, 'close');
});

test('WhatsApp: conta sem acesso (bloqueada) não cria instância', async () => {
  const u = await criarUsuario({ bloqueadoPorAdmin: true });
  const antes = chamadasDe('/instance/create').length;
  const r = await chamar('POST', '/api/whatsapp/conectar', { token: tokenDe(u) });
  assert.equal(r.status, 402);
  assert.equal(chamadasDe('/instance/create').length, antes);
});

test('WhatsApp: não deixa ligar o envio automático sem WhatsApp conectado', async () => {
  const sem = await criarUsuario();
  const r = await chamar('PUT', '/api/conta/academia', { token: tokenDe(sem), corpo: { whatsappAutoEnviar: true } });
  assert.equal(r.status, 400);
  assert.equal(db.users.find(x => x.id === sem.id).whatsappAutoEnviar, undefined);

  const com = await criarUsuario({ whatsappInstancia: 'gymflow-z' });
  const r2 = await chamar('PUT', '/api/conta/academia', { token: tokenDe(com), corpo: { whatsappAutoEnviar: true } });
  assert.equal(r2.status, 200);
});

test('WhatsApp: mensagem sai pela instância da própria academia e falha sem instância', async () => {
  const { enviarWhatsApp } = app.__internals;
  const antes = chamadasDe('/message/sendText/').length;
  await enviarWhatsApp('5511999999999', 'Olá', 'gymflow-42');
  const envio = chamadasDe('/message/sendText/').slice(antes)[0];
  assert.equal(envio.caminho, '/message/sendText/gymflow-42');
  assert.deepEqual(envio.corpo, { number: '5511999999999', text: 'Olá' });
  await assert.rejects(() => enviarWhatsApp('5511999999999', 'Olá', null), /não conectado/i);
});

test('WhatsApp: desconectar faz logout e desliga o envio automático', async () => {
  const u = await criarUsuario({ whatsappInstancia: 'gymflow-w', whatsappAutoEnviar: true });
  const r = await chamar('POST', '/api/whatsapp/desconectar', { token: tokenDe(u) });
  assert.equal(r.status, 200);
  assert.ok(chamadasDe('/instance/logout/gymflow-w').length >= 1);
  assert.equal(db.users.find(x => x.id === u.id).whatsappAutoEnviar, false);
});

test('WhatsApp: excluir a conta apaga também a instância no Evolution', async () => {
  const u = await criarUsuario({ whatsappInstancia: 'gymflow-del' });
  const r = await chamar('DELETE', '/api/conta', { token: tokenDe(u), corpo: { senha: SENHA, confirmacao: 'EXCLUIR' } });
  assert.equal(r.status, 200);
  assert.ok(chamadasDe('/instance/delete/gymflow-del').length >= 1);
});


// ---------- COBRANÇA: PARA DE COBRAR APÓS N DIAS DE ATRASO ----------
function diaRelativo(diasAFrente) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diasAFrente);
  return d;
}
async function numerosEnviadosPara(user) {
  const { dispararNotificacoesParaUsuario } = app.__internals;
  const antes = chamadasDe('/message/sendText/').length;
  await dispararNotificacoesParaUsuario(user.id, 'manual');
  return chamadasDe('/message/sendText/').slice(antes).map(c => c.corpo.number).sort();
}
function alunoComVencimento(ownerId, numero, diasAFrente) {
  db.alunos.push({ id: seq++, nome: `Aluno ${numero}`, whatsapp: numero, dataVencimento: diaRelativo(diasAFrente), ownerId });
}

test('cobrança: para de cobrar quem passou do limite de dias de atraso (padrão 5)', async () => {
  const u = await criarUsuario({ whatsappInstancia: 'gymflow-cob' });
  alunoComVencimento(u.id, '11900000001', 0);    // vence hoje -> cobra
  alunoComVencimento(u.id, '11900000002', -3);   // 3 dias de atraso -> cobra
  alunoComVencimento(u.id, '11900000003', -5);   // 5 dias (no limite) -> cobra
  alunoComVencimento(u.id, '11900000004', -6);   // 6 dias -> NÃO cobra mais
  alunoComVencimento(u.id, '11900000005', -30);  // 30 dias -> NÃO cobra
  alunoComVencimento(u.id, '11900000006', 5);    // falta 5 dias -> lembrete
  alunoComVencimento(u.id, '11900000007', 2);    // falta 2 dias -> nada
  const enviados = await numerosEnviadosPara(u);
  assert.deepEqual(enviados, ['5511900000001', '5511900000002', '5511900000003', '5511900000006']);
});

test('cobrança: o limite é configurável por academia', async () => {
  const u = await criarUsuario({ whatsappInstancia: 'gymflow-cob2', whatsappDiasMaxAtraso: 2 });
  alunoComVencimento(u.id, '11911110001', -2);   // no limite -> cobra
  alunoComVencimento(u.id, '11911110002', -3);   // passou -> não cobra
  const enviados = await numerosEnviadosPara(u);
  assert.deepEqual(enviados, ['5511911110001']);
});

test('cobrança: o limite vale também para o disparo automático (cron)', async () => {
  const { dispararNotificacoesParaUsuario } = app.__internals;
  const u = await criarUsuario({ whatsappInstancia: 'gymflow-cob3', whatsappAutoEnviar: true });
  alunoComVencimento(u.id, '11922220001', -40);
  const antes = chamadasDe('/message/sendText/').length;
  await dispararNotificacoesParaUsuario(u.id, 'cron');
  assert.equal(chamadasDe('/message/sendText/').length, antes);
});

test('cobrança: configuração valida o limite (1 a 90) e salva', async () => {
  const u = await criarUsuario();
  const tk = tokenDe(u);
  assert.equal((await chamar('PUT', '/api/conta/academia', { token: tk, corpo: { whatsappDiasMaxAtraso: 0 } })).status, 400);
  assert.equal((await chamar('PUT', '/api/conta/academia', { token: tk, corpo: { whatsappDiasMaxAtraso: 91 } })).status, 400);
  assert.equal((await chamar('PUT', '/api/conta/academia', { token: tk, corpo: { whatsappDiasMaxAtraso: 2.5 } })).status, 400);
  const r = await chamar('PUT', '/api/conta/academia', { token: tk, corpo: { whatsappDiasMaxAtraso: 7 } });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).whatsappDiasMaxAtraso, 7);
  assert.equal(db.users.find(x => x.id === u.id).whatsappDiasMaxAtraso, 7);
});


// ---------- MODO ADMINISTRADOR x RECEPCIONISTA (imposto no servidor) ----------
const claims = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

test('modo: entrar como recepcionista gera token novo e revoga o de administrador', async () => {
  const u = await criarUsuario();
  const admin = tokenDe(u);
  const r = await chamar('POST', '/api/modo/recepcionista', { token: admin });
  assert.equal(r.status, 200);
  const dados = await r.json();
  assert.equal(claims(dados.token).modo, 'recepcionista');
  assert.equal((await chamar('GET', '/api/alunos', { token: admin })).status, 401, 'token antigo precisa estar revogado');
  assert.equal((await chamar('GET', '/api/alunos', { token: dados.token })).status, 200);
});

test('modo: recepcionista é barrado nas ações restritas, mas usa o dia a dia', async () => {
  const u = await criarUsuario({ subscriptionStatus: 'active' });
  const rec = (await (await chamar('POST', '/api/modo/recepcionista', { token: tokenDe(u) })).json()).token;
  const barradas = [
    ['DELETE', '/api/alunos/1'], ['DELETE', '/api/planos/1'], ['DELETE', '/api/pagamentos/1'],
    ['PUT', '/api/conta/academia'], ['GET', '/api/conta/exportar'], ['DELETE', '/api/conta'],
    ['POST', '/api/billing/cancelar'], ['POST', '/api/billing/checkout'], ['POST', '/api/whatsapp/conectar'],
    ['POST', '/api/whatsapp/desconectar'], ['PUT', '/api/auth/senha'], ['PUT', '/api/conta/pin-admin'],
  ];
  for (const [metodo, caminho] of barradas) {
    const r = await chamar(metodo, caminho, { token: rec, corpo: {} });
    assert.equal(r.status, 403, `${metodo} ${caminho} deveria ser barrado`);
    assert.equal((await r.json()).code, 'ADMIN_MODE_REQUIRED');
  }
  assert.equal((await chamar('GET', '/api/alunos', { token: rec })).status, 200);
  assert.equal((await chamar('GET', '/api/conta/academia', { token: rec })).status, 200);
});

test('modo: recepcionista não consegue virar administrador sem a senha', async () => {
  const u = await criarUsuario();
  const rec = (await (await chamar('POST', '/api/modo/recepcionista', { token: tokenDe(u) })).json()).token;
  assert.equal((await chamar('POST', '/api/modo/admin', { token: rec, corpo: {} })).status, 400);
  assert.equal((await chamar('POST', '/api/modo/admin', { token: rec, corpo: { pin: 'errada' } })).status, 401);
});

test('modo: sem PIN criado, a senha da conta volta ao modo administrador', async () => {
  const u = await criarUsuario();
  const rec = (await (await chamar('POST', '/api/modo/recepcionista', { token: tokenDe(u) })).json()).token;
  const r = await chamar('POST', '/api/modo/admin', { token: rec, corpo: { pin: SENHA } });
  assert.equal(r.status, 200);
  const novo = (await r.json()).token;
  assert.equal(claims(novo).modo, undefined);
  assert.equal((await chamar('GET', '/api/alunos', { token: rec })).status, 401, 'token de recepcionista fica revogado');
  assert.equal((await chamar('PUT', '/api/conta/academia', { token: novo, corpo: {} })).status, 200);
});

test('modo: com PIN criado, só o PIN volta ao modo administrador (a senha da conta não vale)', async () => {
  const u = await criarUsuario();
  const tk = tokenDe(u);
  const criar = await chamar('PUT', '/api/conta/pin-admin', { token: tk, corpo: { senha: SENHA, pin: '4321' } });
  assert.equal(criar.status, 200);
  assert.ok(db.users.find(x => x.id === u.id).pinAdminHash, 'guarda só o hash');
  assert.notEqual(db.users.find(x => x.id === u.id).pinAdminHash, '4321');

  const rec = (await (await chamar('POST', '/api/modo/recepcionista', { token: tk })).json()).token;
  assert.equal((await chamar('POST', '/api/modo/admin', { token: rec, corpo: { pin: SENHA } })).status, 401);
  assert.equal((await chamar('POST', '/api/modo/admin', { token: rec, corpo: { pin: '4321' } })).status, 200);
});

test('modo: 5 PINs errados bloqueiam as tentativas por um tempo', async () => {
  const u = await criarUsuario();
  const rec = (await (await chamar('POST', '/api/modo/recepcionista', { token: tokenDe(u) })).json()).token;
  for (let i = 0; i < 5; i++) {
    assert.equal((await chamar('POST', '/api/modo/admin', { token: rec, corpo: { pin: 'x' + i } })).status, 401);
  }
  assert.equal((await chamar('POST', '/api/modo/admin', { token: rec, corpo: { pin: SENHA } })).status, 429);
});

test('modo: criar PIN exige a senha da conta e formato de 4 a 8 números', async () => {
  const u = await criarUsuario();
  const tk = tokenDe(u);
  assert.equal((await chamar('PUT', '/api/conta/pin-admin', { token: tk, corpo: { senha: 'errada', pin: '1234' } })).status, 401);
  assert.equal((await chamar('PUT', '/api/conta/pin-admin', { token: tk, corpo: { senha: SENHA, pin: '12' } })).status, 400);
  assert.equal((await chamar('PUT', '/api/conta/pin-admin', { token: tk, corpo: { senha: SENHA, pin: 'abcd' } })).status, 400);
  assert.equal((await chamar('PUT', '/api/conta/pin-admin', { token: tk, corpo: { senha: SENHA, pin: '123456789' } })).status, 400);
  const ok = await (await chamar('PUT', '/api/conta/pin-admin', { token: tk, corpo: { senha: SENHA, pin: null } })).json();
  assert.equal(ok.temPinAdmin, false);
});

test('sessão: /verify e troca de senha recusam token revogado (pós-logout)', async () => {
  const u = await criarUsuario();
  const tk = tokenDe(u);
  assert.equal((await chamar('GET', '/api/auth/verify', { token: tk })).status, 200);
  await chamar('POST', '/api/auth/logout', { token: tk });
  assert.equal((await chamar('GET', '/api/auth/verify', { token: tk })).status, 401);
  const r = await chamar('PUT', '/api/auth/senha', { token: tk, corpo: { senhaAtual: SENHA, novaSenha: 'nova12345' } });
  assert.equal(r.status, 401);
  assert.ok(bcrypt.compareSync(SENHA, db.users.find(x => x.id === u.id).password), 'senha não pode ter mudado');
});

test('sessão: troca de senha funciona em modo administrador', async () => {
  const u = await criarUsuario();
  const r = await chamar('PUT', '/api/auth/senha', { token: tokenDe(u), corpo: { senhaAtual: SENHA, novaSenha: 'nova12345' } });
  assert.equal(r.status, 200);
  assert.ok(bcrypt.compareSync('nova12345', db.users.find(x => x.id === u.id).password));
});


// ---------- SEO / SITE PÚBLICO ----------
test('site: preços e limites do site batem com os do servidor (fonte única)', async () => {
  const { PLANOS } = await import('../frontend/src/lib/conteudo.js');
  const { LIMITES_POR_PLANO, PRECOS_POR_PLANO } = app.__internals;
  for (const p of PLANOS) {
    assert.equal(LIMITES_POR_PLANO[p.id], p.limiteAlunos, `limite do plano ${p.id}`);
    assert.equal(PRECOS_POR_PLANO[p.id], p.preco, `preço do plano ${p.id}`);
  }
  assert.deepEqual(PLANOS.map(p => p.limiteAlunos), [150, 250, 350]);
});

test('site: página inicial tem título, descrição, canonical, Open Graph e dados estruturados válidos', async () => {
  const html = await (await fetch(base + '/')).text();
  assert.match(html, /<title>[^<]{20,}<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]{80,}/);
  assert.match(html, /<link rel="canonical" href="https?:\/\/[^"]+\/"/);
  assert.match(html, /property="og:image" content="https?:\/\/[^"]+og-image\.png"/);
  assert.match(html, /<h1>[^<]+<\/h1>/, 'precisa ter h1 em HTML puro para robôs sem JavaScript');
  const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(ld, 'JSON-LD presente');
  const tipos = JSON.parse(ld[1])['@graph'].map(x => x['@type']);
  for (const t of ['Organization', 'WebSite', 'SoftwareApplication', 'FAQPage']) assert.ok(tipos.includes(t), t);
});

test('site: robots.txt, sitemap.xml e llms.txt são servidos', async () => {
  const robots = await (await fetch(base + '/robots.txt')).text();
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap: https?:\/\//);
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  assert.match(sitemap, /<loc>https?:\/\/[^<]+\/<\/loc>/);
  const llms = await (await fetch(base + '/llms.txt')).text();
  assert.match(llms, /R\$ 150/);
  assert.match(llms, /até 350 alunos/);
});

test('site: nenhum depoimento inventado na página inicial', async () => {
  const fonte = require('fs').readFileSync(require('path').join(__dirname, '../frontend/src/pages/LandingPage.jsx'), 'utf-8');
  assert.doesNotMatch(fonte, /DEPOIMENTOS|IronFit|Box CrossFit Alpha/);
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
