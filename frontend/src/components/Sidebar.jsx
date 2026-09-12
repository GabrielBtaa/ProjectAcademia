import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Settings,
  X,
  Dumbbell,
  LogOut,
  PanelLeft,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useViewMode } from '../contexts/ViewModeContext';
import { apiFetch } from '../lib/api';

// Itens de navegação da sidebar
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'alunos', label: 'Alunos', icon: Users },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

function getSiglaUsuario(nome) {
  if (!nome) return 'US';
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const p1 = partes[0] ? partes[0][0] : '';
  const p2 = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (p1 + p2).toUpperCase() || 'US';
}

export default function Sidebar({ activePage, setActivePage, isOpen, onClose, colapsada, onToggleColapsada }) {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { isRecepcionista } = useViewMode();
  const isLight = theme === 'light';
  const [nomeAcademia, setNomeAcademia] = useState('GymFlow');
  const navItems = isRecepcionista ? NAV_ITEMS.filter(i => i.id !== 'configuracoes') : NAV_ITEMS;

  useEffect(() => {
    const carregarNome = () => {
      apiFetch('/api/conta/academia')
        .then(res => res.json())
        .then(data => {
          if (data.nomeAcademia && data.nomeAcademia.trim()) setNomeAcademia(data.nomeAcademia.trim());
          else setNomeAcademia('GymFlow');
        })
        .catch(() => {});
    };
    carregarNome();
    window.addEventListener('gymflow:settings-updated', carregarNome);
    return () => window.removeEventListener('gymflow:settings-updated', carregarNome);
  }, []);

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    onClose();
  };

  const bg = isLight ? '#ffffff' : '#0d1528';
  const border = isLight ? '1px solid #e2e8f0' : '1px solid rgba(55, 65, 81, 0.4)';
  const textPrimary = isLight ? '#0f172a' : '#ffffff';
  const textMuted = isLight ? '#64748b' : '#6b7280';
  const textNavDefault = isLight ? '#475569' : '#9ca3af';
  const surfaceHover = isLight ? '#f1f5f9' : 'rgba(55, 65, 81, 0.35)';
  const accent = '#2563eb';

  const sigla = getSiglaUsuario(user?.nome);

  return (
    <>
      <style>{`
        .sb-shell { transition: width 0.3s ease, background 0.3s ease, border-color 0.3s ease; }
        .sb-hide-when-collapsed { transition: opacity 0.15s ease, max-width 0.25s ease; }
        .sb-collapsed .sb-hide-when-collapsed { opacity: 0; max-width: 0; overflow: hidden; pointer-events: none; }
        .sb-nav-btn { position: relative; }
        .sb-nav-btn.is-active::after {
          content: '';
          position: absolute;
          right: -13px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 26px;
          border-radius: 6px 0 0 6px;
          background: ${accent};
        }
        .sb-collapsed .sb-nav-btn.is-active::after { right: -13px; }
      `}</style>

      {/* Overlay escuro atrás da sidebar em mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar principal — card flutuante no desktop, drawer full-height no mobile */}
      <aside
        className={`
          sb-shell fixed top-0 left-0 h-full z-50 flex flex-col
          lg:top-4 lg:left-4 lg:h-[calc(100%-2rem)] lg:rounded-2xl lg:shadow-xl
          lg:translate-x-0 lg:z-auto
          ${colapsada ? 'sb-collapsed lg:w-[76px]' : 'lg:w-64'}
          w-72
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ background: bg, border }}
      >
        {/* Logo / Cabeçalho */}
        <div className="relative flex items-center gap-3 px-4 py-5 flex-shrink-0" style={{ borderBottom: border }}>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
          >
            <Dumbbell size={18} color="white" />
          </div>
          <div className="sb-hide-when-collapsed min-w-0 whitespace-nowrap">
            <h1 className="font-bold text-sm leading-tight truncate" style={{ color: textPrimary }}>{nomeAcademia}</h1>
            <p style={{ color: textMuted, fontSize: '0.65rem' }}>Sistema de Gestão</p>
          </div>

          {/* Botão de fechar (mobile) */}
          <button onClick={onClose} className="lg:hidden ml-auto text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={18} />
          </button>

          {/* Botão de recolher (desktop) */}
          <button
            onClick={onToggleColapsada}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg items-center justify-center shadow-sm transition-colors"
            style={{ background: bg, border, color: textMuted }}
            title={colapsada ? 'Expandir menu' : 'Recolher menu'}
          >
            <PanelLeft size={14} />
          </button>
        </div>

        {/* Links de navegação */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
          <p
            className="sb-hide-when-collapsed whitespace-nowrap"
            style={{ color: isLight ? '#94a3b8' : '#4b5563', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '0.75rem', marginBottom: '0.5rem' }}
          >
            Menu Principal
          </p>
          <ul className="space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activePage === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => handleNavClick(id)}
                    title={colapsada ? label : undefined}
                    className={`sb-nav-btn ${isActive ? 'is-active' : ''} w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200`}
                    style={
                      isActive
                        ? { background: isLight ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.2)', color: isLight ? '#1d4ed8' : '#60a5fa', fontWeight: 600 }
                        : { color: textNavDefault }
                    }
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = surfaceHover; e.currentTarget.style.color = isLight ? '#0f172a' : '#e5e7eb'; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textNavDefault; } }}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="sb-hide-when-collapsed flex-1 text-left whitespace-nowrap">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Rodapé — perfil do usuário */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: border }}>
          <div className="flex items-center gap-3 mb-3 px-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              {sigla}
            </div>
            <div className="sb-hide-when-collapsed flex-1 min-w-0 whitespace-nowrap">
              <p className="text-xs font-semibold truncate" style={{ color: textPrimary }}>{user?.nome || 'Usuário'}</p>
              <p className="text-xs truncate capitalize" style={{ color: textMuted }}>
                {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
              </p>
            </div>
            <button
              onClick={logout}
              className="sb-hide-when-collapsed flex-shrink-0 p-1.5 rounded-lg transition-colors"
              style={{ color: textMuted }}
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          </div>

          <div
            className="sb-hide-when-collapsed rounded-lg px-3 py-2 text-center whitespace-nowrap"
            style={{ background: isLight ? 'rgba(37, 99, 235, 0.06)' : 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.15)' }}
          >
            <p style={{ color: '#2563eb', fontSize: '0.65rem', fontWeight: 700 }}>Versão 1.13.2</p>
          </div>
        </div>
      </aside>
    </>
  );
}
