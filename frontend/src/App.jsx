import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ViewModeProvider, useViewMode } from './contexts/ViewModeContext';
import { apiFetch } from './lib/api';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Alunos from './pages/Alunos';
import Financeiro from './pages/Financeiro';
import Configuracoes from './pages/Configuracoes';
import Login from './pages/Login';
import Register from './pages/Register';
import Setup from './pages/Setup';
import LandingPage from './pages/LandingPage';

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
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authView, setAuthView] = useState('landing'); // 'landing' | 'login' | 'register'
  const [billing, setBilling] = useState(null);

  // Estado da navegação e sidebar mobile
  const [activePage, setActivePage] = useState('dashboard');
  const { isRecepcionista } = useViewMode();

  // Se estiver em modo recepcionista e a página atual for Configurações, volta pro Dashboard
  useEffect(() => {
    if (isRecepcionista && activePage === 'configuracoes') setActivePage('dashboard');
  }, [isRecepcionista, activePage]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [buscaGlobal, setBuscaGlobal] = useState('');

  // Verificar hash da URL para direcionar tela
  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;

      if (hash === '#register' || path === '/register') {
        setAuthView('register');
      } else if (hash === '#login' || path === '/login') {
        setAuthView('login');
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
    if (!user) {
      setNeedsSetup(false);
      return;
    }

    const checkSetup = async () => {
      try {
        const res = await apiFetch('/api/planos');
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

  // Verificar se a conta tem assinatura ativa (admin sempre libera)
  useEffect(() => {
    if (!user) {
      setBilling(null);
      return;
    }
    apiFetch('/api/billing/status')
      .then(res => res.json())
      .then(setBilling)
      .catch(() => setBilling({ subscriptionStatus: 'active', isAdmin: false }));
  }, [user]);

  // Mostra loading enquanto verifica autenticação, plano e assinatura
  if (loading || needsSetup === null || (user && billing === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Mostrar Landing Page, Login ou Registro se não estiver autenticado
  if (!user) {
    if (authView === 'login') {
      return <Login />;
    }
    if (authView === 'register') {
      return <Register />;
    }
    return (
      <LandingPage
        onOpenLogin={() => setAuthView('login')}
        onOpenRegister={() => setAuthView('register')}
      />
    );
  }

  // Bloqueia o app se a conta não tiver assinatura ativa (admin sempre passa)
  if (billing && !billing.isAdmin) {
    const trialAtivo = billing.subscriptionStatus === 'trial' && billing.trialEndsAt && new Date(billing.trialEndsAt) > new Date();
    const liberado = billing.subscriptionStatus === 'active' || trialAtivo;
    if (!liberado) return <Assinatura />;
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
      style={{ background: 'var(--bg-page)' }}
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
          onNavigate={setActivePage}
          onSearch={(termo) => {
            setBuscaGlobal(termo);
            setActivePage('alunos');
          }}
        />

        {/* Conteúdo da página - rolagem independente */}
        <main className="flex-1 overflow-y-auto">
          {/* Renderiza a página ativa de forma condicional */}
          {/* A key força re-montagem ao mudar de página (anima entrada) */}
          <PageComponent key={activePage} searchTerm={buscaGlobal} />
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
    <ThemeProvider>
      <ViewModeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ViewModeProvider>
    </ThemeProvider>
  );
}
