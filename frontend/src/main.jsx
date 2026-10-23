import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Marcas de diagnóstico: o aviso de "não foi possível carregar" mostra até onde o app chegou
window.__gymflowBoot = 'modulos-carregados'

// Monitoramento de erros em produção. O Sentry só é baixado se VITE_SENTRY_DSN existir no build
// (assim não pesa nem interfere na abertura do site). Não envia dados pessoais por padrão.
if (import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, sendDefaultPii: false, tracesSampleRate: 0 })
      window.__gymflowReportarErro = (erro) => Sentry.captureException(erro)
    })
    .catch(() => { /* sem Sentry: o app segue normalmente */ })
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
          style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: 10, padding: '12px 22px', fontWeight: 700, cursor: 'pointer' }}
        >
          Recarregar
        </button>
      </div>
    </div>
  )
}

class LimiteDeErro extends Component {
  state = { erro: null }
  static getDerivedStateFromError(erro) { return { erro } }
  componentDidCatch(erro) {
    window.__gymflowBoot = 'erro-de-render: ' + (erro && erro.message)
    try { window.__gymflowReportarErro?.(erro) } catch { /* ignora */ }
  }
  render() { return this.state.erro ? <TelaDeErro /> : this.props.children }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LimiteDeErro>
      <App />
    </LimiteDeErro>
  </StrictMode>,
)
window.__gymflowBoot = 'render-chamado'
