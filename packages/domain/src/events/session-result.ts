/**
 * ============================================================================
 * F1Atlas — Camada Domain | Events: SessionResult
 * ============================================================================
 *
 * NÍVEL 1 — ESPECIFICAÇÃO ARQUITETURAL DO COMPONENTE
 *
 * Identificação:
 * - Componente: SessionResult (Resultado da Sessão / Classificação de Pista)
 * - Módulo: events
 * - Papel Arquitetural: Entidade de Domínio / Registro Factológico de Chegada
 * - Referência Normativa DDS: docs/domain/events.md (Seção 8)
 * - Invariantes Vinculadas: EVT-INV-010, EVT-INV-011, EVT-INV-012, EVT-INV-013,
 *   EVT-INV-014, EVT-INV-015, EVT-INV-016
 *
 * Responsabilidade de Domínio:
 * - Representar o desfecho desportivo oficial, preliminar ou simulado obtido por um
 *   participante em uma sessão de corrida, qualificação ou treino livre.
 * - Manter as métricas factuais de pista: status de finalização (FINISHED, DNF, DNS, DSQ, NC),
 *   posição numérica classificada (position), voltas completadas (lapsCompleted),
 *   tempo total acumulado da sessão (totalTimeMillis), intervalo de chegada (gapMillis)
 *   e registro de volta mais rápida da prova.
 * - Gerenciar o ciclo de vida regulamentar de homologação documental da FIA:
 *   PROVISIONAL (imediato à bandeirada), OFFICIAL (auditado e homologado pelos comissários),
 *   REVISED (retificado por punições pós-prova) e SIMULATED (isolado em cenários hipotéticos).
 *
 * Relacionamentos e Fronteiras:
 * - Vinculado a uma Session (`sessionId`), Driver (`driverId`), Team (`teamId`) e Constructor (`constructorId`).
 * - Fornece a entrada factual imutável para os motores de pontuação (`scoring`) e tabelas (`championships`).
 * - Não calcula os pontos conferidos pela posição (responsabilidade exclusiva do módulo `scoring`).
 * - Não manipula deduções de pontos disciplinares de superlicença da FIA.
 * - Não encapsula banco de dados, ORMs, serialização HTTP ou frameworks web.
 *
 * Invariantes do Domínio:
 * - [EVT-INV-010]: Competidores com status FINISHED devem possuir obrigatoriamente position >= 1
 *   e lapsCompleted >= 1.
 * - [EVT-INV-011]: Competidores com status DNS (Did Not Start) possuem obrigatoriamente
 *   lapsCompleted === 0, position === null, totalTimeMillis === null e gapMillis === null.
 * - [EVT-INV-012]: Regra dos 90% (FIA Art. 62.1): piloto em DNF que completou pelo menos 90%
 *   do total de voltas do vencedor é classificado na ordem de voltas; caso contrário, recebe status NC.
 * - [EVT-INV-013]: Competidores com status DSQ (desclassificado) ou NC (não classificado) têm
 *   sua posição numérica anulada (position = null).
 * - [EVT-INV-014]: Apenas resultados com publicationState === OFFICIAL podem alimentar os cálculos de campeonato.
 * - [EVT-INV-015]: Resultados com publicationState === SIMULATED são estritamente isolados e
 *   jamais podem transicionar para OFFICIAL.
 * - [EVT-INV-016]: Qualquer retificação através de applyStewardsRevision exige justificativa
 *   textual não vazia (reason) para assegurar rastreabilidade histórica auditável.
 *
 * ============================================================================
 * NÍVEL 2 — ORIENTAÇÃO TÉCNICA PARA IMPLEMENTAÇÃO (DEVELOPER & TEST ENGINEER)
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';

/**
 * Status regulamentar de conclusão da sessão para um participante.
 */
export const ResultStatus = {
  FINISHED: 'FINISHED',
  DNF: 'DNF',
  DNS: 'DNS',
  DSQ: 'DSQ',
  NC: 'NC'
} as const;

export type ResultStatus = (typeof ResultStatus)[keyof typeof ResultStatus];

/**
 * Estados do ciclo de vida documental e homologação oficial da FIA.
 */
export const PublicationState = {
  PROVISIONAL: 'PROVISIONAL',
  OFFICIAL: 'OFFICIAL',
  REVISED: 'REVISED',
  SIMULATED: 'SIMULATED'
} as const;

export type PublicationState = (typeof PublicationState)[keyof typeof PublicationState];

/**
 * Propriedades para instanciação de um SessionResult.
 */
export interface CreateSessionResultProps {
  readonly id: EntityId<'session-result'>;
  readonly sessionId: EntityId<'session'>;
  readonly driverId: EntityId<'driver'>;
  readonly teamId: EntityId<'team'>;
  readonly constructorId: EntityId<'constructor'>;
  readonly position?: number | null;
  readonly lapsCompleted: number;
  readonly status: ResultStatus;
  readonly totalTimeMillis?: number | null;
  readonly gapMillis?: number | null;
  readonly fastestLapTimeMillis?: number | null;
  readonly fastestLapRank?: number | null;
  readonly publicationState?: PublicationState;
  readonly revisionReason?: string | null;
}

/**
 * Parâmetros para aplicação de revisão disciplinar dos comissários desportivos.
 */
export interface ApplyStewardsRevisionProps {
  readonly newPosition: number | null;
  readonly newStatus?: ResultStatus;
  readonly penaltyTimeMillis?: number | null;
  readonly reason: string;
}

/**
 * Entidade de Domínio representando o desfecho factual apurado de um competidor em uma sessão.
 */
export class SessionResult {
  readonly id: EntityId<'session-result'>;
  readonly sessionId: EntityId<'session'>;
  readonly driverId: EntityId<'driver'>;
  readonly teamId: EntityId<'team'>;
  readonly constructorId: EntityId<'constructor'>;
  readonly position: number | null;
  readonly lapsCompleted: number;
  readonly status: ResultStatus;
  readonly totalTimeMillis: number | null;
  readonly gapMillis: number | null;
  readonly fastestLapTimeMillis: number | null;
  readonly fastestLapRank: number | null;
  readonly publicationState: PublicationState;
  readonly revisionReason: string | null;

  private constructor(props: CreateSessionResultProps) {
    this.id = props.id;
    this.sessionId = props.sessionId;
    this.driverId = props.driverId;
    this.teamId = props.teamId;
    this.constructorId = props.constructorId;
    this.status = props.status;
    this.position = props.position !== undefined ? props.position : null;
    this.lapsCompleted = props.lapsCompleted;
    this.totalTimeMillis = props.totalTimeMillis !== undefined ? props.totalTimeMillis : null;
    this.gapMillis = props.gapMillis !== undefined ? props.gapMillis : null;
    this.fastestLapTimeMillis = props.fastestLapTimeMillis !== undefined ? props.fastestLapTimeMillis : null;
    this.fastestLapRank = props.fastestLapRank !== undefined ? props.fastestLapRank : null;
    this.publicationState = props.publicationState ?? PublicationState.PROVISIONAL;
    this.revisionReason = props.revisionReason ? props.revisionReason.trim() : null;

    Object.freeze(this);
  }

  /**
   * Indica se este competidor obteve a volta mais rápida da prova.
   */
  public get isFastestLap(): boolean {
    return this.fastestLapRank === 1;
  }

  /**
   * Avalia se o resultado atende aos critérios regulamentares de classificação
   * oficial da FIA (Artigo 62.1 — regra dos 90% para DNF).
   *
   * @param winnerLaps Quantidade de voltas completadas pelo vencedor da sessão (se conhecida).
   * @returns Booleano indicando se o resultado é classificado na tabela final.
   */
  public isClassified(winnerLaps?: number): boolean {
    if (this.status === ResultStatus.FINISHED) {
      return true;
    }

    if (this.status === ResultStatus.DNF) {
      if (typeof winnerLaps === 'number' && winnerLaps > 0) {
        const threshold = Math.floor(0.90 * winnerLaps);
        return this.lapsCompleted >= threshold;
      }
      return this.position !== null;
    }

    return false;
  }

  /**
   * Homologa oficialmente o resultado da sessão (PROVISIONAL/REVISED -> OFFICIAL).
   * Resultados em estado SIMULATED são estritamente impedidos de homologação (EVT-INV-015).
   *
   * @returns Result contendo nova instância de SessionResult ou DomainError.
   */
  public homologateResult(): Result<SessionResult, DomainError> {
    if (this.publicationState === PublicationState.SIMULATED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          'Resultados de simulações hipotéticas (SIMULATED) não podem ser homologados como oficiais (EVT-INV-015).'
        )
      );
    }

    if (this.publicationState === PublicationState.OFFICIAL) {
      return Result.ok(this);
    }

    return SessionResult.create({
      id: this.id,
      sessionId: this.sessionId,
      driverId: this.driverId,
      teamId: this.teamId,
      constructorId: this.constructorId,
      position: this.position,
      lapsCompleted: this.lapsCompleted,
      status: this.status,
      totalTimeMillis: this.totalTimeMillis,
      gapMillis: this.gapMillis,
      fastestLapTimeMillis: this.fastestLapTimeMillis,
      fastestLapRank: this.fastestLapRank,
      publicationState: PublicationState.OFFICIAL,
      revisionReason: this.revisionReason
    });
  }

  /**
   * Aplica retificação pós-prova determinada pelos comissários desportivos (Stewards).
   * Exige obrigatoriamente justificativa textual para rastreabilidade auditável (EVT-INV-016).
   *
   * @param revision Parâmetros da revisão a aplicar.
   * @returns Result contendo nova instância de SessionResult com estado REVISED ou DomainError.
   */
  public applyStewardsRevision(revision: ApplyStewardsRevisionProps): Result<SessionResult, DomainError> {
    if (!revision || typeof revision !== 'object') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Parâmetros de revisão não podem ser nulos.')
      );
    }

    if (typeof revision.reason !== 'string' || revision.reason.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          'A aplicação de revisão dos comissários exige justificativa textual não vazia para rastreabilidade histórica (EVT-INV-016).'
        )
      );
    }

    const nextStatus = revision.newStatus ?? this.status;
    let nextPosition = revision.newPosition;

    if (nextStatus === ResultStatus.DSQ || nextStatus === ResultStatus.NC) {
      nextPosition = null;
    }

    return SessionResult.create({
      id: this.id,
      sessionId: this.sessionId,
      driverId: this.driverId,
      teamId: this.teamId,
      constructorId: this.constructorId,
      position: nextPosition,
      lapsCompleted: this.lapsCompleted,
      status: nextStatus,
      totalTimeMillis: this.totalTimeMillis,
      gapMillis: this.gapMillis,
      fastestLapTimeMillis: this.fastestLapTimeMillis,
      fastestLapRank: this.fastestLapRank,
      publicationState: PublicationState.REVISED,
      revisionReason: revision.reason.trim()
    });
  }

  /**
   * Cria um cenário de simulação hipotética desacoplado a partir deste resultado.
   */
  public createSimulatedScenario(overrides?: Partial<CreateSessionResultProps>): Result<SessionResult, DomainError> {
    return SessionResult.create({
      id: overrides?.id ?? this.id,
      sessionId: overrides?.sessionId ?? this.sessionId,
      driverId: overrides?.driverId ?? this.driverId,
      teamId: overrides?.teamId ?? this.teamId,
      constructorId: overrides?.constructorId ?? this.constructorId,
      position: overrides?.position !== undefined ? overrides.position : this.position,
      lapsCompleted: overrides?.lapsCompleted !== undefined ? overrides.lapsCompleted : this.lapsCompleted,
      status: overrides?.status ?? this.status,
      totalTimeMillis: overrides?.totalTimeMillis !== undefined ? overrides.totalTimeMillis : this.totalTimeMillis,
      gapMillis: overrides?.gapMillis !== undefined ? overrides.gapMillis : this.gapMillis,
      fastestLapTimeMillis: overrides?.fastestLapTimeMillis !== undefined ? overrides.fastestLapTimeMillis : this.fastestLapTimeMillis,
      fastestLapRank: overrides?.fastestLapRank !== undefined ? overrides.fastestLapRank : this.fastestLapRank,
      publicationState: PublicationState.SIMULATED,
      revisionReason: overrides?.revisionReason ?? this.revisionReason
    });
  }

  /**
   * Compara igualdade por identidade entre dois SessionResult.
   */
  public equals(other: unknown): boolean {
    if (!(other instanceof SessionResult)) {
      return false;
    }
    return this.id.equals(other.id);
  }

  /**
   * Factory method para validação e instanciação de SessionResult.
   */
  public static create(props: CreateSessionResultProps): Result<SessionResult, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Propriedades de instanciação de SessionResult não podem ser nulas ou indefinidas.'
        )
      );
    }

    if (!props.id || typeof props.id.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador de SessionResult é obrigatório e deve ser uma instância de EntityId<\'session-result\'>.'
        )
      );
    }

    if (!props.sessionId || typeof props.sessionId.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador da sessão é obrigatório e deve ser uma instância de EntityId<\'session\'>.'
        )
      );
    }

    if (!props.driverId || typeof props.driverId.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador do piloto é obrigatório e deve ser uma instância de EntityId<\'driver\'>.'
        )
      );
    }

    if (!props.teamId || typeof props.teamId.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador da equipe é obrigatório e deve ser uma instância de EntityId<\'team\'>.'
        )
      );
    }

    if (!props.constructorId || typeof props.constructorId.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador do construtor é obrigatório e deve ser uma instância de EntityId<\'constructor\'>.'
        )
      );
    }

    if (!props.status || !Object.values(ResultStatus).includes(props.status)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          `Status de resultado inválido: ${props.status}. Valores suportados: ${Object.values(ResultStatus).join(', ')}.`
        )
      );
    }

    if (
      typeof props.lapsCompleted !== 'number' ||
      !Number.isInteger(props.lapsCompleted) ||
      props.lapsCompleted < 0
    ) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          `Voltas completadas (${props.lapsCompleted}) inválidas. Deve ser um número inteiro maior ou igual a zero.`,
          { lapsCompleted: props.lapsCompleted }
        )
      );
    }

    // Validação de FINISHED (EVT-INV-010)
    if (props.status === ResultStatus.FINISHED) {
      if (
        typeof props.position !== 'number' ||
        !Number.isInteger(props.position) ||
        props.position < 1
      ) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            'Competidores com status FINISHED devem possuir obrigatoriamente posição de chegada maior ou igual a 1 (EVT-INV-010).',
            { position: props.position, status: props.status }
          )
        );
      }

      if (props.lapsCompleted < 1) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            'Competidores com status FINISHED devem possuir ao menos 1 volta completada (EVT-INV-010).',
            { lapsCompleted: props.lapsCompleted }
          )
        );
      }
    }

    // Validação de DNS (EVT-INV-011)
    if (props.status === ResultStatus.DNS) {
      if (props.lapsCompleted !== 0) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            'Competidores com status DNS (Did Not Start) devem registrar obrigatoriamente 0 voltas completadas (EVT-INV-011).',
            { lapsCompleted: props.lapsCompleted }
          )
        );
      }

      if (props.position !== null && props.position !== undefined) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            'Competidores com status DNS não podem possuir posição numérica de chegada (EVT-INV-011).',
            { position: props.position }
          )
        );
      }

      if (props.totalTimeMillis !== null && props.totalTimeMillis !== undefined) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            'Competidores com status DNS não podem possuir tempo total de prova registrado (EVT-INV-011).',
            { totalTimeMillis: props.totalTimeMillis }
          )
        );
      }
    }

    // Validação de DSQ (EVT-INV-013)
    if (props.status === ResultStatus.DSQ && props.position !== null && props.position !== undefined) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          'Competidores desclassificados (DSQ) têm sua posição numérica anulada (deve ser nula) (EVT-INV-013).',
          { position: props.position }
        )
      );
    }

    // Validação de NC (não classificado)
    if (props.status === ResultStatus.NC && props.position !== null && props.position !== undefined) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          'Competidores com status NC (não classificado) não possuem posição numérica associada.',
          { position: props.position }
        )
      );
    }

    if (props.publicationState && !Object.values(PublicationState).includes(props.publicationState)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          `Estado de publicação inválido: ${props.publicationState}.`
        )
      );
    }

    return Result.ok(new SessionResult(props));
  }

  /**
   * Reconstitui um SessionResult a partir de persistência sem validações destrutivas.
   */
  public static reconstitute(props: CreateSessionResultProps): Result<SessionResult, DomainError> {
    return SessionResult.create(props);
  }
}

/**
 * Função utilitária factory de criação de SessionResult.
 */
export function createSessionResult(props: CreateSessionResultProps): Result<SessionResult, DomainError> {
  return SessionResult.create(props);
}

/**
 * Valida os limites e invariantes de conjunto de uma classificação consolidada da sessão.
 *
 * Invariantes validadas:
 * - Unicidade de posições classificadas (finishPosition única para position >= 1).
 * - Identificação do vencedor (posição 1): deve ter a maior contagem de voltas completadas (EVT-INV-011).
 * - Unicidade de volta mais rápida da prova (no máximo um piloto com fastestLapRank === 1).
 * - Coerência de escopo: todos os resultados devem pertencer à mesma sessão.
 *
 * @param results Coleção consolidada de resultados da sessão.
 * @returns Result void indicando aprovação ou DomainError com detalhes do conflito.
 */
export function validateSessionClassification(results: readonly SessionResult[]): Result<void, DomainError> {
  if (!Array.isArray(results) || results.length === 0) {
    return Result.ok();
  }

  const primarySessionId = results[0].sessionId.toValue();
  const usedPositions = new Set<number>();
  let fastestLapCount = 0;
  let winnerLaps = 0;

  for (const res of results) {
    if (res.sessionId.toValue() !== primarySessionId) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          'A classificação consolidada contém resultados pertencentes a sessões distintas.'
        )
      );
    }

    if (res.position !== null) {
      if (usedPositions.has(res.position)) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `Posição de chegada duplicada na mesma sessão: posição ${res.position} (EVT-INV-010).`,
            { position: res.position }
          )
        );
      }
      usedPositions.add(res.position);

      if (res.position === 1) {
        winnerLaps = res.lapsCompleted;
      }
    }

    if (res.fastestLapRank === 1) {
      fastestLapCount += 1;
      if (fastestLapCount > 1) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            'No máximo um participante pode ser marcado como detentor da volta mais rápida da sessão (EVT-INV-013).'
          )
        );
      }
    }
  }

  // Se houve um vencedor, nenhum outro piloto pode ter completado mais voltas que ele
  if (winnerLaps > 0) {
    for (const res of results) {
      if (res.lapsCompleted > winnerLaps) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `Nenhum competidor (${res.driverId.toValue()}: ${res.lapsCompleted} voltas) pode ter completado mais voltas que o vencedor (${winnerLaps} voltas) (EVT-INV-011).`,
            { lapsCompleted: res.lapsCompleted, winnerLaps }
          )
        );
      }
    }
  }

  return Result.ok();
}
