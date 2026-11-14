/**
 * ============================================================================
 * F1Atlas — Camada Domain | Events: SessionEntry
 * ============================================================================
 *
 * NÍVEL 1 — ESPECIFICAÇÃO ARQUITETURAL DO COMPONENTE
 *
 * Identificação:
 * - Componente: SessionEntry (Alinhamento na Sessão / Entrada de Pista)
 * - Módulo: events
 * - Papel Arquitetural: Entidade de Domínio / Objeto de Associação de Alinhamento
 * - Referência Normativa DDS: docs/domain/events.md (Seção 7)
 * - Invariantes Vinculadas: EVT-INV-009
 *
 * Responsabilidade de Domínio:
 * - Representar a presença e as condições de alinhamento de um competidor (piloto,
 *   equipe, construtor e número de carro) em uma sessão específica de pista.
 * - Isolar categoricamente as condições prévias de largada (posicionamento no grid
 *   ou largada a partir do pit lane) do resultado obtido na chegada (escopo de SessionResult).
 * - Modelar o terceiro nível da hierarquia tripartite de participação: enquanto a
 *   SeasonEntry (módulo participants) formaliza o contrato anual, a SessionEntry formaliza
 *   quem efetivamente assumiu o cockpit naquele treino, qualificação ou corrida.
 *
 * Relacionamentos e Fronteiras:
 * - Vincula uma Session (`sessionId`) a um Driver (`driverId`), Team (`teamId`) e Constructor (`constructorId`).
 * - Fornece os dados de identidade de competidor para o SessionResult correspondente.
 * - Não armazena voltas completadas, tempos ou posições de chegada (escopo de SessionResult).
 * - Não calcula penalidades de posições de grid (escopo de regras disciplinares dos Stewards).
 *
 * Invariantes do Domínio:
 * - [EVT-INV-009]: Se o competidor largar a partir do pit lane (startedFromPitLane === true),
 *   ele não ocupa uma caixa no grid de largada (gridPosition deve ser nulo).
 *   Se startedFromPitLane for falso e gridPosition for informado, a posição de largada
 *   deve ser um número inteiro positivo (>= 1). Dois competidores não podem ocupar
 *   a mesma posição física de grid na mesma sessão.
 * - Número de carro deve ser um inteiro válido entre 1 e 99, respeitando a aposentadoria
 *   homologada pela FIA do numeral #17 (em memória de Jules Bianchi).
 *
 * ============================================================================
 * NÍVEL 2 — ORIENTAÇÃO TÉCNICA PARA IMPLEMENTAÇÃO (DEVELOPER & TEST ENGINEER)
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';

/**
 * Numeral permanentemente aposentado pela FIA na Fórmula 1.
 */
export const RETIRED_CAR_NUMBER = 17;

/**
 * Status operacional do alinhamento de um participante na sessão.
 */
export const SessionEntryStatus = {
  CONFIRMED: 'CONFIRMED',
  WITHDRAWN: 'WITHDRAWN',
  REPLACED: 'REPLACED',
  DNS: 'DNS'
} as const;

export type SessionEntryStatus = (typeof SessionEntryStatus)[keyof typeof SessionEntryStatus];

/**
 * Propriedades para criação de um SessionEntry.
 */
export interface CreateSessionEntryProps {
  readonly id: EntityId<'session-entry'>;
  readonly sessionId: EntityId<'session'>;
  readonly driverId: EntityId<'driver'>;
  readonly teamId: EntityId<'team'>;
  readonly constructorId: EntityId<'constructor'>;
  readonly carNumber: number;
  readonly gridPosition?: number | null;
  readonly startedFromPitLane?: boolean;
  readonly status?: SessionEntryStatus;
}

/**
 * Entidade de Domínio representando o alinhamento de um piloto e carro em uma sessão de pista.
 */
export class SessionEntry {
  readonly id: EntityId<'session-entry'>;
  readonly sessionId: EntityId<'session'>;
  readonly driverId: EntityId<'driver'>;
  readonly teamId: EntityId<'team'>;
  readonly constructorId: EntityId<'constructor'>;
  readonly carNumber: number;
  readonly gridPosition: number | null;
  readonly startedFromPitLane: boolean;
  readonly status: SessionEntryStatus;

  private constructor(props: CreateSessionEntryProps) {
    this.id = props.id;
    this.sessionId = props.sessionId;
    this.driverId = props.driverId;
    this.teamId = props.teamId;
    this.constructorId = props.constructorId;
    this.carNumber = props.carNumber;
    this.startedFromPitLane = Boolean(props.startedFromPitLane);
    this.gridPosition = this.startedFromPitLane
      ? null
      : props.gridPosition !== undefined && props.gridPosition !== null
        ? props.gridPosition
        : null;
    this.status = props.status ?? SessionEntryStatus.CONFIRMED;

    Object.freeze(this);
  }

  /**
   * Atualiza as condições de largada (posicionamento de grid ou pit lane start).
   * Modela penalidades de perda de posições ou largada dos boxes por quebra de parque fechado.
   *
   * @param newPosition Nova posição de grid pretendida (ou null se for largar dos boxes).
   * @param startFromPitLane Flag indicativa se o piloto largará do pit lane.
   * @returns Result contendo nova instância de SessionEntry ou DomainError.
   */
  public updateGridPosition(
    newPosition: number | null,
    startFromPitLane: boolean
  ): Result<SessionEntry, DomainError> {
    return SessionEntry.create({
      id: this.id,
      sessionId: this.sessionId,
      driverId: this.driverId,
      teamId: this.teamId,
      constructorId: this.constructorId,
      carNumber: this.carNumber,
      gridPosition: startFromPitLane ? null : newPosition,
      startedFromPitLane: startFromPitLane,
      status: this.status
    });
  }

  /**
   * Marca o alinhamento como retirado antes da sessão (WITHDRAWN).
   */
  public markWithdrawn(): Result<SessionEntry, DomainError> {
    return SessionEntry.create({
      id: this.id,
      sessionId: this.sessionId,
      driverId: this.driverId,
      teamId: this.teamId,
      constructorId: this.constructorId,
      carNumber: this.carNumber,
      gridPosition: null,
      startedFromPitLane: false,
      status: SessionEntryStatus.WITHDRAWN
    });
  }

  /**
   * Marca o competidor com status Did Not Start (DNS).
   */
  public markDNS(): Result<SessionEntry, DomainError> {
    return SessionEntry.create({
      id: this.id,
      sessionId: this.sessionId,
      driverId: this.driverId,
      teamId: this.teamId,
      constructorId: this.constructorId,
      carNumber: this.carNumber,
      gridPosition: this.gridPosition,
      startedFromPitLane: this.startedFromPitLane,
      status: SessionEntryStatus.DNS
    });
  }

  /**
   * Compara equivalência por identidade entre dois SessionEntry.
   */
  public equals(other: unknown): boolean {
    if (!(other instanceof SessionEntry)) {
      return false;
    }
    return this.id.equals(other.id);
  }

  /**
   * Factory method para validação e instanciação rigorosa de um SessionEntry.
   */
  public static create(props: CreateSessionEntryProps): Result<SessionEntry, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Propriedades de instanciação de SessionEntry não podem ser nulas ou indefinidas.'
        )
      );
    }

    if (!props.id || typeof props.id.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador de SessionEntry é obrigatório e deve ser uma instância válida de EntityId<\'session-entry\'>.'
        )
      );
    }

    if (!props.sessionId || typeof props.sessionId.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador da sessão é obrigatório e deve ser uma instância válida de EntityId<\'session\'>.'
        )
      );
    }

    if (!props.driverId || typeof props.driverId.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador do piloto é obrigatório e deve ser uma instância válida de EntityId<\'driver\'>.'
        )
      );
    }

    if (!props.teamId || typeof props.teamId.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador da equipe é obrigatório e deve ser uma instância válida de EntityId<\'team\'>.'
        )
      );
    }

    if (!props.constructorId || typeof props.constructorId.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador do construtor é obrigatório e deve ser uma instância válida de EntityId<\'constructor\'>.'
        )
      );
    }

    // Validação do número do carro (inteiro entre 1 e 99, != 17)
    if (
      typeof props.carNumber !== 'number' ||
      !Number.isInteger(props.carNumber) ||
      props.carNumber < 1 ||
      props.carNumber > 99
    ) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          `Número do carro (${props.carNumber}) inválido. Deve ser um número inteiro entre 1 e 99.`,
          { carNumber: props.carNumber }
        )
      );
    }

    if (props.carNumber === RETIRED_CAR_NUMBER) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `O número #17 foi permanentemente retirado pela FIA em homenagem a Jules Bianchi e não pode ser utilizado.`,
          { carNumber: props.carNumber }
        )
      );
    }

    // Validação de alinhamento e largada (EVT-INV-009)
    const isPitLane = Boolean(props.startedFromPitLane);

    if (isPitLane) {
      if (props.gridPosition !== undefined && props.gridPosition !== null) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            'Um participante que larga a partir do pit lane não pode ocupar uma posição de grid (EVT-INV-009).',
            { gridPosition: props.gridPosition, startedFromPitLane: true }
          )
        );
      }
    } else if (props.gridPosition !== undefined && props.gridPosition !== null) {
      if (
        typeof props.gridPosition !== 'number' ||
        !Number.isInteger(props.gridPosition) ||
        props.gridPosition < 1
      ) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `Posição no grid (${props.gridPosition}) inválida. Deve ser um número inteiro maior ou igual a 1 (EVT-INV-009).`,
            { gridPosition: props.gridPosition }
          )
        );
      }
    }

    if (props.status && !Object.values(SessionEntryStatus).includes(props.status)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          `Status de alinhamento inválido: ${props.status}.`
        )
      );
    }

    return Result.ok(new SessionEntry(props));
  }

  /**
   * Reconstitui um SessionEntry sem validações destrutivas.
   */
  public static reconstitute(props: CreateSessionEntryProps): Result<SessionEntry, DomainError> {
    return SessionEntry.create(props);
  }
}

/**
 * Função utilitária de criação de SessionEntry.
 */
export function createSessionEntry(props: CreateSessionEntryProps): Result<SessionEntry, DomainError> {
  return SessionEntry.create(props);
}

/**
 * Valida os limites e invariantes de conjunto de uma coleção de entradas de alinhamento da sessão.
 * Assegura que não existam pilotos repetidos, números de carro duplicados ou caixas de grid conflitantes.
 *
 * @param entries Coleção de alinhamentos a serem auditados.
 * @returns Result void indicando aprovação ou DomainError detalhado.
 */
export function validateSessionEntries(entries: readonly SessionEntry[]): Result<void, DomainError> {
  if (!Array.isArray(entries)) {
    return Result.fail(
      new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'A lista de entradas deve ser um array.')
    );
  }

  const driverIds = new Set<string>();
  const carNumbers = new Set<number>();
  const gridPositions = new Set<number>();

  for (const entry of entries) {
    const driverVal = entry.driverId.toValue();
    if (driverIds.has(driverVal)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `O piloto ${driverVal} está alinhado mais de uma vez na mesma sessão (EVT-INV-009).`,
          { driverId: driverVal }
        )
      );
    }
    driverIds.add(driverVal);

    if (carNumbers.has(entry.carNumber)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `O número de carro #${entry.carNumber} está duplicado na mesma sessão.`,
          { carNumber: entry.carNumber }
        )
      );
    }
    carNumbers.add(entry.carNumber);

    if (!entry.startedFromPitLane && entry.gridPosition !== null) {
      if (gridPositions.has(entry.gridPosition)) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `A posição de grid ${entry.gridPosition} está ocupada por mais de um competidor (EVT-INV-009).`,
            { gridPosition: entry.gridPosition }
          )
        );
      }
      gridPositions.add(entry.gridPosition);
    }
  }

  return Result.ok();
}
