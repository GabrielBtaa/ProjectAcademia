import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const PLANOS = [
  { id: 'starter', nome: 'Starter', preco: 'R$150/mês', limite: 'Até 50 alunos' },
  { id: 'pro', nome: 'Pro', preco: 'R$250/mês', limite: 'Até 100 alunos', destaque: true },
  { id: 'business', nome: 'Business', preco: 'R$400/mês', limite: 'Até 250 alunos' },
];

export default function Assinatura() {
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
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#080c18' }}>
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-white mb-2">Escolha um plano para continuar</h1>
          <p style={{ color: '#8890a4' }}>Sua conta ainda não tem uma assinatura ativa no GymFlow.</p>
        </div>

        {erro && (
          <p className="text-center text-sm mb-4" style={{ color: '#ff6b6b' }}>{erro}</p>
        )}

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {PLANOS.map(p => (
            <div
              key={p.id}
              className="rounded-2xl p-6 flex flex-col"
              style={{
                background: '#11182c',
                border: p.destaque ? '1px solid #22e39a' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="font-bold text-white mb-1">{p.nome}</div>
              <div className="text-xs mb-4" style={{ color: '#8890a4' }}>{p.limite}</div>
              <div className="text-2xl font-bold mb-6" style={{ color: '#22e39a', fontFamily: 'monospace' }}>{p.preco}</div>
              <button
                onClick={() => handleAssinar(p.id)}
                disabled={carregando !== null}
                className="mt-auto py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                style={{
                  background: p.destaque ? '#22e39a' : 'transparent',
                  color: p.destaque ? '#080c18' : 'white',
                  border: p.destaque ? 'none' : '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {carregando === p.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Assinar {p.nome}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button onClick={logout} className="text-sm underline" style={{ color: '#8890a4' }}>
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
