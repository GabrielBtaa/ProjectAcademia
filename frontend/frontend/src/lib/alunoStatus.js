/**
 * Calcula o status "efetivo" de um aluno a partir da dataVencimento,
 * já que o campo `status` salvo no banco só muda quando um pagamento é
 * registrado (não existe um job que marca "inadimplente" sozinho).
 *
 * - 'inativo' é sempre respeitado (aluno que saiu da academia)
 * - Caso contrário: vencimento no passado = 'inadimplente', senão 'ativo'
 */
export function statusEfetivo(aluno) {
  if (!aluno) return 'ativo';
  if (aluno.status === 'inativo') return 'inativo';
  const hoje = new Date().toISOString().slice(0, 10);
  return aluno.dataVencimento && aluno.dataVencimento < hoje ? 'inadimplente' : 'ativo';
}
