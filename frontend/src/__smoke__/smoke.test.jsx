import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'

const b64 = (o) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
const fakeJwt = (extra = {}) => `${b64({ alg: 'HS256' })}.${b64({ id: 1, email: 'a@b.com', role: 'usuario', jti: 'x', iat: 1, exp: 9999999999, ...extra })}.sig`

const resposta = (corpo, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })
function mockApi({ billing = {}, planos = [{ id: 1, nome: 'Mensal', duracao: 30, valor: 100 }] } = {}) {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const u = String(url)
    if (u.includes('/api/auth/verify')) return resposta({ user: { id: 1, email: 'a@b.com', nome: 'Maria', role: 'usuario' } })
    if (u.includes('/api/billing/status')) return resposta({ subscriptionStatus: 'active', subscriptionTier: 'pro', maxAlunos: 250, isAdmin: false, isPlatformOwner: false, ...billing })
    if (u.includes('/api/planos')) return resposta(planos)
    if (u.includes('/api/conta/academia')) return resposta({ nomeAcademia: 'Academia Teste', whatsappAutoEnviar: false, whatsappHoraEnvio: 9, whatsappDiasMaxAtraso: 5, emailAutoEnviar: false })
    if (u.includes('/api/whatsapp/status')) return resposta({ disponivel: true, estado: 'close' })
    if (u.includes('/api/indicacao')) return resposta({ codigo: 'ABCD2345', totalIndicados: 0, convertidos: 0, creditosPendentes: 0 })
    if (u.includes('/api/dashboard') || u.includes('/api/pagamentos') || u.includes('/api/alunos')) return resposta([])
    return resposta({})
  }))
}

let errosConsole
beforeEach(() => {
  cleanup()
  localStorage.clear()
  errosConsole = []
  vi.spyOn(console, 'error').mockImplementation((...a) => { errosConsole.push(a.map(x => (x && x.message) || String(x)).join(' ').slice(0, 300)) })
})

async function abrirApp(token) {
  localStorage.setItem('token', token)
  const { default: App } = await import('/src/App.jsx')
  return render(<App />)
}

describe('app logado', () => {
  it('servidor com erro ao carregar a conta mostra aviso com "Tentar novamente" (não fica girando)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const u = String(url)
      if (u.includes('/api/auth/verify')) return resposta({ user: { id: 1, email: 'a@b.com', nome: 'Maria', role: 'usuario' } })
      if (u.includes('/api/billing/status')) return resposta({ error: 'Erro interno' }, 500)
      if (u.includes('/api/planos')) return resposta([{ id: 1, nome: 'Mensal' }])
      return resposta({})
    }))
    await abrirApp(fakeJwt())
    await waitFor(() => expect(screen.getByText(/Não foi possível carregar sua conta/i)).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByText(/Tentar novamente/i)).toBeTruthy()
    expect(screen.getByText(/Sair/i)).toBeTruthy()
  })

  it('abre o painel e navega por todas as telas sem quebrar', async () => {
    mockApi()
    const { container } = await abrirApp(fakeJwt())
    await waitFor(() => expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0), { timeout: 5000 })
    for (const nome of ['Alunos', 'Financeiro', 'Configurações', 'Dashboard']) {
      const botoes = screen.getAllByText(nome).map(e => e.closest('button')).filter(Boolean)
      expect(botoes.length, `botão ${nome}`).toBeGreaterThan(0)
      fireEvent.click(botoes[0])
      await new Promise(r => setTimeout(r, 600))
      console.log('TELA', nome, '->', container.textContent.length, 'caracteres')
    }
    console.log('ERROS CONSOLE:', JSON.stringify(errosConsole.slice(0, 6)))
    expect(container.textContent.length).toBeGreaterThan(300)
  })

  it('abre em modo recepcionista (token com modo)', async () => {
    mockApi()
    const { container } = await abrirApp(fakeJwt({ modo: 'recepcionista' }))
    await waitFor(() => expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0), { timeout: 5000 })
    expect(screen.queryByText('Configurações')).toBeNull()
    console.log('ERROS RECEP:', JSON.stringify(errosConsole.slice(0, 6)))
  })

  it('conta sem acesso mostra a tela de assinatura (não fica em branco)', async () => {
    mockApi({ billing: { subscriptionStatus: 'inactive' } })
    const { container } = await abrirApp(fakeJwt())
    await waitFor(() => expect(container.textContent).toMatch(/plano|Starter|assin/i), { timeout: 5000 })
    console.log('ERROS ASSINATURA:', JSON.stringify(errosConsole.slice(0, 6)))
  })

  it('conta nova sem planos cai no Setup', async () => {
    mockApi({ planos: [] })
    const { container } = await abrirApp(fakeJwt())
    await waitFor(() => expect(container.textContent.length).toBeGreaterThan(100), { timeout: 5000 })
    console.log('SETUP TEXTO:', container.textContent.slice(0, 120))
    console.log('ERROS SETUP:', JSON.stringify(errosConsole.slice(0, 6)))
  })
})
