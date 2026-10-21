import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ViewModeProvider, useViewMode } from './contexts/ViewModeContext';
import { apiFetch } from './lib/api';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Alunos = lazy(() => import('./pages/Alunos'));
const Financeiro = lazy(() => import('./pages/Financeiro'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
import AuthCard from './pages/AuthCard';
const Setup = lazy(() => import('./pages/Setup'));
const Assinatura = lazy(() => import('./pages/Assinatura'));
import LandingPage from './pages/LandingPage';
const PlataformaAdmin = lazy(() => import('./pages/PlataformaAdmin'));
const PaginaLegal = lazy(() => import('./pages/PaginaLegal'));
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha'));

const backend = import.meta.env.VITE_BACKEND;

// Telas internas são carregadas só quando necessárias (a página inicial e o login ficam leves)
function Carregando() {
  return (
    <div role="status" aria-label="Carregando" style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #9ca3af)', fontSize: 14 }}>
      Carregando...
    </div>
  );
}

// Link de indicação (?ref=CODIGO): guarda o código para ser enviado quando a pessoa criar a conta
try {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref) localStorage.setItem('gymflow_ref', ref.slice(0, 20));
} catch { /* sem localStorage: ignora */ }

// Mapa de páginas: ID → { componente, título }
const PAGES = {
  dashboard: { component: Dashboard, title: 'Dashboard' },
  alunos: { component: Alunos, title: 'Gestão de Alunos' },
  financeiro: { component: Financeiro, title: 'Controle Financeiro' },
  configuracoes: { component: Configuracoes, title: 'Configurações' },
  plataforma: { component: PlataformaAdmin, title: 'Admin do SaaS' },
};

/**
 * Componente interno que usa o contexto de autenticação
 */
function AppContent() {
  const { user, loading, logout } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authView, setAuthView] = useState('landing'); // 'landing' | 'login' | 'register'
  const [billing, setBilling] = useState(null);
  const [billingErro, setBillingErro] = useState(false);
  const [tentativaBilling, setTentativaBilling] = useState(0);
  const [demorou, setDemorou] = useState(false);

  // Se o carregamento passar de 12s, mostra opções em vez de um giro infinito
  useEffect(() => {
    const t = setTimeout(() => setDemorou(true), 12000);
    return () => clearTimeout(t);
  }, []);

  // Estado da navegação e sidebar mobile
  const [activePage, setActivePage] = useState('dashboard');
  const { isRecepcionista } = useViewMode();

  // Se estiver em modo recepcionista e a página atual for Configurações, volta pro Dashboard
  useEffect(() => {
    if (isRecepcionista && activePage === 'configuracoes') setActivePage('dashboard');
  }, [isRecepcionista, activePage]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarColapsada, setSidebarColapsada] = useState(() => localStorage.getItem('gymflow_sidebar_colapsada') === '1');
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
    setBillingErro(false);
    apiFetch('/api/billing/status')
      .then(async res => {
        if (!res.ok) throw new Error('Erro ao carregar a conta');
        return res.json();
      })
      .then(setBilling)
      .catch(() => setBillingErro(true));
  }, [user, tentativaBilling]);

  // Servidor respondeu com erro ao carregar a conta: avisa e deixa tentar de novo (em vez de ficar girando)
  if (user && billing === null && billingErro) {
    return (
      <div className="flex items-center justify-center p-6" style={{ minHeight: '100dvh', background: '#080c18' }}>
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-bold" style={{ color: '#f2f4f8' }}>Não foi possível carregar sua conta</h1>
          <p className="mt-2 text-sm" style={{ color: '#9ca3af' }}>O servidor não respondeu como esperado. Tente novamente em instantes; se continuar, fale com o suporte.</p>
          <div className="mt-5 flex gap-2 justify-center">
            <button onClick={() => setTentativaBilling(n => n + 1)} className="btn-primary">Tentar novamente</button>
            <button onClick={logout} className="btn-secondary">Sair</button>
          </div>
        </div>
      </div>
    );
  }

  // Mostra loading enquanto verifica autenticação, plano e assinatura
  if (loading || needsSetup === null || (user && billing === null)) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100dvh', background: '#080c18' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--accent)' }}></div>
          <p className="mt-4 text-gray-400">Carregando...</p>
          {demorou && (
            <div className="mt-4 text-xs" style={{ color: '#9ca3af' }}>
              <p>Está demorando mais que o normal.</p>
              <div className="mt-3 flex gap-2 justify-center">
                <button onClick={() => window.location.reload()} className="btn-primary">Recarregar</button>
                {user && <button onClick={logout} className="btn-secondary">Sair</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mostrar Landing Page, Login ou Registro se não estiver autenticado
  if (!user) {
    if (authView === 'login' || authView === 'register') {
      return <AuthCard modoInicial={authView === 'register' ? 'cadastro' : 'login'} onVoltar={() => setAuthView('landing')} />;
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
    if (!liberado) return <Suspense fallback={<Carregando />}><Assinatura bloqueadoPorAdmin={!!billing.bloqueadoPorAdmin} /></Suspense>;
  }

  // Mostrar setup se não houver planos
  if (needsSetup) {
    return <Suspense fallback={<Carregando />}><Setup onComplete={() => {
      setNeedsSetup(false);
      setActivePage('dashboard');
    }} /></Suspense>;
  }

  // Obtém as informações da página ativa
  const currentPage = PAGES[activePage] || PAGES.dashboard;
  const PageComponent = currentPage.component;

  return (
    <div
      className="flex overflow-hidden"
      style={{ background: 'var(--bg-page)', height: '100dvh' }}
    >
      {/* ===== Sidebar (fixa na esquerda em desktop) ===== */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        colapsada={sidebarColapsada}
        onToggleColapsada={() => setSidebarColapsada(prev => {
          localStorage.setItem('gymflow_sidebar_colapsada', prev ? '0' : '1');
          return !prev;
        })}
        isPlatformOwner={!!billing?.isPlatformOwner}
      />

      {/* ===== Área Principal (direita) ===== */}
      <div
        className={`app-content-shift ${sidebarColapsada ? 'is-collapsed' : 'is-expanded'} flex-1 flex flex-col min-w-0 overflow-hidden`}
      >

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
          <Suspense fallback={<Carregando />}>
            <PageComponent key={activePage} searchTerm={buscaGlobal} />
          </Suspense>
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
  // Páginas públicas legais (acessíveis sem login, por link direto)
  const pathname = window.location.pathname.replace(/\/+$/, '');
  if (pathname === '/redefinir-senha') {
    return (
      <ThemeProvider>
        <Suspense fallback={<Carregando />}>
          <RedefinirSenha />
        </Suspense>
      </ThemeProvider>
    );
  }
  if (pathname === '/privacidade' || pathname === '/termos') {
    return (
      <ThemeProvider>
        <Suspense fallback={<Carregando />}>
          <PaginaLegal tipo={pathname === '/termos' ? 'termos' : 'privacidade'} />
        </Suspense>
      </ThemeProvider>
    );
  }
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
