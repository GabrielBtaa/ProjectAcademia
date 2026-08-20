import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  DollarSign,
  Check,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Edit2,
  Trash2,
  TrendingUp,
  PackagePlus,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

// ===== Sub-componente: Modal de Plano =====
function PlanoModal({ plano, onClose, onSave }) {
  const [form, setForm] = useState(
    plano || { nome: '', duracao: 1, valor: '', descricao: '' }
  );
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.nome.trim()) errs.nome = 'Nome do plano é obrigatório';
    if (!form.valor || isNaN(form.valor) || Number(form.valor) <= 0) errs.valor = 'Valor inválido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, valor: Number(form.valor), duracao: Number(form.duracao) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl animate-fade-in-up" style={{ background: 'var(--surface-modal)', border: '1px solid var(--border-3)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <h3 className="font-bold text-heading text-base">{plano ? 'Editar Plano' : 'Novo Plano'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-heading p-1 rounded-lg transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome do Plano *</label>
            <input className="input-field" placeholder="Ex: Mensal, Trimestral..." value={form.nome} onChange={e => handleChange('nome', e.target.value)} />
            {errors.nome && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.nome}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Duração (meses) *</label>
              <input className="input-field" type="number" min="1" max="24" value={form.duracao} onChange={e => handleChange('duracao', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Valor (R$) *</label>
              <input className="input-field" type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={e => handleChange('valor', e.target.value)} />
              {errors.valor && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.valor}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Descrição</label>
            <input className="input-field" placeholder="Descrição do plano..." value={form.descricao} onChange={e => handleChange('descricao', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1 justify-center"><Check size={15} /> Salvar Plano</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Sub-componente: Modal de Registrar Pagamento =====
function PagamentoModal({ alunos, planos, onClose, onSave }) {
  const [form, setForm] = useState({
    alunoId: '',
    valor: '',
    metodo: 'PIX',
    data: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'alunoId') {
      const aluno = alunos.find(a => a.id === Number(value));
      if (aluno) {
        const plano = planos.find(p => p.id === aluno.planoId);
        setForm(prev => ({ ...prev, alunoId: value, valor: plano ? plano.valor : prev.valor }));
      }
    }
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.alunoId) errs.alunoId = 'Selecione um aluno';
    if (!form.valor || Number(form.valor) <= 0) errs.valor = 'Valor inválido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const aluno = alunos.find(a => a.id === Number(form.alunoId));
    onSave({
      alunoId: Number(form.alunoId),
      valor: Number(form.valor),
      data: form.data,
      status: 'confirmado',
      metodo: form.metodo,
      aluno: aluno?.nome || '',
      plano: aluno?.plano || '',
    });
  };

  const METODOS = [
    { value: 'PIX', label: 'PIX', icon: Smartphone },
    { value: 'Cartão', label: 'Cartão', icon: CreditCard },
    { value: 'Dinheiro', label: 'Dinheiro', icon: Banknote },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl animate-fade-in-up" style={{ background: 'var(--surface-modal)', border: '1px solid var(--border-3)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <h3 className="font-bold text-heading text-base">Registrar Pagamento</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-heading p-1 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Seleção de Aluno */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Aluno *</label>
            <select className="input-field" value={form.alunoId} onChange={e => handleChange('alunoId', e.target.value)} style={{ colorScheme: 'dark' }}>
              <option value="" style={{ background: 'var(--surface-modal)' }}>Selecione o aluno...</option>
              {alunos.map(a => (
                <option key={a.id} value={a.id} style={{ background: 'var(--surface-modal)' }}>
                  {a.nome} – {a.plano}
                </option>
              ))}
            </select>
            {errors.alunoId && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.alunoId}</p>}
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Valor (R$) *</label>
              <input className="input-field" type="number" step="0.01" min="0" value={form.valor} onChange={e => handleChange('valor', e.target.value)} placeholder="0,00" />
              {errors.valor && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.valor}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data</label>
              <input className="input-field" type="date" value={form.data} onChange={e => handleChange('data', e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
          </div>

          {/* Método de Pagamento */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Forma de Pagamento *</label>
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChange('metodo', value)}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-all"
                  style={
                    form.metodo === value
                      ? { background: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa', border: '2px solid #2563eb' }
                      : { background: 'var(--surface-alt-2)', color: 'var(--text-muted)', border: '2px solid var(--border-1)' }
                  }
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1 justify-center"><Check size={15} /> Confirmar Pagamento</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Página Financeiro
 * Gestão de planos + registro de pagamentos com histórico.
 */
export default function Financeiro() {
  const [planos, setPlanos] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [modalPlano, setModalPlano] = useState(false);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [planoEditando, setPlanoEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroMetodo, setFiltroMetodo] = useState('todos');
  const [filtroMesAno, setFiltroMesAno] = useState('todos');

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      setError(null);
      try {
        const [planosRes, alunosRes, pagamentosRes] = await Promise.all([
          apiFetch(('/api/planos')),
          apiFetch(('/api/alunos')),
          apiFetch(('/api/pagamentos')),
        ]);

        if (!planosRes.ok || !alunosRes.ok || !pagamentosRes.ok) {
          const message = !planosRes.ok
            ? await planosRes.text()
            : !alunosRes.ok
            ? await alunosRes.text()
            : await pagamentosRes.text();
          throw new Error(message || 'Erro ao carregar dados do servidor');
        }

        const planosData = await planosRes.json();
        const alunosData = await alunosRes.json();
        const pagamentosData = await pagamentosRes.json();

        setPlanos(planosData);
        setAlunos(alunosData);
        setPagamentos(pagamentosData);
      } catch (fetchError) {
        console.error('Erro ao carregar dados financeiros:', fetchError);
        setError(fetchError.message || 'Falha ao carregar dados financeiros');
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const totalFaturado = useMemo(() =>
    pagamentos.filter(p => p.status === 'confirmado').reduce((acc, p) => acc + Number(p.valor), 0),
    [pagamentos]
  );

  // Opções de mês/ano geradas a partir dos pagamentos existentes (mais recentes primeiro)
  const opcoesMesAno = useMemo(() => {
    const set = new Set(pagamentos.map(p => p.data?.slice(0, 7)).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [pagamentos]);

  const pagamentosFiltrados = useMemo(() => pagamentos.filter(p => {
    const matchMetodo = filtroMetodo === 'todos' || p.metodo === filtroMetodo;
    const matchMesAno = filtroMesAno === 'todos' || p.data?.slice(0, 7) === filtroMesAno;
    return matchMetodo && matchMesAno;
  }), [pagamentos, filtroMetodo, filtroMesAno]);

  const handleSalvarPlano = async (dados) => {
    try {
      if (planoEditando) {
        const response = await apiFetch((`/api/planos/${planoEditando.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });
        if (!response.ok) throw new Error(await response.text());
        const updated = await response.json();
        setPlanos(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const response = await apiFetch(('/api/planos'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });
        if (!response.ok) throw new Error(await response.text());
        const created = await response.json();
        setPlanos(prev => [created, ...prev]);
      }
    } catch (saveError) {
      console.error('Erro ao salvar plano:', saveError);
      setError('Não foi possível salvar o plano');
    } finally {
      setModalPlano(false);
      setPlanoEditando(null);
    }
  };

  const handleSalvarPagamento = async (dados) => {
    try {
      const response = await apiFetch(('/api/pagamentos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Não foi possível registrar o pagamento.');
      }
      const created = await response.json();
      setPagamentos(prev => [created, ...prev]);
      // Atualiza o aluno localmente (status/vencimento) e recarrega a lista completa
      // para refletir a mensalidade renovada em todas as telas.
      if (created.aluno) {
        setAlunos(prev => prev.map(a => (
          a.id === created.aluno.id
            ? { ...a, status: created.aluno.status, dataVencimento: created.aluno.dataVencimento }
            : a
        )));
      }
      try {
        const alunosRes = await apiFetch(('/api/alunos'));
        if (alunosRes.ok) setAlunos(await alunosRes.json());
      } catch { /* mantém a atualização otimista se a releitura falhar */ }

      // Dispara evento para atualizar as notificações instantaneamente na Topbar
      window.dispatchEvent(new CustomEvent('gymflow:payment-saved'));
      window.dispatchEvent(new CustomEvent('gymflow:data-changed'));
    } catch (saveError) {
      console.error('Erro ao salvar pagamento:', saveError);
      setError(saveError.message || 'Não foi possível registrar o pagamento');
    } finally {
      setModalPagamento(false);
    }
  };

  const handleExcluirPlano = async (id) => {
    if (!window.confirm('Excluir este plano?')) return;
    try {
      const response = await apiFetch((`/api/planos/${id}`), { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      setPlanos(prev => prev.filter(p => p.id !== id));
    } catch (deleteError) {
      console.error('Erro ao excluir plano:', deleteError);
      setError('Não foi possível excluir o plano');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 page-enter">
      {modalPlano && (
        <PlanoModal
          plano={planoEditando}
          onClose={() => { setModalPlano(false); setPlanoEditando(null); }}
          onSave={handleSalvarPlano}
        />
      )}
      {modalPagamento && (
        <PagamentoModal
          alunos={alunos}
          planos={planos}
          onClose={() => setModalPagamento(false)}
          onSave={handleSalvarPagamento}
        />
      )}

      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(220, 38, 38, 0.12)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.4)' }}>
          {error}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-heading">Controle Financeiro</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Faturamento total: <span style={{ color: '#34d399', fontWeight: 600 }}>R$ {totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </p>
        </div>
        <button onClick={() => setModalPagamento(true)} className="btn-primary">
          <DollarSign size={16} />
          Registrar Pagamento
        </button>
      </div>

      {/* ===== Seção: Planos ===== */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PackagePlus size={18} style={{ color: '#60a5fa' }} />
            <h4 className="font-semibold text-heading text-sm">Planos Disponíveis</h4>
          </div>
          <button
            onClick={() => { setPlanoEditando(null); setModalPlano(true); }}
            className="btn-secondary text-xs"
            style={{ padding: '0.4rem 0.85rem' }}
          >
            <Plus size={13} /> Novo Plano
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {planos.map(plano => (
            <div
              key={plano.id}
              className="card-hover rounded-xl p-4 relative"
              style={{ background: 'var(--surface-card-alt)', border: '1px solid var(--border-2)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-heading text-sm">{plano.nome}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {plano.duracao} {plano.duracao === 1 ? 'mês' : 'meses'}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setPlanoEditando(plano); setModalPlano(true); }}
                    className="p-1 rounded-lg"
                    style={{ color: '#60a5fa', background: 'rgba(37, 99, 235, 0.1)' }}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleExcluirPlano(plano.id)}
                    className="p-1 rounded-lg"
                    style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#34d399' }}>
                R$ {plano.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{plano.descricao}</p>
              {plano.duracao > 1 && (
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#34d399' }}>
                  <TrendingUp size={11} />
                  R$ {(plano.valor / plano.duracao).toFixed(2)}/mês
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== Seção: Histórico de Pagamentos ===== */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}
      >
        <div className="px-5 py-4 flex flex-wrap items-center gap-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <DollarSign size={18} style={{ color: '#34d399' }} />
          <h4 className="font-semibold text-heading text-sm">Histórico de Pagamentos</h4>

          <select
            className="input-field"
            style={{ width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.75rem', colorScheme: 'dark' }}
            value={filtroMetodo}
            onChange={e => setFiltroMetodo(e.target.value)}
          >
            <option value="todos" style={{ background: 'var(--surface-modal)' }}>Todos os métodos</option>
            <option value="PIX" style={{ background: 'var(--surface-modal)' }}>PIX</option>
            <option value="Cartão" style={{ background: 'var(--surface-modal)' }}>Cartão</option>
            <option value="Dinheiro" style={{ background: 'var(--surface-modal)' }}>Dinheiro</option>
          </select>

          <select
            className="input-field"
            style={{ width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.75rem', colorScheme: 'dark' }}
            value={filtroMesAno}
            onChange={e => setFiltroMesAno(e.target.value)}
          >
            <option value="todos" style={{ background: 'var(--surface-modal)' }}>Todos os meses</option>
            {opcoesMesAno.map(mesAno => (
              <option key={mesAno} value={mesAno} style={{ background: 'var(--surface-modal)' }}>
                {new Date(mesAno + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>

          <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            {pagamentosFiltrados.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-card-alt)', borderBottom: '1px solid var(--border-1)' }}>
                {['Aluno', 'Plano', 'Valor', 'Método', 'Data', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-gray-400">Nenhum pagamento encontrado para este filtro</td>
                </tr>
              ) : pagamentosFiltrados.map(p => (
                <tr
                  key={p.id}
                  className="transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: '1px solid var(--border-1)' }}
                >
                  <td className="px-5 py-3.5 font-medium text-heading whitespace-nowrap">{p.aluno?.nome || '—'}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{p.aluno?.plano?.nome || '—'}</td>
                  <td className="px-5 py-3.5 font-semibold whitespace-nowrap" style={{ color: '#34d399' }}>
                    R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{p.metodo}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`badge ${p.status === 'confirmado' ? 'badge-active' : 'badge-overdue'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
