import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Phone,
  CakeSlice,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { apiUrl } from '../lib/api';

// ===== Constantes =====
const ITENS_POR_PAGINA = 5;

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'inadimplente', label: 'Inadimplente' },
  { value: 'inativo', label: 'Inativo' },
];

// ===== Sub-componente: Modal de Aluno (Cadastro/Edição) =====
function AlunoModal({ aluno, planos, onClose, onSave }) {
  // Estado do formulário - inicializa com dados existentes ou vazio
  const [form, setForm] = useState(
    aluno || {
      nome: '',
      cpf: '',
      whatsapp: '',
      dataNascimento: '',
      planoId: planos[0]?.id ?? 1,
      dataVencimento: '',
      status: 'ativo',
    }
  );
  const [errors, setErrors] = useState({});

  // Atualiza um campo do formulário
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Validação básica dos campos obrigatórios
  const validate = () => {
    const errs = {};
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório';
    if (!form.cpf.trim()) errs.cpf = 'CPF é obrigatório';
    if (!form.whatsapp.trim()) errs.whatsapp = 'WhatsApp é obrigatório';
    if (!form.dataNascimento) errs.dataNascimento = 'Data de nascimento é obrigatória';
    if (!form.dataVencimento) errs.dataVencimento = 'Data de vencimento é obrigatória';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    // Encontra o nome do plano para exibição
    const planoSelecionado = planos.find(p => p.id === Number(form.planoId));
    onSave({ ...form, plano: planoSelecionado?.nome, planoId: Number(form.planoId) });
  };

  return (
    // Fundo escuro do modal
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up"
        style={{ background: '#0d1528', border: '1px solid rgba(55, 65, 81, 0.5)' }}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.3)' }}>
          <h3 className="font-bold text-white text-base">
            {aluno ? 'Editar Aluno' : 'Novo Aluno'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Nome Completo *</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex: João da Silva"
              value={form.nome}
              onChange={e => handleChange('nome', e.target.value)}
            />
            {errors.nome && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.nome}</p>}
          </div>

          {/* CPF + WhatsApp */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>CPF *</label>
              <input
                className="input-field"
                type="text"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={e => handleChange('cpf', e.target.value)}
                maxLength={14}
              />
              {errors.cpf && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.cpf}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>WhatsApp *</label>
              <input
                className="input-field"
                type="text"
                placeholder="(11) 99999-9999"
                value={form.whatsapp}
                onChange={e => handleChange('whatsapp', e.target.value)}
              />
              {errors.whatsapp && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.whatsapp}</p>}
            </div>
          </div>

          {/* Data de Nascimento */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Data de Nascimento *</label>
            <input
              className="input-field"
              type="date"
              value={form.dataNascimento}
              onChange={e => handleChange('dataNascimento', e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
            {errors.dataNascimento && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.dataNascimento}</p>}
          </div>

          {/* Plano + Data de Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Plano *</label>
              <select
                className="input-field"
                value={form.planoId}
                onChange={e => handleChange('planoId', Number(e.target.value))}
                style={{ colorScheme: 'dark' }}
              >
                {planos.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#0d1528' }}>
                    {p.nome} – R$ {p.valor.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Vencimento *</label>
              <input
                className="input-field"
                type="date"
                value={form.dataVencimento}
                onChange={e => handleChange('dataVencimento', e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
              {errors.dataVencimento && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.dataVencimento}</p>}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Status</label>
            <div className="flex gap-2">
              {['ativo', 'inativo', 'inadimplente'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleChange('status', s)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
                  style={
                    form.status === s
                      ? s === 'ativo'
                        ? { background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }
                        : s === 'inadimplente'
                        ? { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }
                        : { background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', border: '1px solid rgba(107, 114, 128, 0.4)' }
                      : { background: 'rgba(31, 41, 55, 0.5)', color: '#6b7280', border: '1px solid rgba(55, 65, 81, 0.3)' }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              <Check size={15} />
              {aluno ? 'Salvar Alterações' : 'Cadastrar Aluno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Sub-componente: Card de Aluno (Mobile) =====
function AlunoCard({ aluno, onEdit, onDelete }) {
  const diasRestantes = () => {
    const hoje = new Date();
    const venc = new Date(aluno.dataVencimento + 'T12:00:00');
    return Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
  };
  const dias = diasRestantes();

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(22, 27, 39, 0.8)', border: '1px solid rgba(55, 65, 81, 0.4)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e3a72, #2563eb)' }}
          >
            {aluno.avatar}
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{aluno.nome}</p>
            <p className="text-xs" style={{ color: '#6b7280' }}>{aluno.cpf}</p>
          </div>
        </div>
        <span className={`badge badge-${aluno.status === 'ativo' ? 'active' : aluno.status === 'inadimplente' ? 'overdue' : 'inactive'}`}>
          {aluno.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5" style={{ color: '#9ca3af' }}>
          <Phone size={12} />
          {aluno.whatsapp}
        </div>
        <div className="flex items-center gap-1.5" style={{ color: '#9ca3af' }}>
          <CakeSlice size={12} />
          {new Date(aluno.dataNascimento + 'T12:00:00').toLocaleDateString('pt-BR')}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs" style={{ color: '#6b7280' }}>Plano: </span>
          <span className="text-xs font-medium" style={{ color: '#60a5fa' }}>{aluno.plano}</span>
          <span className="text-xs ml-2" style={{ color: dias < 5 ? '#f87171' : '#6b7280' }}>
            {dias > 0 ? `(vence em ${dias}d)` : `(vencido há ${Math.abs(dias)}d)`}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(aluno)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#60a5fa' }}>
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(aluno.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#f87171' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Página de Gestão de Alunos
 * CRUD completo com busca, filtros, paginação e modal de cadastro/edição.
 */
export default function Alunos() {
  const [alunos, setAlunos] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState(null);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErroApi(null);
    try {
      const [plRes, alRes] = await Promise.all([
        fetch(apiUrl('/api/planos')),
        fetch(apiUrl('/api/alunos')),
      ]);
      if (!plRes.ok || !alRes.ok) {
        const t = !plRes.ok ? await plRes.text() : await alRes.text();
        throw new Error(t || 'Falha ao carregar dados');
      }
      const planosData = await plRes.json();
      const alunosData = await alRes.json();
      setPlanos(planosData);
      setAlunos(alunosData);
    } catch (e) {
      setErroApi(e.message || 'Não foi possível conectar à API.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Estados de controle
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [modalAberto, setModalAberto] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState(null);

  // useMemo: filtra e busca sem recálculo desnecessário
  const alunosFiltrados = useMemo(() => {
    return alunos.filter(aluno => {
      const matchBusca =
        aluno.nome.toLowerCase().includes(busca.toLowerCase()) ||
        aluno.cpf.includes(busca) ||
        aluno.whatsapp.includes(busca);
      const matchStatus = filtroStatus === 'todos' || aluno.status === filtroStatus;
      return matchBusca && matchStatus;
    });
  }, [alunos, busca, filtroStatus]);

  // Paginação calculada
  const totalPaginas = Math.max(1, Math.ceil(alunosFiltrados.length / ITENS_POR_PAGINA));
  const alunosPagina = alunosFiltrados.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA,
    paginaAtual * ITENS_POR_PAGINA
  );

  // Reseta a paginação ao filtrar
  const handleBusca = (v) => { setBusca(v); setPaginaAtual(1); };
  const handleFiltro = (v) => { setFiltroStatus(v); setPaginaAtual(1); };

  // Abre modal para novo aluno
  const handleNovoAluno = () => {
    if (!planos.length) return;
    setAlunoEditando(null);
    setModalAberto(true);
  };

  // Abre modal para editar
  const handleEditar = (aluno) => {
    setAlunoEditando(aluno);
    setModalAberto(true);
  };

  // Salva aluno (novo ou editado)
  const handleSalvar = async (dadosAluno) => {
    const payload = {
      nome: dadosAluno.nome,
      cpf: dadosAluno.cpf,
      whatsapp: dadosAluno.whatsapp,
      dataNascimento: dadosAluno.dataNascimento,
      planoId: dadosAluno.planoId,
      dataVencimento: dadosAluno.dataVencimento,
      status: dadosAluno.status,
    };
    try {
      if (alunoEditando) {
        const res = await fetch(apiUrl(`/api/alunos/${alunoEditando.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || res.statusText);
        setAlunos(prev => prev.map(a => (a.id === body.id ? body : a)));
      } else {
        const res = await fetch(apiUrl('/api/alunos'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || res.statusText);
        setAlunos(prev => [...prev, body]);
      }
      setModalAberto(false);
    } catch (e) {
      alert(e.message || 'Erro ao salvar aluno');
    }
  };

  // Exclui aluno (com confirmação)
  const handleExcluir = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este aluno?')) return;
    try {
      const res = await fetch(apiUrl(`/api/alunos/${id}`), { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText);
      }
      setAlunos(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      alert(e.message || 'Erro ao excluir');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 page-enter">
      {/* Modal de cadastro/edição */}
      {modalAberto && (
        <AlunoModal
          aluno={alunoEditando}
          planos={planos}
          onClose={() => setModalAberto(false)}
          onSave={handleSalvar}
        />
      )}

      {/* ===== Cabeçalho da listagem ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Gestão de Alunos</h3>
          <p className="text-sm" style={{ color: '#6b7280' }}>
            {carregando
              ? 'Carregando…'
              : `${alunosFiltrados.length} aluno${alunosFiltrados.length !== 1 ? 's' : ''} encontrado${alunosFiltrados.length !== 1 ? 's' : ''}`}
          </p>
          {erroApi && (
            <p className="text-sm mt-2" style={{ color: '#f87171' }}>
              {erroApi}{' '}
              <button type="button" className="underline font-medium" onClick={carregarDados}>
                Tentar de novo
              </button>
            </p>
          )}
        </div>
        <button
          onClick={handleNovoAluno}
          className="btn-primary"
          disabled={carregando || !!erroApi || !planos.length}
        >
          <Plus size={16} />
          Novo Aluno
        </button>
      </div>

      {/* ===== Barra de Busca + Filtros ===== */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Busca por nome/CPF/WhatsApp */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg flex-1"
          style={{ background: 'rgba(22, 27, 39, 0.8)', border: '1px solid rgba(55, 65, 81, 0.5)' }}
        >
          <Search size={16} style={{ color: '#6b7280', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou WhatsApp..."
            value={busca}
            onChange={e => handleBusca(e.target.value)}
            className="bg-transparent text-sm outline-none flex-1 text-white placeholder-gray-600"
          />
          {busca && (
            <button onClick={() => handleBusca('')} className="text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros de status */}
        <div
          className="flex gap-1 p-1 rounded-lg"
          style={{ background: 'rgba(22, 27, 39, 0.8)', border: '1px solid rgba(55, 65, 81, 0.5)' }}
        >
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleFiltro(opt.value)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={
                filtroStatus === opt.value
                  ? { background: '#2563eb', color: 'white' }
                  : { color: '#6b7280' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== Tabela (Desktop) ===== */}
      <div
        className="hidden md:block rounded-xl overflow-hidden"
        style={{ background: 'rgba(22, 27, 39, 0.8)', border: '1px solid rgba(55, 65, 81, 0.4)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(15, 20, 40, 0.8)', borderBottom: '1px solid rgba(55, 65, 81, 0.4)' }}>
              {['Aluno', 'Contato', 'Plano', 'Vencimento', 'Status', 'Ações'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alunosPagina.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle size={32} style={{ color: '#374151' }} />
                    <p style={{ color: '#6b7280' }}>Nenhum aluno encontrado</p>
                  </div>
                </td>
              </tr>
            ) : (
              alunosPagina.map((aluno) => {
                const diasVenc = Math.ceil((new Date(aluno.dataVencimento + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <tr
                    key={aluno.id}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.2)' }}
                  >
                    {/* Aluno */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1e3a72, #2563eb)' }}
                        >
                          {aluno.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{aluno.nome}</p>
                          <p className="text-xs" style={{ color: '#6b7280' }}>{aluno.cpf}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: '#9ca3af' }}>
                        <Phone size={12} />
                        {aluno.whatsapp}
                      </div>
                    </td>

                    {/* Plano */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#60a5fa', border: '1px solid rgba(37, 99, 235, 0.25)' }}>
                        {aluno.plano}
                      </span>
                    </td>

                    {/* Vencimento */}
                    <td className="px-5 py-3.5">
                      <p className="text-xs" style={{ color: diasVenc < 0 ? '#f87171' : diasVenc < 5 ? '#fbbf24' : '#9ca3af' }}>
                        {new Date(aluno.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        {diasVenc > 0 ? `${diasVenc}d restantes` : `Vencido há ${Math.abs(diasVenc)}d`}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span className={`badge badge-${aluno.status === 'ativo' ? 'active' : aluno.status === 'inadimplente' ? 'overdue' : 'inactive'}`}>
                        {aluno.status}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditar(aluno)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: '#60a5fa', background: 'rgba(37, 99, 235, 0.1)' }}
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleExcluir(aluno.id)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)' }}
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Cards (Mobile) ===== */}
      <div className="md:hidden space-y-3">
        {alunosPagina.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle size={32} className="mx-auto mb-2" style={{ color: '#374151' }} />
            <p style={{ color: '#6b7280' }}>Nenhum aluno encontrado</p>
          </div>
        ) : (
          alunosPagina.map(aluno => (
            <AlunoCard key={aluno.id} aluno={aluno} onEdit={handleEditar} onDelete={handleExcluir} />
          ))
        )}
      </div>

      {/* ===== Paginação ===== */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: '#6b7280' }}>
            Página {paginaAtual} de {totalPaginas}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="p-2 rounded-lg transition-all disabled:opacity-30"
              style={{ background: 'rgba(31, 41, 55, 0.6)', color: '#9ca3af', border: '1px solid rgba(55, 65, 81, 0.4)' }}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPaginaAtual(p)}
                className="w-8 h-8 rounded-lg text-xs font-semibold transition-all"
                style={
                  p === paginaAtual
                    ? { background: '#2563eb', color: 'white' }
                    : { background: 'rgba(31, 41, 55, 0.6)', color: '#9ca3af', border: '1px solid rgba(55, 65, 81, 0.4)' }
                }
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
              className="p-2 rounded-lg transition-all disabled:opacity-30"
              style={{ background: 'rgba(31, 41, 55, 0.6)', color: '#9ca3af', border: '1px solid rgba(55, 65, 81, 0.4)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
