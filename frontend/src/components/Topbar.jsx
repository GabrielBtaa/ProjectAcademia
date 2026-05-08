import { Bell, Menu, Search, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Componente Topbar
 * Barra superior com título da página, busca global e notificações.
 *
 * Props:
 * - title: string com o título da página atual
 * - onMenuClick: função para abrir a sidebar em mobile
 * - notificacoes: número de notificações pendentes
 */
export default function Topbar({ title, onMenuClick, notificacoes = 3 }) {
  const { user, logout } = useAuth();

  return (
    <header
      className="flex items-center justify-between px-4 lg:px-6 py-3 flex-shrink-0 sticky top-0 z-30"
      style={{
        background: 'rgba(13, 17, 40, 0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(55, 65, 81, 0.3)',
      }}
    >
      {/* Esquerda: Botão menu (mobile) + Título */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg transition-colors"
          style={{ color: '#9ca3af' }}
          onMouseEnter={e => e.currentTarget.style.color = 'white'}
          onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 className="font-bold text-white text-base lg:text-lg leading-tight">{title}</h2>
          <p className="text-xs hidden sm:block" style={{ color: '#6b7280' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Direita: Busca global + Notificações + Usuário */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Campo de busca (visível em telas médias+) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(31, 41, 55, 0.8)', border: '1px solid rgba(55, 65, 81, 0.4)' }}>
          <Search size={14} style={{ color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Buscar aluno..."
            className="bg-transparent text-sm outline-none w-40 lg:w-56"
            style={{ color: '#d1d5db' }}
          />
        </div>

        {/* Ícone de notificações com badge */}
        <button
          className="relative p-2 rounded-lg transition-all duration-200"
          style={{ color: '#9ca3af', background: 'rgba(31, 41, 55, 0.6)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(55, 65, 81, 0.6)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'rgba(31, 41, 55, 0.6)'; }}
          aria-label="Notificações"
        >
          <Bell size={18} />
          {notificacoes > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: '#ef4444', fontSize: '0.6rem' }}
            >
              {notificacoes}
            </span>
          )}
        </button>

        {/* Informações do usuário e logout */}
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-600">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-white">{user?.nome}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg transition-all duration-200"
            style={{ color: '#9ca3af', background: 'rgba(31, 41, 55, 0.6)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(55, 65, 81, 0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'rgba(31, 41, 55, 0.6)'; }}
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
