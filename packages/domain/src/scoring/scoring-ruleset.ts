/**
 * ============================================================================
 * F1Atlas — Camada Domain | Scoring: ScoringRuleset
 * ============================================================================
 *
 * NÍVEL 1 — ESPECIFICAÇÃO ARQUITETURAL DO COMPONENTE
 *
 * Identificação:
 * - Componente: ScoringRuleset (Conjunto de Regras de Pontuação)
 * - Módulo: scoring
 * - Papel Arquitetural: Objeto de Valor / Entidade de Configuração Normativa
 * - Referência Normativa DDS: docs/domain/scoring.md
 * - Invariantes Vinculadas: INV-SC-01, INV-SC-02, INV-SC-03, INV-SC-05
 *
 * Responsabilidade de Domínio:
 * - Define a tabela normativa e as condições de pontuação aplicáveis a uma temporada
 *   específica da Fórmula 1 em estrita conformidade com os regulamentos esportivos da FIA:
 *   - Grand Prix regular (Artigo 6.4 da FIA): ex. [25, 18, 15, 12, 10, 8, 6, 4, 2, 1].
 *   - Sprint Race (Artigo 6.3 da FIA): ex. [8, 7, 6, 5, 4, 3, 2, 1].
 *   - Bonificação de volta mais rápida (Fastest Lap):
 *     - Histórico (2019-2024): 1 ponto para quem registrar a melhor volta terminando no top 10.
 *     - 2025 em diante: Abolição formal aprovada pelo WMSC da FIA em 17/10/2024 (0 pontos).
 *   - Escalas para corridas encurtadas ou suspensas (Artigo 6.5 da FIA pós-Spa 2021):
 *     - UNDER_2_LAPS: 0 pontos para todos.
 *     - LAP_2_TO_25_PCT: P1..P5 recebem [6, 4, 3, 2, 1].
 *     - PCT_25_TO_50: P1..P9 recebem [13, 10, 8, 6, 5, 4, 3, 2, 1].
 *     - PCT_50_TO_75: P1..P10 recebem [19, 14, 12, 10, 8, 6, 4, 3, 2, 1].
 *     - FULL_DISTANCE: Pontuação integral regular.
 *   - Política de desempate do campeonato:
 *     - Para 2025 (FIA Artigo 7.2), o desempate oficial (countback) utiliza exclusivamente
 *       resultados de Grand Prix (`includeSprintInTieBreak: false`).
 *
 * Relacionamentos e Fronteiras:
 * - Vinculado a uma Season através de `seasonId: EntityId<'season'>` ou identificador de era.
 * - Consumido por `PointsCalculator` e `StandingsCalculator`.
 * - Não processa resultados brutos de pista nem gera classificações finais.
 * - Totalmente livre de dependências de infraestrutura, ORMs ou transporte HTTP.
 *
 * Invariantes do Domínio:
 * - [INV-SC-01]: Todas as pontuações são finitas e estritamente não-negativas (points >= 0).
 * - [INV-SC-02]: A tabela de pontuação é monotonicamente não-crescente (P_i >= P_{i+1}).
 * - [INV-SC-03]: Posições consultadas devem ser inteiros positivos >= 1.
 * - Instância congelada via `Object.freeze` assegurando imutabilidade absoluta.
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';

/**
 * Faixas de distância percorrida para corridas suspensas (Artigo 6.5 da FIA).
 */
export const DistanceBracket = {
  UNDER_2_LAPS: 'UNDER_2_LAPS',
  LAP_2_TO_25_PCT: 'LAP_2_TO_25_PCT',
  PCT_25_TO_50: 'PCT_25_TO_50',
  PCT_50_TO_75: 'PCT_50_TO_75',
  FULL_DISTANCE: 'FULL_DISTANCE'
} as const;

export type DistanceBracket = (typeof DistanceBracket)[keyof typeof DistanceBracket];

/**
 * Tabelas de pontuação reduzida por faixa de distância programada.
 */
export interface ReducedDistanceTables {
  readonly [DistanceBracket.UNDER_2_LAPS]: readonly number[];
  readonly [DistanceBracket.LAP_2_TO_25_PCT]: readonly number[];
  readonly [DistanceBracket.PCT_25_TO_50]: readonly number[];
  readonly [DistanceBracket.PCT_50_TO_75]: readonly number[];
}

/**
 * Propriedades para criação de uma instância de ScoringRuleset.
 */
export interface CreateScoringRulesetProps {
  readonly id: EntityId<'scoring-ruleset'>;
  readonly seasonId: EntityId<'season'>;
  readonly racePoints: readonly number[];
  readonly sprintPoints?: readonly number[];
  readonly fastestLapBonusPoints: number;
  readonly fastestLapRequiresTop10: boolean;
  readonly includeSprintInTieBreak?: boolean;
  readonly reducedDistanceTables?: ReducedDistanceTables;
}

/**
 * Objeto de Valor / Entidade de Configuração representando as regras de pontuação de uma temporada.
 */
export class ScoringRuleset {
  readonly id: EntityId<'scoring-ruleset'>;
  readonly seasonId: EntityId<'season'>;
  readonly racePoints: readonly number[];
  readonly sprintPoints: readonly number[];
  readonly fastestLapBonusPoints: number;
  readonly fastestLapRequiresTop10: boolean;
  readonly includeSprintInTieBreak: boolean;
  readonly reducedDistanceTables: ReducedDistanceTables;

  private constructor(props: CreateScoringRulesetProps) {
    this.id = props.id;
    this.seasonId = props.seasonId;
    this.racePoints = Object.freeze([...props.racePoints]);
    this.sprintPoints = Object.freeze([...(props.sprintPoints ?? [])]);
    this.fastestLapBonusPoints = props.fastestLapBonusPoints;
    this.fastestLapRequiresTop10 = props.fastestLapRequiresTop10;
    this.includeSprintInTieBreak = props.includeSprintInTieBreak ?? false;

    const defaultReducedTables: ReducedDistanceTables = {
      [DistanceBracket.UNDER_2_LAPS]: Object.freeze([]),
      [DistanceBracket.LAP_2_TO_25_PCT]: Object.freeze([6, 4, 3, 2, 1]),
      [DistanceBracket.PCT_25_TO_50]: Object.freeze([13, 10, 8, 6, 5, 4, 3, 2, 1]),
      [DistanceBracket.PCT_50_TO_75]: Object.freeze([19, 14, 12, 10, 8, 6, 4, 3, 2, 1])
    };

    if (props.reducedDistanceTables) {
      this.reducedDistanceTables = Object.freeze({
        [DistanceBracket.UNDER_2_LAPS]: Object.freeze([
          ...(props.reducedDistanceTables[DistanceBracket.UNDER_2_LAPS] ?? [])
        ]),
        [DistanceBracket.LAP_2_TO_25_PCT]: Object.freeze([
          ...(props.reducedDistanceTables[DistanceBracket.LAP_2_TO_25_PCT] ?? defaultReducedTables[DistanceBracket.LAP_2_TO_25_PCT])
        ]),
        [DistanceBracket.PCT_25_TO_50]: Object.freeze([
          ...(props.reducedDistanceTables[DistanceBracket.PCT_25_TO_50] ?? defaultReducedTables[DistanceBracket.PCT_25_TO_50])
        ]),
        [DistanceBracket.PCT_50_TO_75]: Object.freeze([
          ...(props.reducedDistanceTables[DistanceBracket.PCT_50_TO_75] ?? defaultReducedTables[DistanceBracket.PCT_50_TO_75])
        ])
      });
    } else {
      this.reducedDistanceTables = Object.freeze(defaultReducedTables);
    }

    Object.freeze(this);
  }

  /**
   * Factory method para validação e criação controlada de um ScoringRuleset.
   *
   * @param props Propriedades do conjunto de regras.
   * @returns Result contendo ScoringRuleset imutável ou DomainError.
   */
  public static create(props: CreateScoringRulesetProps): Result<ScoringRuleset, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Propriedades de ScoringRuleset não podem ser nulas.')
      );
    }

    if (!props.id || typeof props.id.value !== 'string') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Identificador de ScoringRuleset ausente ou inválido.')
      );
    }

    if (!props.seasonId || typeof props.seasonId.value !== 'string') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Identificador de Season ausente ou inválido.')
      );
    }

    if (!Array.isArray(props.racePoints) || props.racePoints.length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          'A tabela de pontos para Grand Prix (racePoints) não pode ser vazia.'
        )
      );
    }

    const raceValidation = ScoringRuleset.validatePointsArray(props.racePoints, 'racePoints');
    if (raceValidation.isFailure) {
      return Result.fail(raceValidation.getError());
    }

    if (props.sprintPoints !== undefined) {
      if (!Array.isArray(props.sprintPoints)) {
        return Result.fail(
          new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'sprintPoints deve ser um array numérico.')
        );
      }
      const sprintValidation = ScoringRuleset.validatePointsArray(props.sprintPoints, 'sprintPoints');
      if (sprintValidation.isFailure) {
        return Result.fail(sprintValidation.getError());
      }
    }

    if (
      typeof props.fastestLapBonusPoints !== 'number' ||
      isNaN(props.fastestLapBonusPoints) ||
      !Number.isFinite(props.fastestLapBonusPoints) ||
      props.fastestLapBonusPoints < 0
    ) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          'fastestLapBonusPoints deve ser um número finito >= 0 (INV-SC-01).'
        )
      );
    }

    if (typeof props.fastestLapRequiresTop10 !== 'boolean') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'fastestLapRequiresTop10 deve ser um booleano.')
      );
    }

    if (props.reducedDistanceTables) {
      const reducedKeys: (keyof ReducedDistanceTables)[] = [
        DistanceBracket.UNDER_2_LAPS,
        DistanceBracket.LAP_2_TO_25_PCT,
        DistanceBracket.PCT_25_TO_50,
        DistanceBracket.PCT_50_TO_75
      ];

      for (const key of reducedKeys) {
        const table = props.reducedDistanceTables[key];
        if (table !== undefined) {
          if (!Array.isArray(table)) {
            return Result.fail(
              new DomainError(DomainErrorCode.INVALID_ARGUMENT, `Tabela reduzida ${key} deve ser um array numérico.`)
            );
          }
          const tableVal = ScoringRuleset.validatePointsArray(table, `reducedDistanceTables.${key}`);
          if (tableVal.isFailure) {
            return Result.fail(tableVal.getError());
          }
        }
      }
    }

    return Result.ok(new ScoringRuleset(props));
  }

  /**
   * Factory canônica para a temporada de 2025 da Fórmula 1.
   * - Grand Prix: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
   * - Sprint: [8, 7, 6, 5, 4, 3, 2, 1]
   * - Volta mais rápida: 0 pontos (Abolida pelo WMSC em 17/10/2024)
   * - Countback 2025 (FIA Artigo 7.2): apenas Grandes Prêmios (includeSprintInTieBreak = false)
   */
  public static create2025Ruleset(
    id = EntityId.from<'scoring-ruleset'>('ruleset-2025'),
    seasonId = EntityId.from<'season'>('season-2025')
  ): Result<ScoringRuleset, DomainError> {
    return ScoringRuleset.create({
      id,
      seasonId,
      racePoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
      sprintPoints: [8, 7, 6, 5, 4, 3, 2, 1],
      fastestLapBonusPoints: 0,
      fastestLapRequiresTop10: false,
      includeSprintInTieBreak: false
    });
  }

  /**
   * Factory canônica para a temporada de 2024 da Fórmula 1 (referência histórica).
   * - Grand Prix: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
   * - Sprint: [8, 7, 6, 5, 4, 3, 2, 1]
   * - Volta mais rápida: 1 ponto sob a condição de terminar no top 10
   */
  public static create2024Ruleset(
    id = EntityId.from<'scoring-ruleset'>('ruleset-2024'),
    seasonId = EntityId.from<'season'>('season-2024')
  ): Result<ScoringRuleset, DomainError> {
    return ScoringRuleset.create({
      id,
      seasonId,
      racePoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
      sprintPoints: [8, 7, 6, 5, 4, 3, 2, 1],
      fastestLapBonusPoints: 1,
      fastestLapRequiresTop10: true,
      includeSprintInTieBreak: false
    });
  }

  /**
   * Consulta os pontos oficiais atribuíveis a uma posição para um tipo de sessão e faixa de distância.
   *
   * @param sessionType Tipo regulamentar de sessão ('RACE' ou 'SPRINT').
   * @param position Posição de chegada homologada (inteiro >= 1).
   * @param distanceBracket Faixa de distância homologada (padrão: FULL_DISTANCE).
   * @returns Quantidade numérica de pontos obtidos (0 se fora da zona pontuável).
   */
  public getPointsForPosition(
    sessionType: 'RACE' | 'SPRINT',
    position: number,
    distanceBracket: DistanceBracket = DistanceBracket.FULL_DISTANCE
  ): number {
    if (typeof position !== 'number' || !Number.isInteger(position) || position < 1) {
      return 0;
    }

    if (sessionType === 'SPRINT') {
      const idx = position - 1;
      return idx < this.sprintPoints.length ? this.sprintPoints[idx] : 0;
    }

    if (distanceBracket === DistanceBracket.FULL_DISTANCE) {
      const idx = position - 1;
      return idx < this.racePoints.length ? this.racePoints[idx] : 0;
    }

    const reducedTable = this.reducedDistanceTables[distanceBracket];
    if (!reducedTable || reducedTable.length === 0) {
      return 0;
    }

    const idx = position - 1;
    return idx < reducedTable.length ? reducedTable[idx] : 0;
  }

  /**
   * Valida se um array numérico atende às invariantes de não-negatividade e ordenação não-crescente.
   */
  private static validatePointsArray(points: readonly number[], fieldName: string): Result<void, DomainError> {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (typeof p !== 'number' || isNaN(p) || !Number.isFinite(p) || p < 0) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `O valor de pontuação no índice ${i} de ${fieldName} deve ser um número finito >= 0 (INV-SC-01).`
          )
        );
      }

      if (i > 0 && p > points[i - 1]) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVARIANT_VIOLATION,
            `A tabela ${fieldName} viola a ordem não-crescente: posição ${i + 1} (${p}) é maior que posição ${i} (${points[i - 1]}) (INV-SC-02).`
          )
        );
      }
    }

    return Result.ok();
  }
}
