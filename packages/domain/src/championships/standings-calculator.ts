/**
 * ============================================================================
 * F1Atlas — Camada Domain | Championships: StandingsCalculator
 * ============================================================================
 *
 * NÍVEL 1 — ESPECIFICAÇÃO ARQUITETURAL DO COMPONENTE
 *
 * Identificação:
 * - Componente: StandingsCalculator (Calculadora de Classificação Geral)
 * - Módulo: championships
 * - Papel Arquitetural: Serviço de Domínio Puro (Domain Service)
 * - Referência Normativa DDS: docs/domain/championships.md
 * - Invariantes Vinculadas: INV-CH-01, INV-CH-02, INV-CH-03, INV-CH-04, INV-CH-05
 *
 * Responsabilidade de Domínio:
 * - Processa e orquestra o cálculo completo e determinístico das tabelas de classificação
 *   de Pilotos (DriverStandings) e Construtores (ConstructorStandings) acumuladas até
 *   determinada etapa da temporada (roundNumber).
 * - Orquestração funcional em 6 passos:
 *   1. Validação de integridade e isolamento de estado (OFFICIAL/REVISED vs SIMULATED).
 *   2. Aplicação de PointsCalculator para cada resultado de sessão (Grand Prix ou Sprint).
 *   3. Agregação de pontos acumulados, vitórias, pódios e histórico de posições por competidor.
 *   4. Aplicação rigorosa da TieBreakPolicy (FIA Artigo 7.2) para desempate de posições.
 *   5. Cálculo posicional comparativo (rankChange) em relação à rodada anterior.
 *   6. Instanciação de projeções de domínio imutáveis prontas para consulta.
 *
 * Regras Especiais de Negócio:
 * - Trocas de Equipe Intra-Temporada:
 *   - WDC: Pontos acumulam-se exclusivamente para a pessoa do piloto (driverId).
 *   - WCC: Pontos obtidos em cada corrida pertencem irrevogavelmente ao construtor
 *     (constructorId) do veículo utilizado naquela sessão específica.
 * - Isolamento Hermético de Simulações:
 *   - Resultados com status SIMULATED são terminantemente rejeitados em apurações oficiais.
 *   - Cálculos com isSimulation === true emitem tabelas com status SIMULATED.
 *
 * Relacionamentos e Fronteiras:
 * - Consome coleções de SessionResult e a configuração de ScoringRuleset.
 * - Aciona internamente PointsCalculator e TieBreakPolicy.
 * - Totalmente livre de I/O, banco de dados ou dependências de infraestrutura.
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';
import { SessionResult, ResultStatus, PublicationState } from '../events/session-result.ts';
import { ScoringRuleset, DistanceBracket } from '../scoring/scoring-ruleset.ts';
import { PointsCalculator } from '../scoring/points-calculator.ts';
import { TieBreakPolicy } from '../scoring/tie-break-policy.ts';
import { DriverStandings, StandingStatus } from './driver-standings.ts';
import type { DriverStandingEntry } from './driver-standings.ts';
import { ConstructorStandings } from './constructor-standings.ts';
import type { ConstructorStandingEntry } from './constructor-standings.ts';

/**
 * Pacote de sessão pontuável com seus resultados homologados.
 */
export interface ScoredSessionData {
  readonly roundNumber: number;
  readonly sessionType: 'RACE' | 'SPRINT';
  readonly results: readonly SessionResult[];
  readonly distanceBracket?: DistanceBracket;
}

/**
 * Parâmetros para apuração do Campeonato Mundial de Pilotos.
 */
export interface CalculateDriverStandingsProps {
  readonly seasonId: EntityId<'season'>;
  readonly roundNumber: number;
  readonly sessions: readonly ScoredSessionData[];
  readonly ruleset: ScoringRuleset;
  readonly previousStandings?: DriverStandings;
  readonly isSimulation?: boolean;
}

/**
 * Parâmetros para apuração do Campeonato Mundial de Construtores.
 */
export interface CalculateConstructorStandingsProps {
  readonly seasonId: EntityId<'season'>;
  readonly roundNumber: number;
  readonly sessions: readonly ScoredSessionData[];
  readonly ruleset: ScoringRuleset;
  readonly previousStandings?: ConstructorStandings;
  readonly isSimulation?: boolean;
}

/**
 * Serviço de Domínio Puro responsável pelo cálculo das classificações da Fórmula 1.
 */
export class StandingsCalculator {
  /**
   * Calcula a projeção imutável do Campeonato Mundial de Pilotos (WDC).
   */
  public static calculateDriverStandings(
    props: CalculateDriverStandingsProps
  ): Result<DriverStandings, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Parâmetros de cálculo não podem ser nulos.')
      );
    }

    if (!props.seasonId || typeof props.seasonId.value !== 'string') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Identificador de Season inválido.')
      );
    }

    if (typeof props.roundNumber !== 'number' || props.roundNumber < 0) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVARIANT_VIOLATION, 'roundNumber deve ser um inteiro >= 0.')
      );
    }

    if (!props.ruleset) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'ScoringRuleset ausente.')
      );
    }

    const isSimulation = props.isSimulation ?? false;
    const standingStatus: StandingStatus = isSimulation ? StandingStatus.SIMULATED : StandingStatus.OFFICIAL;

    // Estruturas de agregação por piloto
    interface DriverAccumulator {
      id: string;
      driverId: EntityId<'driver'>;
      constructorId: EntityId<'constructor'>;
      points: number;
      wins: number;
      podiums: number;
      gpFinishes: number[];
      sprintFinishes: number[];
    }

    const driversMap = new Map<string, DriverAccumulator>();

    // Ordena sessões por roundNumber para garantir rastreabilidade cronológica
    const sortedSessions = [...(props.sessions ?? [])].sort((a, b) => a.roundNumber - b.roundNumber);

    for (const sessionData of sortedSessions) {
      // Considera apenas sessões até o round especificado
      if (sessionData.roundNumber > props.roundNumber) {
        continue;
      }

      for (const res of sessionData.results) {
        // Blindagem contra dados de simulação em apuração oficial
        if (!isSimulation && res.publicationState === PublicationState.SIMULATED) {
          return Result.fail(
            new DomainError(
              DomainErrorCode.OPERATION_NOT_ALLOWED,
              `Resultado simulado detectado na apuração oficial do piloto ${res.driverId.value} (INV-CH-05).`
            )
          );
        }

        const driverKey = res.driverId.value;
        let acc = driversMap.get(driverKey);

        if (!acc) {
          acc = {
            id: driverKey,
            driverId: res.driverId,
            constructorId: res.constructorId,
            points: 0,
            wins: 0,
            podiums: 0,
            gpFinishes: [],
            sprintFinishes: []
          };
          driversMap.set(driverKey, acc);
        }

        // Atualiza a equipe para a mais recente do piloto
        acc.constructorId = res.constructorId;

        // Calcula pontos via PointsCalculator
        const breakdown = PointsCalculator.calculateSessionPoints(
          res,
          sessionData.sessionType,
          props.ruleset,
          sessionData.distanceBracket
        );

        acc.points += breakdown.totalPoints;

        // Atualiza estatísticas e matriz de posições para desempate
        if (sessionData.sessionType === 'RACE') {
          if (res.status !== ResultStatus.DSQ && res.position !== null && res.position >= 1) {
            acc.gpFinishes.push(res.position);

            if (res.position === 1) {
              acc.wins += 1;
            }
            if (res.position <= 3) {
              acc.podiums += 1;
            }
          }
        } else if (sessionData.sessionType === 'SPRINT') {
          if (res.status !== ResultStatus.DSQ && res.position !== null && res.position >= 1) {
            acc.sprintFinishes.push(res.position);
          }
        }
      }
    }

    // Ordenação com TieBreakPolicy
    const competitorsList = Array.from(driversMap.values());
    const orderedCompetitors = TieBreakPolicy.resolveStandingsOrder(
      competitorsList,
      props.ruleset.includeSprintInTieBreak
    );

    // Mapeamento das entradas finais com cálculo de rankChange
    const entries: DriverStandingEntry[] = orderedCompetitors.map((comp, idx) => {
      const currentRank = idx + 1;
      let rankChange = 0;

      if (props.previousStandings) {
        const prevEntry = props.previousStandings.getEntry(comp.driverId);
        if (prevEntry) {
          rankChange = prevEntry.rank - currentRank;
        }
      }

      return Object.freeze({
        rank: currentRank,
        driverId: comp.driverId,
        constructorId: comp.constructorId,
        points: comp.points,
        wins: comp.wins,
        podiums: comp.podiums,
        gpFinishes: Object.freeze([...comp.gpFinishes]),
        sprintFinishes: Object.freeze([...comp.sprintFinishes]),
        rankChange
      });
    });

    const standingId = EntityId.from<'driver-standings'>(
      `wdc-${props.seasonId.value}-r${props.roundNumber}${isSimulation ? '-sim' : ''}`
    );

    return DriverStandings.create({
      id: standingId,
      seasonId: props.seasonId,
      roundNumber: props.roundNumber,
      status: standingStatus,
      entries
    });
  }

  /**
   * Calcula a projeção imutável do Campeonato Mundial de Construtores (WCC).
   */
  public static calculateConstructorStandings(
    props: CalculateConstructorStandingsProps
  ): Result<ConstructorStandings, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Parâmetros de cálculo não podem ser nulos.')
      );
    }

    if (!props.seasonId || typeof props.seasonId.value !== 'string') {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Identificador de Season inválido.')
      );
    }

    if (typeof props.roundNumber !== 'number' || props.roundNumber < 0) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVARIANT_VIOLATION, 'roundNumber deve ser um inteiro >= 0.')
      );
    }

    if (!props.ruleset) {
      return Result.fail(
        new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'ScoringRuleset ausente.')
      );
    }

    const isSimulation = props.isSimulation ?? false;
    const standingStatus: StandingStatus = isSimulation ? StandingStatus.SIMULATED : StandingStatus.OFFICIAL;

    interface ConstructorAccumulator {
      id: string;
      constructorId: EntityId<'constructor'>;
      points: number;
      wins: number;
      podiums: number;
      gpFinishes: number[];
      sprintFinishes: number[];
    }

    const constructorsMap = new Map<string, ConstructorAccumulator>();
    const sortedSessions = [...(props.sessions ?? [])].sort((a, b) => a.roundNumber - b.roundNumber);

    for (const sessionData of sortedSessions) {
      if (sessionData.roundNumber > props.roundNumber) {
        continue;
      }

      for (const res of sessionData.results) {
        if (!isSimulation && res.publicationState === PublicationState.SIMULATED) {
          return Result.fail(
            new DomainError(
              DomainErrorCode.OPERATION_NOT_ALLOWED,
              `Resultado simulado detectado na apuração oficial do construtor ${res.constructorId.value} (INV-CH-05).`
            )
          );
        }

        const constructorKey = res.constructorId.value;
        let acc = constructorsMap.get(constructorKey);

        if (!acc) {
          acc = {
            id: constructorKey,
            constructorId: res.constructorId,
            points: 0,
            wins: 0,
            podiums: 0,
            gpFinishes: [],
            sprintFinishes: []
          };
          constructorsMap.set(constructorKey, acc);
        }

        const breakdown = PointsCalculator.calculateSessionPoints(
          res,
          sessionData.sessionType,
          props.ruleset,
          sessionData.distanceBracket
        );

        acc.points += breakdown.totalPoints;

        if (sessionData.sessionType === 'RACE') {
          if (res.status !== ResultStatus.DSQ && res.position !== null && res.position >= 1) {
            acc.gpFinishes.push(res.position);

            if (res.position === 1) {
              acc.wins += 1;
            }
            if (res.position <= 3) {
              acc.podiums += 1;
            }
          }
        } else if (sessionData.sessionType === 'SPRINT') {
          if (res.status !== ResultStatus.DSQ && res.position !== null && res.position >= 1) {
            acc.sprintFinishes.push(res.position);
          }
        }
      }
    }

    const competitorsList = Array.from(constructorsMap.values());
    const orderedCompetitors = TieBreakPolicy.resolveStandingsOrder(
      competitorsList,
      props.ruleset.includeSprintInTieBreak
    );

    const entries: ConstructorStandingEntry[] = orderedCompetitors.map((comp, idx) => {
      const currentRank = idx + 1;
      let rankChange = 0;

      if (props.previousStandings) {
        const prevEntry = props.previousStandings.getEntry(comp.constructorId);
        if (prevEntry) {
          rankChange = prevEntry.rank - currentRank;
        }
      }

      return Object.freeze({
        rank: currentRank,
        constructorId: comp.constructorId,
        points: comp.points,
        wins: comp.wins,
        podiums: comp.podiums,
        gpFinishes: Object.freeze([...comp.gpFinishes]),
        sprintFinishes: Object.freeze([...comp.sprintFinishes]),
        rankChange
      });
    });

    const standingId = EntityId.from<'constructor-standings'>(
      `wcc-${props.seasonId.value}-r${props.roundNumber}${isSimulation ? '-sim' : ''}`
    );

    return ConstructorStandings.create({
      id: standingId,
      seasonId: props.seasonId,
      roundNumber: props.roundNumber,
      status: standingStatus,
      entries
    });
  }
}
