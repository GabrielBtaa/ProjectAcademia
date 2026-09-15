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

export default function Register() {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    confirmarEmail: '',
    celular: '',
    modeloNegocio: 'Academia Tradicional',
    password: '',
    confirmarSenha: '',
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

    // Validações locais
    if (!form.nome.trim()) return setError('Informe seu nome completo');
    if (!form.email.trim()) return setError('Informe seu email');
    if (form.email.trim().toLowerCase() !== form.confirmarEmail.trim().toLowerCase()) {
      return setError('A confirmação de email não confere com o email informado');
    }
    if (!form.celular.trim()) return setError('Informe seu celular / WhatsApp');
    if (!form.password) return setError('Crie uma senha de acesso');
    if (form.password.length < 6) return setError('A senha deve ter no mínimo 6 caracteres');
    if (form.password !== form.confirmarSenha) {
      return setError('A confirmação de senha não confere');
    }

    setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          confirmarEmail: form.confirmarEmail,
          celular: form.celular,
          modeloNegocio: form.modeloNegocio,
          password: form.password,
          confirmarSenha: form.confirmarSenha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar cadastro');
      }

      setSuccess(true);

      // Login automático
      const result = await login(form.email, form.password);
      if (!result.success) {
        setError('Cadastro realizado! Por favor, faça login com seu email e senha.');
      }
    } catch (err) {
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-6" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1528 50%, #0a0f1e 100%)' }}>
      <div className="w-full max-w-xl space-y-6">
        
        {/* Badge do Teste Grátis */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold animate-pulse" style={{ background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#60a5fa' }}>
            <Sparkles size={14} className="text-blue-400" />
            <span>Teste Grátis de 30 Dias · Sem necessidade de cartão de crédito</span>
          </div>
        </div>

        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            <Dumbbell size={24} color="white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Comece a Gestão da sua Academia
          </h2>
          <p className="text-sm text-gray-400">
            Crie sua conta em menos de 1 minuto e libere acesso total imediato.
          </p>
        </div>

        {/* Formulário */}
        <div className="rounded-2xl p-6 lg:p-8 shadow-2xl backdrop-blur-xl" style={{ background: 'rgba(13, 21, 40, 0.85)', border: '1px solid rgba(55, 65, 81, 0.4)' }}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            
            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Gabriel Silva"
                value={form.nome}
                onChange={e => handleChange('nome', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-gray-800/80 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Email e Confirmação de Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Seu Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-gray-800/80 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Confirmar Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="Repita seu email"
                  value={form.confirmarEmail}
                  onChange={e => handleChange('confirmarEmail', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-gray-800/80 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Celular / WhatsApp e Modelo de Negócio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Celular / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(11) 99999-9999"
                  value={form.celular}
                  onChange={e => handleChange('celular', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-gray-800/80 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Modelo de Negócio *
                </label>
                <select
                  value={form.modeloNegocio}
                  onChange={e => handleChange('modeloNegocio', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                  {MODELOS_NEGOCIO.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Senha e Confirmação de Senha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Senha de Acesso *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={e => handleChange('password', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-gray-800/80 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Confirmar Senha *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repita sua senha"
                  value={form.confirmarSenha}
                  onChange={e => handleChange('confirmarSenha', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-gray-800/80 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="p-3 rounded-lg text-xs font-medium bg-red-950/60 border border-red-800 text-red-300">
                {error}
              </div>
            )}

            {/* Mensagem de Sucesso */}
            {success && (
              <div className="p-3 rounded-lg text-xs font-medium bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Cadastro concluído! Liberando seus 30 dias de teste grátis...</span>
              </div>
            )}

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              {loading ? (
                <span>Criando sua conta...</span>
              ) : (
                <>
                  <span>Começar Meus 30 Dias Grátis</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Benefícios inclusos */}
            <div className="pt-2 flex items-center justify-around text-[0.7rem] text-gray-400">
              <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-400" /> Sem cartão</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-blue-400" /> Acesso total</span>
              <span className="flex items-center gap-1"><Sparkles size={13} className="text-amber-400" /> Cancelamento livre</span>
            </div>

            {/* Link para voltar ao Login */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Já possui uma conta? <span className="text-blue-400 underline font-semibold">Fazer Login</span>
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}