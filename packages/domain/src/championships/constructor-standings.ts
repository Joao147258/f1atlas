/**
 * ============================================================================
 * F1Atlas — Camada Domain | Championships: ConstructorStandings
 * ============================================================================
 *
 * NÍVEL 1 — ESPECIFICAÇÃO ARQUITETURAL DO COMPONENTE
 *
 * Identificação:
 * - Componente: ConstructorStandings (Classificação do Campeonato de Construtores)
 * - Módulo: championships
 * - Papel Arquitetural: Projeção de Domínio Imutável (Read-Model Snapshot)
 * - Referência Normativa DDS: docs/domain/championships.md
 * - Invariantes Vinculadas: INV-CH-01, INV-CH-02, INV-CH-03, INV-CH-04, INV-CH-05
 *
 * Responsabilidade de Domínio:
 * - Representa a fotografia oficial, preliminar ou simulada da tabela do Campeonato
 *   Mundial de Construtores da Fórmula 1 (WCC) acumulada até determinada etapa (roundNumber).
 * - Modela as entradas imutáveis de classificação consolidada por equipe:
 *   - rank: Posição sequencial rigorosa (1..N).
 *   - constructorId: Identificador único do construtor/equipe.
 *   - points: Pontos acumulados na temporada (soma dos carros válidos da equipe).
 *   - wins: Total de vitórias conquistadas pela equipe em Grandes Prêmios.
 *   - podiums: Total de pódios alcançados pelos carros da equipe em Grandes Prêmios.
 *   - gpFinishes: Matriz de colocações individuais dos carros para countback da FIA.
 *   - sprintFinishes: Colocações individuais dos carros em Corridas Sprint.
 *   - rankChange: Variação de colocação em relação à etapa anterior.
 *
 * Relacionamentos e Fronteiras:
 * - Vinculado a uma Season através de `seasonId: EntityId<'season'>`.
 * - Gerado deterministicamente pelo serviço `StandingsCalculator`.
 * - Totalmente livre de dependências de infraestrutura, ORMs ou transporte HTTP.
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';
import { StandingStatus } from './driver-standings.ts';

/**
 * Entrada individual de classificação de um construtor na tabela.
 */
export interface ConstructorStandingEntry {
  readonly rank: number;
  readonly constructorId: EntityId<'constructor'>;
  readonly points: number;
  readonly wins: number;
  readonly podiums: number;
  readonly gpFinishes: readonly number[];
  readonly sprintFinishes: readonly number[];
  readonly rankChange: number;
}

/**
 * Propriedades para instanciação de ConstructorStandings.
 */
export interface CreateConstructorStandingsProps {
  readonly id: EntityId<'constructor-standings'>;
  readonly seasonId: EntityId<'season'>;
  readonly roundNumber: number;
  readonly status: StandingStatus;
  readonly entries: readonly ConstructorStandingEntry[];
  readonly updatedAt?: Date;
}

/**
 * Projeção de Domínio Imutável representando a tabela do WCC em uma etapa específica.
 */
export class ConstructorStandings {
  readonly id: EntityId<'constructor-standings'>;
  readonly seasonId: EntityId<'season'>;
  readonly roundNumber: number;
  readonly status: StandingStatus;
  readonly entries: readonly ConstructorStandingEntry[];
  readonly updatedAt: Date;

  private constructor(props: CreateConstructorStandingsProps) {
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
   * Factory method para validação e criação controlada de ConstructorStandings.
   */
  public static create(props: CreateConstructorStandingsProps): Result<ConstructorStandings, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Propriedades de ConstructorStandings não podem ser nulas.')
      );
    }

    if (!props.id || typeof props.id.value !== 'string') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Identificador de ConstructorStandings ausente ou inválido.')
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
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'entries deve ser um array de ConstructorStandingEntry.')
      );
    }

    const constructorIdsSet = new Set<string>();

    for (let i = 0; i < props.entries.length; i++) {
      const entry = props.entries[i];
      const expectedRank = i + 1;

      if (!entry.constructorId || typeof entry.constructorId.value !== 'string') {
        return Result.fail(
          new DomainError(DomainErrorCode.INVALID_ARGUMENT, `constructorId inválido na entrada de índice ${i}.`)
        );
      }

      if (constructorIdsSet.has(entry.constructorId.value)) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `Construtor duplicado detectado na tabela: ${entry.constructorId.value} (INV-CH-02).`
          )
        );
      }
      constructorIdsSet.add(entry.constructorId.value);

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
          new DomainError(DomainErrorCode.INVARIANT_VIOLATION, `Pontuação inválida para construtor ${entry.constructorId.value}.`)
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

    return Result.ok(new ConstructorStandings(props));
  }

  /**
   * Consulta a entrada de classificação de um construtor específico.
   */
  public getEntry(constructorId: EntityId<'constructor'>): ConstructorStandingEntry | null {
    if (!constructorId) {
      return null;
    }
    const found = this.entries.find(e => e.constructorId.equals(constructorId));
    return found ?? null;
  }

  /**
   * Retorna a entrada do construtor líder do campeonato (P1).
   */
  public getLeader(): ConstructorStandingEntry | null {
    return this.entries.length > 0 ? this.entries[0] : null;
  }

  /**
   * Calcula a diferença de pontos de um construtor em relação ao líder da tabela.
   */
  public getPointsGapToLeader(constructorId: EntityId<'constructor'>): number | null {
    const leader = this.getLeader();
    const entry = this.getEntry(constructorId);

    if (!leader || !entry) {
      return null;
    }

    return leader.points - entry.points;
  }
}
