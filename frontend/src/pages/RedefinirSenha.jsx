import { useState, useEffect } from 'react';
import { Dumbbell, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiUrl } from '../lib/api';

/**
 * Página aberta pelo link do e-mail de recuperação: /redefinir-senha#token=CODIGO
 * O código vai no "#" (não aparece em logs de servidor) e é apagado do endereço assim que é lido.
 */
export default function RedefinirSenha() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || '');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    // Tira o código do endereço (histórico do navegador, prints, etc.) e não indexa a página
    window.history.replaceState(null, '', window.location.pathname);
    document.title = 'Redefinir senha | GymFlow';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const enviar = async (e) => {
    e.preventDefault();
    setErro(null);
    if (novaSenha.length < 6) return setErro('A nova senha deve ter ao menos 6 caracteres');
    if (novaSenha !== confirmar) return setErro('A confirmação não confere com a nova senha');
    setEnviando(true);
    try {
      const res = await fetch(apiUrl('/api/auth/redefinir-senha'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao redefinir a senha');
      setConcluido(true);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const campo = 'w-full rounded-lg px-3 py-2.5 text-sm';
  const estiloCampo = { background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)', color: 'var(--text-heading)' };

  return (
    <div className="flex items-center justify-center p-4" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-5" style={{ background: 'var(--surface-modal)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}>
            <Dumbbell size={22} color="#fff" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>Criar nova senha</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>GymFlow</p>
          </div>
        </div>

        {concluido ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 size={40} className="mx-auto" style={{ color: '#22c55e' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Senha alterada com sucesso! Todas as outras sessões foram encerradas por segurança.</p>
            <a href="/#login" className="btn-primary w-full justify-center">Ir para o login</a>
          </div>
        ) : !token ? (
          <div className="space-y-4 text-center">
            <AlertTriangle size={36} className="mx-auto" style={{ color: '#f59e0b' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Este link está incompleto. Abra novamente o link que enviamos por e-mail, ou peça um novo na tela de login.</p>
            <a href="/#login" className="btn-secondary w-full justify-center">Voltar ao login</a>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-3">
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input type="password" autoComplete="new-password" required placeholder="Nova senha (mínimo 6 caracteres)" value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)} className={campo} style={{ ...estiloCampo, paddingLeft: 38 }} />
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input type="password" autoComplete="new-password" required placeholder="Repita a nova senha" value={confirmar}
                onChange={e => setConfirmar(e.target.value)} className={campo} style={{ ...estiloCampo, paddingLeft: 38 }} />
            </div>
            {erro && <p className="text-xs" style={{ color: '#f87171' }}>{erro}</p>}
            <button type="submit" disabled={enviando} className="btn-primary w-full justify-center disabled:opacity-50">
              {enviando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
