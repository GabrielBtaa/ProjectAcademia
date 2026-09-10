import { useState, useEffect } from 'react';
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

export default function AuthCard({ modoInicial = 'login' }) {
  const [modoCadastro, setModoCadastro] = useState(modoInicial === 'cadastro');

  // Sincroniza se a prop mudar
  useEffect(() => {
    setModoCadastro(modoInicial === 'cadastro');
  }, [modoInicial]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 w-full"
      style={{ background: 'radial-gradient(circle at 30% 20%, #0f1f3d 0%, #080c18 60%)' }}
    >
      <style>{`
        * { box-sizing: border-box; }
        
        .authcard-container {
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: 960px;
          height: 680px;
          border-radius: 24px;
          background: #0d1528;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 40px 100px -30px rgba(0,0,0,0.8);
        }

        .authcard-toggle {
          display: none;
        }

        .authcard-bg {
          position: absolute;
          z-index: 2;
          top: 0;
          left: 0;
          bottom: 0;
          width: 50%;
          background: linear-gradient(to bottom, rgba(13,21,40,0.6), rgba(13,21,40,0.9)), url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop") center/cover no-repeat;
          translate: 100% 0;
          transition: 0.65s ease-in-out;
        }

        .authcard-toggle:checked ~ .authcard-bg {
          translate: 0 0;
        }

        .authcard-hero, .authcard-form {
          position: absolute;
          width: 50%;
          height: 100%;
          opacity: 0;
          visibility: hidden;
          transition: 0.65s ease-in-out;
        }

        /* ===== ESTADO: LOGIN (UNCHECKED) ===== */
        .authcard-hero.login, .authcard-form.login {
          opacity: 1;
          visibility: visible;
        }

        /* O formulário de login fica na esquerda (left: 0) */
        .authcard-form.login {
          left: 0;
          translate: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        /* O hero do login fica na direita (left: 50%) */
        .authcard-hero.login {
          left: 50%;
          translate: 0;
        }

        /* ===== ESTADO: CADASTRO (CHECKED) ===== */
        .authcard-toggle:checked ~ :is(.authcard-hero, .authcard-form).login {
          opacity: 0;
          visibility: hidden;
        }

        .authcard-toggle:checked ~ :is(.authcard-hero, .authcard-form).register {
          opacity: 1;
          visibility: visible;
        }

        /* Quando checked, movemos a form login pra direita */
        .authcard-toggle:checked ~ .authcard-form.login {
          translate: 100% 0;
        }

        /* Quando checked, movemos o hero login pra fora na direita */
        .authcard-toggle:checked ~ .authcard-hero.login {
          translate: 100% 0;
        }

        /* O formulário de cadastro fica na direita (left: 50%) */
        .authcard-form.register {
          left: 50%;
          translate: -100% 0;
        }
        .authcard-toggle:checked ~ .authcard-form.register {
          translate: 0;
        }

        /* O hero do cadastro fica na esquerda (left: 0) */
        .authcard-hero.register {
          left: 0;
          translate: -100% 0;
        }
        .authcard-toggle:checked ~ .authcard-hero.register {
          translate: 0;
        }

        /* ===== ESTILIZAÇÃO INTERNA ===== */
        .authcard-hero {
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          color: #f9f9f9;
          text-align: center;
          padding: 0 40px;
        }

        .authcard-hero h2 {
          font-size: 2rem;
          font-weight: 800;
          margin: 0;
        }

        .authcard-hero p {
          margin: 0;
          opacity: 0.85;
          line-height: 1.5;
          max-width: 280px;
          font-size: 0.95rem;
          color: #b8bfcc;
        }

        .authcard-hero label {
          margin-top: 10px;
          padding: 14px 48px;
          border-radius: 32px;
          letter-spacing: 1px;
          font-size: 13px;
          text-transform: uppercase;
          border: 1px solid #22e39a;
          background: rgba(34,227,154, 0.05);
          backdrop-filter: blur(4px);
          transition: all 0.3s ease;
          cursor: pointer;
          color: #22e39a;
          font-weight: 700;
        }

        .authcard-hero label:hover {
          color: #080c18;
          background: #22e39a;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px rgba(34,227,154, 0.5);
        }

        .authcard-form {
          padding: 50px 48px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        
        .authcard-form::-webkit-scrollbar { width: 6px; }
        .authcard-form::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

        .authcard-input { 
          width: 100%; 
          padding: 12px 16px; 
          border-radius: 12px; 
          font-size: 0.85rem; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(255,255,255,0.08); 
          color: #f2f4f8; 
          transition: all 0.2s; 
        }
        .authcard-input::placeholder { color: #5b6270; }
        .authcard-input:focus { outline: none; border-color: #22e39a; background: rgba(255,255,255,0.05); }
        
        .authcard-label { 
          display: block; 
          font-size: 0.75rem; 
          font-weight: 600; 
          color: #8890a4; 
          margin-bottom: 6px; 
          margin-top: 2px;
        }

        /* ===== RESPONSIVIDADE MOBILE ===== */
        @media (max-width: 768px) {
          .authcard-container { 
            height: auto; 
            min-height: 80vh; 
            display: flex; 
            flex-direction: column;
            border-radius: 20px;
          }
          .authcard-bg { display: none; }
          .authcard-hero, .authcard-form { 
            position: relative; 
            width: 100%; 
            height: auto; 
            translate: 0 !important; 
            left: 0 !important; 
            transition: none; 
          }
          
          /* Esconder quem não deve aparecer */
          .authcard-hero.login, .authcard-form.login { display: flex; opacity: 1; visibility: visible; }
          .authcard-hero.register, .authcard-form.register { display: none; opacity: 0; visibility: hidden; }
          
          .authcard-toggle:checked ~ .authcard-hero.login, 
          .authcard-toggle:checked ~ .authcard-form.login { display: none; opacity: 0; visibility: hidden; }
          
          .authcard-toggle:checked ~ .authcard-hero.register, 
          .authcard-toggle:checked ~ .authcard-form.register { display: flex; opacity: 1; visibility: visible; }
          
          .authcard-form { padding: 40px 24px; }
          .authcard-hero { padding: 40px 24px; background: rgba(34,227,154,0.03); border-bottom: 1px solid rgba(255,255,255,0.05); }
          .authcard-hero h2 { font-size: 1.5rem; }
          .authcard-hero label { display: none; /* No mobile, escondemos o botão do hero pq temos o link embaixo do form */ }
        }
      `}</style>

      <div className="authcard-container">
        {/* O CHECKBOX QUE CONTROLA TUDO MÁGICAMENTE */}
        <input 
          type="checkbox" 
          id="authcard-toggle" 
          className="authcard-toggle" 
          checked={modoCadastro} 
          onChange={e => setModoCadastro(e.target.checked)} 
        />
        
        {/* BACKGROUND QUE DESLIZA */}
        <div className="authcard-bg"></div>

        {/* ======================================================== */}
        {/* LADO REGISTRO: Hero (esq) e Form (dir) - Só aparecem se checked */}
        {/* ======================================================== */}
        
        <div className="authcard-hero register">
          <h2>Bem-vindo<br/>de volta!</h2>
          <p>Para se conectar com sua academia e alunos, faça login com suas informações pessoais.</p>
          <label htmlFor="authcard-toggle">FAZER LOGIN</label>
        </div>

        <div className="authcard-form register">
          <FormCadastro />
        </div>

        {/* ======================================================== */}
        {/* LADO LOGIN: Form (esq) e Hero (dir) - Só aparecem se unchecked */}
        {/* ======================================================== */}

        <div className="authcard-hero login">
          <h2>Olá, Gestor!</h2>
          <p>Cadastre sua academia e comece a testar o GymFlow gratuitamente hoje mesmo.</p>
          <label htmlFor="authcard-toggle">CRIAR CONTA</label>
        </div>

        <div className="authcard-form login">
          <FormLogin />
        </div>

      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE DE LOGIN (RENDERIZADO DENTRO DO PAINEL)
// ==========================================
function FormLogin() {
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
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, #22e39a, #0a9e6c)', boxShadow: '0 8px 20px -8px rgba(34,227,154,0.6)' }}>
        <Dumbbell size={24} color="#080c18" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Entrar</h2>
      <p className="text-sm mb-8" style={{ color: '#8890a4' }}>Acesse sua conta para gerenciar sua academia.</p>

      <form onSubmit={handleSubmit} className="space-y-5 w-full">
        <div>
          <label className="authcard-label">Email</label>
          <input type="email" required className="authcard-input" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="authcard-label">Senha</label>
          <input type="password" required className="authcard-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        {error && (
          <div className="p-3.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl font-bold text-[0.9rem] flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4" style={{ background: '#22e39a', color: '#080c18' }}>
          {loading ? 'Entrando...' : (<>Fazer Login <ArrowRight size={18} /></>)}
        </button>
      </form>

      {/* Visível apenas no mobile para alternar os painéis */}
      <label htmlFor="authcard-toggle" className="mt-8 text-[0.8rem] text-center transition-colors md:hidden block cursor-pointer w-full" style={{ color: '#8890a4' }}>
        Não tem conta? <span style={{ color: '#22e39a', fontWeight: 600 }}>Criar conta grátis</span>
      </label>
    </>
  );
}

// ==========================================
// COMPONENTE DE CADASTRO (RENDERIZADO DENTRO DO PAINEL)
// ==========================================
function FormCadastro() {
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
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.7rem] font-bold tracking-wide mb-5" style={{ background: 'rgba(34,227,154,0.1)', border: '1px solid rgba(34,227,154,0.3)', color: '#22e39a' }}>
        <Sparkles size={13} />
        30 DIAS GRÁTIS
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Criar Conta</h2>
      <p className="text-sm mb-6" style={{ color: '#8890a4' }}>Menos de 1 minuto pra liberar seu acesso total.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="authcard-label">Nome Completo</label>
          <input className="authcard-input" required placeholder="Ex: Gabriel Silva" value={form.nome} onChange={e => handleChange('nome', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="authcard-label">Email</label>
            <input type="email" className="authcard-input" required placeholder="seu@email.com" value={form.email} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <div>
            <label className="authcard-label">Confirmar Email</label>
            <input type="email" className="authcard-input" required placeholder="Repita seu email" value={form.confirmarEmail} onChange={e => handleChange('confirmarEmail', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="authcard-label">WhatsApp</label>
            <input type="tel" className="authcard-input" required placeholder="(11) 99999-9999" value={form.celular} onChange={e => handleChange('celular', e.target.value)} />
          </div>
          <div>
            <label className="authcard-label">Negócio</label>
            <select className="authcard-input" value={form.modeloNegocio} onChange={e => handleChange('modeloNegocio', e.target.value)}>
              {MODELOS_NEGOCIO.map(opt => <option key={opt.value} value={opt.value} style={{ background: '#0d1528' }}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="authcard-label">Senha</label>
            <input type="password" className="authcard-input" required placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => handleChange('password', e.target.value)} />
          </div>
          <div>
            <label className="authcard-label">Confirmar Senha</label>
            <input type="password" className="authcard-input" required placeholder="Repita sua senha" value={form.confirmarSenha} onChange={e => handleChange('confirmarSenha', e.target.value)} />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl text-xs font-medium flex items-center gap-2" style={{ background: 'rgba(34,227,154,0.1)', border: '1px solid rgba(34,227,154,0.3)', color: '#22e39a' }}>
            <CheckCircle2 size={16} />
            Cadastro concluído! Acessando sistema...
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl font-bold text-[0.9rem] flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2" style={{ background: '#22e39a', color: '#080c18' }}>
          {loading ? 'Criando conta...' : (<>Finalizar Cadastro <ArrowRight size={18} /></>)}
        </button>

        <div className="pt-2 pb-1 flex flex-wrap items-center justify-center gap-4 text-[0.7rem]" style={{ color: '#8890a4' }}>
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} style={{ color: '#22e39a' }} /> Sem cartão</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} style={{ color: '#60a5fa' }} /> Acesso total</span>
        </div>

        {/* Visível apenas no mobile para alternar os painéis */}
        <label htmlFor="authcard-toggle" className="mt-2 text-[0.8rem] text-center transition-colors md:hidden block cursor-pointer w-full" style={{ color: '#8890a4' }}>
          Já tem conta? <span style={{ color: '#22e39a', fontWeight: 600 }}>Fazer login</span>
        </label>
      </form>
    </>
  );
}

