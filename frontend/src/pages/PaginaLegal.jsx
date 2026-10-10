import { ArrowLeft, Dumbbell } from 'lucide-react';

// >>> EDITE AQUI com os dados reais da sua empresa/contato antes de divulgar <<<
const NOME_EMPRESA = 'GymFlow';
const EMAIL_CONTATO = 'contato@seudominio.com.br';
const ULTIMA_ATUALIZACAO = '08/10/2026';

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
          <li><strong>Dados técnicos:</strong> data do último acesso e registros de erros, para segurança e funcionamento do sistema.</li>
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

      <Secao titulo="7. Segurança">
        <p>Adotamos medidas como senhas criptografadas, comunicação protegida (HTTPS), limite de tentativas de login e controle de acesso por conta. Nenhum sistema é 100% imune, mas trabalhamos para reduzir riscos e corrigir falhas rapidamente.</p>
      </Secao>

      <Secao titulo="8. Retenção e exclusão">
        <p>Mantemos os dados enquanto a conta estiver ativa. Após o cancelamento, os dados podem ser mantidos pelo período necessário para cumprir obrigações legais e depois excluídos ou anonimizados. Você pode solicitar a exclusão antes disso, conforme item 9.</p>
      </Secao>

      <Secao titulo="9. Seus direitos (LGPD)">
        <p>Você pode solicitar: confirmação de tratamento, acesso, correção, anonimização ou eliminação de dados, portabilidade, informação sobre compartilhamento e revogação de consentimento. Para exercer esses direitos, escreva para <strong>{EMAIL_CONTATO}</strong>. Se você é aluno de uma academia, solicite primeiro à própria academia, que é a controladora dos seus dados.</p>
      </Secao>

      <Secao titulo="10. Alterações">
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
        <p>O envio automático de mensagens depende de serviços de terceiros (como WhatsApp) e pode falhar ou atrasar por motivos fora do nosso controle. Você é responsável pelo conteúdo das mensagens que configurar.</p>
      </Secao>

      <Secao titulo="7. Disponibilidade">
        <p>Buscamos manter o sistema disponível, mas não garantimos funcionamento ininterrupto. Podem ocorrer manutenções e instabilidades.</p>
      </Secao>

      <Secao titulo="8. Limitação de responsabilidade">
        <p>Na máxima extensão permitida em lei, o {NOME_EMPRESA} não responde por lucros cessantes ou danos indiretos decorrentes do uso do sistema. Recomendamos que você mantenha cópias dos dados que considerar essenciais.</p>
      </Secao>

      <Secao titulo="9. Alterações e contato">
        <p>Estes Termos podem ser atualizados, e mudanças relevantes serão avisadas. Dúvidas: <strong>{EMAIL_CONTATO}</strong>.</p>
      </Secao>
    </>
  );
}

export default function PaginaLegal({ tipo }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <header className="sticky top-0 z-10 backdrop-blur-xl" style={{ background: 'var(--surface-modal)', borderBottom: '1px solid var(--border-2)' }}>
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={16} /> Voltar
          </a>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
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
