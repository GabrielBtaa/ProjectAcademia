import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Alunos from './pages/Alunos';
import Financeiro from './pages/Financeiro';
import Configuracoes from './pages/Configuracoes';

const backend = import.meta.env.VITE_BACKEND;

// Mapa de páginas: ID → { componente, título }
const PAGES = {
  dashboard: { component: Dashboard, title: 'Dashboard' },
  alunos: { component: Alunos, title: 'Gestão de Alunos' },
  financeiro: { component: Financeiro, title: 'Controle Financeiro' },
  configuracoes: { component: Configuracoes, title: 'Configurações' },
};

/**
 * Componente raiz App
 * Gerencia o estado global da navegação (página ativa e sidebar mobile).
 * O layout é dividido em: Sidebar (esquerda) + Área principal (direita).
 *
 * Estado:
 * - activePage: string com o ID da página ativa
 * - sidebarOpen: boolean para controle da sidebar em mobile
 */
export default function App() {
  // Estado da navegação e sidebar mobile
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Obtém as informações da página ativa
  const currentPage = PAGES[activePage] || PAGES.dashboard;
  const PageComponent = currentPage.component;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#030712' }}
    >
      {/* ===== Sidebar (fixa na esquerda em desktop) ===== */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ===== Área Principal (direita) ===== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar fixa no topo */}
        <Topbar
          title={currentPage.title}
          onMenuClick={() => setSidebarOpen(true)}
          notificacoes={2}
        />

        {/* Conteúdo da página - rolagem independente */}
        <main className="flex-1 overflow-y-auto">
          {/* Renderiza a página ativa de forma condicional */}
          {/* A key força re-montagem ao mudar de página (anima entrada) */}
          <PageComponent key={activePage} />
        </main>
      </div>
    </div>
  );
}
