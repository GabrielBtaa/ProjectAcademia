import { useState, useEffect } from 'react';
import {
  Users,
  AlertTriangle,
  DollarSign,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ALUNOS_MOCK, PAGAMENTOS_MOCK, FREQUENCIA_SEMANAL } from '../data/mockData';

// ===== Sub-componente: Card de Métrica =====
function MetricCard({ title, value, subtitle, icon: Icon, gradient, trend, trendText }) {
  return (
    <div
      className="card-hover animate-fade-in-up rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: 'rgba(22, 27, 39, 0.8)',
        border: '1px solid rgba(55, 65, 81, 0.4)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
            {title}
          </p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{subtitle}</p>
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

// ===== Sub-componente: Tooltip customizado do gráfico =====
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-lg px-3 py-2 text-sm shadow-xl"
        style={{ background: '#1f2937', border: '1px solid rgba(55, 65, 81, 0.6)', color: 'white' }}
      >
        <p className="font-semibold">{label}</p>
        <p style={{ color: '#60a5fa' }}>{payload[0].value} presenças</p>
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
      style={{ background: 'rgba(31, 41, 55, 0.4)', marginBottom: '0.5rem' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
        >
          {aluno.avatar}
        </div>
        <div>
          <p className="text-sm font-medium text-white leading-tight">{aluno.nome}</p>
          <p className="text-xs" style={{ color: '#6b7280' }}>{aluno.plano}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-semibold" style={{ color: '#fbbf24' }}>Vence hoje</p>
        <p className="text-xs" style={{ color: '#6b7280' }}>
          {new Date(aluno.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
}

/**
 * Página Dashboard
 * Exibe métricas, gráfico de frequência e lista de vencimentos do dia.
 * Usa useEffect para calcular métricas a partir dos dados mock.
 */
export default function Dashboard() {
  // Estado local das métricas calculadas
  const [metricas, setMetricas] = useState({
    totalAtivos: 0,
    inadimplentes: 0,
    faturamentoMes: 0,
    vencimentosHoje: [],
  });

  // useEffect: calcula métricas ao montar o componente
  // Em produção, aqui seria feito um fetch() para a API
  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();

    const totalAtivos = ALUNOS_MOCK.filter(a => a.status === 'ativo').length;
    const inadimplentes = ALUNOS_MOCK.filter(a => a.status === 'inadimplente').length;

    // Faturamento: soma dos pagamentos confirmados do mês corrente
    const faturamentoMes = PAGAMENTOS_MOCK
      .filter(p => {
        const dataPgto = new Date(p.data);
        return (
          p.status === 'confirmado' &&
          dataPgto.getMonth() === mesAtual &&
          dataPgto.getFullYear() === anoAtual
        );
      })
      .reduce((acc, p) => acc + p.valor, 0);

    // Vencimentos do dia: alunos cujo vencimento é hoje
    const vencimentosHoje = ALUNOS_MOCK.filter(a => a.dataVencimento === hoje);

    setMetricas({ totalAtivos, inadimplentes, faturamentoMes, vencimentosHoje });
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6 page-enter">

      {/* ===== Cards de Métricas ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Alunos Ativos"
          value={metricas.totalAtivos}
          subtitle="Total matriculados"
          icon={Users}
          gradient="linear-gradient(135deg, #1e3a72, #2563eb)"
          trend="up"
          trendText="+3 este mês"
        />
        <MetricCard
          title="Inadimplentes"
          value={metricas.inadimplentes}
          subtitle="Mensalidades em atraso"
          icon={AlertTriangle}
          gradient="linear-gradient(135deg, #7f1d1d, #dc2626)"
          trend="down"
          trendText="Atenção necessária"
        />
        <MetricCard
          title="Faturamento do Mês"
          value={`R$ ${metricas.faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Pagamentos confirmados"
          icon={DollarSign}
          gradient="linear-gradient(135deg, #065f46, #059669)"
          trend="up"
          trendText="+12% vs. mês anterior"
        />
        <MetricCard
          title="Vencimentos Hoje"
          value={metricas.vencimentosHoje.length > 0 ? metricas.vencimentosHoje.length : '—'}
          subtitle={metricas.vencimentosHoje.length > 0 ? 'Mensalidades a renovar' : 'Nenhum vencimento hoje'}
          icon={CalendarClock}
          gradient="linear-gradient(135deg, #78350f, #d97706)"
          trend={metricas.vencimentosHoje.length > 0 ? 'down' : 'up'}
          trendText={metricas.vencimentosHoje.length > 0 ? 'Notificar alunos' : 'Dia tranquilo!'}
        />
      </div>

      {/* ===== Gráfico + Vencimentos de Hoje ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Gráfico de Frequência Semanal */}
        <div
          className="xl:col-span-2 rounded-xl p-5"
          style={{
            background: 'rgba(22, 27, 39, 0.8)',
            border: '1px solid rgba(55, 65, 81, 0.4)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white text-sm">Frequência Semanal</h3>
              <p className="text-xs" style={{ color: '#6b7280' }}>Presenças registradas por dia</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
              <Activity size={13} style={{ color: '#60a5fa' }} />
              <span style={{ color: '#60a5fa', fontSize: '0.7rem', fontWeight: 600 }}>Última semana</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={FREQUENCIA_SEMANAL} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(55, 65, 81, 0.3)" vertical={false} />
              <XAxis
                dataKey="dia"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }} />
              <Bar
                dataKey="presencas"
                fill="url(#gradientBar)"
                radius={[6, 6, 0, 0]}
              />
              <defs>
                <linearGradient id="gradientBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vencimentos de Hoje */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'rgba(22, 27, 39, 0.8)',
            border: '1px solid rgba(55, 65, 81, 0.4)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white text-sm">Vencimentos de Hoje</h3>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </p>
            </div>
            <CalendarClock size={18} style={{ color: '#f59e0b' }} />
          </div>

          {metricas.vencimentosHoje.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 size={36} style={{ color: '#34d399' }} />
              <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Nenhum vencimento hoje</p>
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

      {/* ===== Atividade Recente de Pagamentos ===== */}
      <div
        className="rounded-xl p-5"
        style={{
          background: 'rgba(22, 27, 39, 0.8)',
          border: '1px solid rgba(55, 65, 81, 0.4)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white text-sm">Pagamentos Recentes</h3>
            <p className="text-xs" style={{ color: '#6b7280' }}>Últimas movimentações financeiras</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.4)' }}>
                {['Aluno', 'Plano', 'Valor', 'Método', 'Data', 'Status'].map(h => (
                  <th key={h} className="text-left pb-3 pr-4 font-semibold text-xs uppercase tracking-wider" style={{ color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PAGAMENTOS_MOCK.slice(0, 5).map(p => (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.2)' }}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="py-3 pr-4 font-medium text-white whitespace-nowrap">{p.aluno}</td>
                  <td className="py-3 pr-4 whitespace-nowrap" style={{ color: '#9ca3af' }}>{p.plano}</td>
                  <td className="py-3 pr-4 font-semibold whitespace-nowrap" style={{ color: '#34d399' }}>
                    R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap" style={{ color: '#9ca3af' }}>{p.metodo}</td>
                  <td className="py-3 pr-4 whitespace-nowrap" style={{ color: '#9ca3af' }}>
                    {new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3">
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
