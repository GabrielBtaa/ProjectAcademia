// Fonte ÚNICA de conteúdo público (planos, recursos, perguntas frequentes).
// É usada pela Landing Page, pela tela de assinatura E pelo build do SEO (meta tags,
// dados estruturados, sitemap e llms.txt). Mudou preço ou limite? Mude só aqui.
// Mantenha os valores iguais aos do backend (LIMITES_POR_PLANO / PRECOS_POR_PLANO em api/index.js).

export const PLANOS = [
  { id: 'starter', nome: 'Starter', preco: 150, limiteAlunos: 150 },
  { id: 'pro', nome: 'Pro', preco: 250, limiteAlunos: 250, destaque: true },
  { id: 'business', nome: 'Business', preco: 400, limiteAlunos: 350 },
];

export const RECURSOS_TEXTO = [
  { title: 'Gestão Completa de Alunos', description: 'Controle matriculados, mensalidades em dia, vencimentos e cadastros em uma interface rápida e intuitiva.' },
  { title: 'Controle Financeiro Automático', description: 'Registre pagamentos com 1 clique. O sistema estende os vencimentos e calcula o faturamento mensal automaticamente.' },
  { title: 'Gráficos e Métricas em Tempo Real', description: 'Visualização nítida de faturamento, alunos ativos vs. inadimplentes e distribuição de matriculados por plano.' },
  { title: 'Cobrança Automática por WhatsApp e E-mail', description: 'Cada academia conecta o próprio WhatsApp. O sistema avisa 5 dias antes do vencimento e cobra quem está em atraso, no horário que você escolher.' },
];

export const FAQS = [
  { pergunta: 'Como funciona o teste grátis de 30 dias?', resposta: 'Ao se cadastrar, sua conta ganha 30 dias de acesso total a todas as ferramentas do GymFlow. Não exigimos cartão de crédito no momento do registro.' },
  { pergunta: 'Preciso instalar algum programa no computador?', resposta: 'Não! O GymFlow é 100% online (SaaS). Você e sua equipe podem acessar de qualquer computador, tablet ou celular com internet.' },
  { pergunta: 'Posso cadastrar quantos alunos quiser no período de testes?', resposta: 'Sim! Durante os 30 dias grátis, o cadastro de alunos, planos e movimentações financeiras é ilimitado.' },
  { pergunta: 'O que acontece após o término dos 30 dias?', resposta: 'Você escolhe um plano para continuar usando: Starter (até 150 alunos), Pro (até 250) ou Business (até 350). Todos os seus dados cadastrados continuam salvos.' },
  { pergunta: 'De qual número de WhatsApp saem as cobranças?', resposta: 'Do número da sua própria academia: você conecta o WhatsApp lendo um QR code, como no WhatsApp Web. Os alunos recebem a mensagem de um número que já conhecem.' },
  { pergunta: 'Posso cancelar quando quiser?', resposta: 'Sim. O cancelamento é feito dentro do sistema, em Configurações. Você continua com acesso até o fim do período já pago e não há nova cobrança depois.' },
  { pergunta: 'Meus dados estão protegidos?', resposta: 'Tratamos os dados de acordo com a LGPD: você pode baixar todos os seus dados ou excluir sua conta a qualquer momento, e o acesso à conta tem proteção contra tentativas de invasão.' },
];

export const PASSOS = [
  { titulo: 'Crie sua conta grátis', texto: 'Cadastre-se em menos de 1 minuto, sem cartão de crédito. São 30 dias de teste com tudo liberado.' },
  { titulo: 'Cadastre planos e alunos', texto: 'Adicione seus planos e alunos um a um ou importe uma planilha CSV de outro sistema.' },
  { titulo: 'Ative a cobrança automática', texto: 'Conecte o WhatsApp da academia e o GymFlow lembra e cobra os alunos sozinho, todos os dias.' },
];

export const formatarPreco = (valor) => `R$ ${valor.toLocaleString('pt-BR')}`;
