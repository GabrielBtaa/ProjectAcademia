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
 * Card de autenticação com 2 painéis físicos (marca + formulário) que trocam
 * de lado com um slide suave. O conteúdo de texto dentro de cada painel faz
 * crossfade entre a versão login/cadastro — mais simples e robusto que
 * animar 4 painéis independentes.
 */
export default function AuthCard({ modoInicial = 'login' }) {
  const [modoCadastro, setModoCadastro] = useState(modoInicial === 'cadastro');

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(circle at 30% 20%, #0f1f3d 0%, #080c18 65%)' }}
    >
      <style>{`
        .authcard { position: relative; width: 100%; max-width: 840px; height: 580px; border-radius: 28px; overflow: hidden; background: #0d1528; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 40px 100px -30px rgba(0,0,0,0.75); }
        .authcard-panel { position: absolute; top: 0; width: 50%; height: 100%; transition: transform 0.7s cubic-bezier(.83,0,.17,1); }
        .authcard-brand { left: 0; z-index: 2; overflow: hidden; }
        .authcard-formpanel { left: 50%; z-index: 3; background: #0d1528; }
        .authcard.is-cadastro .authcard-brand { transform: translateX(100%); }
        .authcard.is-cadastro .authcard-formpanel { transform: translateX(-100%); }

        .authcard-brand-bg { position: absolute; inset: 0; background: radial-gradient(circle at 30% 20%, rgba(34,227,154,0.35), transparent 55%), radial-gradient(circle at 80% 85%, rgba(37,99,235,0.35), transparent 50%), linear-gradient(160deg, #10321f 0%, #0a1c2e 55%, #080c18 100%); }
        .authcard-brand-bg::after { content: ''; position: absolute; inset: 0; opacity: 0.5; background-image: repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 46px); }
        .authcard-brand-icon { position: absolute; right: -30px; bottom: -30px; opacity: 0.08; transform: rotate(-18deg); }

        .authcard-slide { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 48px 40px; transition: opacity 0.4s ease, transform 0.5s ease; }
        .authcard-slide.is-out { opacity: 0; pointer-events: none; transform: scale(0.97); }
        .authcard-slide.is-in { opacity: 1; transform: scale(1); }

        .authcard-toggle-btn { padding: 11px 30px; border-radius: 100px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.03em; border: 1.5px solid rgba(255,255,255,0.55); background: rgba(255,255,255,0.06); backdrop-filter: blur(6px); color: #fff; cursor: pointer; transition: all 0.25s; }
        .authcard-toggle-btn:hover { background: #22e39a; border-color: #22e39a; color: #080c18; }

        .authcard-form-scroll { height: 100%; overflow-y: auto; padding: 40px 44px; }
        .authcard-input { width: 100%; padding: 11px 14px; border-radius: 10px; font-size: 0.85rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #f2f4f8; transition: border-color 0.2s, background 0.2s; }
        .authcard-input::placeholder { color: #5b6270; }
        .authcard-input:focus { outline: none; border-color: #22e39a; background: rgba(255,255,255,0.06); }
        .authcard-label { display: block; font-size: 0.72rem; font-weight: 600; color: #8890a4; margin-bottom: 5px; }

        @media (max-width: 760px) {
          .authcard { height: auto; min-height: 0; }
          .authcard-panel { position: relative; width: 100%; height: auto; transform: none !important; }
          .authcard-brand { display: none; }
          .authcard-formpanel { left: 0; }
          .authcard-form-scroll { height: auto; overflow: visible; padding: 32px 24px; }
          .authcard-slide { position: relative; padding: 0; display: none; }
        }
      `}</style>

      <div className={`authcard ${modoCadastro ? 'is-cadastro' : ''}`}>
        {/* Painel de marca — sempre à esquerda fisicamente, troca de lado ao alternar */}
        <div className="authcard-panel authcard-brand">
          <div className="authcard-brand-bg" />
          <Dumbbell size={280} className="authcard-brand-icon" color="#fff" />

          <div className={`authcard-slide ${modoCadastro ? 'is-out' : 'is-in'}`} style={{ color: '#f2f4f8' }}>
            <h2 className="text-2xl font-bold mb-2">Olá!</h2>
            <p className="text-sm mb-7" style={{ color: '#c3cad8', maxWidth: 260 }}>
              Ainda não tem uma academia cadastrada no GymFlow? Comece agora, é grátis por 30 dias.
            </p>
            <button type="button" onClick={() => setModoCadastro(true)} className="authcard-toggle-btn">CRIAR CONTA</button>
          </div>

          <div className={`authcard-slide ${modoCadastro ? 'is-in' : 'is-out'}`} style={{ color: '#f2f4f8' }}>
            <h2 className="text-2xl font-bold mb-2">Comece agora</h2>
            <p className="text-sm mb-7" style={{ color: '#c3cad8', maxWidth: 260 }}>
              30 dias grátis, sem cartão de crédito. Já tem uma conta no GymFlow?
            </p>
            <button type="button" onClick={() => setModoCadastro(false)} className="authcard-toggle-btn">FAZER LOGIN</button>
          </div>
        </div>

        {/* Painel de formulário — sempre à direita fisicamente, troca de lado ao alternar */}
        <div className="authcard-panel authcard-formpanel">
          <div className="authcard-form-scroll">
            {modoCadastro
              ? <FormCadastro onVoltarLogin={() => setModoCadastro(false)} />
              : <FormLogin onIrCadastro={() => setModoCadastro(true)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormLogin({ onIrCadastro }) {
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
    <div className="flex flex-col justify-center h-full">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #22e39a, #0a9e6c)' }}>
        <Dumbbell size={22} color="#080c18" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-1">Bem-vindo de volta</h2>
      <p className="text-sm mb-6" style={{ color: '#8890a4' }}>Entre com suas credenciais pra acessar o GymFlow.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="authcard-label">Email</label>
          <input type="email" required className="authcard-input" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="authcard-label">Senha</label>
          <input type="password" required className="authcard-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        {error && (
          <div className="p-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50" style={{ background: '#22e39a', color: '#080c18' }}>
          {loading ? 'Entrando...' : (<>Entrar <ArrowRight size={16} /></>)}
        </button>
      </form>

      <button type="button" onClick={onIrCadastro} className="mt-5 text-xs text-center transition-colors md:hidden" style={{ color: '#8890a4' }}>
        Não tem conta? <span style={{ color: '#22e39a', fontWeight: 600 }}>Criar conta grátis</span>
      </button>
    </div>
  );
}

function FormCadastro({ onVoltarLogin }) {
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

        <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50" style={{ background: '#22e39a', color: '#080c18' }}>
          {loading ? 'Criando sua conta...' : (<>Começar Meus 30 Dias Grátis <ArrowRight size={16} /></>)}
        </button>

        <div className="pt-1 flex items-center justify-around text-[0.68rem]" style={{ color: '#8890a4' }}>
          <span className="flex items-center gap-1"><ShieldCheck size={12} style={{ color: '#22e39a' }} /> Sem cartão</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={12} style={{ color: '#60a5fa' }} /> Acesso total</span>
          <span className="flex items-center gap-1"><Sparkles size={12} style={{ color: '#fbbf24' }} /> Cancele quando quiser</span>
        </div>

        <button type="button" onClick={onVoltarLogin} className="w-full text-xs text-center transition-colors md:hidden" style={{ color: '#8890a4' }}>
          Já tem conta? <span style={{ color: '#22e39a', fontWeight: 600 }}>Fazer login</span>
        </button>
      </form>
    </>
  );
}
