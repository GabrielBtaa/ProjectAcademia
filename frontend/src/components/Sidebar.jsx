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
  Bell,
  LogOut,
} from 'lucide-react';

// Itens de navegação da sidebar
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'alunos', label: 'Alunos', icon: Users },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

/**
 * Componente Sidebar
 * Menu lateral com navegação entre os módulos do sistema.
 * Responsivo: colapsa em mobile e abre como overlay.
 *
 * Props:
 * - activePage: string com o ID da página ativa
 * - setActivePage: função para mudar de página
 * - isOpen: boolean para controlar visibilidade em mobile
 * - onClose: fechar a sidebar em mobile
 */
export default function Sidebar({ activePage, setActivePage, isOpen, onClose }) {
  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    onClose(); // fecha sidebar em mobile ao navegar
  };

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
          transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background: 'linear-gradient(180deg, #0d1528 0%, #0a0f1e 100%)',
          borderRight: '1px solid rgba(55, 65, 81, 0.3)',
        }}
      >
        {/* Logo / Cabeçalho da sidebar */}
        <div
          className="flex items-center justify-between px-5 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.3)' }}
        >
          <div className="flex items-center gap-3">
            {/* Ícone de logomarca */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              <Dumbbell size={18} color="white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">GymFlow</h1>
              <p style={{ color: '#6b7280', fontSize: '0.65rem' }}>Sistema de Gestão</p>
            </div>
          </div>
          {/* Botão de fechar (apenas mobile) */}
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Links de navegação */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p style={{ color: '#4b5563', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
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
                            background: 'rgba(37, 99, 235, 0.2)',
                            color: '#60a5fa',
                            borderLeft: '3px solid #2563eb',
                          }
                        : {
                            color: '#9ca3af',
                            borderLeft: '3px solid transparent',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(55, 65, 81, 0.3)';
                        e.currentTarget.style.color = '#e5e7eb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#9ca3af';
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
          style={{ borderTop: '1px solid rgba(55, 65, 81, 0.3)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">Admin</p>
              <p className="text-xs truncate" style={{ color: '#6b7280' }}>admin@gymflow.com</p>
            </div>
            <button className="text-gray-500 hover:text-red-400 transition-colors" title="Sair">
              <LogOut size={15} />
            </button>
          </div>

          {/* Versão do sistema */}
          <div
            className="rounded-lg px-3 py-2 text-center"
            style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.15)' }}
          >
            <p style={{ color: '#3b82f6', fontSize: '0.65rem', fontWeight: 600 }}>GymFlow v1.0 · Plano Pro</p>
          </div>
        </div>
      </aside>
    </>
  );
}
