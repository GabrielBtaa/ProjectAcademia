import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Settings,
  Menu,
  X,
  Dumbbell,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// Itens de navegação da sidebar
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'alunos', label: 'Alunos', icon: Users },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

export default function Sidebar({ activePage, setActivePage, isOpen, onClose }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    onClose();
  };

  const bgStyle = isLight
    ? { background: '#ffffff', borderRight: '1px solid #e2e8f0' }
    : { background: 'linear-gradient(180deg, #0d1528 0%, #0a0f1e 100%)', borderRight: '1px solid rgba(55, 65, 81, 0.3)' };

  const borderStyle = isLight
    ? { borderBottom: '1px solid #e2e8f0' }
    : { borderBottom: '1px solid rgba(55, 65, 81, 0.3)' };

  const textPrimary = isLight ? '#0f172a' : '#ffffff';
  const textMuted = isLight ? '#64748b' : '#6b7280';
  const textNavDefault = isLight ? '#475569' : '#9ca3af';

  return (
    <>
      {/* Overlay escuro atrás da sidebar em mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar principal */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-50
          flex flex-col
          transition-colors duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={bgStyle}
      >
        {/* Logo / Cabeçalho da sidebar */}
        <div
          className="flex items-center justify-between px-5 py-5 flex-shrink-0"
          style={borderStyle}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              <Dumbbell size={18} color="white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight" style={{ color: textPrimary }}>GymFlow</h1>
              <p style={{ color: textMuted, fontSize: '0.65rem' }}>Sistema de Gestão</p>
            </div>
          </div>
          {/* Botão de fechar (apenas mobile) */}
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Links de navegação */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p style={{ color: isLight ? '#94a3b8' : '#4b5563', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
            Menu Principal
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = activePage === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => handleNavClick(id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                    style={
                      isActive
                        ? {
                            background: isLight ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.2)',
                            color: isLight ? '#1d4ed8' : '#60a5fa',
                            borderLeft: '3px solid #2563eb',
                            fontWeight: 600,
                          }
                        : {
                            color: textNavDefault,
                            borderLeft: '3px solid transparent',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = isLight ? '#f1f5f9' : 'rgba(55, 65, 81, 0.3)';
                        e.currentTarget.style.color = isLight ? '#0f172a' : '#e5e7eb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = textNavDefault;
                      }
                    }}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                    {isActive && <ChevronRight size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Rodapé da sidebar - perfil do usuário */}
        <div
          className="p-4 flex-shrink-0"
          style={{ borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(55, 65, 81, 0.3)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              US
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: textPrimary }}>Usuário</p>
              <p className="text-xs truncate" style={{ color: textMuted }}>Conectado</p>
            </div>
          </div>

          {/* Versão do sistema */}
          <div
            className="rounded-lg px-3 py-2 text-center"
            style={{
              background: isLight ? 'rgba(37, 99, 235, 0.06)' : 'rgba(37, 99, 235, 0.08)',
              border: isLight ? '1px solid rgba(37, 99, 235, 0.15)' : '1px solid rgba(37, 99, 235, 0.15)'
            }}
          >
            <p style={{ color: '#2563eb', fontSize: '0.65rem', fontWeight: 700 }}>Versão 1.2.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
