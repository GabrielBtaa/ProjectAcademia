import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { PLANOS, RECURSOS_TEXTO, FAQS, PASSOS, formatarPreco } from './src/lib/conteudo.js'

const NOME = 'GymFlow'
const TITULO = 'GymFlow: sistema de gestão para academias com cobrança automática'
const DESCRICAO = 'Sistema online para academias: alunos, mensalidades e financeiro com cobrança automática por WhatsApp e e-mail. 30 dias grátis, sem cartão de crédito.'
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ---------- SEO: meta tags, dados estruturados, conteúdo para robôs, sitemap, robots e llms.txt ----------
// Tudo gerado no build a partir de src/lib/conteudo.js, então preço/limite/FAQ nunca ficam desatualizados.
function seoPlugin(site) {
  const hoje = new Date().toISOString().slice(0, 10)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${site}/#org`, name: NOME, url: `${site}/`, logo: `${site}/icon-512.png` },
      { '@type': 'WebSite', '@id': `${site}/#website`, url: `${site}/`, name: NOME, inLanguage: 'pt-BR', publisher: { '@id': `${site}/#org` } },
      {
        '@type': 'SoftwareApplication',
        name: NOME,
        url: `${site}/`,
        description: DESCRICAO,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web (qualquer navegador, celular ou computador)',
        inLanguage: 'pt-BR',
        featureList: RECURSOS_TEXTO.map(r => r.title),
        offers: PLANOS.map(p => ({
          '@type': 'Offer',
          name: `Plano ${p.nome}`,
          description: `Até ${p.limiteAlunos} alunos. 30 dias grátis, sem cartão de crédito.`,
          price: p.preco.toFixed(2),
          priceCurrency: 'BRL',
          url: `${site}/#planos`,
          availability: 'https://schema.org/InStock',
          priceSpecification: { '@type': 'UnitPriceSpecification', price: p.preco.toFixed(2), priceCurrency: 'BRL', unitText: 'mês' },
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.pergunta, acceptedAnswer: { '@type': 'Answer', text: f.resposta } })),
      },
    ],
  }

  const head = `
    <title>${esc(TITULO)}</title>
    <meta name="description" content="${esc(DESCRICAO)}" />
    <link rel="canonical" href="${site}/" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="application-name" content="${NOME}" />
    <meta name="author" content="${NOME}" />
    <meta name="color-scheme" content="dark light" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${NOME}" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:title" content="${esc(TITULO)}" />
    <meta property="og:description" content="${esc(DESCRICAO)}" />
    <meta property="og:url" content="${site}/" />
    <meta property="og:image" content="${site}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="GymFlow, sistema de gestão para academias e estúdios" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(TITULO)}" />
    <meta name="twitter:description" content="${esc(DESCRICAO)}" />
    <meta name="twitter:image" content="${site}/og-image.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" crossorigin="use-credentials" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`

  // Conteúdo em HTML puro dentro do #root: robôs que NÃO executam JavaScript (a maioria dos
  // rastreadores de IA) conseguem ler. Quando o React carrega, ele substitui este bloco.
  const corpo = `
      <div id="conteudo-estatico" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap">
        <header><a href="/">${NOME}</a></header>
        <main style="white-space:normal">
          <h1>${NOME}: sistema de gestão para academias e estúdios, com cobrança automática por WhatsApp</h1>
          <p>${esc(DESCRICAO)}</p>
          <h2>Recursos</h2>
          <ul>${RECURSOS_TEXTO.map(r => `<li><strong>${esc(r.title)}:</strong> ${esc(r.description)}</li>`).join('')}</ul>
          <h2>Como começar</h2>
          <ol>${PASSOS.map(p => `<li><strong>${esc(p.titulo)}:</strong> ${esc(p.texto)}</li>`).join('')}</ol>
          <h2>Planos e preços</h2>
          <ul>${PLANOS.map(p => `<li>Plano ${esc(p.nome)}: ${esc(formatarPreco(p.preco))} por mês, até ${p.limiteAlunos} alunos</li>`).join('')}</ul>
          <p>Todos os planos incluem todos os recursos. Teste grátis por 30 dias, sem cartão de crédito.</p>
          <h2>Perguntas frequentes</h2>
          <dl>${FAQS.map(f => `<dt>${esc(f.pergunta)}</dt><dd>${esc(f.resposta)}</dd>`).join('')}</dl>
        </main>
        <footer><a href="/privacidade">Política de Privacidade</a> <a href="/termos">Termos de Uso</a></footer>
      </div>
      <noscript>O ${NOME} precisa de JavaScript ativado para funcionar. Ative-o no seu navegador e recarregue a página.</noscript>`

  const robots = (() => {
    const bloco = (agente) => `User-agent: ${agente}\nAllow: /\nDisallow: /api/\nDisallow: /redefinir-senha\n`
    const ias = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended']
    return `# ${NOME}: rastreadores de buscadores e de IAs são bem-vindos nas páginas públicas.\n${bloco('*')}\n${ias.map(bloco).join('\n')}\nSitemap: ${site}/sitemap.xml\n`
  })()

  const urls = [['/', '1.0'], ['/privacidade', '0.3'], ['/termos', '0.3']]
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, prio]) => `  <url><loc>${site}${u}</loc><lastmod>${hoje}</lastmod><priority>${prio}</priority></url>`).join('\n')}\n</urlset>\n`

  const llms = `# ${NOME}

> ${DESCRICAO}

${NOME} é um software online (SaaS) em português do Brasil para donos de academias, estúdios e boxes. Substitui planilhas e controles manuais: cadastra alunos e planos, controla vencimentos e pagamentos e envia lembretes e cobranças automáticas pelo WhatsApp da própria academia e por e-mail.

## Recursos
${RECURSOS_TEXTO.map(r => `- ${r.title}: ${r.description}`).join('\n')}

## Planos e preços
${PLANOS.map(p => `- ${p.nome}: ${formatarPreco(p.preco)} por mês, até ${p.limiteAlunos} alunos`).join('\n')}
- Todos os planos incluem todos os recursos. 30 dias grátis, sem cartão de crédito. Cancelamento dentro do sistema.

## Perguntas frequentes
${FAQS.map(f => `- ${f.pergunta} ${f.resposta}`).join('\n')}

## Links
- [Página inicial](${site}/): apresentação, planos e cadastro
- [Política de Privacidade](${site}/privacidade)
- [Termos de Uso](${site}/termos)
`

  return {
    name: 'gymflow-seo',
    transformIndexHtml(html) {
      return html.replace('<!--SEO_HEAD-->', head).replace('<!--SEO_BODY-->', corpo)
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llms })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // Defina VITE_SITE_URL na Vercel quando tiver o domínio próprio (ex.: https://www.gymflow.com.br)
  const site = (process.env.VITE_SITE_URL || env.VITE_SITE_URL || 'https://projeto-academia-sable.vercel.app').replace(/\/+$/, '')
  return {
    plugins: [react(), tailwindcss(), seoPlugin(site)],
    build: {
      outDir: '../public',
      emptyOutDir: true,
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
  }
})
