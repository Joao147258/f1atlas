/**
 * ============================================================================
 * F1Atlas — Camada Domain | Events: Validador de Elegibilidade de Participante
 * ============================================================================
 *
 * Componente: session-participant-validator.ts
 * Papel Arquitetural: Serviço de Domínio Puro / Validador Transversal
 *
 * Responsabilidade:
 * - Validar se um alinhamento de pista (SessionEntry) possui correspondência
 *   desportiva válida e vigente com as inscrições oficiais de temporada (SeasonEntry).
 * - Garantir que pilotos em sessões competitivas (RACE, SPRINT, QUALIFYING)
 *   possuam inscrição ativa na rodada para a equipe e construtor informados.
 * - Permitir a participação regulamentar de pilotos reserva/teste sem SeasonEntry
 *   exclusivamente em sessões de Treino Livre (FREE_PRACTICE / FP1/FP2/FP3).
 *
 * Invariantes Transversais:
 * - INV-TR-PA-EV-01: Elegibilidade de Inscrição no Grid de Sessão.
 * - INV-TR-PA-EV-02: Consistência de Número Permanente e Chassi.
 * ============================================================================
 */

import { DomainError, DomainErrorCode, createDomainError } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';
import { SessionEntry } from './session-entry.ts';
import { SessionType } from './session.ts';
import type { SeasonEntry } from '../participants/season-entry.ts';

/**
 * Propriedades para validação de elegibilidade de participante na sessão.
 */
export interface ValidateParticipantEligibilityProps {
  readonly sessionEntry: SessionEntry;
  readonly sessionType: SessionType;
  readonly seasonEntries: readonly SeasonEntry[];
  readonly roundNumber: number;
}

/**
 * Determina se o tipo de sessão é de Treino Livre.
 */
function isPracticeSession(type: SessionType): boolean {
  return (
    type === SessionType.FP1 ||
    type === SessionType.FP2 ||
    type === SessionType.FP3
  );
}

/**
 * Validador puro de domínio da elegibilidade de um participante em uma sessão.
 *
 * @param props Parâmetros de validação (alinhamento, tipo de sessão, inscrições e rodada).
 * @returns Result.ok() se elegível, ou Result.fail(DomainError) com o motivo da inelegibilidade.
 */
export function validateSessionParticipantEligibility(
  props: ValidateParticipantEligibilityProps
): Result<void, DomainError> {
  const { sessionEntry, sessionType, seasonEntries, roundNumber } = props;

  if (!sessionEntry || !sessionType || !Array.isArray(seasonEntries)) {
    return Result.fail(
      createDomainError(
        DomainErrorCode.INVALID_ARGUMENT,
        'Parâmetros obrigatórios ausentes na validação de elegibilidade do participante.'
      )
    );
  }

  if (!Number.isInteger(roundNumber) || roundNumber < 1) {
    return Result.fail(
      createDomainError(
        DomainErrorCode.INVALID_ARGUMENT,
        `Número de rodada inválido: ${roundNumber}. Deve ser um inteiro positivo.`
      )
    );
  }

  // Busca inscrições do mesmo piloto
  const driverEntries = seasonEntries.filter((entry) =>
    entry.driverId.equals(sessionEntry.driverId)
  );

  // Caso 1: Sessões de Treino Livre (FP1, FP2, FP3)
  if (isPracticeSession(sessionType)) {
    if (driverEntries.length === 0) {
      // Piloto sem SeasonEntry participando de Treino Livre (ex.: jovem piloto / teste)
      return Result.ok(undefined);
    }

    // Se possui SeasonEntry, checa se há coerência com equipe/número se houver inscrição vigente
    const activeEntry = driverEntries.find((entry) =>
      entry.isActiveInRound(roundNumber)
    );

    if (activeEntry) {
      if (
        !activeEntry.teamId.equals(sessionEntry.teamId) ||
        !activeEntry.constructorId.equals(sessionEntry.constructorId)
      ) {
        return Result.fail(
          createDomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `Piloto ${sessionEntry.driverId.toValue()} possui inscrição na temporada com equipe divergente da informada no treino livre.`
          )
        );
      }
      if (activeEntry.carNumber !== sessionEntry.carNumber) {
        return Result.fail(
          createDomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `Número do carro (${sessionEntry.carNumber}) diverge da inscrição oficial do piloto (${activeEntry.carNumber}).`
          )
        );
      }
    }

    return Result.ok(undefined);
  }

  // Caso 2: Sessões Competitivas (RACE, SPRINT, QUALIFYING, etc.)
  if (driverEntries.length === 0) {
    return Result.fail(
      createDomainError(
        DomainErrorCode.INVARIANT_VIOLATION,
        `Piloto ${sessionEntry.driverId.toValue()} não possui inscrição formal de temporada (SeasonEntry) para disputar sessões competitivas.`
      )
    );
  }

  // Verifica se o piloto possui inscrição ativa na rodada informada
  const activeEntry = driverEntries.find((entry) =>
    entry.isActiveInRound(roundNumber)
  );

  if (!activeEntry) {
    return Result.fail(
      createDomainError(
        DomainErrorCode.INVARIANT_VIOLATION,
        `Piloto ${sessionEntry.driverId.toValue()} não possui inscrição ativa na rodada ${roundNumber}.`
      )
    );
  }

  // Valida correspondência de equipe e construtor
  if (
    !activeEntry.teamId.equals(sessionEntry.teamId) ||
    !activeEntry.constructorId.equals(sessionEntry.constructorId)
  ) {
    return Result.fail(
      createDomainError(
        DomainErrorCode.INVARIANT_VIOLATION,
        `Inscrição ativa do piloto ${sessionEntry.driverId.toValue()} para a rodada ${roundNumber} pertence a equipe/construtor diferente.`
      )
    );
  }

  // Valida correspondência estrita de número de carro
  if (activeEntry.carNumber !== sessionEntry.carNumber) {
    return Result.fail(
      createDomainError(
        DomainErrorCode.INVARIANT_VIOLATION,
        `Número do carro alinhado (${sessionEntry.carNumber}) diverge do número homologado na inscrição da temporada (${activeEntry.carNumber}).`
      )
    );
  }

  return Result.ok(undefined);
}
