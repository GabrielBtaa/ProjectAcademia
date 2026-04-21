import { useState, useMemo } from 'react';
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
import { PLANOS_MOCK, PAGAMENTOS_MOCK, ALUNOS_MOCK } from '../data/mockData';

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
      <div className="w-full max-w-md rounded-2xl shadow-2xl animate-fade-in-up" style={{ background: '#0d1528', border: '1px solid rgba(55, 65, 81, 0.5)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.3)' }}>
          <h3 className="font-bold text-white text-base">{plano ? 'Editar Plano' : 'Novo Plano'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-lg transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Nome do Plano *</label>
            <input className="input-field" placeholder="Ex: Mensal, Trimestral..." value={form.nome} onChange={e => handleChange('nome', e.target.value)} />
            {errors.nome && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.nome}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Duração (meses) *</label>
              <input className="input-field" type="number" min="1" max="24" value={form.duracao} onChange={e => handleChange('duracao', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Valor (R$) *</label>
              <input className="input-field" type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={e => handleChange('valor', e.target.value)} />
              {errors.valor && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.valor}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Descrição</label>
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
function PagamentoModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    alunoId: '',
    valor: '',
    metodo: 'PIX',
    data: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Preenche o valor do plano ao selecionar o aluno
    if (field === 'alunoId') {
      const aluno = ALUNOS_MOCK.find(a => a.id === Number(value));
      if (aluno) {
        const plano = PLANOS_MOCK.find(p => p.nome === aluno.plano);
        if (plano) setForm(prev => ({ ...prev, alunoId: value, valor: plano.valor }));
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
    const aluno = ALUNOS_MOCK.find(a => a.id === Number(form.alunoId));
    onSave({
      ...form,
      alunoId: Number(form.alunoId),
      aluno: aluno?.nome,
      plano: aluno?.plano,
      valor: Number(form.valor),
      status: 'confirmado',
    });
  };

  const METODOS = [
    { value: 'PIX', label: 'PIX', icon: Smartphone },
    { value: 'Cartão', label: 'Cartão', icon: CreditCard },
    { value: 'Dinheiro', label: 'Dinheiro', icon: Banknote },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl animate-fade-in-up" style={{ background: '#0d1528', border: '1px solid rgba(55, 65, 81, 0.5)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.3)' }}>
          <h3 className="font-bold text-white text-base">Registrar Pagamento</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Seleção de Aluno */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Aluno *</label>
            <select className="input-field" value={form.alunoId} onChange={e => handleChange('alunoId', e.target.value)} style={{ colorScheme: 'dark' }}>
              <option value="" style={{ background: '#0d1528' }}>Selecione o aluno...</option>
              {ALUNOS_MOCK.map(a => (
                <option key={a.id} value={a.id} style={{ background: '#0d1528' }}>
                  {a.nome} – {a.plano}
                </option>
              ))}
            </select>
            {errors.alunoId && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.alunoId}</p>}
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Valor (R$) *</label>
              <input className="input-field" type="number" step="0.01" min="0" value={form.valor} onChange={e => handleChange('valor', e.target.value)} placeholder="0,00" />
              {errors.valor && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.valor}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Data</label>
              <input className="input-field" type="date" value={form.data} onChange={e => handleChange('data', e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
          </div>

          {/* Método de Pagamento */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#9ca3af' }}>Forma de Pagamento *</label>
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
                      : { background: 'rgba(31, 41, 55, 0.5)', color: '#6b7280', border: '2px solid rgba(55, 65, 81, 0.3)' }
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
  const [planos, setPlanos] = useState(PLANOS_MOCK);
  const [pagamentos, setPagamentos] = useState(PAGAMENTOS_MOCK);
  const [modalPlano, setModalPlano] = useState(false);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [planoEditando, setPlanoEditando] = useState(null);

  // Total faturado
  const totalFaturado = useMemo(() =>
    pagamentos.filter(p => p.status === 'confirmado').reduce((acc, p) => acc + p.valor, 0),
    [pagamentos]
  );

  const handleSalvarPlano = (dados) => {
    if (planoEditando) {
      setPlanos(prev => prev.map(p => p.id === planoEditando.id ? { ...p, ...dados } : p));
    } else {
      const novoId = Math.max(...planos.map(p => p.id)) + 1;
      setPlanos(prev => [...prev, { ...dados, id: novoId }]);
    }
    setModalPlano(false);
    setPlanoEditando(null);
  };

  const handleSalvarPagamento = (dados) => {
    const novoId = Math.max(...pagamentos.map(p => p.id)) + 1;
    setPagamentos(prev => [{ ...dados, id: novoId }, ...prev]);
    setModalPagamento(false);
  };

  const handleExcluirPlano = (id) => {
    if (window.confirm('Excluir este plano?')) {
      setPlanos(prev => prev.filter(p => p.id !== id));
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
          onClose={() => setModalPagamento(false)}
          onSave={handleSalvarPagamento}
        />
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Controle Financeiro</h3>
          <p className="text-sm" style={{ color: '#6b7280' }}>
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
        style={{ background: 'rgba(22, 27, 39, 0.8)', border: '1px solid rgba(55, 65, 81, 0.4)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PackagePlus size={18} style={{ color: '#60a5fa' }} />
            <h4 className="font-semibold text-white text-sm">Planos Disponíveis</h4>
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
              style={{ background: 'rgba(15, 20, 40, 0.7)', border: '1px solid rgba(55, 65, 81, 0.4)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-white text-sm">{plano.nome}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
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
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{plano.descricao}</p>
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
        style={{ background: 'rgba(22, 27, 39, 0.8)', border: '1px solid rgba(55, 65, 81, 0.4)' }}
      >
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.3)' }}>
          <DollarSign size={18} style={{ color: '#34d399' }} />
          <h4 className="font-semibold text-white text-sm">Histórico de Pagamentos</h4>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            {pagamentos.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(15, 20, 40, 0.8)', borderBottom: '1px solid rgba(55, 65, 81, 0.3)' }}>
                {['Aluno', 'Plano', 'Valor', 'Método', 'Data', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagamentos.map(p => (
                <tr
                  key={p.id}
                  className="transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.2)' }}
                >
                  <td className="px-5 py-3.5 font-medium text-white whitespace-nowrap">{p.aluno}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: '#9ca3af' }}>{p.plano}</td>
                  <td className="px-5 py-3.5 font-semibold whitespace-nowrap" style={{ color: '#34d399' }}>
                    R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: '#9ca3af' }}>{p.metodo}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: '#9ca3af' }}>
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
