/**
 * ============================================================================
 * F1Atlas — Camada Domain | Scoring: TieBreakPolicy
 * ============================================================================
 *
 * NÍVEL 1 — ESPECIFICAÇÃO ARQUITETURAL DO COMPONENTE
 *
 * Identificação:
 * - Componente: TieBreakPolicy (Política de Desempate de Classificação)
 * - Módulo: scoring
 * - Papel Arquitetural: Serviço de Domínio / Política de Regulamento
 * - Referência Normativa DDS: docs/domain/scoring.md
 * - Referência Regulamentar FIA: Sporting Regulations (Artigo 7.2 de 2025 / Artigo 7.1 histórico)
 *
 * Responsabilidade de Domínio:
 * - Implementa a regra oficial de desempate da FIA (Countback System) para ordenar
 *   pilotos e construtores que possuam a mesma pontuação acumulada no campeonato mundial.
 * - Procedimento algorítmico esportivo determinístico:
 *   1. Maior número de vitórias (1º lugar / P1) em Grandes Prêmios.
 *   2. Se o empate persistir, maior número de 2º lugares (P2) em Grandes Prêmios.
 *   3. Persistindo, compara sucessivamente P3, P4, P5... até a pior colocação homologada.
 *   4. Avaliação opcional de posições de Sprint: apenas se configurado pelo regulamento
 *      da temporada (`includeSprintResults: true`). Para a temporada 2025, o Artigo 7.2
 *      da FIA NÃO prevê desempate por Sprint (padrão: false).
 *   5. Se o empate persistir em todas as posições avaliadas, a política marca o resultado
 *      como UNRESOLVED (conforme Artigo 7.2, que determina decisão residual discricionária da FIA).
 *
 * Relacionamentos e Fronteiras:
 * - Utilizado por StandingsCalculator para ordenar DriverStandings e ConstructorStandings.
 * - Consome arrays de posições de chegada homologadas em Grandes Prêmios e Sprints.
 * - Emite contratos enriquecidos de auditoria (TieBreakResult) para fundamentar a narrativa.
 * ============================================================================
 */

/**
 * Critério que definiu a resolução do desempate.
 */
export const TieBreakCriterion = {
  POINTS: 'POINTS',
  GP_POSITIONS: 'GP_POSITIONS',
  SPRINT_POSITIONS: 'SPRINT_POSITIONS',
  UNRESOLVED: 'UNRESOLVED'
} as const;

export type TieBreakCriterion = (typeof TieBreakCriterion)[keyof typeof TieBreakCriterion];

/**
 * Contrato estruturado de auditoria detalhando o resultado de uma comparação de desempate.
 */
export interface TieBreakResult {
  readonly isTie: boolean;
  readonly winnerId: string | null;
  readonly loserId: string | null;
  readonly decisiveCriterion: TieBreakCriterion;
  readonly decisivePosition: number | null;
  readonly winnerCount: number | null;
  readonly loserCount: number | null;
  readonly explanation: string;
}

/**
 * Interface genérica para competidores elegíveis a desempate.
 */
export interface TieBreakCompetitor {
  readonly id: string;
  readonly points: number;
  readonly gpFinishes: readonly number[];
  readonly sprintFinishes?: readonly number[];
}

/**
 * Serviço de Domínio responsável pela aplicação do sistema oficial de countback da FIA.
 */
export class TieBreakPolicy {
  /**
   * Compara detalhadamente dois competidores e emite um TieBreakResult auditável.
   *
   * @param compA Primeiro competidor.
   * @param compB Segundo competidor.
   * @param includeSprintResults Se posições de Sprint devem ser avaliadas (padrão: false para 2025).
   * @returns Instância de TieBreakResult com justificativa compreensível.
   */
  public static compare(
    compA: TieBreakCompetitor,
    compB: TieBreakCompetitor,
    includeSprintResults = false
  ): TieBreakResult {
    // 1. Comparação de pontos
    if (compA.points !== compB.points) {
      const winner = compA.points > compB.points ? compA : compB;
      const loser = compA.points > compB.points ? compB : compA;
      return Object.freeze({
        isTie: false,
        winnerId: winner.id,
        loserId: loser.id,
        decisiveCriterion: TieBreakCriterion.POINTS,
        decisivePosition: null,
        winnerCount: winner.points,
        loserCount: loser.points,
        explanation: `${winner.id} supera ${loser.id} por maior pontuação (${winner.points} vs ${loser.points}).`
      });
    }

    // 2. Comparação por posições de Grand Prix (Countback Art. 7.2 FIA)
    const gpResult = TieBreakPolicy.compareFinishesByPosition(
      compA.id,
      compA.gpFinishes,
      compB.id,
      compB.gpFinishes,
      'Grand Prix',
      TieBreakCriterion.GP_POSITIONS
    );

    if (gpResult !== null) {
      return gpResult;
    }

    // 3. Comparação opcional por posições de Sprint (se previsto no regulamento)
    if (includeSprintResults && (compA.sprintFinishes || compB.sprintFinishes)) {
      const sprintResult = TieBreakPolicy.compareFinishesByPosition(
        compA.id,
        compA.sprintFinishes ?? [],
        compB.id,
        compB.sprintFinishes ?? [],
        'Sprint',
        TieBreakCriterion.SPRINT_POSITIONS
      );

      if (sprintResult !== null) {
        return sprintResult;
      }
    }

    // 4. Empate absoluto não resolvível pelas regras numéricas (FIA Artigo 7.2)
    return Object.freeze({
      isTie: true,
      winnerId: null,
      loserId: null,
      decisiveCriterion: TieBreakCriterion.UNRESOLVED,
      decisivePosition: null,
      winnerCount: null,
      loserCount: null,
      explanation: `Empate absoluto entre ${compA.id} e ${compB.id} em todos os critérios esportivos objetivos (FIA Artigo 7.2).`
    });
  }

  /**
   * Função pura de comparação para uso em sort() com contratos estritos de ordenação:
   * Retorna número negativo se A tem precedência sobre B (A fica na frente),
   * número positivo se B tem precedência sobre A (B fica na frente),
   * ou 0 se rigorosamente empatados.
   */
  public static comparator(
    compA: TieBreakCompetitor,
    compB: TieBreakCompetitor,
    includeSprintResults = false
  ): number {
    if (compA.points !== compB.points) {
      return compB.points - compA.points;
    }

    const gpDiff = TieBreakPolicy.countbackDiff(compA.gpFinishes, compB.gpFinishes);
    if (gpDiff !== 0) {
      return gpDiff;
    }

    if (includeSprintResults) {
      const sprintDiff = TieBreakPolicy.countbackDiff(compA.sprintFinishes ?? [], compB.sprintFinishes ?? []);
      if (sprintDiff !== 0) {
        return sprintDiff;
      }
    }

    return 0;
  }

  /**
   * Ordena deterministicamente uma coleção de competidores de acordo com as regras de pontuação e countback.
   */
  public static resolveStandingsOrder<T extends TieBreakCompetitor>(
    competitors: readonly T[],
    includeSprintResults = false
  ): readonly T[] {
    if (!Array.isArray(competitors)) {
      return Object.freeze([]);
    }
    if (competitors.length <= 1) {
      return Object.freeze([...competitors]);
    }

    const copy = [...competitors];
    copy.sort((a, b) => TieBreakPolicy.comparator(a, b, includeSprintResults));
    return Object.freeze(copy);
  }

  /**
   * Compara matriz de posições de chegada posição a posição (1º, 2º, 3º...) retornando TieBreakResult se houver vencedor.
   */
  private static compareFinishesByPosition(
    idA: string,
    finishesA: readonly number[],
    idB: string,
    finishesB: readonly number[],
    sessionLabel: string,
    criterion: TieBreakCriterion
  ): TieBreakResult | null {
    const countsA = TieBreakPolicy.buildPositionCounts(finishesA);
    const countsB = TieBreakPolicy.buildPositionCounts(finishesB);

    const maxPos = Math.max(
      ...Array.from(countsA.keys()),
      ...Array.from(countsB.keys()),
      0
    );

    for (let pos = 1; pos <= maxPos; pos++) {
      const countA = countsA.get(pos) ?? 0;
      const countB = countsB.get(pos) ?? 0;

      if (countA !== countB) {
        const winnerId = countA > countB ? idA : idB;
        const loserId = countA > countB ? idB : idA;
        const winnerCount = Math.max(countA, countB);
        const loserCount = Math.min(countA, countB);

        return Object.freeze({
          isTie: false,
          winnerId,
          loserId,
          decisiveCriterion: criterion,
          decisivePosition: pos,
          winnerCount,
          loserCount,
          explanation: `${winnerId} supera ${loserId} em ${sessionLabel} por maior número de ${pos}º lugares (${winnerCount} vs ${loserCount}).`
        });
      }
    }

    return null;
  }

  /**
   * Calcula a diferença numérica para sort: número negativo se A tem mais posições melhores.
   */
  private static countbackDiff(finishesA: readonly number[], finishesB: readonly number[]): number {
    const countsA = TieBreakPolicy.buildPositionCounts(finishesA);
    const countsB = TieBreakPolicy.buildPositionCounts(finishesB);

    const maxPos = Math.max(
      ...Array.from(countsA.keys()),
      ...Array.from(countsB.keys()),
      0
    );

    for (let pos = 1; pos <= maxPos; pos++) {
      const countA = countsA.get(pos) ?? 0;
      const countB = countsB.get(pos) ?? 0;

      if (countA !== countB) {
        return countB - countA; // Se A tem mais, countB - countA < 0 (A vem primeiro)
      }
    }

    return 0;
  }

  /**
   * Agrupa e conta a frequência de cada posição válida de chegada (inteiro >= 1).
   */
  public static buildPositionCounts(finishes: readonly number[]): Map<number, number> {
    const counts = new Map<number, number>();
    if (!Array.isArray(finishes)) {
      return counts;
    }

    for (const pos of finishes) {
      if (typeof pos === 'number' && Number.isInteger(pos) && pos >= 1) {
        counts.set(pos, (counts.get(pos) ?? 0) + 1);
      }
    }

    return counts;
  }
}
