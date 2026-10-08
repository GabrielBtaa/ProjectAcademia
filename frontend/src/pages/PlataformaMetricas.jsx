import { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, UserMinus, Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';

function Cartao({ icon: Icon, titulo, valor, cor }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color: cor }} />
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{titulo}</p>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>{valor}</p>
    </div>
  );
}

/**
 * Métricas de negócio da plataforma como um todo — visível apenas para o dono do SaaS
 * (protegido no backend via PLATFORM_ADMIN_EMAIL; esta tela só chega a ser exibida porque
 * o App.jsx já checou billing.isPlatformOwner antes de rotear pra cá).
 */
export default function PlataformaMetricas() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    apiFetch('/api/plataforma/metricas')
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar métricas');
        setDados(data);
      })
      .catch(e => setErro(e.message));
  }, []);

  if (erro) return <div className="p-6 text-sm" style={{ color: '#f87171' }}>{erro}</div>;
  if (!dados) return <div className="p-6 text-sm" style={{ color: 'var(--text-muted)' }}>Carregando métricas...</div>;

  return (
    <div className="p-4 lg:p-6 space-y-5 page-enter">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>Métricas da Plataforma</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Visão geral de todos os clientes do GymFlow (só você vê esta tela)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Cartao icon={DollarSign} titulo="MRR estimado" valor={`R$ ${dados.mrrEstimado.toLocaleString('pt-BR')}`} cor="#22c55e" />
        <Cartao icon={Users} titulo="Assinantes ativos" valor={dados.assinantesAtivos} cor="#60a5fa" />
        <Cartao icon={Sparkles} titulo="Em trial" valor={dados.emTrial} cor="#f59e0b" />
        <Cartao icon={UserMinus} titulo="Cancelados" valor={dados.cancelados} cor="#f87171" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-heading)' }}>Assinantes por plano</p>
          <div className="space-y-2">
            {Object.entries(dados.assinantesPorTier).map(([tier, qtd]) => (
              <div key={tier} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }} className="capitalize">{tier}</span>
                <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>{qtd}</span>
              </div>
            ))}
            {Object.keys(dados.assinantesPorTier).length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhum assinante ativo ainda</p>
            )}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} style={{ color: '#60a5fa' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>Crescimento (último mês)</p>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-heading)' }}>{dados.novosUltimoMes}</strong> conta(s) nova(s) •{' '}
            <strong style={{ color: 'var(--text-heading)' }}>{dados.canceladosUltimoMes}</strong> cancelamento(s)
          </p>
        </div>
      </div>

      {dados.motivosCancelamento.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-heading)' }}>Motivos de cancelamento relatados</p>
          <ul className="space-y-2">
            {dados.motivosCancelamento.map((m, i) => (
              <li key={i} className="text-xs p-2 rounded-lg" style={{ background: 'var(--surface-alt-1)', color: 'var(--text-secondary)' }}>
                "{m}"
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
