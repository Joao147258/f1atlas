/**
 * ============================================================================
 * F1Atlas — Camada Domain | Seasons: Season
 * ============================================================================
 *
 * Identificação:
 * - Componente: Season
 * - Módulo: Seasons
 * - Papel Arquitetural: Raiz de Agregação (Aggregate Root)
 * - Estado: Implementado e Validado
 *
 * Responsabilidade:
 * - Representar um ano de campeonato oficial da Fórmula 1 (ex.: Temporada 2025).
 * - Atuar como o contexto delimitador temporal soberano para todas as disputas
 *   esportivas, inscrições de participantes e regras aplicáveis.
 * - Coordenar o calendário oficial de etapas através de registros de agendamento
 *   (`ScheduledGrandPrix`), adotando o modelo intermediário de calendário /
 *   referência por identidade para isolar a governança anual da execução
 *   detalhada das sessões em pista (escopo do módulo `events`).
 * - Proteger as invariantes regulamentares do calendário: unicidade de rodadas,
 *   sequencialidade ininterrupta, coerência temporal e imutabilidade pós-conclusão.
 * - Permitir o cancelamento pontual de etapas (ex.: GP da Emilia-Romagna de 2023)
 *   preservando o número oficial da rodada e a memória histórica da temporada.
 *
 * Relacionamentos:
 * - Agrega o calendário de etapas agendadas (`ScheduledGrandPrix[]`).
 * - Referencia o conjunto de regras desportivas e de pontuação aplicáveis (`ScoringRuleset`).
 * - Desacoplado da entidade `GrandPrix` do módulo `events` via referência por identidade (`EntityId<'grand-prix'>`).
 * - Não encapsula banco de dados, ORMs, frameworks web ou detalhes de transporte.
 *
 * Comportamento Implementado:
 * - Controlar a transição de ciclo de vida da temporada (`SeasonStatus`).
 * - Agendar etapas no calendário oficial mantendo a ordenação cronológica de rodadas.
 * - Cancelar e reagendar etapas preservando a integridade histórica.
 * - Marcar conclusão individual de etapas durante o campeonato em andamento.
 * - Bloquear adições e modificações operacionais ordinárias após encerramento oficial (`CONCLUDED`).
 * - Permitir retificações históricas auditadas e supervisionadas pós-conclusão (`HISTORICAL_REVISED`).
 *
 * Restrições e Invariantes:
 * - Ano da temporada (`year`) deve ser um número inteiro positivo e consistente com a história (>= 1950).
 * - Não pode haver duas etapas no calendário com a mesma rodada (`roundNumber`) nem com o mesmo `grandPrixId`.
 * - Ao iniciar a temporada (`startSeason`), o calendário deve conter ao menos 1 etapa e formar uma sequência contínua de 1 até N.
 * - Ao concluir a temporada (`concludeSeason`), todas as etapas devem estar resolvidas (concluídas ou canceladas).
 * - Imutabilidade estrita: instâncias congeladas em runtime (`Object.freeze`) e cópia defensiva de datas (`Date`).
 *
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';
import {
  SeasonStatus,
  isLockedForModifications,
  isValidTransition
} from './season-status.ts';

/**
 * Estados possíveis de uma etapa agendada no calendário da temporada.
 */
export const ScheduledGrandPrixStatus = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  POSTPONED: 'POSTPONED'
} as const;

export type ScheduledGrandPrixStatus = (typeof ScheduledGrandPrixStatus)[keyof typeof ScheduledGrandPrixStatus];

/**
 * Representação imutável de uma etapa agendada no calendário da temporada.
 * Atua como o modelo intermediário de calendário (Value Object de agendamento),
 * referenciando a identidade do Grande Prêmio sem carregar sessões de pista.
 */
export interface ScheduledGrandPrix {
  readonly grandPrixId: EntityId<'grand-prix'>;
  readonly roundNumber: number;
  readonly name: string;
  readonly status?: ScheduledGrandPrixStatus;
  readonly cancellationReason?: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
}

/**
 * Propriedades para criação de uma nova temporada.
 */
export interface CreateSeasonProps {
  readonly id: EntityId<'season'>;
  readonly year: number;
  readonly rulesetId?: EntityId<'scoring-ruleset'>;
  readonly description?: string;
  readonly status?: SeasonStatus;
}

/**
 * Propriedades internas completas do estado da temporada.
 */
export interface SeasonStateProps extends CreateSeasonProps {
  readonly status: SeasonStatus;
  readonly grandPrixList: readonly ScheduledGrandPrix[];
}

/**
 * Função utilitária pura de cópia defensiva e congelamento de uma etapa de calendário.
 */
function cloneAndFreezeScheduledGrandPrix(gp: ScheduledGrandPrix): ScheduledGrandPrix {
  const cloned: ScheduledGrandPrix = {
    grandPrixId: gp.grandPrixId,
    roundNumber: gp.roundNumber,
    name: gp.name,
    status: gp.status ?? ScheduledGrandPrixStatus.SCHEDULED,
    cancellationReason: gp.cancellationReason,
    startDate: gp.startDate ? new Date(gp.startDate.getTime()) : undefined,
    endDate: gp.endDate ? new Date(gp.endDate.getTime()) : undefined
  };
  return Object.freeze(cloned);
}

/**
 * Raiz de Agregado que coordena o campeonato anual de Fórmula 1 e seu calendário de Grandes Prêmios.
 */
export class Season {
  readonly id: EntityId<'season'>;
  readonly year: number;
  readonly status: SeasonStatus;
  readonly rulesetId?: EntityId<'scoring-ruleset'>;
  readonly description?: string;
  readonly grandPrixList: readonly ScheduledGrandPrix[];

  private constructor(props: SeasonStateProps) {
    this.id = props.id;
    this.year = props.year;
    this.status = props.status;
    this.rulesetId = props.rulesetId;
    this.description = props.description;
    this.grandPrixList = Object.freeze(props.grandPrixList.map(cloneAndFreezeScheduledGrandPrix));

    Object.freeze(this);
  }

  /**
   * Indica se a temporada está bloqueada para modificações ordinárias de calendário.
   */
  public get isLocked(): boolean {
    return isLockedForModifications(this.status);
  }

  /**
   * Total de etapas registradas no calendário da temporada.
   */
  public get totalRounds(): number {
    return this.grandPrixList.length;
  }

  /**
   * Total de etapas concluídas no calendário da temporada.
   */
  public get completedRounds(): number {
    return this.grandPrixList.filter(gp => gp.status === ScheduledGrandPrixStatus.COMPLETED).length;
  }

  /**
   * Total de etapas canceladas no calendário da temporada.
   */
  public get cancelledRounds(): number {
    return this.grandPrixList.filter(gp => gp.status === ScheduledGrandPrixStatus.CANCELLED).length;
  }

  /**
   * Verifica se uma rodada específica existe no calendário.
   */
  public hasRound(roundNumber: number): boolean {
    return this.grandPrixList.some(gp => gp.roundNumber === roundNumber);
  }

  /**
   * Recupera uma etapa do calendário pelo seu número de rodada (roundNumber).
   * Retorna cópia defensiva imutável com datas isoladas.
   */
  public getGrandPrixByRound(roundNumber: number): ScheduledGrandPrix | undefined {
    const gp = this.grandPrixList.find(candidate => candidate.roundNumber === roundNumber);
    return gp ? cloneAndFreezeScheduledGrandPrix(gp) : undefined;
  }

  /**
   * Fábrica estática para criar e validar uma nova instância da raiz de agregado Season.
   */
  public static create(props: CreateSeasonProps): Result<Season, DomainError> {
    if (!props.id || !(props.id instanceof EntityId)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'O identificador da temporada é obrigatório e deve ser uma instância válida de EntityId.'
        )
      );
    }

    if (!props.year || !Number.isInteger(props.year) || isNaN(props.year)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'O ano da temporada deve ser um número inteiro válido.'
        )
      );
    }

    if (props.year < 1950) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          `O ano da temporada (${props.year}) deve ser maior ou igual a 1950 (ano inaugural da FIA Formula One).`
        )
      );
    }

    const initialStatus = props.status ?? SeasonStatus.PLANNED;

    const season = new Season({
      id: props.id,
      year: props.year,
      status: initialStatus,
      rulesetId: props.rulesetId,
      description: props.description,
      grandPrixList: []
    });

    return Result.ok(season);
  }

  /**
   * Associa ou atualiza o identificador do conjunto de regras de pontuação aplicáveis.
   * Permitido em temporadas em estado PLANNED.
   */
  public withRuleset(rulesetId: EntityId<'scoring-ruleset'>): Result<Season, DomainError> {
    if (this.isLocked) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          `Não é possível alterar o regulamento da temporada ${this.year} pois ela se encontra bloqueada para modificações ("${this.status}").`
        )
      );
    }

    if (!rulesetId || !(rulesetId instanceof EntityId)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'O identificador do conjunto de regras é obrigatório e deve ser uma instância válida de EntityId.'
        )
      );
    }

    const updatedSeason = new Season({
      id: this.id,
      year: this.year,
      status: this.status,
      rulesetId,
      description: this.description,
      grandPrixList: this.grandPrixList
    });

    return Result.ok(updatedSeason);
  }

  /**
   * Adiciona ou agenda um Grande Prêmio no calendário oficial da temporada.
   */
  public scheduleGrandPrix(grandPrix: ScheduledGrandPrix): Result<Season, DomainError> {
    if (this.isLocked) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          `Não é possível agendar etapas na temporada ${this.year} pois ela se encontra bloqueada para modificações ("${this.status}").`
        )
      );
    }

    if (!grandPrix.roundNumber || !Number.isInteger(grandPrix.roundNumber) || grandPrix.roundNumber < 1) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'O número da rodada (roundNumber) deve ser um inteiro positivo maior ou igual a 1.'
        )
      );
    }

    if (!grandPrix.grandPrixId || !(grandPrix.grandPrixId instanceof EntityId)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'O identificador do Grande Prêmio é obrigatório e deve ser uma instância válida de EntityId.'
        )
      );
    }

    if (!grandPrix.name || typeof grandPrix.name !== 'string' || grandPrix.name.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'O nome da etapa é obrigatório e não pode ser vazio.'
        )
      );
    }

    // Validação de coerência temporal das datas (se fornecidas)
    if (grandPrix.startDate && isNaN(grandPrix.startDate.getTime())) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'A data de início do Grande Prêmio fornecida é inválida.'
        )
      );
    }

    if (grandPrix.endDate && isNaN(grandPrix.endDate.getTime())) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'A data de término do Grande Prêmio fornecida é inválida.'
        )
      );
    }

    if (grandPrix.startDate && grandPrix.endDate && grandPrix.endDate.getTime() < grandPrix.startDate.getTime()) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          'A data de encerramento do Grande Prêmio não pode ser anterior à data de início.'
        )
      );
    }

    // Unicidade de rodada
    const existingByRound = this.grandPrixList.find(gp => gp.roundNumber === grandPrix.roundNumber);
    if (existingByRound) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `A rodada número ${grandPrix.roundNumber} já existe no calendário da temporada ${this.year} ("${existingByRound.name}").`
        )
      );
    }

    // Unicidade de identificador do Grande Prêmio
    const existingById = this.grandPrixList.find(gp => gp.grandPrixId.equals(grandPrix.grandPrixId));
    if (existingById) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `O Grande Prêmio com identificador "${grandPrix.grandPrixId.value}" já está agendado na temporada ${this.year}.`
        )
      );
    }

    const sanitizedGp = cloneAndFreezeScheduledGrandPrix(grandPrix);

    // Mantém a coleção ordenada cronologicamente por roundNumber
    const updatedList = [...this.grandPrixList, sanitizedGp].sort((a, b) => a.roundNumber - b.roundNumber);

    const updatedSeason = new Season({
      id: this.id,
      year: this.year,
      status: this.status,
      rulesetId: this.rulesetId,
      description: this.description,
      grandPrixList: updatedList
    });

    return Result.ok(updatedSeason);
  }

  /**
   * Cancela uma etapa agendada específica no calendário da temporada (ex.: GP da Emilia-Romagna 2023).
   * Preserva a identidade do evento e o número da rodada (roundNumber), marcando-a como CANCELLED.
   * Não renumera as etapas posteriores, respeitando a diretriz desportiva e documental da FIA.
   */
  public cancelGrandPrix(roundNumber: number, reason?: string): Result<Season, DomainError> {
    if (this.isLocked) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          `Não é possível cancelar etapas na temporada ${this.year} pois ela se encontra bloqueada para modificações ("${this.status}").`
        )
      );
    }

    const targetIndex = this.grandPrixList.findIndex(gp => gp.roundNumber === roundNumber);
    if (targetIndex === -1) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.ENTITY_NOT_FOUND,
          `Nenhuma etapa agendada com o número de rodada ${roundNumber} foi encontrada na temporada ${this.year}.`
        )
      );
    }

    const targetGp = this.grandPrixList[targetIndex];
    if (targetGp.status === ScheduledGrandPrixStatus.CANCELLED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          `A etapa de rodada ${roundNumber} ("${targetGp.name}") já se encontra cancelada.`
        )
      );
    }

    if (targetGp.status === ScheduledGrandPrixStatus.COMPLETED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          `Não é possível cancelar a etapa de rodada ${roundNumber} ("${targetGp.name}") pois ela já foi oficialmente concluída.`
        )
      );
    }

    const updatedGp: ScheduledGrandPrix = {
      ...targetGp,
      status: ScheduledGrandPrixStatus.CANCELLED,
      cancellationReason: reason?.trim() || targetGp.cancellationReason
    };

    const updatedList = [...this.grandPrixList];
    updatedList[targetIndex] = cloneAndFreezeScheduledGrandPrix(updatedGp);

    const updatedSeason = new Season({
      id: this.id,
      year: this.year,
      status: this.status,
      rulesetId: this.rulesetId,
      description: this.description,
      grandPrixList: updatedList
    });

    return Result.ok(updatedSeason);
  }

  /**
   * Reagenda as datas de realização de uma etapa mantendo seu número de rodada e integridade temporal.
   */
  public rescheduleGrandPrix(
    roundNumber: number,
    newDates: { startDate?: Date; endDate?: Date }
  ): Result<Season, DomainError> {
    if (this.isLocked) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          `Não é possível reagendar etapas na temporada ${this.year} pois ela se encontra bloqueada para modificações ("${this.status}").`
        )
      );
    }

    const targetIndex = this.grandPrixList.findIndex(gp => gp.roundNumber === roundNumber);
    if (targetIndex === -1) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.ENTITY_NOT_FOUND,
          `Nenhuma etapa agendada com o número de rodada ${roundNumber} foi encontrada na temporada ${this.year}.`
        )
      );
    }

    const targetGp = this.grandPrixList[targetIndex];
    if (targetGp.status === ScheduledGrandPrixStatus.COMPLETED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          `Não é possível reagendar a etapa de rodada ${roundNumber} pois ela já foi oficialmente concluída.`
        )
      );
    }

    if (newDates.startDate && isNaN(newDates.startDate.getTime())) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'A nova data de início fornecida para o reagendamento é inválida.'
        )
      );
    }

    if (newDates.endDate && isNaN(newDates.endDate.getTime())) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'A nova data de término fornecida para o reagendamento é inválida.'
        )
      );
    }

    if (newDates.startDate && newDates.endDate && newDates.endDate.getTime() < newDates.startDate.getTime()) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          'A data de encerramento não pode ser anterior à data de início no reagendamento.'
        )
      );
    }

    const updatedGp: ScheduledGrandPrix = {
      ...targetGp,
      status: targetGp.status === ScheduledGrandPrixStatus.CANCELLED ? ScheduledGrandPrixStatus.SCHEDULED : targetGp.status,
      startDate: newDates.startDate ? new Date(newDates.startDate.getTime()) : targetGp.startDate,
      endDate: newDates.endDate ? new Date(newDates.endDate.getTime()) : targetGp.endDate
    };

    const updatedList = [...this.grandPrixList];
    updatedList[targetIndex] = cloneAndFreezeScheduledGrandPrix(updatedGp);

    const updatedSeason = new Season({
      id: this.id,
      year: this.year,
      status: this.status,
      rulesetId: this.rulesetId,
      description: this.description,
      grandPrixList: updatedList
    });

    return Result.ok(updatedSeason);
  }

  /**
   * Marca uma etapa como concluída no calendário após a realização e homologação de suas sessões.
   * Só permitido enquanto a temporada estiver em andamento (`IN_PROGRESS`).
   */
  public completeGrandPrix(roundNumber: number): Result<Season, DomainError> {
    if (this.status !== SeasonStatus.IN_PROGRESS) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_STATE,
          `Apenas temporadas em andamento (IN_PROGRESS) admitem conclusão de etapas (status atual: "${this.status}").`
        )
      );
    }

    const targetIndex = this.grandPrixList.findIndex(gp => gp.roundNumber === roundNumber);
    if (targetIndex === -1) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.ENTITY_NOT_FOUND,
          `Nenhuma etapa agendada com o número de rodada ${roundNumber} foi encontrada na temporada ${this.year}.`
        )
      );
    }

    const targetGp = this.grandPrixList[targetIndex];
    if (targetGp.status === ScheduledGrandPrixStatus.CANCELLED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          `Não é possível marcar como concluída a etapa de rodada ${roundNumber} pois ela se encontra cancelada.`
        )
      );
    }

    const updatedGp: ScheduledGrandPrix = {
      ...targetGp,
      status: ScheduledGrandPrixStatus.COMPLETED
    };

    const updatedList = [...this.grandPrixList];
    updatedList[targetIndex] = cloneAndFreezeScheduledGrandPrix(updatedGp);

    const updatedSeason = new Season({
      id: this.id,
      year: this.year,
      status: this.status,
      rulesetId: this.rulesetId,
      description: this.description,
      grandPrixList: updatedList
    });

    return Result.ok(updatedSeason);
  }

  /**
   * Inicia oficialmente o campeonato (PLANNED -> IN_PROGRESS).
   *
   * Validações:
   * 1. Status deve ser PLANNED.
   * 2. Deve possuir ao menos 1 etapa agendada.
   * 3. Invariante de Sequencialidade: As rodadas agendadas devem formar uma sequência
   *    ininterrupta de 1 até N (sem buracos no calendário).
   */
  public startSeason(): Result<Season, DomainError> {
    if (this.status !== SeasonStatus.PLANNED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_STATE,
          `Não é possível iniciar a temporada no estado "${this.status}". Apenas temporadas PLANNED podem ser iniciadas.`
        )
      );
    }

    if (this.grandPrixList.length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `A temporada ${this.year} deve possuir ao menos 1 etapa agendada para ser iniciada.`
        )
      );
    }

    // Invariante de Sequencialidade: todas as rodadas de 1 a N devem existir
    const totalCount = this.grandPrixList.length;
    for (let expectedRound = 1; expectedRound <= totalCount; expectedRound++) {
      const exists = this.grandPrixList.some(gp => gp.roundNumber === expectedRound);
      if (!exists) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `Calendário inconsistente para início da temporada ${this.year}: a rodada ${expectedRound} está ausente na sequência sequencial de 1 a ${totalCount}.`
          )
        );
      }
    }

    const updatedSeason = new Season({
      id: this.id,
      year: this.year,
      status: SeasonStatus.IN_PROGRESS,
      rulesetId: this.rulesetId,
      description: this.description,
      grandPrixList: this.grandPrixList
    });

    return Result.ok(updatedSeason);
  }

  /**
   * Encerra oficialmente a temporada (IN_PROGRESS -> CONCLUDED).
   *
   * Validações:
   * 1. Status deve ser IN_PROGRESS.
   * 2. Todas as etapas do calendário devem estar resolvidas (COMPLETED ou CANCELLED).
   *    Não é permitido concluir a temporada havendo etapas ainda abertas (SCHEDULED ou POSTPONED).
   */
  public concludeSeason(): Result<Season, DomainError> {
    if (this.status !== SeasonStatus.IN_PROGRESS) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_STATE,
          `Não é possível concluir a temporada no estado "${this.status}". Apenas temporadas IN_PROGRESS podem ser concluídas.`
        )
      );
    }

    // Validação de encerramento de todas as etapas
    const pendingGps = this.grandPrixList.filter(
      gp => gp.status === ScheduledGrandPrixStatus.SCHEDULED || gp.status === ScheduledGrandPrixStatus.POSTPONED
    );

    if (pendingGps.length > 0) {
      const pendingNames = pendingGps.map(gp => `R${gp.roundNumber}: "${gp.name}"`).join(', ');
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_STATE,
          `Não é possível concluir a temporada ${this.year} pois existem ${pendingGps.length} etapa(s) ainda em aberto no calendário (${pendingNames}). Todas as etapas devem ser concluídas ou canceladas.`
        )
      );
    }

    const updatedSeason = new Season({
      id: this.id,
      year: this.year,
      status: SeasonStatus.CONCLUDED,
      rulesetId: this.rulesetId,
      description: this.description,
      grandPrixList: this.grandPrixList
    });

    return Result.ok(updatedSeason);
  }

  /**
   * Cancela a temporada que não chegou a ser disputada (PLANNED -> CANCELLED).
   */
  public cancelSeason(reason?: string): Result<Season, DomainError> {
    if (this.status !== SeasonStatus.PLANNED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_STATE,
          `Não é possível cancelar a temporada no estado "${this.status}". Apenas temporadas PLANNED podem ser canceladas.`
        )
      );
    }

    const updatedSeason = new Season({
      id: this.id,
      year: this.year,
      status: SeasonStatus.CANCELLED,
      rulesetId: this.rulesetId,
      description: reason ? `${this.description ?? ''} [CANCELAMENTO: ${reason}]`.trim() : this.description,
      grandPrixList: this.grandPrixList
    });

    return Result.ok(updatedSeason);
  }

  /**
   * Aplica transição supervisionada pós-conclusão para permitir auditoria e retificação histórica
   * (CONCLUDED -> HISTORICAL_REVISED).
   */
  public reviseHistorically(auditNote: string): Result<Season, DomainError> {
    if (this.status !== SeasonStatus.CONCLUDED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_STATE,
          `Apenas temporadas com status CONCLUDED podem transicionar para HISTORICAL_REVISED (status atual: "${this.status}").`
        )
      );
    }

    if (!auditNote || typeof auditNote !== 'string' || auditNote.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'A nota de auditoria é obrigatória para autorizar a revisão histórica da temporada.'
        )
      );
    }

    const updatedSeason = new Season({
      id: this.id,
      year: this.year,
      status: SeasonStatus.HISTORICAL_REVISED,
      rulesetId: this.rulesetId,
      description: `${this.description ?? ''} [REVISÃO HISTÓRICA: ${auditNote.trim()}]`.trim(),
      grandPrixList: this.grandPrixList
    });

    return Result.ok(updatedSeason);
  }

  /**
   * Aplica retificação histórica supervisionada e auditada em uma etapa específica do calendário.
   * Exclusivamente permitido quando o status da temporada é HISTORICAL_REVISED.
   */
  public rectifyGrandPrix(
    roundNumber: number,
    patch: { name?: string; startDate?: Date; endDate?: Date; cancellationReason?: string },
    auditNote: string
  ): Result<Season, DomainError> {
    if (this.status !== SeasonStatus.HISTORICAL_REVISED) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.OPERATION_NOT_ALLOWED,
          `Retificações históricas de etapas exigem que a temporada esteja no estado HISTORICAL_REVISED (status atual: "${this.status}").`
        )
      );
    }

    if (!auditNote || typeof auditNote !== 'string' || auditNote.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'A nota de auditoria é obrigatória para retificar dados históricos de uma etapa.'
        )
      );
    }

    const targetIndex = this.grandPrixList.findIndex(gp => gp.roundNumber === roundNumber);
    if (targetIndex === -1) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.ENTITY_NOT_FOUND,
          `Nenhuma etapa agendada com o número de rodada ${roundNumber} foi encontrada na temporada ${this.year}.`
        )
      );
    }

    const targetGp = this.grandPrixList[targetIndex];
    const newStartDate = patch.startDate ? new Date(patch.startDate.getTime()) : targetGp.startDate;
    const newEndDate = patch.endDate ? new Date(patch.endDate.getTime()) : targetGp.endDate;

    if (newStartDate && isNaN(newStartDate.getTime())) {
      return Result.fail(new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'A data de início fornecida é inválida.'));
    }
    if (newEndDate && isNaN(newEndDate.getTime())) {
      return Result.fail(new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'A data de término fornecida é inválida.'));
    }
    if (newStartDate && newEndDate && newEndDate.getTime() < newStartDate.getTime()) {
      return Result.fail(new DomainError(DomainErrorCode.INVARIANT_VIOLATION, 'Data de término anterior à de início.'));
    }

    const updatedGp: ScheduledGrandPrix = {
      ...targetGp,
      name: patch.name?.trim() || targetGp.name,
      startDate: newStartDate,
      endDate: newEndDate,
      cancellationReason: patch.cancellationReason?.trim() || targetGp.cancellationReason
    };

    const updatedList = [...this.grandPrixList];
    updatedList[targetIndex] = cloneAndFreezeScheduledGrandPrix(updatedGp);

    const updatedSeason = new Season({
      id: this.id,
      year: this.year,
      status: this.status,
      rulesetId: this.rulesetId,
      description: `${this.description ?? ''} [RETIFICAÇÃO R${roundNumber}: ${auditNote.trim()}]`.trim(),
      grandPrixList: updatedList
    });

    return Result.ok(updatedSeason);
  }
}

/**
 * Operação: createSeason
 *
 * Objetivo:
 * Criar uma nova temporada oficial validando o ano de competição.
 */
export function createSeason(props: CreateSeasonProps): Result<Season, DomainError> {
  return Season.create(props);
}

/**
 * Operação: scheduleGrandPrix
 *
 * Objetivo:
 * Adicionar ou agendar um Grande Prêmio no calendário oficial da temporada.
 */
export function scheduleGrandPrix(season: Season, grandPrix: ScheduledGrandPrix): Result<Season, DomainError> {
  return season.scheduleGrandPrix(grandPrix);
}

/**
 * Operação: cancelGrandPrix
 *
 * Objetivo:
 * Cancelar pontualmente um Grande Prêmio agendado preservando seu roundNumber no histórico.
 */
export function cancelGrandPrix(season: Season, roundNumber: number, reason?: string): Result<Season, DomainError> {
  return season.cancelGrandPrix(roundNumber, reason);
}

/**
 * Operação: rescheduleGrandPrix
 *
 * Objetivo:
 * Reagendar as datas de uma etapa mantendo a rodada oficial.
 */
export function rescheduleGrandPrix(
  season: Season,
  roundNumber: number,
  newDates: { startDate?: Date; endDate?: Date }
): Result<Season, DomainError> {
  return season.rescheduleGrandPrix(roundNumber, newDates);
}

/**
 * Operação: completeGrandPrix
 *
 * Objetivo:
 * Marcar uma etapa como concluída no calendário oficial.
 */
export function completeGrandPrix(season: Season, roundNumber: number): Result<Season, DomainError> {
  return season.completeGrandPrix(roundNumber);
}

/**
 * Operação: startSeason
 *
 * Objetivo:
 * Transicionar o status da temporada de PLANNED para IN_PROGRESS ao iniciar
 * o primeiro evento competitivo do ano, validando a sequencialidade de rodadas.
 */
export function startSeason(season: Season): Result<Season, DomainError> {
  return season.startSeason();
}

/**
 * Operação: concludeSeason
 *
 * Objetivo:
 * Encerrar oficialmente a temporada após a resolução de todos os Grandes Prêmios agendados.
 */
export function concludeSeason(season: Season): Result<Season, DomainError> {
  return season.concludeSeason();
}

/**
 * Operação: cancelSeason
 *
 * Objetivo:
 * Cancelar uma temporada em estado PLANNED que não chegou a ser disputada.
 */
export function cancelSeason(season: Season, reason?: string): Result<Season, DomainError> {
  return season.cancelSeason(reason);
}

/**
 * Operação: reviseHistorically
 *
 * Objetivo:
 * Autorizar revisão histórica supervisionada em temporada concluída.
 */
export function reviseHistorically(season: Season, auditNote: string): Result<Season, DomainError> {
  return season.reviseHistorically(auditNote);
}
