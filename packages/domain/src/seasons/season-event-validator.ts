/**
 * ============================================================================
 * F1Atlas — Camada Domain | Seasons: Validador de Consistência Temporada-Evento
 * ============================================================================
 *
 * Componente: season-event-validator.ts
 * Papel Arquitetural: Serviço de Domínio Puro / Validador Transversal
 *
 * Responsabilidade:
 * - Validar se a instância de GrandPrix é compatível com a Temporada oficial.
 * - Garantir que o GrandPrix corresponda ao roundNumber e grandPrixId agendados
 *   no calendário anual da Season.
 * - Impedir a realização de eventos esportivos quando a temporada estiver em
 *   estado inválido (ex.: CANCELLED).
 *
 * Invariantes Transversais:
 * - INV-TR-SE-EV-01: Correspondência Estrita de Identidade de Rodada e Temporada.
 * - INV-TR-SE-EV-02: Compatibilidade de Janela Temporal de Calendário.
 * ============================================================================
 */

import { DomainError, DomainErrorCode, createDomainError } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';
import { Season } from './season.ts';
import { SeasonStatus } from './season-status.ts';
import type { GrandPrix } from '../events/grand-prix.ts';

/**
 * Propriedades para validação de consistência entre Temporada e Grande Prêmio.
 */
export interface ValidateSeasonGrandPrixConsistencyProps {
  readonly season: Season;
  readonly grandPrix: GrandPrix;
}

/**
 * Validador puro de domínio da consistência entre Season e GrandPrix.
 *
 * @param props Parâmetros de validação (instâncias de Season e GrandPrix).
 * @returns Result.ok() se consistente, ou Result.fail(DomainError) em caso de inconsistência.
 */
export function validateSeasonGrandPrixConsistency(
  props: ValidateSeasonGrandPrixConsistencyProps
): Result<void, DomainError> {
  const { season, grandPrix } = props;

  if (!season || !grandPrix) {
    return Result.fail(
      createDomainError(
        DomainErrorCode.INVALID_ARGUMENT,
        'Parâmetros obrigatórios ausentes na validação de consistência Temporada/GP.'
      )
    );
  }

  // 1. Verifica correspondência do identificador da temporada
  if (!grandPrix.seasonId.equals(season.id)) {
    return Result.fail(
      createDomainError(
        DomainErrorCode.INVARIANT_VIOLATION,
        `GrandPrix ${grandPrix.id.toValue()} pertence à temporada ${grandPrix.seasonId.toValue()}, mas foi vinculado à temporada ${season.id.toValue()}.`
      )
    );
  }

  // 2. Temporada cancelada não permite execução de provas
  if (season.status === SeasonStatus.CANCELLED) {
    return Result.fail(
      createDomainError(
        DomainErrorCode.INVALID_STATE,
        `Não é permitido validar ou realizar eventos esportivos em uma temporada cancelada (${season.id.toValue()}).`
      )
    );
  }

  // 3. Verifica se a rodada está presente no calendário oficial da temporada
  const scheduledRound = season.grandPrixList.find(
    (item) => item.roundNumber === grandPrix.roundNumber
  );

  if (!scheduledRound) {
    return Result.fail(
      createDomainError(
        DomainErrorCode.ENTITY_NOT_FOUND,
        `A rodada ${grandPrix.roundNumber} do GrandPrix ${grandPrix.id.toValue()} não consta no calendário oficial da temporada ${season.year}.`
      )
    );
  }

  // 4. Verifica se o GrandPrixId coincide com o agendado no calendário
  if (!scheduledRound.grandPrixId.equals(grandPrix.id)) {
    return Result.fail(
      createDomainError(
        DomainErrorCode.INVARIANT_VIOLATION,
        `O identificador do GrandPrix (${grandPrix.id.toValue()}) diverge do agendado para a rodada ${grandPrix.roundNumber} (${scheduledRound.grandPrixId.toValue()}).`
      )
    );
  }

  return Result.ok(undefined);
}
