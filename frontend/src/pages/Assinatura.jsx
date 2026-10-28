import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { PLANOS as PLANOS_BASE, formatarPreco } from '../lib/conteudo';

// Planos, preços e limites vêm da fonte única (src/lib/conteudo.js)
const PLANOS = PLANOS_BASE.map(p => ({ ...p, preco: `${formatarPreco(p.preco)}/mês`, limite: `Até ${p.limiteAlunos} alunos` }));

export default function Assinatura({ bloqueadoPorAdmin = false }) {
  const { logout } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const planoPreSelecionado = params.get('plano');
  const [carregando, setCarregando] = useState(null);
  const [erro, setErro] = useState(null);

  const handleAssinar = async (planoId) => {
    setErro(null);
    setCarregando(planoId);
    try {
      const res = await apiFetch('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plano: planoId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Erro ao iniciar pagamento');
      window.location.href = data.url;
    } catch (e) {
      setErro(e.message || 'Erro ao iniciar pagamento');
      setCarregando(null);
    }
  };

  // Se chegou aqui vindo da landing (ex: /app?plano=pro), já inicia o checkout direto
  useEffect(() => {
    if (planoPreSelecionado && PLANOS.some(p => p.id === planoPreSelecionado)) {
      handleAssinar(planoPreSelecionado);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center p-6" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-heading mb-2">Escolha um plano para continuar</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sua conta ainda não tem uma assinatura ativa no GymFlow.</p>
        </div>

        {bloqueadoPorAdmin && (
          <div className="rounded-xl p-4 mb-6 text-center text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            O acesso desta conta foi suspenso. Entre em contato com o suporte do GymFlow para regularizar.
          </div>
        )}

        {erro && (
          <p className="text-center text-sm mb-4" style={{ color: '#ff6b6b' }}>{erro}</p>
        )}

        <div className={`grid sm:grid-cols-3 gap-4 mb-8 ${bloqueadoPorAdmin ? 'hidden' : ''}`}>
          {PLANOS.map(p => (
            <div
              key={p.id}
              className="rounded-2xl p-6 flex flex-col"
              style={{
                background: 'var(--surface-card)',
                border: p.destaque ? '1px solid var(--accent-500)' : '1px solid var(--border-2)',
              }}
            >
              <div className="font-bold text-heading mb-1">{p.nome}</div>
              <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{p.limite}</div>
              <div className="text-2xl font-bold mb-6" style={{ color: 'var(--accent-500)', fontFamily: 'monospace' }}>{p.preco}</div>
              <button
                onClick={() => handleAssinar(p.id)}
                disabled={carregando !== null}
                className="mt-auto py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                style={{
                  background: p.destaque ? 'var(--accent-500)' : 'transparent',
                  color: p.destaque ? '#fff' : 'var(--text-heading)',
                  border: p.destaque ? 'none' : '1px solid var(--border-2)',
                }}
              >
                {carregando === p.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Assinar {p.nome}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button onClick={logout} className="text-sm underline" style={{ color: 'var(--text-muted)' }}>
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
