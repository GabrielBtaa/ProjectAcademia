import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Dumbbell, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { apiUrl } from '../lib/api';

const MODELOS_NEGOCIO = [
  { value: 'Academia Tradicional', label: '🏋️ Academia Tradicional' },
  { value: 'Box de CrossFit / Funcional', label: '🔥 Box de CrossFit / Treinamento Funcional' },
  { value: 'Estúdio (Personal / Pilates)', label: '🧘 Estúdio de Personal / Pilates' },
  { value: 'Academia de Artes Marciais / Lutas', label: '🥋 Academia de Artes Marciais / Lutas' },
  { value: 'Escola de Dança / Natação', label: '💃 Escola de Dança / Natação' },
  { value: 'Outro Modelo', label: '🏢 Outro Modelo de Negócio' },
];

/**
 * Card único de autenticação com painéis que deslizam entre Login e Cadastro,
 * inspirado num design de referência (checkbox + CSS sibling selectors),
 * adaptado pra React com estado em vez de :checked.
 */
export default function AuthCard({ modoInicial = 'login' }) {
  const [modoCadastro, setModoCadastro] = useState(modoInicial === 'cadastro');

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(circle at 30% 20%, #0f1f3d 0%, #080c18 60%)' }}
    >
      <style>{`
        .authcard { position: relative; width: 100%; max-width: 880px; min-height: 560px; border-radius: 28px; overflow: hidden; background: #0d1528; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 40px 100px -30px rgba(0,0,0,0.7); display: flex; }
        .authcard-hero, .authcard-form { flex: 1 1 50%; min-width: 0; transition: transform 0.6s cubic-bezier(.65,0,.35,1), opacity 0.5s ease; }
        .authcard-hero { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 48px 40px; position: relative; color: #f2f4f8; }
        .authcard-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 0%, rgba(34,227,154,0.18), transparent 60%), linear-gradient(160deg, #0f1f3d, #080c18); }
        .authcard-hero > * { position: relative; z-index: 1; }
        .authcard-form { padding: 44px 40px; overflow-y: auto; max-height: 640px; }
        .authcard.is-cadastro .authcard-hero { order: 2; }
        .authcard.is-cadastro .authcard-form { order: 1; }
        @media (max-width: 720px) {
          .authcard { flex-direction: column; min-height: 0; }
          .authcard.is-cadastro .authcard-hero { order: 0; }
          .authcard.is-cadastro .authcard-form { order: 1; }
          .authcard-form { max-height: none; }
        }
        .authcard-toggle-btn { padding: 11px 30px; border-radius: 100px; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.02em; border: 1px solid rgba(255,255,255,0.5); background: transparent; color: #fff; cursor: pointer; transition: all 0.2s; }
        .authcard-toggle-btn:hover { background: #22e39a; border-color: #22e39a; color: #080c18; }
        .authcard-input { width: 100%; padding: 11px 14px; border-radius: 10px; font-size: 0.85rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #f2f4f8; transition: border-color 0.2s; }
        .authcard-input::placeholder { color: #5b6270; }
        .authcard-input:focus { outline: none; border-color: #22e39a; }
        .authcard-label { display: block; font-size: 0.72rem; font-weight: 600; color: #8890a4; margin-bottom: 5px; }
      `}</style>

      <div className={`authcard ${modoCadastro ? 'is-cadastro' : ''}`}>
        {modoCadastro ? (
          <CadastroPainel onVoltarLogin={() => setModoCadastro(false)} />
        ) : (
          <LoginPainel onIrCadastro={() => setModoCadastro(true)} />
        )}
      </div>
    </div>
  );
}

function LoginPainel({ onIrCadastro }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(email, password);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  return (
    <>
      <div className="authcard-form flex flex-col justify-center">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #22e39a, #0a9e6c)' }}>
          <Dumbbell size={22} color="#080c18" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Bem-vindo de volta</h2>
        <p className="text-sm mb-6" style={{ color: '#8890a4' }}>Entre com suas credenciais pra acessar o GymFlow.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="authcard-label">Email</label>
            <input
              type="email"
              required
              className="authcard-input"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="authcard-label">Senha</label>
            <input
              type="password"
              required
              className="authcard-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ background: '#22e39a', color: '#080c18' }}
          >
            {loading ? 'Entrando...' : (<>Entrar <ArrowRight size={16} /></>)}
          </button>
        </form>

        <button
          type="button"
          onClick={onIrCadastro}
          className="mt-5 text-xs text-center transition-colors"
          style={{ color: '#8890a4' }}
        >
          Não tem conta? <span style={{ color: '#22e39a', fontWeight: 600 }}>Criar conta grátis</span>
        </button>
      </div>

      <div className="authcard-hero">
        <h2 className="text-2xl font-bold mb-2">Olá!</h2>
        <p className="text-sm mb-7" style={{ color: '#b8bfcc', maxWidth: 260 }}>
          Ainda não tem uma academia cadastrada no GymFlow? Comece agora, é grátis por 30 dias.
        </p>
        <button type="button" onClick={onIrCadastro} className="authcard-toggle-btn">
          CRIAR CONTA
        </button>
      </div>
    </>
  );
}

function CadastroPainel({ onVoltarLogin }) {
  const [form, setForm] = useState({
    nome: '', email: '', confirmarEmail: '', celular: '',
    modeloNegocio: 'Academia Tradicional', password: '', confirmarSenha: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { login } = useAuth();

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.nome.trim()) return setError('Informe seu nome completo');
    if (!form.email.trim()) return setError('Informe seu email');
    if (form.email.trim().toLowerCase() !== form.confirmarEmail.trim().toLowerCase()) {
      return setError('A confirmação de email não confere com o email informado');
    }
    if (!form.celular.trim()) return setError('Informe seu celular / WhatsApp');
    if (!form.password) return setError('Crie uma senha de acesso');
    if (form.password.length < 6) return setError('A senha deve ter no mínimo 6 caracteres');
    if (form.password !== form.confirmarSenha) return setError('A confirmação de senha não confere');

    setLoading(true);
    try {
      const response = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao realizar cadastro');
      setSuccess(true);
      const result = await login(form.email, form.password);
      if (!result.success) setError('Cadastro realizado! Por favor, faça login com seu email e senha.');
    } catch (err) {
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="authcard-hero">
        <h2 className="text-2xl font-bold mb-2">Comece agora</h2>
        <p className="text-sm mb-7" style={{ color: '#b8bfcc', maxWidth: 260 }}>
          30 dias grátis, sem cartão de crédito. Já tem uma conta no GymFlow?
        </p>
        <button type="button" onClick={onVoltarLogin} className="authcard-toggle-btn">
          FAZER LOGIN
        </button>
      </div>

      <div className="authcard-form">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[0.68rem] font-semibold mb-4" style={{ background: 'rgba(34,227,154,0.1)', border: '1px solid rgba(34,227,154,0.3)', color: '#22e39a' }}>
          <Sparkles size={12} />
          Teste Grátis de 30 Dias
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Crie sua conta</h2>
        <p className="text-sm mb-5" style={{ color: '#8890a4' }}>Menos de 1 minuto pra liberar acesso total.</p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="authcard-label">Nome Completo *</label>
            <input className="authcard-input" required placeholder="Ex: Gabriel Silva" value={form.nome} onChange={e => handleChange('nome', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="authcard-label">Seu Email *</label>
              <input type="email" className="authcard-input" required placeholder="seu@email.com" value={form.email} onChange={e => handleChange('email', e.target.value)} />
            </div>
            <div>
              <label className="authcard-label">Confirmar Email *</label>
              <input type="email" className="authcard-input" required placeholder="Repita seu email" value={form.confirmarEmail} onChange={e => handleChange('confirmarEmail', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="authcard-label">Celular / WhatsApp *</label>
              <input type="tel" className="authcard-input" required placeholder="(11) 99999-9999" value={form.celular} onChange={e => handleChange('celular', e.target.value)} />
            </div>
            <div>
              <label className="authcard-label">Modelo de Negócio *</label>
              <select className="authcard-input" value={form.modeloNegocio} onChange={e => handleChange('modeloNegocio', e.target.value)}>
                {MODELOS_NEGOCIO.map(opt => <option key={opt.value} value={opt.value} style={{ background: '#0d1528' }}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="authcard-label">Senha de Acesso *</label>
              <input type="password" className="authcard-input" required placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => handleChange('password', e.target.value)} />
            </div>
            <div>
              <label className="authcard-label">Confirmar Senha *</label>
              <input type="password" className="authcard-input" required placeholder="Repita sua senha" value={form.confirmarSenha} onChange={e => handleChange('confirmarSenha', e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg text-xs font-medium flex items-center gap-2" style={{ background: 'rgba(34,227,154,0.1)', border: '1px solid rgba(34,227,154,0.3)', color: '#22e39a' }}>
              <CheckCircle2 size={16} />
              Cadastro concluído! Liberando seus 30 dias de teste grátis...
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ background: '#22e39a', color: '#080c18' }}
          >
            {loading ? 'Criando sua conta...' : (<>Começar Meus 30 Dias Grátis <ArrowRight size={16} /></>)}
          </button>

          <div className="pt-1 flex items-center justify-around text-[0.68rem]" style={{ color: '#8890a4' }}>
            <span className="flex items-center gap-1"><ShieldCheck size={12} style={{ color: '#22e39a' }} /> Sem cartão</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} style={{ color: '#60a5fa' }} /> Acesso total</span>
            <span className="flex items-center gap-1"><Sparkles size={12} style={{ color: '#fbbf24' }} /> Cancele quando quiser</span>
          </div>
        </form>
      </div>
    </>
  );
}
