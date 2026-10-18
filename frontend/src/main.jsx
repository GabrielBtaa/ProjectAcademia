import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'

// Monitoramento de erros em produção. Só ativa se VITE_SENTRY_DSN estiver configurada
// na Vercel (variável de ambiente de build). Não envia dados pessoais por padrão.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
}

// Tela mostrada se algo quebrar de forma inesperada (em vez de tela branca)
function TelaDeErro() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#080c18', color: '#f2f4f8', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <div style={{ maxWidth: 360 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Algo deu errado</h1>
        <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 20 }}>
          Já registramos o problema. Tente recarregar a página; se continuar, fale com o suporte.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ background: 'var(--accent)', color: '#fff', border: 0, borderRadius: 10, padding: '12px 22px', fontWeight: 700, cursor: 'pointer' }}
        >
          Recarregar
        </button>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<TelaDeErro />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
