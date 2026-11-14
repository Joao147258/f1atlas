/**
 * ============================================================================
 * F1Atlas — Camada Domain | Seasons: SeasonStatus
 * ============================================================================
 *
 * Identificação:
 * - Componente: SeasonStatus
 * - Módulo: Seasons
 * - Papel Arquitetural: Enum de Domínio / Objeto de Valor de Estado
 * - Estado: Implementado e Validado
 *
 * Responsabilidade:
 * - Definir o ciclo de vida formal e os estados válidos de uma temporada esportiva.
 * - Diferenciar claramente as fases de planejamento, competição ativa, encerramento
 *   homologado e revisões históricas post-mortem.
 *
 * Contexto Regulamentar e Operacional:
 * - Os estados definidos por este componente representam o modelo de ciclo de vida
 *   e governança temporal do F1Atlas para enquadramento dos dados desportivos.
 * - Salvo quando expressamente indicado, representam a máquina de estados interna
 *   do sistema e não uma nomenclatura estritamente normativa do Código Desportivo
 *   Internacional da FIA.
 *
 * Estados do Ciclo de Vida:
 * 1. `PLANNED` (Planejada):
 *    - O calendário preliminar e as regras foram definidos, mas nenhuma sessão
 *      oficial de pista foi iniciada ainda. O calendário admite adição, remoção
 *      e reorganização de etapas.
 * 2. `IN_PROGRESS` (Em Andamento):
 *    - O campeonato está ativo; a primeira atividade de pista teve início.
 *      O calendário torna-se restrito a alterações extraordinárias homologadas.
 * 3. `CONCLUDED` (Concluída):
 *    - A última etapa foi disputada e homologada, e todos os recursos desportivos
 *      foram decididos. A temporada torna-se bloqueada contra modificações operacionais ordinárias.
 * 4. `CANCELLED` (Cancelada):
 *    - Aplicável exclusivamente a temporadas em estado PLANNED que não chegaram
 *      a ser disputadas (ex.: força maior ou cancelamento do campeonato).
 * 5. `HISTORICAL_REVISED` (Revisada Historicamente):
 *    - Estado especial pós-conclusão no qual retificações documentais e correções
 *      históricas auditadas foram incorporadas com rastreabilidade explícita.
 *
 * Relacionamentos:
 * - Propriedade de estado da raiz de agregação `Season`.
 * - Controla o bloqueio de operações ordinárias no calendário (`isLockedForModifications`).
 * - Não deve ser confundido com status de etapas agendadas (`ScheduledGrandPrixStatus`)
 *   nem de sessões cronometradas (`SessionStatus`).
 *
 * Restrições e Invariantes:
 * - A máquina de estados proíbe retrocessos ilógicos (ex.: CONCLUDED -> PLANNED).
 * - Estados terminais ordinários (CANCELLED) não admitem reabertura.
 * - CONCLUDED admite transição supervisionada apenas para HISTORICAL_REVISED.
 *
 * ============================================================================
 */

/**
 * Estados regulamentares do ciclo de vida de uma temporada da Fórmula 1.
 */
export const SeasonStatus = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  CONCLUDED: 'CONCLUDED',
  CANCELLED: 'CANCELLED',
  HISTORICAL_REVISED: 'HISTORICAL_REVISED'
} as const;

export type SeasonStatus = (typeof SeasonStatus)[keyof typeof SeasonStatus];

/**
 * Operação: isValidTransition
 *
 * Objetivo:
 * Validar se a transição entre o status atual e o status pretendido é permitida
 * pela máquina de estados do domínio esportivo.
 *
 * Regras:
 * - PLANNED -> IN_PROGRESS: Válido.
 * - PLANNED -> CANCELLED: Válido.
 * - IN_PROGRESS -> CONCLUDED: Válido.
 * - CONCLUDED -> HISTORICAL_REVISED: Válido.
 * - Qualquer retorno para PLANNED ou transição a partir de estado terminal: Inválido.
 */
export function isValidTransition(currentStatus: SeasonStatus, nextStatus: SeasonStatus): boolean {
  if (currentStatus === nextStatus) {
    return false;
  }

  switch (currentStatus) {
    case SeasonStatus.PLANNED:
      return (
        nextStatus === SeasonStatus.IN_PROGRESS ||
        nextStatus === SeasonStatus.CANCELLED
      );

    case SeasonStatus.IN_PROGRESS:
      return nextStatus === SeasonStatus.CONCLUDED;

    case SeasonStatus.CONCLUDED:
      return nextStatus === SeasonStatus.HISTORICAL_REVISED;

    case SeasonStatus.CANCELLED:
    case SeasonStatus.HISTORICAL_REVISED:
      return false;

    default:
      return false;
  }
}

/**
 * Operação: isLockedForModifications
 *
 * Objetivo:
 * Informar se uma temporada está com seu calendário e inscrições bloqueados para
 * alterações ordinárias de operação.
 *
 * Saída:
 * - boolean (true se status for CONCLUDED, HISTORICAL_REVISED ou CANCELLED).
 */
export function isLockedForModifications(status: SeasonStatus): boolean {
  return (
    status === SeasonStatus.CONCLUDED ||
    status === SeasonStatus.HISTORICAL_REVISED ||
    status === SeasonStatus.CANCELLED
  );
}
