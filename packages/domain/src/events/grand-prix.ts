/**
 * ============================================================================
 * F1Atlas — Camada Domain | Events: GrandPrix
 * ============================================================================
 *
 * NÍVEL 1 — ESPECIFICAÇÃO ARQUITETURAL DO COMPONENTE
 *
 * Identificação:
 * - Componente: GrandPrix (Grande Prêmio)
 * - Módulo: events
 * - Papel Arquitetural: Raiz de Agregado (Aggregate Root)
 * - Referência Normativa DDS: docs/domain/events.md (Seção 5)
 * - Invariantes Vinculadas: EVT-INV-001, EVT-INV-002, EVT-INV-003
 *
 * Responsabilidade de Domínio:
 * - Representar a etapa oficial de um campeonato de Fórmula 1 (evento desportivo
 *   de fim de semana), como o "Grande Prêmio de São Paulo" ou "Grande Prêmio de Mônaco".
 * - Atuar como Aggregate Root do evento de pista, coordenando o cronograma oficial
 *   de sessões cronometradas (Treinos, Classificação, Sprint e Corrida Principal).
 * - Controlar o número de ordem da etapa na temporada (roundNumber: 1 a N), o autódromo
 *   sede (circuitId), o formato do fim de semana (STANDARD vs SPRINT) e o intervalo de vigência.
 *
 * Relacionamentos e Fronteiras:
 * - Vinculado à temporada anual via `seasonId: EntityId<'season'>`.
 * - Vinculado ao autódromo sede via `circuitId: EntityId<'circuit'>`.
 * - Coordena a coleção imutável de sessões do fim de semana (`Session[]`).
 * - Não calcula pontuação de campeonato (responsabilidade exclusiva do módulo `scoring`).
 * - Não armazena tabelas de classificação acumuladas (responsabilidade de `championships`).
 * - Não encapsula banco de dados, ORMs, frameworks web ou serialização HTTP.
 *
 * Invariantes do Domínio:
 * - [EVT-INV-001]: Um fim de semana de Grande Prêmio deve conter obrigatoriamente
 *   ao menos uma sessão de Corrida (RACE) e uma de Classificação (QUALIFYING).
 * - [EVT-INV-002]: O intervalo de datas deve ser coerente (startDate <= endDate).
 *   Todas as sessões associadas ao evento devem ter seus horários agendados estritamente
 *   compreendidos dentro do intervalo [startDate, endDate] do fim de semana.
 * - [EVT-INV-003]: A sequência cronológica das sessões deve respeitar as regras da FIA:
 *   sessões de Treino Livre e Classificação devem ocorrer estritamente antes da Corrida principal.
 *   Em finais de semana Sprint, a qualificação sprint e a corrida sprint devem anteceder a corrida.
 *
 * ============================================================================
 * NÍVEL 2 — ORIENTAÇÃO TÉCNICA PARA IMPLEMENTAÇÃO (DEVELOPER & TEST ENGINEER)
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';
import { Session, SessionType } from './session.ts';

/**
 * Formatos homologados de fim de semana de Grande Prêmio na Fórmula 1.
 */
export const GrandPrixFormat = {
  STANDARD: 'STANDARD',
  SPRINT: 'SPRINT'
} as const;

export type GrandPrixFormat = (typeof GrandPrixFormat)[keyof typeof GrandPrixFormat];

/**
 * Estados do ciclo de vida regulamentar de um Grande Prêmio.
 */
export const GrandPrixStatus = {
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  POSTPONED: 'POSTPONED'
} as const;

export type GrandPrixStatus = (typeof GrandPrixStatus)[keyof typeof GrandPrixStatus];

/**
 * Propriedades para criação de um Grande Prêmio.
 */
export interface CreateGrandPrixProps {
  readonly id: EntityId<'grand-prix'>;
  readonly seasonId: EntityId<'season'>;
  readonly circuitId: EntityId<'circuit'>;
  readonly name: string;
  readonly roundNumber: number;
  readonly format?: GrandPrixFormat;
  readonly status?: GrandPrixStatus;
  readonly startDate: Date;
  readonly endDate: Date;
}

/**
 * Propriedades completas para reconstituição de um Grande Prêmio a partir da persistência.
 */
export interface ReconstituteGrandPrixProps extends CreateGrandPrixProps {
  readonly sessions?: readonly Session[];
}

/**
 * Aggregate Root representando uma Etapa Oficial (Grande Prêmio) do Campeonato de Fórmula 1.
 */
export class GrandPrix {
  readonly id: EntityId<'grand-prix'>;
  readonly seasonId: EntityId<'season'>;
  readonly circuitId: EntityId<'circuit'>;
  readonly name: string;
  readonly roundNumber: number;
  readonly format: GrandPrixFormat;
  readonly status: GrandPrixStatus;
  private readonly _startDateMs: number;
  private readonly _endDateMs: number;
  private readonly _sessions: readonly Session[];

  private constructor(props: CreateGrandPrixProps, sessions: readonly Session[] = []) {
    this.id = props.id;
    this.seasonId = props.seasonId;
    this.circuitId = props.circuitId;
    this.name = props.name.trim();
    this.roundNumber = props.roundNumber;
    this.format = props.format ?? GrandPrixFormat.STANDARD;
    this.status = props.status ?? GrandPrixStatus.SCHEDULED;
    this._startDateMs = props.startDate.getTime();
    this._endDateMs = props.endDate.getTime();

    // Ordena as sessões estritamente por ordem cronológica (scheduledStartTime)
    this._sessions = Object.freeze(
      [...sessions].sort(
        (a, b) => a.scheduledStartTime.getTime() - b.scheduledStartTime.getTime()
      )
    );

    Object.freeze(this);
  }

  /**
   * Data de início do evento em cópia defensiva.
   */
  public get startDate(): Date {
    return new Date(this._startDateMs);
  }

  /**
   * Data de término do evento em cópia defensiva.
   */
  public get endDate(): Date {
    return new Date(this._endDateMs);
  }

  /**
   * Lista imutável de sessões associadas ao fim de semana.
   */
  public get sessions(): readonly Session[] {
    return this._sessions;
  }

  /**
   * Adiciona uma sessão oficial ao cronograma do fim de semana através de copy-on-write.
   *
   * @param session Sessão a ser vinculada e cronometrada.
   * @returns Result contendo a nova versão do GrandPrix ou DomainError.
   */
  public addSession(session: Session): Result<GrandPrix, DomainError> {
    if (!session || !(session instanceof Session)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'A sessão a ser adicionada deve ser uma instância válida de Session.'
        )
      );
    }

    if (!session.grandPrixId.equals(this.id)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `A sessão ${session.id.toValue()} pertence ao GP ${session.grandPrixId.toValue()} e não pode ser vinculada ao GP ${this.id.toValue()}.`
        )
      );
    }

    const sessionStartMs = session.scheduledStartTime.getTime();
    if (sessionStartMs < this._startDateMs || sessionStartMs > this._endDateMs) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `Horário da sessão (${session.scheduledStartTime.toISOString()}) está fora do intervalo regulamentar do GP [${this.startDate.toISOString()} a ${this.endDate.toISOString()}] (EVT-INV-002).`,
          {
            scheduledStartTime: session.scheduledStartTime.toISOString(),
            gpStartDate: this.startDate.toISOString(),
            gpEndDate: this.endDate.toISOString()
          }
        )
      );
    }

    // Regra de unicidade de sessão de corrida (apenas 1 sessão RACE por evento)
    if (session.type === SessionType.RACE) {
      const alreadyHasRace = this._sessions.some(s => s.type === SessionType.RACE);
      if (alreadyHasRace) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            'Um Grande Prêmio não pode conter mais de uma sessão de Corrida Principal (RACE).'
          )
        );
      }
    }

    // Não permite duplicar sessão com o mesmo id
    if (this._sessions.some(s => s.id.equals(session.id))) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `A sessão ${session.id.toValue()} já está presente no cronograma do Grande Prêmio.`
        )
      );
    }

    const updatedSessions = [...this._sessions, session];

    return Result.ok(
      new GrandPrix(
        {
          id: this.id,
          seasonId: this.seasonId,
          circuitId: this.circuitId,
          name: this.name,
          roundNumber: this.roundNumber,
          format: this.format,
          status: this.status === GrandPrixStatus.SCHEDULED ? GrandPrixStatus.ACTIVE : this.status,
          startDate: this.startDate,
          endDate: this.endDate
        },
        updatedSessions
      )
    );
  }

  /**
   * Cancela o Grande Prêmio registrando motivo regulamentar ou operacional.
   */
  public cancelGrandPrix(reason?: string): Result<GrandPrix, DomainError> {
    if (this.status === GrandPrixStatus.COMPLETED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          'Um Grande Prêmio já concluído não pode ser cancelado.'
        )
      );
    }

    if (this.status === GrandPrixStatus.CANCELLED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          'O Grande Prêmio já se encontra cancelado.'
        )
      );
    }

    return Result.ok(
      new GrandPrix(
        {
          id: this.id,
          seasonId: this.seasonId,
          circuitId: this.circuitId,
          name: this.name,
          roundNumber: this.roundNumber,
          format: this.format,
          status: GrandPrixStatus.CANCELLED,
          startDate: this.startDate,
          endDate: this.endDate
        },
        this._sessions
      )
    );
  }

  /**
   * Reagenda as datas do Grande Prêmio (copy-on-write).
   */
  public reschedule(newStartDate: Date, newEndDate: Date): Result<GrandPrix, DomainError> {
    if (this.status === GrandPrixStatus.COMPLETED || this.status === GrandPrixStatus.CANCELLED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          `Não é permitido reagendar um Grande Prêmio em estado ${this.status}.`
        )
      );
    }

    if (!(newStartDate instanceof Date) || Number.isNaN(newStartDate.getTime())) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Nova data de início inválida.')
      );
    }

    if (!(newEndDate instanceof Date) || Number.isNaN(newEndDate.getTime())) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Nova data de término inválida.')
      );
    }

    if (newStartDate.getTime() > newEndDate.getTime()) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'A data de início não pode ser posterior à data de término (EVT-INV-002).'
        )
      );
    }

    // Verifica se as sessões já cadastradas continuam cabendo no novo período
    const newStartMs = newStartDate.getTime();
    const newEndMs = newEndDate.getTime();
    const hasConflictingSession = this._sessions.some(
      s => s.scheduledStartTime.getTime() < newStartMs || s.scheduledStartTime.getTime() > newEndMs
    );

    if (hasConflictingSession) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          'Existem sessões previamente agendadas que ficam fora do novo intervalo de datas do GP.'
        )
      );
    }

    return Result.ok(
      new GrandPrix(
        {
          id: this.id,
          seasonId: this.seasonId,
          circuitId: this.circuitId,
          name: this.name,
          roundNumber: this.roundNumber,
          format: this.format,
          status: GrandPrixStatus.POSTPONED,
          startDate: newStartDate,
          endDate: newEndDate
        },
        this._sessions
      )
    );
  }

  /**
   * Conclui oficialmente o fim de semana do Grande Prêmio.
   */
  public completeGrandPrix(): Result<GrandPrix, DomainError> {
    if (this.status === GrandPrixStatus.COMPLETED) {
      return Result.ok(this);
    }

    if (this.status === GrandPrixStatus.CANCELLED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          'Um Grande Prêmio cancelado não pode ser marcado como concluído.'
        )
      );
    }

    return Result.ok(
      new GrandPrix(
        {
          id: this.id,
          seasonId: this.seasonId,
          circuitId: this.circuitId,
          name: this.name,
          roundNumber: this.roundNumber,
          format: this.format,
          status: GrandPrixStatus.COMPLETED,
          startDate: this.startDate,
          endDate: this.endDate
        },
        this._sessions
      )
    );
  }

  /**
   * Indica se o Grande Prêmio foi concluído.
   */
  public isComplete(): boolean {
    return this.status === GrandPrixStatus.COMPLETED;
  }

  /**
   * Valida se o Grande Prêmio possui as sessões obrigatórias regulamentares
   * da FIA (Art. 5.4 e EVT-INV-001: ao menos uma Classificação e uma Corrida).
   */
  public hasRequiredSessions(): boolean {
    const hasQualifying = this._sessions.some(
      s => s.type === SessionType.QUALIFYING || s.type === SessionType.SPRINT_QUALIFYING
    );
    const hasRace = this._sessions.some(s => s.type === SessionType.RACE);
    return hasQualifying && hasRace;
  }

  /**
   * Compara igualdade de identidade entre dois Grandes Prêmios.
   */
  public equals(other: unknown): boolean {
    if (!(other instanceof GrandPrix)) {
      return false;
    }
    return this.id.equals(other.id);
  }

  /**
   * Factory method para criação e validação inicial de um Grande Prêmio.
   */
  public static create(props: CreateGrandPrixProps): Result<GrandPrix, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Propriedades de instanciação do Grande Prêmio não podem ser nulas ou indefinidas.'
        )
      );
    }

    if (!props.id || typeof props.id.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador do Grande Prêmio é obrigatório e deve ser uma instância válida de EntityId<\'grand-prix\'>.'
        )
      );
    }

    if (!props.seasonId || typeof props.seasonId.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador da temporada é obrigatório e deve ser uma instância válida de EntityId<\'season\'>.'
        )
      );
    }

    if (!props.circuitId || typeof props.circuitId.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador do circuito é obrigatório e deve ser uma instância válida de EntityId<\'circuit\'> (EVT-INV-003).'
        )
      );
    }

    if (typeof props.name !== 'string' || props.name.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Nome oficial do Grande Prêmio é obrigatório e não pode ser vazio.'
        )
      );
    }

    if (
      typeof props.roundNumber !== 'number' ||
      !Number.isInteger(props.roundNumber) ||
      props.roundNumber < 1
    ) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `Número de rodada (${props.roundNumber}) inválido. Deve ser um número inteiro estritamente positivo (EVT-INV-001).`,
          { roundNumber: props.roundNumber }
        )
      );
    }

    if (props.format && !Object.values(GrandPrixFormat).includes(props.format)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          `Formato de evento inválido: ${props.format}. Formatos suportados: ${Object.values(GrandPrixFormat).join(', ')}.`
        )
      );
    }

    if (props.status && !Object.values(GrandPrixStatus).includes(props.status)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          `Status de evento inválido: ${props.status}.`
        )
      );
    }

    if (!(props.startDate instanceof Date) || Number.isNaN(props.startDate.getTime())) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Data de início do Grande Prêmio inválida.')
      );
    }

    if (!(props.endDate instanceof Date) || Number.isNaN(props.endDate.getTime())) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Data de término do Grande Prêmio inválida.')
      );
    }

    if (props.startDate.getTime() > props.endDate.getTime()) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          'Data de início não pode ser posterior à data de término do Grande Prêmio (EVT-INV-002).',
          {
            startDate: props.startDate.toISOString(),
            endDate: props.endDate.toISOString()
          }
        )
      );
    }

    return Result.ok(new GrandPrix(props, []));
  }

  /**
   * Reconstitui um Grande Prêmio a partir da camada de persistência com sua coleção de sessões.
   */
  public static reconstitute(props: ReconstituteGrandPrixProps): Result<GrandPrix, DomainError> {
    const createResult = GrandPrix.create(props);
    if (createResult.isFailure) {
      return createResult;
    }

    return Result.ok(new GrandPrix(props, props.sessions ?? []));
  }
}

/**
 * Função utilitária factory para criação de Grandes Prêmios.
 */
export function createGrandPrix(props: CreateGrandPrixProps): Result<GrandPrix, DomainError> {
  return GrandPrix.create(props);
}
