/**
 * ============================================================================
 * F1Atlas — Camada Domain: Documentação Arquitetural e Plano Conceitual
 * ============================================================================
 *
 * NÍVEL 1: ESPECIFICAÇÃO DE DOMÍNIO
 *
 * Identificação:
 * - Nome do componente: Session (Sessão de Pista)
 * - Módulo: events
 * - Papel arquitetural: Entidade / Raiz Autônoma de Ciclo de Vida em Pista
 * - Estado: Implementado e Validado (229 testes unitários em conjunto no Domain)
 * - Especificação Canônica: `docs/domain/events.md`
 *
 * Responsabilidade:
 * - Representa uma atividade cronometrada oficial em pista durante um fim de semana
 *   de GP, possuindo data/hora marcada, duração regulamentar e finalidade esportiva.
 * - Categoriza o tipo de sessão regulamentar homologada pela FIA:
 *   - Treinos Livres: FP1, FP2, FP3
 *   - Qualificação: QUALIFYING, SPRINT_QUALIFYING / SPRINT_SHOOTOUT
 *   - Corridas: SPRINT, RACE
 * - Governa a máquina de estados finitos regulamentar do ciclo de vida:
 *   SCHEDULED -> LIVE <-> RED_FLAGGED -> COMPLETED (ou SCHEDULED/LIVE/RED_FLAGGED -> CANCELLED).
 *
 * Relacionamentos e Limites de Responsabilidade:
 * - Pertence a um GrandPrix através do identificador fraco `grandPrixId: EntityId<'grand-prix'>`.
 * - Referenciada por `SessionEntry` através de `sessionId: EntityId<'session'>`.
 * - Referenciada por `SessionResult` através de `sessionId: EntityId<'session'>`.
 * - O QUE NÃO FAZ:
 *   - Não define grid de largada derivado de qualificações/penalidades.
 *   - Não calcula pontuação de campeonato (responsabilidade do futuro módulo Scoring).
 *   - Não persiste diretamente nem depende de frameworks de transporte/web.
 *
 * Invariantes Mapeadas (docs/domain/events.md):
 * - EVT-INV-004: Tipo regulamentar estrito homologado pela FIA.
 * - EVT-INV-005: Janela temporal e ordenação cronológica das sessões do fim de semana.
 * - EVT-INV-006: Ciclo de vida determinístico de sessão e imutabilidade pós-encerramento.
 *
 * ============================================================================
 * NÍVEL 2: DIRETRIZES DE IMPLEMENTAÇÃO E EXECUÇÃO
 * ============================================================================
 *
 * - Instanciação: `Session.create(...)` e reconstituição `Session.reconstitute(...)`.
 * - Métodos de transição de estado:
 *   `startSession(...)`, `interruptWithRedFlag(...)`, `resumeSession(...)`,
 *   `completeSession(...)`, `cancelSession(...)`.
 * - Todas as mutações de ciclo de vida retornam `Result<Session, DomainError>`.
 * - Sessão em estado `COMPLETED` ou `CANCELLED` rejeita qualquer mutação de estado.
 * - Tipos exportados: `SessionType`, `SessionStatus`, `SessionProps`, `CreateSessionProps`.
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';

/**
 * Tipos regulamentares de sessão homologados pela FIA na Fórmula 1.
 */
export const SessionType = {
  FP1: 'FP1',
  FP2: 'FP2',
  FP3: 'FP3',
  QUALIFYING: 'QUALIFYING',
  SPRINT_QUALIFYING: 'SPRINT_QUALIFYING',
  SPRINT_SHOOTOUT: 'SPRINT_SHOOTOUT',
  SPRINT: 'SPRINT',
  RACE: 'RACE'
} as const;

export type SessionType = (typeof SessionType)[keyof typeof SessionType];

/**
 * Estados do ciclo de vida regulamentar de uma sessão de pista.
 */
export const SessionStatus = {
  SCHEDULED: 'SCHEDULED',
  LIVE: 'LIVE',
  RED_FLAGGED: 'RED_FLAGGED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

/**
 * Propriedades para criação de uma instância de Session.
 */
export interface CreateSessionProps {
  readonly id: EntityId<'session'>;
  readonly grandPrixId: EntityId<'grand-prix'>;
  readonly type: SessionType;
  readonly scheduledStartTime: Date;
  readonly scheduledEndTime?: Date;
}

/**
 * Propriedades completas do estado interno de uma Session.
 */
export interface SessionStateProps extends CreateSessionProps {
  readonly status: SessionStatus;
  readonly actualStartTime?: Date;
  readonly actualEndTime?: Date;
  readonly cancellationReason?: string;
}

/**
 * Entidade de Domínio representando uma sessão atômica de pista em um Grande Prêmio.
 */
export class Session {
  readonly id: EntityId<'session'>;
  readonly grandPrixId: EntityId<'grand-prix'>;
  readonly type: SessionType;
  readonly status: SessionStatus;
  private readonly _scheduledStartTime: number;
  private readonly _scheduledEndTime?: number;
  private readonly _actualStartTime?: number;
  private readonly _actualEndTime?: number;
  readonly cancellationReason?: string;

  private constructor(props: SessionStateProps) {
    this.id = props.id;
    this.grandPrixId = props.grandPrixId;
    this.type = props.type;
    this.status = props.status;
    this._scheduledStartTime = props.scheduledStartTime.getTime();
    this._scheduledEndTime = props.scheduledEndTime ? props.scheduledEndTime.getTime() : undefined;
    this._actualStartTime = props.actualStartTime ? props.actualStartTime.getTime() : undefined;
    this._actualEndTime = props.actualEndTime ? props.actualEndTime.getTime() : undefined;
    this.cancellationReason = props.cancellationReason;

    Object.freeze(this);
  }

  /**
   * Data e horário agendado de início (cópia defensiva imutável).
   */
  public get scheduledStartTime(): Date {
    return new Date(this._scheduledStartTime);
  }

  /**
   * Data e horário agendado de encerramento (cópia defensiva imutável).
   */
  public get scheduledEndTime(): Date | undefined {
    return this._scheduledEndTime !== undefined ? new Date(this._scheduledEndTime) : undefined;
  }

  /**
   * Data e horário real de início na pista (cópia defensiva imutável).
   */
  public get actualStartTime(): Date | undefined {
    return this._actualStartTime !== undefined ? new Date(this._actualStartTime) : undefined;
  }

  /**
   * Data e horário real de término na pista (cópia defensiva imutável).
   */
  public get actualEndTime(): Date | undefined {
    return this._actualEndTime !== undefined ? new Date(this._actualEndTime) : undefined;
  }

  /**
   * Indica se a sessão é elegível para concessão de pontos oficiais no campeonato.
   */
  public get isPointsEligible(): boolean {
    return this.type === SessionType.RACE || this.type === SessionType.SPRINT;
  }

  /**
   * Indica se a sessão é um treino livre (FP1, FP2 ou FP3).
   */
  public get isPractice(): boolean {
    return (
      this.type === SessionType.FP1 ||
      this.type === SessionType.FP2 ||
      this.type === SessionType.FP3
    );
  }

  /**
   * Indica se a sessão é de qualificação de grid (Qualifying, Sprint Qualifying ou Sprint Shootout).
   */
  public get isQualifying(): boolean {
    return (
      this.type === SessionType.QUALIFYING ||
      this.type === SessionType.SPRINT_QUALIFYING ||
      this.type === SessionType.SPRINT_SHOOTOUT
    );
  }

  /**
   * Indica se a sessão é uma corrida (Sprint ou Grand Prix principal).
   */
  public get isRace(): boolean {
    return this.type === SessionType.RACE || this.type === SessionType.SPRINT;
  }

  /**
   * Fábrica estática para criar e validar uma nova instância de Session.
   */
  public static create(props: CreateSessionProps): Result<Session, DomainError> {
    if (!props.id || !(props.id instanceof EntityId)) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'O identificador da sessão é obrigatório e deve ser um EntityId.')
      );
    }

    if (!props.grandPrixId || !(props.grandPrixId instanceof EntityId)) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'O identificador do Grande Prêmio é obrigatório e deve ser um EntityId.')
      );
    }

    const validTypes = Object.values(SessionType);
    if (!validTypes.includes(props.type)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          `Tipo de sessão inválido: "${props.type}". Tipos permitidos: ${validTypes.join(', ')}.`
        )
      );
    }

    if (!props.scheduledStartTime || isNaN(props.scheduledStartTime.getTime())) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'A data e horário de início agendado é inválida.')
      );
    }

    if (props.scheduledEndTime !== undefined) {
      if (isNaN(props.scheduledEndTime.getTime())) {
        return Result.fail(
          new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'A data e horário de término agendado é inválida.')
        );
      }
      if (props.scheduledEndTime.getTime() < props.scheduledStartTime.getTime()) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            'O horário agendado de término não pode ser anterior ao horário de início.'
          )
        );
      }
    }

    const session = new Session({
      id: props.id,
      grandPrixId: props.grandPrixId,
      type: props.type,
      status: SessionStatus.SCHEDULED,
      scheduledStartTime: props.scheduledStartTime,
      scheduledEndTime: props.scheduledEndTime
    });

    return Result.ok(session);
  }

  /**
   * Inicia a sessão de pista, transicionando o status para LIVE.
   */
  public start(actualStartTime?: Date): Result<Session, DomainError> {
    if (this.status !== SessionStatus.SCHEDULED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_STATE,
          `Não é possível iniciar uma sessão no estado "${this.status}". Apenas sessões SCHEDULED podem ser iniciadas.`
        )
      );
    }

    const startTimestamp = actualStartTime ? actualStartTime.getTime() : Date.now();
    if (isNaN(startTimestamp)) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Data de início real da sessão é inválida.')
      );
    }

    const updated = new Session({
      id: this.id,
      grandPrixId: this.grandPrixId,
      type: this.type,
      status: SessionStatus.LIVE,
      scheduledStartTime: this.scheduledStartTime,
      scheduledEndTime: this.scheduledEndTime,
      actualStartTime: new Date(startTimestamp)
    });

    return Result.ok(updated);
  }

  /**
   * Interrompe a sessão com bandeira vermelha (RED_FLAGGED).
   */
  public interrupt(): Result<Session, DomainError> {
    if (this.status !== SessionStatus.LIVE) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_STATE,
          `Não é possível interromper uma sessão no estado "${this.status}". Apenas sessões LIVE podem ser paralisadas.`
        )
      );
    }

    const updated = new Session({
      id: this.id,
      grandPrixId: this.grandPrixId,
      type: this.type,
      status: SessionStatus.RED_FLAGGED,
      scheduledStartTime: this.scheduledStartTime,
      scheduledEndTime: this.scheduledEndTime,
      actualStartTime: this.actualStartTime
    });

    return Result.ok(updated);
  }

  /**
   * Retoma a sessão que estava sob bandeira vermelha de volta para LIVE.
   */
  public resume(): Result<Session, DomainError> {
    if (this.status !== SessionStatus.RED_FLAGGED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_STATE,
          `Não é possível retomar uma sessão no estado "${this.status}". Apenas sessões RED_FLAGGED podem ser retomadas.`
        )
      );
    }

    const updated = new Session({
      id: this.id,
      grandPrixId: this.grandPrixId,
      type: this.type,
      status: SessionStatus.LIVE,
      scheduledStartTime: this.scheduledStartTime,
      scheduledEndTime: this.scheduledEndTime,
      actualStartTime: this.actualStartTime
    });

    return Result.ok(updated);
  }

  /**
   * Conclui oficialmente as atividades de pista (COMPLETED).
   */
  public complete(actualEndTime: Date): Result<Session, DomainError> {
    if (this.status !== SessionStatus.LIVE && this.status !== SessionStatus.RED_FLAGGED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_STATE,
          `Não é possível concluir uma sessão no estado "${this.status}". Apenas sessões LIVE ou RED_FLAGGED podem ser concluídas.`
        )
      );
    }

    if (!actualEndTime || isNaN(actualEndTime.getTime())) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'A data de encerramento da sessão é inválida.')
      );
    }

    if (this._actualStartTime !== undefined && actualEndTime.getTime() < this._actualStartTime) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          'O horário de término da sessão não pode ser anterior ao horário de início.'
        )
      );
    }

    const updated = new Session({
      id: this.id,
      grandPrixId: this.grandPrixId,
      type: this.type,
      status: SessionStatus.COMPLETED,
      scheduledStartTime: this.scheduledStartTime,
      scheduledEndTime: this.scheduledEndTime,
      actualStartTime: this.actualStartTime,
      actualEndTime: actualEndTime
    });

    return Result.ok(updated);
  }

  /**
   * Cancela a sessão com justificativa regulamentar opcional.
   */
  public cancel(reason?: string): Result<Session, DomainError> {
    if (this.status === SessionStatus.COMPLETED || this.status === SessionStatus.CANCELLED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_STATE,
          `Não é possível cancelar uma sessão que já se encontra em estado terminal ("${this.status}").`
        )
      );
    }

    const updated = new Session({
      id: this.id,
      grandPrixId: this.grandPrixId,
      type: this.type,
      status: SessionStatus.CANCELLED,
      scheduledStartTime: this.scheduledStartTime,
      scheduledEndTime: this.scheduledEndTime,
      actualStartTime: this.actualStartTime,
      cancellationReason: reason
    });

    return Result.ok(updated);
  }
}

/**
 * Cria uma nova sessão oficial de pista para um Grande Prêmio.
 *
 * @name createSession
 * @purpose Inicializar uma sessão de pista com horário agendado e tipo regulamentar.
 */
export function createSession(props: CreateSessionProps): Result<Session, DomainError> {
  return Session.create(props);
}

/**
 * Transiciona o estado da sessão para COMPLETED registrando o horário real de encerramento.
 *
 * @name completeSession
 * @purpose Homologar o encerramento das atividades de pista daquela sessão.
 */
export function completeSession(session: Session, actualEndTime: Date): Result<Session, DomainError> {
  return session.complete(actualEndTime);
}
