import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Alunos from './pages/Alunos';
import Financeiro from './pages/Financeiro';
import Configuracoes from './pages/Configuracoes';
import Login from './pages/Login';
import Register from './pages/Register';
import Setup from './pages/Setup';

const backend = import.meta.env.VITE_BACKEND;

// Mapa de páginas: ID → { componente, título }
const PAGES = {
  dashboard: { component: Dashboard, title: 'Dashboard' },
  alunos: { component: Alunos, title: 'Gestão de Alunos' },
  financeiro: { component: Financeiro, title: 'Controle Financeiro' },
  configuracoes: { component: Configuracoes, title: 'Configurações' },
};

/**
 * Componente interno que usa o contexto de autenticação
 */
function AppContent() {
  const { user, loading } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Estado da navegação e sidebar mobile
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Verificar hash da URL para mostrar registro
  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;

      if (hash === '#register' || path === '/register') {
        setShowRegister(true);
      } else {
        setShowRegister(false);
      }
    };

    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);

    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  // Verificar se precisa fazer setup (verificar planos)
  useEffect(() => {
    if (!user) return;
    
    const checkSetup = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API || '/api'}/planos`);
        if (!res.ok) throw new Error('Erro ao verificar planos');
        const planos = await res.json();
        setNeedsSetup(planos.length === 0);
      } catch (err) {
        console.error('Erro ao verificar setup:', err);
        setNeedsSetup(false);
      }
    };

    checkSetup();
  }, [user]);

  // Mostrar loading enquanto verifica autenticação
  if (loading || needsSetup === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Mostrar login ou registro se não estiver autenticado
  if (!user) {
    return showRegister ? <Register /> : <Login />;
  }

  // Mostrar setup se não houver planos
  if (needsSetup) {
    return <Setup onComplete={() => {
      setNeedsSetup(false);
      setActivePage('dashboard');
    }} />;
  }

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

/**
 * Componente raiz App
 * Envolve tudo com o AuthProvider
 */
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
