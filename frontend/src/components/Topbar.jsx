import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Menu, Search, LogOut, User, AlertTriangle, Clock, CreditCard, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../lib/api';

const ICONE_TIPO = {
  vencido: { icon: AlertTriangle, color: '#f87171' },
  vencendo: { icon: Clock, color: '#fbbf24' },
  pendente: { icon: CreditCard, color: '#60a5fa' },
};

/**
 * Componente Topbar
 * Barra superior com título da página, busca global e notificações.
 *
 * Props:
 * - title: string com o título da página atual
 * - onMenuClick: função para abrir a sidebar em mobile
 * - onNavigate: função(pageId) para navegar ao clicar em uma notificação
 * - onSearch: função(termo) para buscar alunos
 */
export default function Topbar({ title, onMenuClick, onNavigate, onSearch }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const [notificacoes, setNotificacoes] = useState([]);
  const [painelAberto, setPainelAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const painelRef = useRef(null);

  const buscarNotificacoes = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await apiFetch(('/api/notificacoes'));
      if (!res.ok) throw new Error('Erro ao buscar notificações');
      const data = await res.json();
      setNotificacoes(data.notificacoes || []);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Busca inicial, atualização periódica e resposta a eventos de pagamento
  useEffect(() => {
    buscarNotificacoes();
    const interval = setInterval(buscarNotificacoes, 120000);

    const handlePaymentSaved = () => {
      buscarNotificacoes();
    };
    window.addEventListener('gymflow:payment-saved', handlePaymentSaved);

    return () => {
      clearInterval(interval);
      window.removeEventListener('gymflow:payment-saved', handlePaymentSaved);
    };
  }, [buscarNotificacoes]);

  // Fecha o painel ao clicar fora
  useEffect(() => {
    function handleClickFora(e) {
      if (painelRef.current && !painelRef.current.contains(e.target)) {
        setPainelAberto(false);
      }
    }
    if (painelAberto) document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [painelAberto]);

  const handleTogglePainel = () => {
    if (!painelAberto) buscarNotificacoes();
    setPainelAberto(prev => !prev);
  };

  const handleClickNotificacao = (notif) => {
    setPainelAberto(false);
    if (notif.tipo === 'pendente') {
      onNavigate?.('financeiro');
    } else {
      onNavigate?.('alunos');
    }
  };

  const handleSubmitBusca = (event) => {
    event.preventDefault();
    const termo = termoBusca.trim();
    if (termo) onSearch?.(termo);
  };

  const bgHeader = isLight
    ? 'rgba(255, 255, 255, 0.9)'
    : 'rgba(13, 17, 40, 0.9)';

  const borderHeader = isLight
    ? '1px solid #e2e8f0'
    : '1px solid rgba(55, 65, 81, 0.3)';

  const textHeading = isLight ? '#0f172a' : '#ffffff';
  const textSub = isLight ? '#64748b' : '#6b7280';
  const btnBg = isLight ? '#f1f5f9' : 'rgba(31, 41, 55, 0.6)';
  const btnColor = isLight ? '#475569' : '#9ca3af';

  return (
    <header
      className="flex items-center justify-between px-4 lg:px-6 py-3 flex-shrink-0 sticky top-0 z-30 transition-colors duration-300"
      style={{
        background: bgHeader,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: borderHeader,
      }}
    >
      {/* Esquerda: Botão menu (mobile) + Título */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg transition-colors"
          style={{ color: btnColor }}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 className="font-bold text-base lg:text-lg leading-tight" style={{ color: textHeading }}>{title}</h2>
          <p className="text-xs hidden sm:block" style={{ color: textSub }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Direita: Busca global + Notificações + Usuário */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Campo de busca (visível em telas médias+) */}
        <form
          onSubmit={handleSubmitBusca}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            background: isLight ? '#f8fafc' : 'rgba(31, 41, 55, 0.8)',
            border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(55, 65, 81, 0.4)'
          }}
        >
          <Search size={14} style={{ color: textSub }} />
          <input
            type="text"
            placeholder="Buscar aluno..."
            className="bg-transparent text-sm outline-none w-40 lg:w-56"
            style={{ color: textHeading }}
            value={termoBusca}
            onChange={event => {
              const val = event.target.value;
              setTermoBusca(val);
              if (onSearch) onSearch(val);
            }}
            aria-label="Buscar aluno por nome, CPF ou WhatsApp"
          />
        </form>

        {/* Botão de alternância Modo Claro / Escuro */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-all duration-200"
          style={{ color: btnColor, background: btnBg }}
          onMouseEnter={e => { e.currentTarget.style.color = isLight ? '#1d4ed8' : 'white'; e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(55, 65, 81, 0.6)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = btnColor; e.currentTarget.style.background = btnBg; }}
          aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Ícone de notificações com badge + dropdown */}
        <div className="relative" ref={painelRef}>
          <button
            onClick={handleTogglePainel}
            className="relative p-2 rounded-lg transition-all duration-200"
          style={{ color: btnColor, background: btnBg }}
          onMouseEnter={e => { e.currentTarget.style.color = isLight ? '#1d4ed8' : 'white'; e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(55, 65, 81, 0.6)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = btnColor; e.currentTarget.style.background = btnBg; }}
            aria-label="Notificações"
          >
            <Bell size={18} />
            {notificacoes.length > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: '#ef4444', fontSize: '0.6rem' }}
              >
                {notificacoes.length > 9 ? '9+' : notificacoes.length}
              </span>
            )}
          </button>

          {painelAberto && (
            <div
              className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl shadow-2xl z-40 animate-fade-in-up"
              style={{
                background: isLight ? '#ffffff' : '#0d1528',
                border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(55, 65, 81, 0.5)',
                boxShadow: isLight ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : undefined
              }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: isLight ? '1px solid #f1f5f9' : '1px solid rgba(55, 65, 81, 0.3)' }}>
                <h4 className="font-semibold text-sm" style={{ color: textHeading }}>Notificações</h4>
                {notificacoes.length > 0 && (
                  <span className="text-xs" style={{ color: textSub }}>{notificacoes.length} pendente(s)</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {carregando ? (
                  <p className="text-sm text-center py-6" style={{ color: textSub }}>Carregando...</p>
                ) : notificacoes.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: textSub }}>Nenhuma notificação por aqui 🎉</p>
                ) : (
                  notificacoes.map(notif => {
                    const cfg = ICONE_TIPO[notif.tipo] || ICONE_TIPO.pendente;
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={notif.id}
                        onClick={() => handleClickNotificacao(notif)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.03]'}`}
                        style={{ borderBottom: isLight ? '1px solid #f1f5f9' : '1px solid rgba(55, 65, 81, 0.2)' }}
                      >
                        <Icon size={16} style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }} />
                        <div className="min-w-0">
                          <p className="text-sm leading-snug font-medium" style={{ color: textHeading }}>{notif.titulo}</p>
                          <p className="text-xs mt-0.5" style={{ color: textSub }}>
                            {new Date(notif.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Informações do usuário, tipo de conta e logout */}
        <div className="flex items-center gap-2 ml-2 pl-2 border-l" style={{ borderColor: isLight ? '#cbd5e1' : '#4b5563' }}>
          
          {/* Badge Tipo de Conta */}
          {user?.role === 'admin' ? (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.7rem] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              👑 Admin
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.7rem] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
              ⚡ Teste Grátis: {user?.trialEndsAt ? Math.max(0, Math.ceil((new Date(user.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))) : 30}d restantes
            </span>
          )}

          <div className="hidden sm:flex items-center gap-2 ml-1">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <User size={16} className="text-white" />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium" style={{ color: textHeading }}>{user?.nome}</p>
              <p className="text-xs capitalize" style={{ color: textSub }}>
                {user?.role === 'admin' ? 'Administrador' : 'Conta Teste'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg transition-all duration-200"
            style={{ color: btnColor, background: btnBg }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.color = btnColor; }}
            aria-label="Sair"
            title="Sair do sistema"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
