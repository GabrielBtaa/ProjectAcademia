import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  AlertTriangle,
  DollarSign,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CORES_PLANO = ['#3b82f6', '#34d399', '#f59e0b', '#a78bfa', '#f87171', '#22d3ee'];

// ===== Sub-componente: Card de Métrica =====
function MetricCard({ title, value, subtitle, icon: Icon, gradient, trend, trendText }) {
  return (
    <div
      className="card-hover animate-fade-in-up rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-2)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {title}
          </p>
          <p className="text-3xl font-bold text-heading mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
          )}
        </div>
        {/* Ícone com gradiente de cor */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: gradient }}
        >
          <Icon size={22} color="white" />
        </div>
      </div>

      {/* Indicador de tendência */}
      {trendText && (
        <div className="flex items-center gap-1.5">
          {trend === 'up' ? (
            <TrendingUp size={13} style={{ color: '#34d399' }} />
          ) : (
            <TrendingDown size={13} style={{ color: '#f87171' }} />
          )}
          <span className="text-xs font-medium" style={{ color: trend === 'up' ? '#34d399' : '#f87171' }}>
            {trendText}
          </span>
        </div>
      )}
    </div>
  );
}

// ===== Sub-componente: Tooltip customizado do gráfico de faturamento =====
function FaturamentoTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-lg px-3 py-2 text-sm shadow-xl"
        style={{ background: 'var(--surface-modal)', border: '1px solid var(--border-4)', color: 'var(--text-heading)' }}
      >
        <p className="font-semibold">{label}</p>
        <p style={{ color: '#34d399' }}>
          R$ {Number(payload[0].value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
}

// ===== Sub-componente: Tooltip customizado do gráfico de distribuição por plano =====
function PlanoTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div
        className="rounded-lg px-3 py-2 text-sm shadow-xl"
        style={{ background: 'var(--surface-modal)', border: '1px solid var(--border-4)', color: 'var(--text-heading)' }}
      >
        <p className="font-semibold">{item.name}</p>
        <p style={{ color: item.payload.fill }}>{item.value} aluno(s)</p>
      </div>
    );
  }
  return null;
}

// ===== Sub-componente: Item da lista de vencimentos de hoje =====
function VencimentoItem({ aluno }) {
  return (
    <div
      className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-all"
      style={{ background: 'var(--surface-alt-1)', marginBottom: '0.5rem' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
        >
          {aluno.avatar}
        </div>
        <div>
          <p className="text-sm font-medium text-heading leading-tight">{aluno.nome}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{aluno.plano}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-semibold" style={{ color: '#fbbf24' }}>Vence hoje</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {new Date(aluno.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
}

/**
 * Página Dashboard
 * Exibe métricas, gráfico de frequência e lista de vencimentos do dia.
 * Usa dados reais da API para exibir informações atualizadas.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [metricas, setMetricas] = useState({
    totalAtivos: 0,
    inadimplentes: 0,
    faturamentoMes: 0,
    vencimentosHoje: [],
  });
  const [pagamentos, setPagamentos] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pagamentosRecentes = pagamentos.slice(0, 5);

  // Evolução financeira: soma de pagamentos confirmados por mês, jan-dez do ano atual
  const evolucaoFinanceira = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    const totais = Array(12).fill(0);
    pagamentos.forEach(p => {
      if (p.status !== 'confirmado') return;
      const d = new Date(p.data + 'T12:00:00');
      if (d.getFullYear() === anoAtual) totais[d.getMonth()] += Number(p.valor);
    });
    return MESES_ABREV.map((mes, i) => ({ mes, total: totais[i] }));
  }, [pagamentos]);

  // Distribuição de alunos por plano
  const distribuicaoPorPlano = useMemo(() => {
    const contagem = {};
    alunos.forEach(a => {
      const nome = a.plano || 'Sem plano';
      contagem[nome] = (contagem[nome] || 0) + 1;
    });
    return Object.entries(contagem).map(([nome, quantidade], i) => ({
      nome,
      quantidade,
      fill: CORES_PLANO[i % CORES_PLANO.length],
    }));
  }, [alunos]);

  const fetchDashboardData = useCallback(async ({ showLoading = false } = {}) => {
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const [alunosResponse, pagamentosResponse] = await Promise.all([
          apiFetch(('/api/alunos')),
          apiFetch(('/api/pagamentos')),
        ]);

        if (!alunosResponse.ok || !pagamentosResponse.ok) {
          const errorText = !alunosResponse.ok
            ? await alunosResponse.text()
            : await pagamentosResponse.text();
          throw new Error(errorText || 'Erro ao buscar dados da API');
        }

        const alunos = await alunosResponse.json();
        const pagamentosData = await pagamentosResponse.json();

        const hojeDate = new Date();
        hojeDate.setHours(0, 0, 0, 0);
        const hojeStr = new Date().toISOString().split('T')[0];
        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();

        const isOverdue = (aluno) => {
          if (aluno.status === 'inadimplente') return true;
          if (aluno.status === 'inativo') return false;
          if (!aluno.dataVencimento) return false;
          const venc = new Date(aluno.dataVencimento + 'T12:00:00');
          return venc < hojeDate;
        };

        const totalAtivos = alunos.filter(a => a.status === 'ativo' && !isOverdue(a)).length;
        const inadimplentes = alunos.filter(a => isOverdue(a)).length;
        const novosEsteMes = alunos.filter(a => {
          const d = new Date(a.dataCadastro || Date.now());
          return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        }).length;

        const faturamentoMes = pagamentosData
          .filter(p => {
            const dataPgto = new Date(p.data + 'T12:00:00');
            return (
              p.status === 'confirmado' &&
              dataPgto.getMonth() === mesAtual &&
              dataPgto.getFullYear() === anoAtual
            );
          })
          .reduce((acc, p) => acc + Number(p.valor), 0);

        const vencimentosHoje = alunos.filter(a => a.dataVencimento === hojeStr);

        setMetricas({ totalAtivos, inadimplentes, faturamentoMes, vencimentosHoje, novosEsteMes, totalAlunos: alunos.length });
        setPagamentos(pagamentosData);
        setAlunos(alunos);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        setError(error.message || 'Erro ao carregar dados do dashboard.');
        setMetricas({ totalAtivos: 0, inadimplentes: 0, faturamentoMes: 0, vencimentosHoje: [], novosEsteMes: 0, totalAlunos: 0 });
        setPagamentos([]);
        setAlunos([]);
      } finally {
        if (showLoading) setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchDashboardData({ showLoading: true });
    const refresh = () => fetchDashboardData();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('gymflow:data-changed', refresh);
    window.addEventListener('gymflow:payment-saved', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('gymflow:data-changed', refresh);
      window.removeEventListener('gymflow:payment-saved', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [fetchDashboardData]);

  const taxaFrequencia = metricas.totalAlunos > 0 ? Math.round((metricas.totalAtivos / metricas.totalAlunos) * 100) : 0;

  const diasTrialRestantes = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : 30;

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 lg:p-6 space-y-6 page-enter">

      {/* ===== Banner de Status de Conta / Trial ===== */}
      <div
        className="rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
        style={{
          background: isAdmin
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(29, 78, 216, 0.05) 100%)',
          border: isAdmin
            ? '1px solid rgba(245, 158, 11, 0.3)'
            : '1px solid rgba(37, 99, 235, 0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: isAdmin
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            }}
          >
            {isAdmin ? <Crown size={20} color="white" /> : <Sparkles size={20} color="white" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-heading">
                {isAdmin ? 'Conta Administrador Ativa' : 'Teste Grátis de 30 Dias Ativo'}
              </h3>
              <span
                className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider"
                style={{
                  background: isAdmin ? 'rgba(245, 158, 11, 0.2)' : 'rgba(37, 99, 235, 0.2)',
                  color: isAdmin ? '#fbbf24' : '#60a5fa',
                }}
              >
                {isAdmin ? 'Acesso Master' : `Restam ${diasTrialRestantes} dias`}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {isAdmin
                ? 'Você possui acesso irrestrito de administrador a todas as funções da plataforma.'
                : `Aproveite ${diasTrialRestantes} dias de acesso Pro liberado sem necessidade de cartão de crédito.`}
            </p>
          </div>
        </div>

        {!isAdmin && (
          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={14} /> 100% Liberado
            </span>
          </div>
        )}
      </div>

      {/* ===== Cards de Métricas ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Alunos Ativos"
          value={metricas.totalAtivos}
          subtitle={`Total: ${metricas.totalAlunos} alunos`}
          icon={Users}
          gradient="linear-gradient(135deg, #1e3a72, #2563eb)"
          trend="up"
          trendText={metricas.novosEsteMes > 0 ? `+${metricas.novosEsteMes} este mês` : 'Calculado em tempo real'}
        />
        <MetricCard
          title="Inadimplentes"
          value={metricas.inadimplentes}
          subtitle="Mensalidades em atraso"
          icon={AlertTriangle}
          gradient="linear-gradient(135deg, #7f1d1d, #dc2626)"
          trend={metricas.inadimplentes > 0 ? 'down' : 'up'}
          trendText={metricas.inadimplentes > 0 ? `${metricas.inadimplentes} com pagamento pendente` : 'Nenhum atraso 🎉'}
        />
        <MetricCard
          title="Faturamento do Mês"
          value={`R$ ${metricas.faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Pagamentos confirmados"
          icon={DollarSign}
          gradient="linear-gradient(135deg, #065f46, #059669)"
          trend="up"
          trendText="Mês atual"
        />
        <MetricCard
          title="Frequência Ativa"
          value={`${taxaFrequencia}%`}
          subtitle={`${metricas.totalAtivos} de ${metricas.totalAlunos} alunos em dia`}
          icon={Activity}
          gradient="linear-gradient(135deg, #7c3aed, #2563eb)"
          trend="up"
          trendText="Frequência estimada"
        />
      </div>

      {/* ===== Gráfico + Vencimentos de Hoje ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Gráfico de Evolução Financeira */}
        <div
          className="xl:col-span-2 rounded-xl p-5"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-2)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-heading text-sm">Evolução Financeira</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Faturamento confirmado por mês ({new Date().getFullYear()})</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <Activity size={13} style={{ color: '#34d399' }} />
              <span style={{ color: '#34d399', fontSize: '0.7rem', fontWeight: 600 }}>Ano atual</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evolucaoFinanceira} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(55, 65, 81, 0.3)" vertical={false} />
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              />
              <Tooltip content={<FaturamentoTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
              <Bar
                dataKey="total"
                fill="url(#gradientBar)"
                radius={[6, 6, 0, 0]}
              />
              <defs>
                <linearGradient id="gradientBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vencimentos de Hoje */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-2)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-heading text-sm">Vencimentos de Hoje</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </p>
            </div>
            <CalendarClock size={18} style={{ color: '#f59e0b' }} />
          </div>

          {metricas.vencimentosHoje.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 size={36} style={{ color: '#34d399' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Nenhum vencimento hoje</p>
            </div>
          ) : (
            <div>
              {metricas.vencimentosHoje.map(aluno => (
                <VencimentoItem key={aluno.id} aluno={aluno} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Distribuição de Alunos por Plano ===== */}
      <div
        className="rounded-xl p-5"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-2)',
        }}
      >
        <div className="mb-4">
          <h3 className="font-semibold text-heading text-sm">Distribuição por Plano</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Quantidade de alunos matriculados em cada plano</p>
        </div>
        {distribuicaoPorPlano.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Users size={36} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Nenhum aluno cadastrado ainda</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={220} style={{ maxWidth: 260 }}>
              <PieChart>
                <Pie
                  data={distribuicaoPorPlano}
                  dataKey="quantidade"
                  nameKey="nome"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {distribuicaoPorPlano.map((entry, i) => (
                    <Cell key={entry.nome} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PlanoTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 w-full space-y-2">
              {distribuicaoPorPlano.map(item => (
                <div key={item.nome} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.fill }} />
                    <span style={{ color: '#d1d5db' }}>{item.nome}</span>
                  </div>
                  <span className="font-semibold text-heading">{item.quantidade}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== Atividade Recente de Pagamentos ===== */}
      <div
        className="rounded-xl p-5"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-2)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-heading text-sm">Pagamentos Recentes</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Últimas movimentações financeiras</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-2)' }}>
                {['Aluno', 'Plano', 'Valor', 'Método', 'Data', 'Status'].map(h => (
                  <th key={h} className="text-left pb-3 pr-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-gray-400">Carregando pagamentos...</td>
                </tr>
              ) : pagamentosRecentes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-gray-400">Nenhum pagamento encontrado</td>
                </tr>
              ) : (
                pagamentosRecentes.map(p => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid var(--border-1)' }}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="py-3 pr-4 font-medium text-heading whitespace-nowrap">{p.aluno?.nome || '—'}</td>
                    <td className="py-3 pr-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{p.aluno?.plano?.nome || '—'}</td>
                    <td className="py-3 pr-4 font-semibold whitespace-nowrap" style={{ color: '#34d399' }}>
                      R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{p.metodo || 'PIX'}</td>
                    <td className="py-3 pr-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3">
                      <span className={`badge ${p.status === 'confirmado' ? 'badge-active' : 'badge-overdue'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
