import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { TieBreakPolicy, TieBreakCriterion } from '../../src/scoring/tie-break-policy.ts';
import type { TieBreakCompetitor } from '../../src/scoring/tie-break-policy.ts';

describe('TieBreakPolicy — Sistema Oficial de Countback da FIA (Artigo 7.2)', () => {
  test('deve resolver desempate preliminar por maior número de pontos acumulados', () => {
    const compA: TieBreakCompetitor = { id: 'norris', points: 350, gpFinishes: [1, 1, 2] };
    const compB: TieBreakCompetitor = { id: 'verstappen', points: 345, gpFinishes: [1, 1, 1] };

    const res = TieBreakPolicy.compare(compA, compB);
    assert.equal(res.isTie, false);
    assert.equal(res.winnerId, 'norris');
    assert.equal(res.loserId, 'verstappen');
    assert.equal(res.decisiveCriterion, TieBreakCriterion.POINTS);
  });

  test('deve desempatar por maior número de vitórias (1º lugares) em Grandes Prêmios com pontos iguais', () => {
    const compA: TieBreakCompetitor = { id: 'verstappen', points: 300, gpFinishes: [1, 1, 1, 2] }; // 3 vitórias
    const compB: TieBreakCompetitor = { id: 'norris', points: 300, gpFinishes: [1, 1, 2, 2] }; // 2 vitórias

    const res = TieBreakPolicy.compare(compA, compB);
    assert.equal(res.isTie, false);
    assert.equal(res.winnerId, 'verstappen');
    assert.equal(res.loserId, 'norris');
    assert.equal(res.decisiveCriterion, TieBreakCriterion.GP_POSITIONS);
    assert.equal(res.decisivePosition, 1);
    assert.equal(res.winnerCount, 3);
    assert.equal(res.loserCount, 2);
    assert.match(res.explanation, /maior número de 1º lugares/);
  });

  test('deve desempatar por posições subsequentes (segundos lugares) quando vitórias forem iguais', () => {
    const compA: TieBreakCompetitor = { id: 'leclerc', points: 250, gpFinishes: [1, 2, 2, 3] }; // 1 vitória, 2x P2
    const compB: TieBreakCompetitor = { id: 'piastri', points: 250, gpFinishes: [1, 2, 3, 3] }; // 1 vitória, 1x P2

    const res = TieBreakPolicy.compare(compA, compB);
    assert.equal(res.isTie, false);
    assert.equal(res.winnerId, 'leclerc');
    assert.equal(res.decisiveCriterion, TieBreakCriterion.GP_POSITIONS);
    assert.equal(res.decisivePosition, 2);
    assert.equal(res.winnerCount, 2);
    assert.equal(res.loserCount, 1);
  });

  test('Countback 2025: NÃO deve utilizar posições de Sprint por padrão (FIA 2025 Artigo 7.2)', () => {
    // Ambos com histórico idêntico de GP, mas compB venceu 1 Sprint
    const compA: TieBreakCompetitor = {
      id: 'driverA',
      points: 200,
      gpFinishes: [1, 2, 3],
      sprintFinishes: [2]
    };
    const compB: TieBreakCompetitor = {
      id: 'driverB',
      points: 200,
      gpFinishes: [1, 2, 3],
      sprintFinishes: [1]
    };

    // Sem includeSprintResults (padrão 2025 da FIA)
    const res = TieBreakPolicy.compare(compA, compB, false);
    assert.equal(res.isTie, true);
    assert.equal(res.decisiveCriterion, TieBreakCriterion.UNRESOLVED);
    assert.match(res.explanation, /Empate absoluto/);
  });

  test('deve desempatar por posições de Sprint quando explicitamente habilitado', () => {
    const compA: TieBreakCompetitor = {
      id: 'driverA',
      points: 200,
      gpFinishes: [1, 2, 3],
      sprintFinishes: [2]
    };
    const compB: TieBreakCompetitor = {
      id: 'driverB',
      points: 200,
      gpFinishes: [1, 2, 3],
      sprintFinishes: [1] // 1 vitória em Sprint
    };

    const res = TieBreakPolicy.compare(compA, compB, true);
    assert.equal(res.isTie, false);
    assert.equal(res.winnerId, 'driverB');
    assert.equal(res.decisiveCriterion, TieBreakCriterion.SPRINT_POSITIONS);
    assert.equal(res.decisivePosition, 1);
  });

  test('deve emitir UNRESOLVED para empate absoluto em todas as posições avaliadas', () => {
    const compA: TieBreakCompetitor = { id: 'driverA', points: 100, gpFinishes: [1, 2, 3] };
    const compB: TieBreakCompetitor = { id: 'driverB', points: 100, gpFinishes: [1, 2, 3] };

    const res = TieBreakPolicy.compare(compA, compB);
    assert.equal(res.isTie, true);
    assert.equal(res.winnerId, null);
    assert.equal(res.decisiveCriterion, TieBreakCriterion.UNRESOLVED);
  });
});

describe('TieBreakPolicy — Propriedades Matemáticas do Comparator (Reflexividade, Antissimetria, Transitividade)', () => {
  const compA: TieBreakCompetitor = { id: 'A', points: 100, gpFinishes: [1, 2] };
  const compB: TieBreakCompetitor = { id: 'B', points: 100, gpFinishes: [1, 3] };
  const compC: TieBreakCompetitor = { id: 'C', points: 90, gpFinishes: [1, 1] };

  test('Reflexividade: compA comparado com compA deve retornar 0', () => {
    assert.equal(TieBreakPolicy.comparator(compA, compA), 0);
  });

  test('Antissimetria: sign(compare(A, B)) === -sign(compare(B, A))', () => {
    const diffAB = TieBreakPolicy.comparator(compA, compB);
    const diffBA = TieBreakPolicy.comparator(compB, compA);

    assert.equal(Math.sign(diffAB), -Math.sign(diffBA));
    assert.equal(diffAB < 0, true); // A vem na frente de B
  });

  test('Transitividade: se A supera B e B supera C, então A supera C', () => {
    const diffAB = TieBreakPolicy.comparator(compA, compB);
    const diffBC = TieBreakPolicy.comparator(compB, compC);
    const diffAC = TieBreakPolicy.comparator(compA, compC);

    assert.equal(diffAB < 0, true); // A > B
    assert.equal(diffBC < 0, true); // B > C
    assert.equal(diffAC < 0, true); // A > C
  });

  test('resolveStandingsOrder: deve ordenar coleção completa preservando a precedência esportiva', () => {
    const list: TieBreakCompetitor[] = [
      { id: '3rd', points: 50, gpFinishes: [5] },
      { id: '1st', points: 100, gpFinishes: [1, 2] },
      { id: '2nd', points: 100, gpFinishes: [1, 3] },
      { id: '4th', points: 30, gpFinishes: [10] }
    ];

    const ordered = TieBreakPolicy.resolveStandingsOrder(list);
    assert.deepEqual(
      ordered.map(c => c.id),
      ['1st', '2nd', '3rd', '4th']
    );
  });

  test('resolveStandingsOrder: deve lidar com listas vazias ou com apenas 1 competidor de forma segura', () => {
    assert.deepEqual(TieBreakPolicy.resolveStandingsOrder([]), []);
    const single: TieBreakCompetitor[] = [{ id: 'solo', points: 25, gpFinishes: [1] }];
    assert.deepEqual(TieBreakPolicy.resolveStandingsOrder(single), single);
    // @ts-expect-error teste de runtime defensivo
    assert.deepEqual(TieBreakPolicy.resolveStandingsOrder(null), []);
  });

  test('buildPositionCounts: deve lidar com array nulo ou posições inválidas', () => {
    // @ts-expect-error teste defensivo
    const countsNull = TieBreakPolicy.buildPositionCounts(null);
    assert.equal(countsNull.size, 0);

    const countsInvalid = TieBreakPolicy.buildPositionCounts([0, -1, 1.5, NaN]);
    assert.equal(countsInvalid.size, 0);
  });

  test('comparator: deve considerar sprintDiff quando includeSprintResults for true e pontuação/GP forem iguais', () => {
    const compA: TieBreakCompetitor = { id: 'A', points: 100, gpFinishes: [1, 2], sprintFinishes: [1] };
    const compB: TieBreakCompetitor = { id: 'B', points: 100, gpFinishes: [1, 2], sprintFinishes: [2] };

    const diff = TieBreakPolicy.comparator(compA, compB, true);
    assert.equal(diff < 0, true); // A vem na frente

    // Empate absoluto também nos sprints com includeSprintResults
    const compEqualSprintA: TieBreakCompetitor = { id: 'A', points: 100, gpFinishes: [1], sprintFinishes: [1] };
    const compEqualSprintB: TieBreakCompetitor = { id: 'B', points: 100, gpFinishes: [1], sprintFinishes: [1] };
    assert.equal(TieBreakPolicy.comparator(compEqualSprintA, compEqualSprintB, true), 0);
    assert.equal(TieBreakPolicy.compare(compEqualSprintA, compEqualSprintB, true).isTie, true);

    // includeSprintResults true mas ambos sem sprintFinishes
    const compNoSprintA: TieBreakCompetitor = { id: 'A', points: 100, gpFinishes: [1] };
    const compNoSprintB: TieBreakCompetitor = { id: 'B', points: 100, gpFinishes: [1] };
    assert.equal(TieBreakPolicy.compare(compNoSprintA, compNoSprintB, true).isTie, true);
  });
});
