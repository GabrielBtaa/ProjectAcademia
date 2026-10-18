import { useEffect } from 'react';
import { ArrowLeft, Dumbbell } from 'lucide-react';

// >>> EDITE AQUI com os dados reais da sua empresa/contato antes de divulgar <<<
const NOME_EMPRESA = 'GymFlow';
// Defina VITE_CONTATO_EMAIL nas variáveis de ambiente da Vercel (e faça um novo deploy)
// com o e-mail real de contato/encarregado. Enquanto não definir, aparece o texto padrão abaixo.
const EMAIL_CONTATO = import.meta.env.VITE_CONTATO_EMAIL || 'contato@seudominio.com.br';
const ULTIMA_ATUALIZACAO = '11/10/2026';

const Secao = ({ titulo, children }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>{titulo}</h2>
    <div className="space-y-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{children}</div>
  </section>
);

function Privacidade() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--text-heading)' }}>Política de Privacidade</h1>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Última atualização: {ULTIMA_ATUALIZACAO}</p>

      <Secao titulo="1. Quem somos">
        <p>O {NOME_EMPRESA} é um sistema de gestão para academias e estúdios. Esta política explica como tratamos dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>
      </Secao>

      <Secao titulo="2. Papéis: quem é o controlador dos dados">
        <p>Quanto aos dados do <strong>titular da conta</strong> (o dono ou gestor da academia que contrata o {NOME_EMPRESA}), o {NOME_EMPRESA} atua como <strong>controlador</strong>.</p>
        <p>Quanto aos dados dos <strong>alunos</strong> cadastrados pela academia, a academia é a <strong>controladora</strong> e o {NOME_EMPRESA} atua como <strong>operador</strong>, tratando esses dados apenas para prestar o serviço contratado e conforme as instruções da academia.</p>
      </Secao>

      <Secao titulo="3. Dados que coletamos">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Titular da conta:</strong> nome, e-mail, celular/WhatsApp, senha (armazenada de forma criptografada), dados da academia (nome, CNPJ, endereço, telefone, chave PIX) e dados de assinatura.</li>
          <li><strong>Alunos (inseridos pela academia):</strong> nome, CPF, WhatsApp, e-mail, data de nascimento, plano, vencimento e histórico de pagamentos.</li>
          <li><strong>Dados técnicos:</strong> data do último acesso, endereço IP, tipo de navegador e registros de erros, para segurança e funcionamento do sistema.</li>
          <li><strong>Uso do sistema:</strong> datas de marcos de uso (como o cadastro do primeiro aluno), código de indicação e, se você cancelar, o motivo informado (opcional).</li>
          <li><strong>Pagamento:</strong> os dados do cartão são tratados exclusivamente pela Stripe; o {NOME_EMPRESA} não armazena número de cartão.</li>
        </ul>
      </Secao>

      <Secao titulo="4. Para que usamos os dados">
        <ul className="list-disc pl-5 space-y-1">
          <li>Prestar o serviço de gestão de alunos, planos e cobranças.</li>
          <li>Enviar lembretes e cobranças a alunos por WhatsApp e e-mail, quando a academia ativa essa função.</li>
          <li>Processar a assinatura do {NOME_EMPRESA} (pagamentos feitos pela Stripe).</li>
          <li>Garantir a segurança da conta e prevenir fraudes.</li>
          <li>Comunicar-se com o titular da conta sobre o serviço.</li>
        </ul>
      </Secao>

      <Secao titulo="5. Compartilhamento com terceiros">
        <p>Não vendemos dados pessoais. Compartilhamos apenas o necessário com provedores que viabilizam o serviço: hospedagem e banco de dados (Vercel e Supabase), pagamentos (Stripe), envio de e-mails (Resend), envio de mensagens por WhatsApp (provedor de API de WhatsApp) e monitoramento de erros (Sentry). Alguns desses provedores podem armazenar dados fora do Brasil.</p>
      </Secao>

      <Secao titulo="6. Responsabilidade da academia sobre os dados dos alunos">
        <p>A academia é responsável por ter base legal para cadastrar e contatar seus alunos (por exemplo, a execução do contrato de matrícula) e por informá-los sobre o uso dos dados. Ao usar o envio automático de mensagens, a academia declara que os alunos podem ser contatados para fins de cobrança e avisos do contrato.</p>
      </Secao>

      <Secao titulo="7. Dados de alunos menores de idade">
        <p>Se a academia cadastrar alunos menores de 18 anos, ela é responsável por obter o consentimento específico de pelo menos um dos pais ou do responsável legal e por tratar esses dados no melhor interesse do menor, conforme o art. 14 da LGPD. Recomendamos cadastrar apenas os dados estritamente necessários.</p>
      </Secao>

      <Secao titulo="8. Cookies e armazenamento local">
        <p>O {NOME_EMPRESA} <strong>não usa cookies de publicidade nem de rastreamento</strong>. Usamos apenas o armazenamento local do navegador (localStorage), para:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Essencial:</strong> manter você conectado (token de sessão) e lembrar a preferência de menu recolhido.</li>
          <li><strong>Preferência:</strong> guardar o tema claro/escuro.</li>
          <li><strong>Indicação:</strong> se você chegar por um link de indicação, guardamos o código temporariamente apenas para registrar quem indicou ao criar a conta.</li>
          <li><strong>Diagnóstico:</strong> o monitoramento de erros (Sentry), quando ativo, recebe dados técnicos de falhas (como página e navegador) para corrigirmos problemas, sem finalidade publicitária.</li>
        </ul>
        <p>A página de pagamento da Stripe é de responsabilidade da Stripe e pode usar cookies próprios, conforme a política dela. Você pode limpar o armazenamento local nas configurações do navegador; isso apenas desconecta sua sessão.</p>
      </Secao>

      <Secao titulo="9. Segurança">
        <p>Adotamos medidas como senhas criptografadas, comunicação protegida (HTTPS), limite de tentativas de login e controle de acesso por conta. Nenhum sistema é 100% imune, mas trabalhamos para reduzir riscos e corrigir falhas rapidamente.</p>
      </Secao>

      <Secao titulo="10. Retenção e exclusão">
        <p>Mantemos os dados enquanto a conta estiver ativa. Você pode <strong>excluir sua conta a qualquer momento</strong> em Configurações → Privacidade e meus dados; isso apaga definitivamente seus dados e cancela a assinatura. Informações que a lei exija guardar (como registros fiscais de pagamento, mantidos pela Stripe) podem ser retidas pelo prazo legal.</p>
      </Secao>

      <Secao titulo="11. Seus direitos (LGPD)">
        <p>Você pode solicitar: confirmação de tratamento, acesso, correção, anonimização ou eliminação de dados, portabilidade, informação sobre compartilhamento e revogação de consentimento. Parte disso você faz sozinho em Configurações (<strong>baixar meus dados</strong> e <strong>excluir minha conta</strong>). Para o restante, escreva para <strong>{EMAIL_CONTATO}</strong>, que é também nosso canal do encarregado de proteção de dados. Se você é aluno de uma academia, solicite primeiro à própria academia, que é a controladora dos seus dados. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>
      </Secao>

      <Secao titulo="12. Alterações">
        <p>Podemos atualizar esta política. Mudanças relevantes serão comunicadas pelo sistema ou por e-mail.</p>
      </Secao>
    </>
  );
}

function Termos() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--text-heading)' }}>Termos de Uso</h1>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Última atualização: {ULTIMA_ATUALIZACAO}</p>

      <Secao titulo="1. Aceitação">
        <p>Ao criar uma conta ou usar o {NOME_EMPRESA}, você concorda com estes Termos e com a Política de Privacidade.</p>
      </Secao>

      <Secao titulo="2. O serviço">
        <p>O {NOME_EMPRESA} é um software online (SaaS) para gestão de alunos, planos, pagamentos e envio de lembretes de cobrança por WhatsApp e e-mail.</p>
      </Secao>

      <Secao titulo="3. Conta e responsabilidades">
        <ul className="list-disc pl-5 space-y-1">
          <li>Você é responsável pela veracidade dos dados informados e pela guarda da sua senha.</li>
          <li>Você é responsável pelos dados de alunos que cadastrar e por ter autorização para contatá-los.</li>
          <li>É proibido usar o sistema para spam, fraude ou qualquer finalidade ilegal.</li>
        </ul>
      </Secao>

      <Secao titulo="4. Período de teste, planos e pagamento">
        <p>Novas contas têm 30 dias de teste gratuito, sem necessidade de cartão. Após o teste, o acesso exige uma assinatura mensal, cobrada de forma recorrente pela Stripe, conforme o plano escolhido (limite de alunos por plano). Falta de pagamento pode levar ao bloqueio do acesso.</p>
      </Secao>

      <Secao titulo="5. Cancelamento">
        <p>Você pode cancelar a assinatura a qualquer momento em Configurações. O acesso continua liberado até o fim do período já pago, e não há nova cobrança depois disso. Não fazemos reembolso proporcional de períodos já pagos, salvo quando a lei exigir.</p>
      </Secao>

      <Secao titulo="6. Mensagens automáticas">
        <p>O envio automático de mensagens depende de serviços de terceiros (como WhatsApp) e pode falhar ou atrasar por motivos fora do nosso controle. Você é responsável pelo conteúdo das mensagens que configurar. As mensagens são enviadas pelo número de WhatsApp da própria academia, conectado por leitura de QR code. A academia é responsável por usar seu número conforme as regras do WhatsApp, e o envio automático em volume pode levar o WhatsApp a limitar ou bloquear o número, o que está fora do nosso controle.</p>
      </Secao>

      <Secao titulo="7. Disponibilidade">
        <p>Buscamos manter o sistema disponível, mas não garantimos funcionamento ininterrupto. Podem ocorrer manutenções e instabilidades.</p>
      </Secao>

      <Secao titulo="8. Limitação de responsabilidade">
        <p>Na máxima extensão permitida em lei, o {NOME_EMPRESA} não responde por lucros cessantes ou danos indiretos decorrentes do uso do sistema. Recomendamos que você mantenha cópias dos dados que considerar essenciais.</p>
      </Secao>

      <Secao titulo="9. Programa de indicação">
        <p>Quem indicar uma academia que se cadastre pelo seu link e assine um plano pago recebe um crédito equivalente a um mês do próprio plano, abatido na próxima fatura. Cada indicado gera no máximo uma recompensa. Podemos suspender recompensas em caso de fraude ou autoindicação.</p>
      </Secao>

      <Secao titulo="10. Suspensão e encerramento">
        <p>Podemos suspender ou encerrar contas que violem estes Termos, causem risco à plataforma ou estejam inadimplentes. Você pode excluir sua conta a qualquer momento em Configurações, o que apaga seus dados conforme a Política de Privacidade.</p>
      </Secao>

      <Secao titulo="11. Quem pode usar">
        <p>O {NOME_EMPRESA} é destinado a pessoas maiores de 18 anos, em nome próprio ou de uma empresa (academia ou estúdio).</p>
      </Secao>

      <Secao titulo="12. Lei aplicável e contato">
        <p>Estes Termos são regidos pelas leis brasileiras. Estes Termos podem ser atualizados, e mudanças relevantes serão avisadas. Dúvidas: <strong>{EMAIL_CONTATO}</strong>.</p>
      </Secao>
    </>
  );
}

export default function PaginaLegal({ tipo }) {
  // Título e descrição próprios para cada página (ajuda buscadores e quem compartilha o link)
  useEffect(() => {
    const termos = tipo === 'termos';
    const tituloAnterior = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const descricaoAnterior = meta?.getAttribute('content');
    document.title = termos ? `Termos de Uso | ${NOME_EMPRESA}` : `Política de Privacidade | ${NOME_EMPRESA}`;
    meta?.setAttribute('content', termos
      ? `Termos de Uso do ${NOME_EMPRESA}: regras de uso, planos, cobrança, cancelamento e responsabilidades.`
      : `Política de Privacidade do ${NOME_EMPRESA}: quais dados coletamos, para que usamos e como exercer seus direitos pela LGPD.`);
    return () => {
      document.title = tituloAnterior;
      if (meta && descricaoAnterior) meta.setAttribute('content', descricaoAnterior);
    };
  }, [tipo]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <header className="sticky top-0 z-10 backdrop-blur-xl" style={{ background: 'var(--surface-modal)', borderBottom: '1px solid var(--border-2)' }}>
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={16} /> Voltar
          </a>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-700))' }}>
              <Dumbbell size={16} color="white" />
            </div>
            <span className="font-bold" style={{ color: 'var(--text-heading)' }}>{NOME_EMPRESA}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {tipo === 'termos' ? <Termos /> : <Privacidade />}
        <div className="pt-6 flex gap-4 text-xs" style={{ borderTop: '1px solid var(--border-2)', color: 'var(--text-muted)' }}>
          <a href="/privacidade" className="hover:text-blue-400">Política de Privacidade</a>
          <a href="/termos" className="hover:text-blue-400">Termos de Uso</a>
        </div>
      </main>
    </div>
  );
}
