/**
 * ============================================================================
 * F1Atlas — Camada Domain | Scoring: PointsCalculator
 * ============================================================================
 *
 * NÍVEL 1 — ESPECIFICAÇÃO ARQUITETURAL DO COMPONENTE
 *
 * Identificação:
 * - Componente: PointsCalculator (Calculadora de Pontos)
 * - Módulo: scoring
 * - Papel Arquitetural: Serviço de Domínio Puro (Domain Service)
 * - Referência Normativa DDS: docs/domain/scoring.md
 * - Invariantes Vinculadas: INV-SC-01, INV-SC-03, INV-SC-04, INV-SC-05
 *
 * Responsabilidade de Domínio:
 * - Executa o cálculo determinístico e sem efeitos colaterais de pontuação obtida
 *   por pilotos e construtores em uma sessão de corrida ou sprint, combinando o
 *   SessionResult de cada participante com o ScoringRuleset da temporada.
 * - Avalia as condições regulamentares específicas de elegibilidade esportiva (FIA Artigo 62.1):
 *   - Status FINISHED: Piloto que cruzou a linha de chegada; pontua conforme sua posição.
 *   - Status DNF Classificado: Piloto que completou >= 90% das voltas do vencedor (posição homologada
 *     não nula no SessionResult); se terminar no top 10, pontua regularmente.
 *   - Status DNF Não Classificado / NC / DNS: 0 pontos.
 *   - Status DSQ (Desclassificado): Anulação absoluta de pontos e bonificações (0 pontos).
 * - Bonificação de volta mais rápida (Fastest Lap):
 *   - Outorgada apenas em sessões RACE quando fastestLapRank === 1 e prevista no ruleset.
 *   - Se o ruleset exigir top 10, o piloto deve possuir posição classificada <= 10.
 * - Agregação de Construtores:
 *   - Soma dos pontos individuais de todos os carros homologados inscritos sob a equipe na prova.
 *
 * Relacionamentos e Fronteiras:
 * - Recebe instâncias imutáveis de SessionResult e ScoringRuleset.
 * - Consumido por StandingsCalculator para consolidar tabelas de pilotos e construtores.
 * - Não altera ordens de pista, penalidades ou tempos (escopo do módulo events).
 * - Totalmente isolado de banco de dados, relógio de sistema ou transporte de rede.
 * ============================================================================
 */

import { SessionResult, ResultStatus } from '../events/session-result.ts';
import { ScoringRuleset, DistanceBracket } from './scoring-ruleset.ts';

/**
 * Detalhamento discriminado da pontuação apurada para um competidor.
 */
export interface SessionPointsBreakdown {
  readonly totalPoints: number;
  readonly positionPoints: number;
  readonly fastestLapPoints: number;
}

/**
 * Serviço de Domínio Puro responsável pelo cálculo determinístico de pontos da Fórmula 1.
 */
export class PointsCalculator {
  /**
   * Consulta direta da pontuação correspondente a uma posição de chegada.
   */
  public static getPointsForPosition(
    ruleset: ScoringRuleset,
    sessionType: 'RACE' | 'SPRINT',
    position: number,
    distanceBracket: DistanceBracket = DistanceBracket.FULL_DISTANCE
  ): number {
    return ruleset.getPointsForPosition(sessionType, position, distanceBracket);
  }

  /**
   * Calcula a pontuação individual de um piloto para uma sessão específica.
   *
   * @param result Resultado apurado do competidor na sessão.
   * @param sessionType Tipo de sessão ('RACE' ou 'SPRINT').
   * @param ruleset Conjunto de regras de pontuação aplicável à temporada.
   * @param distanceBracket Faixa de distância homologada (padrão: FULL_DISTANCE).
   * @returns Objeto com a discriminação exata dos pontos por posição, bônus e total.
   */
  public static calculateSessionPoints(
    result: SessionResult,
    sessionType: 'RACE' | 'SPRINT',
    ruleset: ScoringRuleset,
    distanceBracket: DistanceBracket = DistanceBracket.FULL_DISTANCE
  ): SessionPointsBreakdown {
    // DSQ, DNS ou NC conferem rigorosamente 0 pontos absolutos (INV-SC-04)
    if (
      result.status === ResultStatus.DSQ ||
      result.status === ResultStatus.DNS ||
      result.status === ResultStatus.NC ||
      result.position === null ||
      result.position < 1
    ) {
      return Object.freeze({
        totalPoints: 0,
        positionPoints: 0,
        fastestLapPoints: 0
      });
    }

    // Calcula os pontos base da posição
    const positionPoints = ruleset.getPointsForPosition(sessionType, result.position, distanceBracket);

    // Avalia bonificação por volta mais rápida
    let fastestLapPoints = 0;
    if (
      sessionType === 'RACE' &&
      result.fastestLapRank === 1 &&
      ruleset.fastestLapBonusPoints > 0
    ) {
      const isTop10Eligible = !ruleset.fastestLapRequiresTop10 || result.position <= 10;
      if (isTop10Eligible) {
        fastestLapPoints = ruleset.fastestLapBonusPoints;
      }
    }

    const totalPoints = positionPoints + fastestLapPoints;

    return Object.freeze({
      totalPoints,
      positionPoints,
      fastestLapPoints
    });
  }

  /**
   * Calcula a pontuação acumulada obtida por um construtor a partir dos resultados de seus carros na sessão.
   *
   * @param resultsForConstructor Lista de resultados dos carros inscritos pela equipe na prova.
   * @param sessionType Tipo de sessão ('RACE' ou 'SPRINT').
   * @param ruleset Conjunto de regras de pontuação aplicável.
   * @param distanceBracket Faixa de distância homologada (padrão: FULL_DISTANCE).
   * @returns Soma aritmética total de pontos atribuídos ao construtor na sessão.
   */
  public static calculateConstructorPoints(
    resultsForConstructor: readonly SessionResult[],
    sessionType: 'RACE' | 'SPRINT',
    ruleset: ScoringRuleset,
    distanceBracket: DistanceBracket = DistanceBracket.FULL_DISTANCE
  ): number {
    if (!Array.isArray(resultsForConstructor) || resultsForConstructor.length === 0) {
      return 0;
    }

    let totalConstructorPoints = 0;

    for (const res of resultsForConstructor) {
      const breakdown = PointsCalculator.calculateSessionPoints(res, sessionType, ruleset, distanceBracket);
      totalConstructorPoints += breakdown.totalPoints;
    }

    return totalConstructorPoints;
  }
}
