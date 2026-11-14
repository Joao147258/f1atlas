/**
 * ============================================================================
 * F1Atlas — Camada Domain | Championships: DriverStandings
 * ============================================================================
 *
 * NÍVEL 1 — ESPECIFICAÇÃO ARQUITETURAL DO COMPONENTE
 *
 * Identificação:
 * - Componente: DriverStandings (Classificação do Campeonato de Pilotos)
 * - Módulo: championships
 * - Papel Arquitetural: Projeção de Domínio Imutável (Read-Model Snapshot)
 * - Referência Normativa DDS: docs/domain/championships.md
 * - Invariantes Vinculadas: INV-CH-01, INV-CH-02, INV-CH-03, INV-CH-05
 *
 * Responsabilidade de Domínio:
 * - Representa a fotografia oficial, preliminar ou simulada da tabela do Campeonato
 *   Mundial de Pilotos da Fórmula 1 (WDC) acumulada até determinada etapa (roundNumber).
 * - Modela as entradas imutáveis de classificação individual por piloto:
 *   - rank: Posição sequencial rigorosa (1..N).
 *   - driverId: Identificador do piloto (os pontos pertencem à pessoa do piloto).
 *   - constructorId: Construtor mais recente associado ao piloto.
 *   - points: Pontos acumulados na temporada (>= 0).
 *   - wins: Total de vitórias em Grandes Prêmios.
 *   - podiums: Total de chegadas no pódio (top 3 em Grand Prix).
 *   - gpFinishes: Histórico completo de colocações em Grandes Prêmios para desempate.
 *   - sprintFinishes: Histórico de colocações em Sprints.
 *   - rankChange: Variação de colocação em relação à etapa anterior (positive = ganho de posições).
 *
 * Relacionamentos e Fronteiras:
 * - Vinculado a uma Season através de `seasonId: EntityId<'season'>`.
 * - Gerado de forma puramente determinística pelo serviço `StandingsCalculator`.
 * - Totalmente livre de dependências de infraestrutura, ORMs ou transporte HTTP.
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';

/**
 * Estados do ciclo de vida e homologação de uma classificação do campeonato.
 */
export const StandingStatus = {
  OFFICIAL: 'OFFICIAL',
  PROVISIONAL: 'PROVISIONAL',
  SIMULATED: 'SIMULATED'
} as const;

export type StandingStatus = (typeof StandingStatus)[keyof typeof StandingStatus];

/**
 * Entrada individual de classificação de um piloto na tabela.
 */
export interface DriverStandingEntry {
  readonly rank: number;
  readonly driverId: EntityId<'driver'>;
  readonly constructorId: EntityId<'constructor'>;
  readonly points: number;
  readonly wins: number;
  readonly podiums: number;
  readonly gpFinishes: readonly number[];
  readonly sprintFinishes: readonly number[];
  readonly rankChange: number;
}

/**
 * Propriedades para instanciação de DriverStandings.
 */
export interface CreateDriverStandingsProps {
  readonly id: EntityId<'driver-standings'>;
  readonly seasonId: EntityId<'season'>;
  readonly roundNumber: number;
  readonly status: StandingStatus;
  readonly entries: readonly DriverStandingEntry[];
  readonly updatedAt?: Date;
}

/**
 * Projeção de Domínio Imutável representando a tabela do WDC em uma etapa específica.
 */
export class DriverStandings {
  readonly id: EntityId<'driver-standings'>;
  readonly seasonId: EntityId<'season'>;
  readonly roundNumber: number;
  readonly status: StandingStatus;
  readonly entries: readonly DriverStandingEntry[];
  readonly updatedAt: Date;

  private constructor(props: CreateDriverStandingsProps) {
    this.id = props.id;
    this.seasonId = props.seasonId;
    this.roundNumber = props.roundNumber;
    this.status = props.status;
    this.entries = Object.freeze(
      props.entries.map(e =>
        Object.freeze({
          ...e,
          gpFinishes: Object.freeze([...e.gpFinishes]),
          sprintFinishes: Object.freeze([...e.sprintFinishes])
        })
      )
    );
    this.updatedAt = props.updatedAt ? new Date(props.updatedAt.getTime()) : new Date();

    Object.freeze(this);
  }

  /**
   * Factory method para validação e criação controlada de DriverStandings.
   */
  public static create(props: CreateDriverStandingsProps): Result<DriverStandings, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Propriedades de DriverStandings não podem ser nulas.')
      );
    }

    if (!props.id || typeof props.id.value !== 'string') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Identificador de DriverStandings ausente ou inválido.')
      );
    }

    if (!props.seasonId || typeof props.seasonId.value !== 'string') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Identificador de Season ausente ou inválido.')
      );
    }

    if (typeof props.roundNumber !== 'number' || !Number.isInteger(props.roundNumber) || props.roundNumber < 0) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVARIANT_VIOLATION, 'roundNumber deve ser um inteiro >= 0.')
      );
    }

    if (!props.status || !Object.values(StandingStatus).includes(props.status)) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Status de classificação inválido.')
      );
    }

    if (!Array.isArray(props.entries)) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'entries deve ser um array de DriverStandingEntry.')
      );
    }

    // Validação de unicidade e sequencialidade de posições
    const driverIdsSet = new Set<string>();

    for (let i = 0; i < props.entries.length; i++) {
      const entry = props.entries[i];
      const expectedRank = i + 1;

      if (!entry.driverId || typeof entry.driverId.value !== 'string') {
        return Result.fail(
          new DomainError(DomainErrorCode.INVALID_ARGUMENT, `driverId inválido na entrada de índice ${i}.`)
        );
      }

      if (driverIdsSet.has(entry.driverId.value)) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `Piloto duplicado detectado na tabela: ${entry.driverId.value} (INV-CH-02).`
          )
        );
      }
      driverIdsSet.add(entry.driverId.value);

      // INV-CH-01: Sequencialidade de posições (1..N)
      if (entry.rank !== expectedRank) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `Sequencialidade de posições violada: esperava rank ${expectedRank}, mas obteve ${entry.rank} (INV-CH-01).`
          )
        );
      }

      if (typeof entry.points !== 'number' || isNaN(entry.points) || entry.points < 0) {
        return Result.fail(
          new DomainError(DomainErrorCode.INVARIANT_VIOLATION, `Pontuação inválida para piloto ${entry.driverId.value}.`)
        );
      }

      // INV-CH-03: Monotonia não-crescente de pontuação
      if (i > 0 && entry.points > props.entries[i - 1].points) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `Ordenação por pontos violada: rank ${entry.rank} (${entry.points} pts) possui mais pontos que rank ${props.entries[i - 1].rank} (${props.entries[i - 1].points} pts) (INV-CH-03).`
          )
        );
      }
    }

    return Result.ok(new DriverStandings(props));
  }

  /**
   * Consulta a entrada de classificação de um piloto específico.
   */
  public getEntry(driverId: EntityId<'driver'>): DriverStandingEntry | null {
    if (!driverId) {
      return null;
    }
    const found = this.entries.find(e => e.driverId.equals(driverId));
    return found ?? null;
  }

  /**
   * Retorna a entrada do líder do campeonato (P1).
   */
  public getLeader(): DriverStandingEntry | null {
    return this.entries.length > 0 ? this.entries[0] : null;
  }

  /**
   * Calcula a diferença de pontos de um piloto em relação ao líder do campeonato.
   *
   * @param driverId Identificador do piloto.
   * @returns Diferença numérica de pontos (0 se for o líder, ou null se não constar).
   */
  public getPointsGapToLeader(driverId: EntityId<'driver'>): number | null {
    const leader = this.getLeader();
    const entry = this.getEntry(driverId);

    if (!leader || !entry) {
      return null;
    }

    return leader.points - entry.points;
  }
}
