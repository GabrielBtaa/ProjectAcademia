/**
 * Utilitário de automação e envio de WhatsApp para o GymFlow
 */

export const MSG_PADRAO_5_DIAS =
  'Olá, {NOME_ALUNO}! 👋 Passando para lembrar que seu plano na {NOME_ACADEMIA} vence em 5 dias (dia {DATA_VENCIMENTO}). Garantir o seu pagamento em dia mantém seus treinos ativos sem interrupção! 🏋️‍♂️ Chave PIX: {CHAVE_PIX}. Qualquer dúvida, estamos à disposição!';

export const MSG_PADRAO_VENCIDO =
  'Olá, {NOME_ALUNO}! 🚨 Notamos que sua mensalidade na {NOME_ACADEMIA} venceu em {DATA_VENCIMENTO}. Para regularizar seu plano e evitar bloqueio no acesso, faça o pagamento via PIX: {CHAVE_PIX} e envie o comprovante por aqui! 💪';

/**
 * Formata um número de telefone/WhatsApp para o formato internacional de API (55...)
 */
export function formatarNumeroWhatsApp(telefone) {
  if (!telefone) return '';
  const limpo = String(telefone).replace(/\D/g, '');
  if (!limpo) return '';
  if (limpo.startsWith('55') && limpo.length >= 12) return limpo;
  return `55${limpo}`;
}

/**
 * Monta o texto personalizado substituindo as variáveis {NOME_ALUNO}, {NOME_ACADEMIA}, {DATA_VENCIMENTO}, {CHAVE_PIX}
 */
export function processarTextoMensagem({ modelo, aluno, dadosAcademia, configWhatsapp }) {
  const nomeAluno = aluno?.nome || 'Aluno';
  const nomeAcademia = dadosAcademia?.nome || 'Academia';
  const dataVenc = aluno?.dataVencimento
    ? new Date(aluno.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')
    : 'data estipulada';
  const chavePix = configWhatsapp?.chavePix || dadosAcademia?.cnpj || dadosAcademia?.telefone || '[Solicitar PIX]';

  let texto = modelo || (aluno?.status === 'inadimplente' ? MSG_PADRAO_VENCIDO : MSG_PADRAO_5_DIAS);

  texto = texto.replace(/\{NOME_ALUNO\}/g, nomeAluno);
  texto = texto.replace(/\{NOME_ACADEMIA\}/g, nomeAcademia);
  texto = texto.replace(/\{DATA_VENCIMENTO\}/g, dataVenc);
  texto = texto.replace(/\{CHAVE_PIX\}/g, chavePix);

  return texto;
}

/**
 * Gera um link de WhatsApp (api.whatsapp.com/send) pronto para disparo em 1 clique
 */
export function gerarLinkWhatsApp({ aluno, tipo, dadosAcademia, configWhatsapp }) {
  const numero = formatarNumeroWhatsApp(aluno?.whatsapp || aluno?.telefone);
  if (!numero) return null;

  const modelo = tipo === '5dias' 
    ? (configWhatsapp?.msg5Dias || MSG_PADRAO_5_DIAS)
    : (configWhatsapp?.msgVencido || MSG_PADRAO_VENCIDO);

  const texto = processarTextoMensagem({ modelo, aluno, dadosAcademia, configWhatsapp });
  return `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(texto)}`;
}
