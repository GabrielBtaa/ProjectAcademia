import { useState } from 'react';
import {
  Dumbbell,
  Users,
  DollarSign,
  Activity,
  Bell,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  BarChart3,
  ChevronRight,
  Star,
} from 'lucide-react';

export default function LandingPage({ onOpenLogin, onOpenRegister }) {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const RECURSOS = [
    {
      icon: Users,
      title: 'Gestão Completa de Alunos',
      description: 'Controle matriculados, mensalidades em dia, vencimentos e cadastros em uma interface rápida e intuitiva.',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
    },
    {
      icon: DollarSign,
      title: 'Controle Financeiro Automático',
      description: 'Registre pagamentos com 1 clique. O sistema estende os vencimentos e calcula o faturamento mensal automaticamente.',
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.1)',
    },
    {
      icon: BarChart3,
      title: 'Gráficos e Métricas em Tempo Real',
      description: 'Visualização nítida de faturamento, alunos ativos vs. inadimplentes e distribuição de matriculados por plano.',
      color: '#a78bfa',
      bg: 'rgba(167, 139, 250, 0.1)',
    },
    {
      icon: Bell,
      title: 'Lembretes Inteligentes de Vencimento',
      description: 'Saiba exatamente quem vence hoje ou nos próximos 5 dias. As notificações limpam na hora assim que o pagamento cai.',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
  ];

  const DEPOIMENTOS = [
    {
      nome: 'Marcelo Oliveira',
      cargo: 'Proprietário da Academia IronFit',
      texto: 'O GymFlow organizou todo o nosso financeiro em menos de uma semana. Zeramos a inadimplência com os avisos de vencimento.',
      estrelas: 5,
    },
    {
      nome: 'Renata Castro',
      cargo: 'Gestora do Box CrossFit Alpha',
      texto: 'O teste de 30 dias sem cartão facilitou muito. Conseguimos cadastrar nossos alunos e ver os gráficos funcionando na prática.',
      estrelas: 5,
    },
    {
      nome: 'Carlos Eduardo',
      cargo: 'Head Coach do Estúdio Personal VIP',
      texto: 'Visual muito limpo, simples de usar no celular ou computador. Excelente suporte e relatórios super precisos!',
      estrelas: 5,
    },
  ];

  const FAQS = [
    {
      pergunta: 'Como funciona o teste grátis de 30 dias?',
      resposta: 'Ao se cadastrar, sua conta ganha 30 dias de acesso total e ilimitado a todas as ferramentas do GymFlow. Não exigimos cartão de crédito no momento do registro.',
    },
    {
      pergunta: 'Preciso instalar algum programa no computador?',
      resposta: 'Não! O GymFlow é 100% online (SaaS). Você e sua equipe podem acessar de qualquer computador, tablet ou celular com internet.',
    },
    {
      pergunta: 'Posso cadastrar quantos alunos quiser no período de testes?',
      resposta: 'Sim! Durante os 30 dias grátis, o cadastro de alunos, planos e movimentações financeiras é totalmente ilimitado.',
    },
    {
      pergunta: 'O que acontece após o término dos 30 dias?',
      resposta: 'Após 30 dias, você poderá escolher um de nossos planos acessíveis para continuar usando. Todos os seus dados cadastrados continuam 100% salvos e seguros.',
    },
  ];

  return (
    <div className="min-h-screen font-sans text-gray-100" style={{ background: '#0a0f1e' }}>
      
      {/* ===== Barra Superior / Navegação ===== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: 'rgba(10, 15, 30, 0.85)', borderBottom: '1px solid rgba(55, 65, 81, 0.4)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
              <Dumbbell size={20} color="white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">GymFlow</span>
              <span className="text-[0.65rem] block text-blue-400 font-semibold tracking-wider uppercase">SaaS Fitness</span>
            </div>
          </div>

          {/* Links e Botões de Ação */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-300 hover:text-white transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={onOpenRegister}
              className="px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg flex items-center gap-2 transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              <Sparkles size={15} className="text-amber-300" />
              <span>Testar 30 Dias Grátis</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          {/* Badge de Oferta */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8 animate-fade-in-up" style={{ background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#60a5fa' }}>
            <Sparkles size={14} className="text-amber-400" />
            <span>Padrão EVO & W12 · Teste 30 Dias sem Cartão de Crédito</span>
          </div>

          {/* Título Principal */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
            O Sistema de Gestão Definitivo para sua <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Academia ou Estúdio</span>
          </h1>

          {/* Subtítulo */}
          <p className="mt-6 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Elimine a inadimplência, automatize pagamentos e acompanhe o faturamento mensal da sua academia em tempo real em uma plataforma moderna e ultrarrápida.
          </p>

          {/* CTAs do Hero */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base text-white shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              <span>Começar Meus 30 Dias Grátis</span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-base text-gray-300 hover:text-white transition-all"
              style={{ background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(55, 65, 81, 0.5)' }}
            >
              Já sou cliente (Fazer Login)
            </button>
          </div>

          {/* Garantias curtas */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-emerald-400" /> Sem necessidade de cartão</span>
            <span className="flex items-center gap-1.5"><Zap size={15} className="text-amber-400" /> Ativação em 1 minuto</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-blue-400" /> Suporte dedicado</span>
          </div>

          {/* Showcase / Preview do Dashboard */}
          <div className="mt-16 relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl p-2" style={{ background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.3) 0%, rgba(13, 21, 40, 0.8) 100%)', border: '1px solid rgba(55, 65, 81, 0.5)' }}>
            <div className="rounded-xl overflow-hidden p-6 sm:p-8 text-left space-y-6" style={{ background: '#0d1528' }}>
              
              {/* Barra superior simulada do app */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-xs font-mono text-gray-400 ml-2">app.gymflow.com/dashboard</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Activity size={12} />
                  <span>Sincronizado em Tempo Real</span>
                </div>
              </div>

              {/* Cards simulados do Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl p-4 bg-gray-800/60 border border-gray-700/50">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Alunos Ativos</p>
                  <p className="text-2xl font-bold text-white mt-1">142 alunos</p>
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp size={12} /> +12 este mês</p>
                </div>
                <div className="rounded-xl p-4 bg-gray-800/60 border border-gray-700/50">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Faturamento do Mês</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">R$ 16.890,00</p>
                  <p className="text-xs text-gray-400 mt-1">Pagamentos confirmados</p>
                </div>
                <div className="rounded-xl p-4 bg-gray-800/60 border border-gray-700/50">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Inadimplentes</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">2 pendentes</p>
                  <p className="text-xs text-amber-400 mt-1">Avisos enviados automaticamente</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ===== Recursos Principais ===== */}
      <section className="py-20 bg-gray-950/60 border-y border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Tudo o que sua Academia precisa em um só lugar
            </h2>
            <p className="text-sm sm:text-base text-gray-400">
              Desenvolvido com foco na simplicidade de uso diário de gestores, recepcionistas e proprietários de academias.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {RECURSOS.map((rec, i) => {
              const Icon = rec.icon;
              return (
                <div
                  key={i}
                  className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-lg"
                  style={{ background: '#0d1528', border: '1px solid rgba(55, 65, 81, 0.4)' }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: rec.bg }}
                  >
                    <Icon size={24} style={{ color: rec.color }} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{rec.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{rec.description}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ===== Prova Social / Depoimentos ===== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Aprovado por Gestores de Fitness de todo o Brasil
            </h2>
            <p className="text-sm text-gray-400">
              Veja quem já simplificou a gestão e reduziu a inadimplência com o GymFlow.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEPOIMENTOS.map((dep, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 flex flex-col justify-between space-y-4"
                style={{ background: '#0d1528', border: '1px solid rgba(55, 65, 81, 0.4)' }}
              >
                <div className="space-y-3">
                  <div className="flex gap-1">
                    {[...Array(dep.estrelas)].map((_, s) => (
                      <Star key={s} size={16} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 italic leading-relaxed">
                    "{dep.texto}"
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-800">
                  <p className="font-bold text-sm text-white">{dep.nome}</p>
                  <p className="text-xs text-blue-400">{dep.cargo}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ===== Chamada CTA Final ===== */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #1e3a72 0%, #2563eb 100%)' }}>
            
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Pronto para transformar a gestão da sua academia?
            </h2>
            <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto">
              Experimente 30 dias grátis com acesso ilimitado. Crie sua conta agora em menos de 1 minuto sem precisar de cartão.
            </p>

            <div className="pt-4 flex justify-center">
              <button
                onClick={onOpenRegister}
                className="px-8 py-4 rounded-xl font-bold text-base text-blue-900 bg-white shadow-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles size={18} className="text-amber-500" />
                <span>Começar Meus 30 Dias Grátis</span>
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-16 bg-gray-950/40 border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Perguntas Frequentes</h2>
            <p className="text-xs text-gray-400">Tire suas dúvidas sobre o teste de 30 dias do GymFlow</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden transition-all"
                style={{ background: '#0d1528', border: '1px solid rgba(55, 65, 81, 0.4)' }}
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between text-sm font-semibold text-white hover:text-blue-400 transition-colors"
                >
                  <span>{faq.pergunta}</span>
                  <ChevronRight size={18} className={`transition-transform duration-200 ${activeFaq === i ? 'rotate-90 text-blue-400' : 'text-gray-400'}`} />
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-4 text-xs text-gray-400 leading-relaxed border-t border-gray-800/60 pt-3">
                    {faq.resposta}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ===== Rodapé ===== */}
      <footer className="py-8 border-t border-gray-800 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} GymFlow SaaS. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-gray-400">
            <button onClick={onOpenLogin} className="hover:text-white">Login</button>
            <span>•</span>
            <button onClick={onOpenRegister} className="hover:text-white">Criar Conta</button>
            <span>•</span>
            <span>Versão 1.4.0</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
