# 📋 GymFlow — Documentação Completa do Projeto

> **Para o Desenvolvedor e para o Cliente**
> Versão 1.0 · Stack: React + Vite + Tailwind CSS v4 + Lucide Icons + Recharts

---

## 📌 Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Explicação de Cada Arquivo](#3-explicação-de-cada-arquivo)
4. [Como Funciona a Navegação](#4-como-funciona-a-navegação)
5. [Como os Dados Funcionam Hoje](#5-como-os-dados-funcionam-hoje)
6. [Como Integrar com um Backend Real](#6-como-integrar-com-um-backend-real)
7. [Guia de Implantação para o Cliente](#7-guia-de-implantação-para-o-cliente)
8. [Dúvidas Frequentes do Cliente](#8-dúvidas-frequentes-do-cliente)

---

## 1. Visão Geral do Sistema

O **GymFlow** é um sistema de gestão desenvolvido especialmente para academias de pequeno e médio porte. Ele roda no navegador (web) e pode ser acessado pelo computador ou pelo celular do gestor.

### O que o sistema faz hoje (versão 1.0):

| Módulo | O que faz |
|---|---|
| **Dashboard** | Mostra um resumo: alunos ativos, inadimplentes, faturamento do mês e vencimentos do dia |
| **Gestão de Alunos** | Cadastrar, editar, pesquisar e excluir alunos |
| **Controle Financeiro** | Cadastrar planos, registrar pagamentos e ver o histórico |
| **Configurações** | Dados da academia e preferências do sistema |

---

## 2. Estrutura de Pastas

```
ProjetoAcademia/              ← Pasta raiz do projeto
│
├── index.html                ← Página HTML principal (ponto de entrada)
├── vite.config.js            ← Configuração do Vite (bundler)
├── package.json              ← Lista de dependências do projeto
│
└── src/                      ← Todo o código-fonte React fica aqui
    │
    ├── main.jsx              ← Inicializa o React na página HTML
    ├── App.jsx               ← Componente raiz (layout base + navegação)
    ├── index.css             ← Estilos globais + design system
    │
    ├── components/           ← Componentes reutilizáveis (partes visuais)
    │   ├── Sidebar.jsx       ← Menu lateral de navegação
    │   └── Topbar.jsx        ← Barra superior (título + busca + notificações)
    │
    ├── data/
    │   └── mockData.js       ← Dados de exemplo (serão substituídos pela API)
    │
    └── pages/                ← Telas/páginas do sistema
        ├── Dashboard.jsx     ← Tela de métricas e resumo geral
        ├── Alunos.jsx        ← Tela de listagem e cadastro de alunos
        ├── Financeiro.jsx    ← Tela de planos e pagamentos
        └── Configuracoes.jsx ← Tela de configurações
```

---

## 3. Explicação de Cada Arquivo

### `index.html`
É a única página HTML do sistema. Ela não tem conteúdo visível diretamente — apenas contém a âncora `<div id="root">` onde o React "injeta" toda a interface dinamicamente.

**O que personalizar:** O título da aba do navegador e as meta tags de SEO.

---

### `vite.config.js`
Configuração do **Vite**, que é a ferramenta que compila o código React em arquivos que o navegador entende. Ele também inclui o plugin do Tailwind CSS.

**Não precisa mexer aqui na maioria dos casos.**

---

### `src/main.jsx`
O ponto de partida do React. Ele pega a `<div id="root">` do HTML e renderiza o componente `<App />` dentro dela. É aqui que o React "liga" e começa a funcionar.

**Não precisa mexer aqui.**

---

### `src/index.css`
O **design system** completo do projeto. Contém:

- **`@theme {}`** → Define as cores da paleta (azul escuro, verde, vermelho, cinzas). Para mudar as cores do sistema inteiro, edite aqui.
- **Animações** → `fadeInUp`, `shimmer` etc para deixar a UI animada
- **Classes utilitárias** → `.glass-card`, `.btn-primary`, `.btn-secondary`, `.badge-active`, `.input-field` etc.

**Para personalizar a identidade visual do cliente**, edite as variáveis de cor dentro de `@theme {}`.

```css
/* Exemplo: mudar a cor principal de azul para roxo */
--color-brand-400: #7c3aed;   /* era #2563eb */
--color-brand-300: #8b5cf6;   /* era #3b82f6 */
```

---

### `src/App.jsx`
O **componente raiz**. Ele é responsável por:

1. Guardar em estado qual página está sendo exibida (`activePage`)
2. Controlar se a sidebar está aberta ou fechada em mobile (`sidebarOpen`)
3. Montar o layout base: Sidebar à esquerda + conteúdo à direita

```jsx
// Como a navegação funciona (simplificado):
const [activePage, setActivePage] = useState('dashboard'); // página atual

// Mapa de páginas: ID → componente e título
const PAGES = {
  dashboard: { component: Dashboard, title: 'Dashboard' },
  alunos: { component: Alunos, title: 'Gestão de Alunos' },
  // ...
};

// Renderiza o componente da página ativa
const PageComponent = PAGES[activePage].component;
return <PageComponent key={activePage} />;
```

---

### `src/components/Sidebar.jsx`
A barra lateral de navegação. Contém:

- **Logo** do GymFlow com ícone
- **Links de navegação** (Dashboard, Alunos, Financeiro, Configurações)
- **Perfil do usuário** no rodapé
- **Comportamento responsivo**: em telas mobile, some e aparece como drawer (gaveta) sobre a tela

**Para adicionar um novo módulo ao menu**, adicione um item ao array `NAV_ITEMS`:

```jsx
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'alunos', label: 'Alunos', icon: Users },
  { id: 'meuNovoModulo', label: 'Meu Módulo', icon: Star }, // ← adicione aqui
];
```

---

### `src/components/Topbar.jsx`
A barra superior. Exibe:

- Botão de abrir o menu (apenas no mobile)
- Título da página atual
- Data atual formatada em pt-BR
- Campo de busca global (visual, a ser integrado com lógica)
- Ícone de notificações com badge numérico

---

### `src/data/mockData.js`
**Dados de exemplo** que simulam o que um backend/banco de dados retornaria. Contém:

- `PLANOS_MOCK` → Lista de planos (Mensal, Trimestral, Semestral, Anual)
- `ALUNOS_MOCK` → 10 alunos de exemplo com todos os campos
- `PAGAMENTOS_MOCK` → Histórico de pagamentos
- `FREQUENCIA_SEMANAL` → Dados para o gráfico do dashboard

> ⚠️ **Importante**: Estes dados existem apenas para demonstração.
> Quando conectar ao backend, este arquivo será **substituído por chamadas à API**.

---

### `src/pages/Dashboard.jsx`
A tela inicial. Usa `useEffect` para calcular as métricas ao carregar:

```jsx
useEffect(() => {
  // Aqui será feito: fetch('/api/metricas') no futuro
  const totalAtivos = ALUNOS_MOCK.filter(a => a.status === 'ativo').length;
  const faturamentoMes = PAGAMENTOS_MOCK
    .filter(p => p.status === 'confirmado' && /* mês atual */)
    .reduce((acc, p) => acc + p.valor, 0);

  setMetricas({ totalAtivos, faturamentoMes, ... });
}, []);
```

**Sub-componentes internos:**
- `MetricCard` → Um card de métrica (título, valor, ícone, indicador de tendência)
- `CustomTooltip` → Tooltip do gráfico de barras (aparece ao passar o mouse)
- `VencimentoItem` → Item da lista de vencimentos do dia

---

### `src/pages/Alunos.jsx`
A tela mais completa do sistema. Implementa um **CRUD completo**:

**Estados principais:**
```jsx
const [alunos, setAlunos] = useState(ALUNOS_MOCK);    // lista de alunos
const [busca, setBusca] = useState('');                // texto da busca
const [filtroStatus, setFiltroStatus] = useState('todos'); // filtro ativo
const [paginaAtual, setPaginaAtual] = useState(1);     // paginação
const [modalAberto, setModalAberto] = useState(false); // controla o modal
const [alunoEditando, setAlunoEditando] = useState(null); // null = novo, objeto = edição
```

**Lógica de filtro com `useMemo`** (recalcula apenas quando busca ou filtro mudam):
```jsx
const alunosFiltrados = useMemo(() => {
  return alunos.filter(aluno => {
    const matchBusca = aluno.nome.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || aluno.status === filtroStatus;
    return matchBusca && matchStatus;
  });
}, [alunos, busca, filtroStatus]);
```

**Sub-componentes internos:**
- `AlunoModal` → Formulário de cadastro/edição com validação
- `AlunoCard` → Card de aluno para telas mobile

---

### `src/pages/Financeiro.jsx`
Gerencia planos e pagamentos. Destaques:

- `PlanoModal` → Formulário para criar/editar planos
- `PagamentoModal` → Formulário de pagamento com seleção de método (PIX, Cartão, Dinheiro) e preenchimento automático do valor ao selecionar um aluno
- Exibe o **faturamento total** calculado com `useMemo`

---

### `src/pages/Configuracoes.jsx`
Tela de configurações com:
- Formulário de dados da academia (nome, CNPJ, telefone)
- Toggle switches para notificações e sistema
- **Componente `Toggle`** reutilizável para o switch animado

---

## 4. Como Funciona a Navegação

O sistema **não usa URL** para navegar (sem React Router). Em vez disso, usa um simples estado em `App.jsx`:

```
Usuário clica em "Alunos" na Sidebar
  → Sidebar chama setActivePage('alunos')
    → App.jsx re-renderiza com o componente <Alunos />
      → A key={activePage} garante que a animação de entrada rode
```

Isso é ideal para a versão atual. **Quando precisar de URLs compartilháveis**, basta adicionar `react-router-dom`.

---

## 5. Como os Dados Funcionam Hoje

```
mockData.js → importado diretamente → usado nos pages
```

Todos os dados são **locais** (na memória do navegador). Isso significa:
- ✅ Funciona sem servidor
- ✅ Ótimo para demonstração ao cliente
- ❌ Dados resetam ao atualizar a página
- ❌ Não persiste no banco de dados

---

## 6. Como Integrar com um Backend Real

Quando o backend Node.js/Express estiver pronto, a substituição é simples.

### Passo 1 — Criar arquivo de serviço da API

Crie o arquivo `src/services/api.js`:

```js
// src/services/api.js
const BASE_URL = 'http://localhost:3001/api'; // URL do seu backend

// GET todos os alunos
export const getAlunos = async () => {
  const res = await fetch(`${BASE_URL}/alunos`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  if (!res.ok) throw new Error('Erro ao buscar alunos');
  return res.json();
};

// POST - criar novo aluno
export const criarAluno = async (dados) => {
  const res = await fetch(`${BASE_URL}/alunos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(dados)
  });
  if (!res.ok) throw new Error('Erro ao criar aluno');
  return res.json();
};

// PUT - editar aluno
export const editarAluno = async (id, dados) => {
  const res = await fetch(`${BASE_URL}/alunos/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(dados)
  });
  return res.json();
};

// DELETE - excluir aluno
export const excluirAluno = async (id) => {
  await fetch(`${BASE_URL}/alunos/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
};

// GET métricas do dashboard
export const getMetricas = async () => {
  const res = await fetch(`${BASE_URL}/dashboard/metricas`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return res.json();
};
```

### Passo 2 — Atualizar Alunos.jsx

Substitua a linha de estado inicial e o `useMemo` por chamadas à API:

```jsx
// ANTES (mock):
const [alunos, setAlunos] = useState(ALUNOS_MOCK);

// DEPOIS (API):
const [alunos, setAlunos] = useState([]);
const [carregando, setCarregando] = useState(true);

useEffect(() => {
  getAlunos()
    .then(data => setAlunos(data))
    .catch(err => console.error(err))
    .finally(() => setCarregando(false));
}, []);
```

### Passo 3 — Atualizar Dashboard.jsx

```jsx
// ANTES:
useEffect(() => {
  const totalAtivos = ALUNOS_MOCK.filter(...).length;
  // ...
}, []);

// DEPOIS:
useEffect(() => {
  getMetricas().then(data => setMetricas(data));
}, []);
```

### Rotas esperadas no backend (Node/Express)

```
GET    /api/alunos           → lista todos os alunos
POST   /api/alunos           → cria novo aluno
PUT    /api/alunos/:id       → edita aluno
DELETE /api/alunos/:id       → exclui aluno

GET    /api/planos           → lista planos
POST   /api/planos           → cria plano
PUT    /api/planos/:id       → edita plano
DELETE /api/planos/:id       → exclui plano

GET    /api/pagamentos       → lista pagamentos
POST   /api/pagamentos       → registra pagamento

GET    /api/dashboard/metricas → retorna métricas do dashboard
```

---

## 7. Guia de Implantação para o Cliente

### Opção A — Hospedagem Simples em VPS (Recomendado)

Use um servidor VPS (Hostinger, DigitalOcean, Contabo etc).

#### Passo a passo:

**1. Instalar dependências na máquina do cliente (fazer uma vez)**

```bash
# No servidor Linux (via SSH)
sudo apt update
sudo apt install -y nodejs npm nginx
```

**2. Enviar o projeto para o servidor**

```bash
# No seu computador, comprimir o projeto
# (excluindo node_modules)
zip -r gymflow.zip . -x "node_modules/*" -x ".git/*"

# Enviar via SCP ou SFTP para o servidor
scp gymflow.zip usuario@ip-do-servidor:/var/www/gymflow/
```

**3. Instalar e compilar no servidor**

```bash
# No servidor (via SSH)
cd /var/www/gymflow
unzip gymflow.zip
npm install
npm run build   # Gera a pasta 'dist' com os arquivos prontos para produção
```

**4. Configurar o Nginx para servir o sistema**

Crie o arquivo `/etc/nginx/sites-available/gymflow`:

```nginx
server {
    listen 80;
    server_name seudominio.com.br;   # domínio do cliente

    root /var/www/gymflow/dist;
    index index.html;

    # Redireciona todas as rotas para o index.html (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Ativar:
```bash
sudo ln -s /etc/nginx/sites-available/gymflow /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**5. Adicionar HTTPS (gratuito com Certbot)**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com.br
```

---

### Opção B — Vercel (Mais Fácil, Serverless)

Ideal se o frontend for separado do backend.

```bash
# No seu computador
npm install -g vercel
vercel login
vercel --prod   # faz o deploy automaticamente
```

O Vercel gera uma URL como `gymflow.vercel.app`. O cliente pode usar isso até ter um domínio próprio.

---

### Opção C — Netlify (Alternativa ao Vercel)

1. Acesse [netlify.com](https://netlify.com)
2. Arraste a pasta `dist` (gerada pelo `npm run build`) para o painel
3. Pronto! O sistema fica online em segundos.

---

### Configurar Domínio Próprio

Após a hospedagem estar no ar:

1. Compre um domínio (ex: `academiafortafitness.com.br`) no Registro.br, GoDaddy ou Namecheap
2. No painel DNS do domínio, aponte:
   - **Registro A** → IP do servidor VPS
   - Ou, se usar Vercel/Netlify → use os registros CNAME que eles fornecem
3. Aguarde a propagação (de alguns minutos a 48h)

---

## 8. Dúvidas Frequentes do Cliente

### "O sistema funciona no celular?"
**Sim.** O sistema é 100% responsivo (Mobile First). No celular, o menu lateral some e aparece um botão de hambúrguer para abrir. A listagem de alunos vira cartões empilhados.

---

### "Posso acessar de vários computadores ao mesmo tempo?"
**Sim**, pois o sistema fica em um servidor na internet. Qualquer computador, tablet ou celular com acesso à internet pode usar ao mesmo tempo.

---

### "Os dados ficam salvos?"
Na versão atual (v1.0), os dados são de demonstração e resetam ao recarregar a página. **Quando o backend for integrado**, os dados ficarão salvos no banco de dados (PostgreSQL ou MySQL) no servidor.

---

### "É seguro?"
- O sistema usa HTTPS (criptografia) na comunicação
- O acesso é controlado por login com senha (a implementar)
- Os dados ficam no servidor contratado, não em computadores de terceiros

---

### "Posso ter vários usuários (recepcionista, admin)?"
Isso é previsto na próxima versão. Será implementado um sistema de **perfis**:
- **Admin** → acesso total (configurações, financeiro, exclusão)
- **Recepcionista** → cadastro de alunos e confirmação de pagamentos

---

### "Preciso instalar alguma coisa no computador?"
**Não.** O sistema abre diretamente no navegador (Chrome, Edge, Firefox). Não precisa instalar nada.

---

### "Como faço para atualizar o sistema?"

```bash
# No servidor
cd /var/www/gymflow
git pull origin main      # se usar Git
npm install               # instalar novas dependências
npm run build             # recompilar
sudo systemctl reload nginx
```

Ou simplesmente enviar a nova pasta `dist` para o servidor.

---

*Documentação gerada em 30/03/2026 · GymFlow v1.0 · Desenvolvido com React + Vite + Tailwind CSS*
