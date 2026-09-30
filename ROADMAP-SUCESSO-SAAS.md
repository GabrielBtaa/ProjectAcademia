# Roadmap de Melhorias — GymFlow (SaaS de Gestão de Academias)

> Este arquivo é um guia de referência para IA/assistentes de código (Claude Code
> ou similar) usarem ao trabalhar neste projeto. Contém melhorias recomendadas
> para aumentar as chances de sucesso do SaaS, organizadas por área, com
> contexto suficiente para implementação autônoma. Marque itens como `[x]`
> conforme forem implementados.

## Contexto do projeto
- **Produto:** GymFlow — SaaS de gestão de academias para o mercado brasileiro.
- **Concorrente direto:** Tecnofit.
- **Stack:** Node.js/Express (`api/index.js`, deploy na Vercel), Prisma + PostgreSQL (Supabase), React/Vite/Tailwind no frontend, Stripe para billing, Evolution API para WhatsApp, Resend para e-mail, GitHub Actions para o disparo automático horário.
- **Modelo:** assinatura mensal recorrente, tiers por número de alunos (starter/pro/business), trial de 30 dias sem cartão.

---

## 1. Produto / Onboarding

- [ ] **Importação de alunos via CSV/planilha.** Prioridade alta — é o maior fator de fricção pra quem já usa um concorrente (Tecnofit) migrar pro GymFlow. Endpoint sugerido: `POST /api/alunos/importar-csv`, aceitando um arquivo com colunas nome/cpf/whatsapp/email/dataNascimento/plano/dataVencimento, validando linha a linha e retornando um relatório de sucesso/erro por linha.
- [ ] **Medir e reduzir o tempo de onboarding** (cadastro → primeiro aluno cadastrado → primeira cobrança automática configurada). Instrumentar eventos-chave (ex: tabela `EventoOnboarding` ou envio para uma ferramenta de analytics) para saber onde as pessoas travam.
- [ ] **Tela de "primeiro sucesso" (wow moment).** Depois do setup inicial, mostrar de forma clara que a automação de cobrança está ativa e vai economizar tempo — reforça o valor do produto logo de cara.

## 2. Retenção e Churn

- [ ] **Página/endpoint de métricas de negócio para o admin da plataforma** (não confundir com o dashboard do cliente): MRR, número de assinantes ativos, churn mensal, LTV médio. Pode começar simples: um endpoint `GET /api/admin/metricas` que agrega dados de `User` (subscriptionStatus, subscriptionTier, createdAt, canceledAt).
- [ ] **Capturar motivo de cancelamento.** O endpoint `POST /api/billing/cancelar` (já existe) deveria aceitar um campo opcional `motivo` no corpo da requisição e salvar num novo campo/tabela (`motivoCancelamento` no `User`, ou uma tabela `Cancelamento` separada com `userId`, `motivo`, `criadoEm`). No frontend, adicionar um `<select>` ou `<textarea>` opcional na tela de confirmação de cancelamento em `Configuracoes.jsx`.
- [ ] **E-mail de reengajamento para contas inativas.** Se `user.updatedAt` (ou um novo campo `ultimoAcessoEm`, atualizado a cada login) passar de N dias sem atividade, disparar um e-mail via Resend lembrando do valor do produto. Pode reaproveitar o padrão de `enviarEmail()` já existente em `api/index.js`, chamado por um novo cron similar ao `whatsapp-diario`.

## 3. Monetização

- [ ] **Upgrade automático de plano ao atingir o limite de alunos.** Hoje `maxAlunos` bloqueia a criação de novos alunos (`requireActiveSubscription` / validação no `POST /api/alunos`). Ao invés de só bloquear, mostrar um CTA de upgrade direto ali (modal ou banner), com link para o Stripe Checkout do tier seguinte.
- [ ] **Considerar testar trial "com fricção" (pedindo cartão) via Stripe Checkout em modo trial**, como teste A/B contra o modelo atual (sem cartão). Não implementar sem confirmação explícita do dono do produto — é uma decisão de negócio, não só técnica.

## 4. Confiabilidade / Observabilidade

- [ ] **Endpoint de health check.** Criar `GET /api/health` retornando `{ ok: true, db: 'connected' }` (fazendo um `SELECT 1` simples via Prisma) para permitir monitoramento externo (ex: UptimeRobot, BetterStack) apontando pra essa rota.
- [ ] **Integração com Sentry (ou similar) para captura de erros em produção.** Hoje os erros só vão para `console.error`, visíveis apenas nos logs da Vercel. Adicionar `@sentry/node` no backend (`api/index.js`) envolvendo o error handler global, e `@sentry/react` no frontend.
- [ ] **Confirmar que o backup automático do Supabase está ativo** (não é uma tarefa de código — é uma verificação de configuração no painel do Supabase, mas deve ser lembrada/documentada aqui).

## 5. Distribuição / Growth

- [ ] **Programa de indicação (referral).** Adicionar um `codigoIndicacao` único por `User`, um campo `indicadoPorUserId` no cadastro (capturável via query param `?ref=CODIGO` na Landing Page/Register), e lógica de recompensa (ex: um mês grátis ou desconto) quando o indicado vira assinante pago. Envolve: schema (`Prisma`), endpoint de cadastro (`POST /api/auth/register` já existe, precisa aceitar o parâmetro), e lógica de aplicar a recompensa no webhook do Stripe (`checkout.session.completed`).
- [ ] Conteúdo e parcerias (contadores, consultores de academia) — fora do escopo de código, mas vale manter registrado aqui como lembrete estratégico.

## 6. Compliance / Segurança de dados

- [ ] **Política de Privacidade e Termos de Uso.** Adicionar páginas estáticas (`/privacidade`, `/termos`) linkadas no rodapé da Landing Page e na tela de cadastro (`AuthCard.jsx`, formulário de registro) — LGPD exige consentimento explícito ao coletar dados de terceiros (CPF, WhatsApp, e-mail dos alunos).
- [ ] **Avaliar criptografia de campos sensíveis** (CPF do aluno, por exemplo) em repouso no banco, ou ao menos garantir que backups e exports não vazem esses dados sem necessidade.

---

## Notas para quem for implementar

- Este projeto já tem um sistema de versionamento manual: bump de `version` em `package.json`/`frontend/package.json`, refletido no rodapé da UI (`Sidebar.jsx` e `LandingPage.jsx`, string `Versão X.Y.Z`).
- Mudanças que alteram o schema do Prisma sempre precisam de uma migration em `backend/prisma/migrations/` (não usar `prisma migrate dev` automaticamente sem confirmar com o usuário — ele roda isso manualmente contra o banco de produção).
- O frontend é servido a partir da pasta `public/` (build do Vite copiado para lá via `vite.config.js` com `outDir: '../public'`) — qualquer mudança em `frontend/src` exige rodar `npm run build` dentro de `frontend/` antes do deploy ter efeito.
- O disparo automático de notificações roda via GitHub Actions (`.github/workflows/whatsapp-cron.yml`), não via cron nativo da Vercel (limitação do plano Hobby).
