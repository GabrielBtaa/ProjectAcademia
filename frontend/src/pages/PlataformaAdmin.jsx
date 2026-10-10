import { useState, useEffect, useMemo } from 'react';
import { Search, Users, ShieldOff, ShieldCheck, Gift, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PlataformaMetricas from './PlataformaMetricas';

const NOMES_PLANO = { starter: 'Starter', pro: 'Pro', business: 'Business' };
const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'ativo', label: 'Ativos (pagando)' },
  { id: 'cortesia', label: 'Cortesia' },
  { id: 'trial', label: 'Em teste' },
  { id: 'inativo', label: 'Inativos' },
  { id: 'bloqueado', label: 'Bloqueados' },
];

// Situação "real" da conta, considerando liberação/bloqueio manual
function situacao(u) {
  if (u.bloqueadoPorAdmin) return { id: 'bloqueado', label: 'Bloqueado', cor: '#f87171' };
  if (u.acessoLiberadoManual) return { id: 'cortesia', label: 'Cortesia (sem pagamento)', cor: '#a78bfa' };
  if (u.subscriptionStatus === 'active') return { id: 'ativo', label: u.cancelamentoAgendado ? 'Ativo (cancela no fim do ciclo)' : 'Ativo', cor: '#22c55e' };
  if (u.subscriptionStatus === 'trial') {
    const valido = u.trialEndsAt && new Date(u.trialEndsAt) > new Date();
    return valido ? { id: 'trial', label: 'Em teste', cor: '#f59e0b' } : { id: 'inativo', label: 'Teste expirado', cor: '#9ca3af' };
  }
  if (u.subscriptionStatus === 'past_due') return { id: 'inativo', label: 'Pagamento atrasado', cor: '#f59e0b' };
  if (u.subscriptionStatus === 'canceled') return { id: 'inativo', label: 'Cancelado', cor: '#9ca3af' };
  return { id: 'inativo', label: 'Inativo', cor: '#9ca3af' };
}

const fmtData = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

function Faturas({ userId }) {
  const [faturas, setFaturas] = useState(null);
  const [erro, setErro] = useState(null);
  useEffect(() => {
    apiFetch(`/api/plataforma/usuarios/${userId}/faturas`)
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Erro'); setFaturas(d); })
      .catch(e => setErro(e.message));
  }, [userId]);

  if (erro) return <p className="text-xs" style={{ color: '#f87171' }}>{erro}</p>;
  if (!faturas) return <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Loader2 size={12} className="animate-spin" /> Buscando pagamentos no Stripe...</p>;
  if (faturas.length === 0) return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhum pagamento registrado no Stripe para esta conta.</p>;
  return (
    <div className="space-y-1">
      {faturas.map(f => (
        <div key={f.id} className="flex items-center justify-between gap-2 text-xs py-1" style={{ borderBottom: '1px solid var(--border-2)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{fmtData(f.data)}</span>
          <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
            {f.valor.toLocaleString('pt-BR', { style: 'currency', currency: f.moeda === 'BRL' ? 'BRL' : f.moeda })}
          </span>
          <span style={{ color: f.status === 'paid' ? '#22c55e' : '#f59e0b' }}>{f.status === 'paid' ? 'pago' : f.status}</span>
          {f.url && <a href={f.url} target="_blank" rel="noreferrer" aria-label="Abrir fatura" style={{ color: '#60a5fa' }}><ExternalLink size={12} /></a>}
        </div>
      ))}
    </div>
  );
}

function CartaoUsuario({ u, onAcao, ocupado }) {
  const [aberto, setAberto] = useState(false);
  const sit = situacao(u);
  const botao = (acao, label, Icon, cor, confirmacao) => (
    <button
      disabled={ocupado}
      onClick={() => { if (!confirmacao || window.confirm(confirmacao)) onAcao(u.id, acao); }}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
      style={{ background: `${cor}1a`, color: cor, border: `1px solid ${cor}40` }}
    >
      <Icon size={13} /> {label}
    </button>
  );

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-heading)' }}>{u.email}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {u.nome}{u.nomeAcademia ? ` • ${u.nomeAcademia}` : ''}
          </p>
        </div>
        <span className="text-[0.68rem] font-bold px-2 py-1 rounded-full flex-shrink-0 text-center" style={{ background: `${sit.cor}1f`, color: sit.cor }}>
          {sit.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div><p style={{ color: 'var(--text-muted)' }}>Plano</p><p className="font-semibold" style={{ color: 'var(--text-heading)' }}>{NOMES_PLANO[u.subscriptionTier] || u.subscriptionTier || '—'}</p></div>
        <div><p style={{ color: 'var(--text-muted)' }}>Alunos cadastrados</p><p className="font-semibold" style={{ color: 'var(--text-heading)' }}>{u.totalAlunos}{u.maxAlunos && u.maxAlunos < 9999 ? ` / ${u.maxAlunos}` : ''}</p></div>
        <div><p style={{ color: 'var(--text-muted)' }}>Cadastro</p><p className="font-semibold" style={{ color: 'var(--text-heading)' }}>{fmtData(u.createdAt)}</p></div>
        <div><p style={{ color: 'var(--text-muted)' }}>Último acesso</p><p className="font-semibold" style={{ color: 'var(--text-heading)' }}>{fmtData(u.ultimoAcessoEm)}</p></div>
      </div>

      {u.role !== 'admin' && (
        <div className="flex flex-wrap gap-2">
          {u.bloqueadoPorAdmin
            ? botao('desbloquear', 'Desbloquear', ShieldCheck, '#22c55e')
            : botao('bloquear', 'Bloquear acesso', ShieldOff, '#f87171', `Bloquear o acesso de ${u.email}? Ele não conseguirá usar o sistema.`)}
          {u.acessoLiberadoManual
            ? botao('remover_liberacao', 'Remover cortesia', Gift, '#9ca3af', `Remover a liberação gratuita de ${u.email}?`)
            : !u.bloqueadoPorAdmin && botao('liberar', 'Liberar sem pagamento', Gift, '#a78bfa', `Liberar ${u.email} sem exigir pagamento?`)}
        </div>
      )}

      <button onClick={() => setAberto(a => !a)} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#60a5fa' }}>
        {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Pagamentos e detalhes
      </button>
      {aberto && (
        <div className="space-y-2">
          {u.assinaturaRenovaEm && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Próxima renovação / fim do ciclo: <strong>{fmtData(u.assinaturaRenovaEm)}</strong></p>}
          {u.motivoCancelamento && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Motivo do cancelamento: "{u.motivoCancelamento}"</p>}
          {u.telefoneAcademia && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Telefone: {u.telefoneAcademia}</p>}
          <Faturas userId={u.id} />
        </div>
      )}
    </div>
  );
}

function ClientesTab() {
  const [usuarios, setUsuarios] = useState(null);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [ocupado, setOcupado] = useState(false);

  const carregar = () => {
    apiFetch('/api/plataforma/usuarios')
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Erro ao carregar clientes'); setUsuarios(d); })
      .catch(e => setErro(e.message));
  };
  useEffect(carregar, []);

  const handleAcao = async (id, acao) => {
    setOcupado(true);
    try {
      const r = await apiFetch(`/api/plataforma/usuarios/${id}/acesso`, { method: 'POST', body: JSON.stringify({ acao }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Erro ao alterar acesso');
      setUsuarios(prev => prev.map(u => (u.id === id ? { ...u, acessoLiberadoManual: d.acessoLiberadoManual, bloqueadoPorAdmin: d.bloqueadoPorAdmin } : u)));
    } catch (e) {
      alert(e.message);
    } finally {
      setOcupado(false);
    }
  };

  const filtrados = useMemo(() => {
    if (!usuarios) return [];
    const termo = busca.trim().toLowerCase();
    return usuarios.filter(u => {
      if (filtro !== 'todos' && situacao(u).id !== filtro) return false;
      if (!termo) return true;
      return [u.email, u.nome, u.nomeAcademia].some(c => (c || '').toLowerCase().includes(termo));
    });
  }, [usuarios, busca, filtro]);

  if (erro) return <p className="text-sm" style={{ color: '#f87171' }}>{erro}</p>;
  if (!usuarios) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando clientes...</p>;

  const totalAlunos = usuarios.reduce((soma, u) => soma + u.totalAlunos, 0);

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {usuarios.length} conta(s) cadastrada(s) • {totalAlunos} aluno(s) no total • mostrando {filtrados.length}
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por e-mail, nome ou academia"
            className="w-full rounded-lg py-2.5 pl-9 pr-3 text-sm"
            style={{ background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)', color: 'var(--text-heading)' }}
          />
        </div>
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="rounded-lg py-2.5 px-3 text-sm"
          style={{ background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)', color: 'var(--text-heading)' }}
        >
          {FILTROS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {filtrados.map(u => <CartaoUsuario key={u.id} u={u} onAcao={handleAcao} ocupado={ocupado} />)}
      </div>
      {filtrados.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Nenhuma conta encontrada.</p>}
    </div>
  );
}

export default function PlataformaAdmin() {
  const [aba, setAba] = useState('clientes');
  const abas = [{ id: 'clientes', label: 'Clientes', icon: Users }, { id: 'metricas', label: 'Métricas', icon: null }];
  return (
    <div className="p-4 lg:p-6 space-y-5 page-enter">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>Admin do SaaS</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Área restrita ao dono da plataforma</p>
      </div>
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)' }}>
        {abas.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={aba === a.id ? { background: '#2563eb', color: '#fff' } : { color: 'var(--text-secondary)' }}
          >
            {a.label}
          </button>
        ))}
      </div>
      {aba === 'clientes' ? <ClientesTab /> : <PlataformaMetricas embutido />}
    </div>
  );
}
