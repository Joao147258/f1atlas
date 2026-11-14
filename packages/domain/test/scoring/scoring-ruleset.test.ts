import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { ScoringRuleset, DistanceBracket } from '../../src/scoring/scoring-ruleset.ts';

describe('ScoringRuleset — Criação e Invariantes Normativas (INV-SC-01 e INV-SC-02)', () => {
  test('deve instanciar o ruleset canônico de 2025 com abolição do ponto de volta mais rápida', () => {
    const rulesetRes = ScoringRuleset.create2025Ruleset();
    assert.equal(rulesetRes.isSuccess, true);

    const ruleset = rulesetRes.getValue();
    assert.equal(ruleset.fastestLapBonusPoints, 0);
    assert.equal(ruleset.fastestLapRequiresTop10, false);
    assert.equal(ruleset.includeSprintInTieBreak, false);
    assert.equal(ruleset.racePoints.length, 10);
    assert.deepEqual([...ruleset.racePoints], [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
    assert.deepEqual([...ruleset.sprintPoints], [8, 7, 6, 5, 4, 3, 2, 1]);
    assert.equal(Object.isFrozen(ruleset), true);
    assert.equal(Object.isFrozen(ruleset.racePoints), true);
  });

  test('deve instanciar o ruleset histórico de 2024 com 1 ponto de volta mais rápida para top 10', () => {
    const rulesetRes = ScoringRuleset.create2024Ruleset();
    assert.equal(rulesetRes.isSuccess, true);

    const ruleset = rulesetRes.getValue();
    assert.equal(ruleset.fastestLapBonusPoints, 1);
    assert.equal(ruleset.fastestLapRequiresTop10, true);
    assert.deepEqual([...ruleset.racePoints], [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
  });

  test('deve rejeitar propriedades nulas ou indefinidas', () => {
    // @ts-expect-error teste de robustez em runtime
    const res = ScoringRuleset.create(null);
    assert.equal(res.isFailure, true);
  });

  test('deve rejeitar identificadores ausentes', () => {
    const res = ScoringRuleset.create({
      // @ts-expect-error teste de runtime
      id: null,
      seasonId: EntityId.from<'season'>('s2025'),
      racePoints: [25, 18],
      fastestLapBonusPoints: 0,
      fastestLapRequiresTop10: false
    });
    assert.equal(res.isFailure, true);
  });

  test('deve rejeitar tabela de corrida (racePoints) vazia ou não array', () => {
    const resEmpty = ScoringRuleset.create({
      id: EntityId.from<'scoring-ruleset'>('sr-1'),
      seasonId: EntityId.from<'season'>('s2025'),
      racePoints: [],
      fastestLapBonusPoints: 0,
      fastestLapRequiresTop10: false
    });
    assert.equal(resEmpty.isFailure, true);

    const resNotArray = ScoringRuleset.create({
      id: EntityId.from<'scoring-ruleset'>('sr-1'),
      seasonId: EntityId.from<'season'>('s2025'),
      // @ts-expect-error teste de runtime
      racePoints: 'invalid',
      fastestLapBonusPoints: 0,
      fastestLapRequiresTop10: false
    });
    assert.equal(resNotArray.isFailure, true);
  });

  test('INV-SC-01: deve rejeitar valores negativos em tabelas de pontos', () => {
    const res = ScoringRuleset.create({
      id: EntityId.from<'scoring-ruleset'>('sr-1'),
      seasonId: EntityId.from<'season'>('s2025'),
      racePoints: [25, -1, 10],
      fastestLapBonusPoints: 0,
      fastestLapRequiresTop10: false
    });
    assert.equal(res.isFailure, true);
    assert.match(res.getError().message, /INV-SC-01/);
  });

  test('INV-SC-02: deve rejeitar violação da ordem não-crescente (posição inferior com mais pontos)', () => {
    const res = ScoringRuleset.create({
      id: EntityId.from<'scoring-ruleset'>('sr-1'),
      seasonId: EntityId.from<'season'>('s2025'),
      racePoints: [25, 18, 20], // P3 (20) > P2 (18)
      fastestLapBonusPoints: 0,
      fastestLapRequiresTop10: false
    });
    assert.equal(res.isFailure, true);
    assert.match(res.getError().message, /INV-SC-02/);
  });

  test('INV-SC-01: deve rejeitar fastestLapBonusPoints negativo ou NaN', () => {
    const res = ScoringRuleset.create({
      id: EntityId.from<'scoring-ruleset'>('sr-1'),
      seasonId: EntityId.from<'season'>('s2025'),
      racePoints: [25, 18],
      fastestLapBonusPoints: -1,
      fastestLapRequiresTop10: false
    });
    assert.equal(res.isFailure, true);
    assert.match(res.getError().message, /INV-SC-01/);
  });

  test('deve validar seasonId ausente ou inválido', () => {
    const res = ScoringRuleset.create({
      id: EntityId.from<'scoring-ruleset'>('sr-1'),
      // @ts-expect-error teste de runtime
      seasonId: null,
      racePoints: [25, 18],
      fastestLapBonusPoints: 0,
      fastestLapRequiresTop10: false
    });
    assert.equal(res.isFailure, true);
  });

  test('deve validar sprintPoints inválido', () => {
    const res = ScoringRuleset.create({
      id: EntityId.from<'scoring-ruleset'>('sr-1'),
      seasonId: EntityId.from<'season'>('s2025'),
      racePoints: [25, 18],
      // @ts-expect-error teste de runtime
      sprintPoints: 'invalid',
      fastestLapBonusPoints: 0,
      fastestLapRequiresTop10: false
    });
    assert.equal(res.isFailure, true);
  });

  test('deve validar fastestLapRequiresTop10 não booleano', () => {
    const res = ScoringRuleset.create({
      id: EntityId.from<'scoring-ruleset'>('sr-1'),
      seasonId: EntityId.from<'season'>('s2025'),
      racePoints: [25, 18],
      fastestLapBonusPoints: 0,
      // @ts-expect-error teste de runtime
      fastestLapRequiresTop10: 'not-bool'
    });
    assert.equal(res.isFailure, true);
  });

  test('deve aceitar e validar reducedDistanceTables customizado válido', () => {
    const customTables = {
      [DistanceBracket.UNDER_2_LAPS]: [0],
      [DistanceBracket.LAP_2_TO_25_PCT]: [5, 3, 1],
      [DistanceBracket.PCT_25_TO_50]: [10, 6, 4],
      [DistanceBracket.PCT_50_TO_75]: [15, 10, 5]
    };

    const res = ScoringRuleset.create({
      id: EntityId.from<'scoring-ruleset'>('sr-custom'),
      seasonId: EntityId.from<'season'>('s2025'),
      racePoints: [25, 18],
      fastestLapBonusPoints: 0,
      fastestLapRequiresTop10: false,
      reducedDistanceTables: customTables
    });

    assert.equal(res.isSuccess, true);
    assert.equal(res.getValue().getPointsForPosition('RACE', 1, DistanceBracket.PCT_25_TO_50), 10);
  });

  test('deve rejeitar reducedDistanceTables com formato inválido ou valores negativos', () => {
    const resNotArray = ScoringRuleset.create({
      id: EntityId.from<'scoring-ruleset'>('sr-invalid'),
      seasonId: EntityId.from<'season'>('s2025'),
      racePoints: [25, 18],
      fastestLapBonusPoints: 0,
      fastestLapRequiresTop10: false,
      reducedDistanceTables: {
        // @ts-expect-error teste de runtime
        [DistanceBracket.LAP_2_TO_25_PCT]: 'invalid-table'
      }
    });
    assert.equal(resNotArray.isFailure, true);

    const resNegative = ScoringRuleset.create({
      id: EntityId.from<'scoring-ruleset'>('sr-invalid-2'),
      seasonId: EntityId.from<'season'>('s2025'),
      racePoints: [25, 18],
      fastestLapBonusPoints: 0,
      fastestLapRequiresTop10: false,
      reducedDistanceTables: {
        [DistanceBracket.UNDER_2_LAPS]: [],
        [DistanceBracket.LAP_2_TO_25_PCT]: [5, -2, 1],
        [DistanceBracket.PCT_25_TO_50]: [10],
        [DistanceBracket.PCT_50_TO_75]: [15]
      }
    });
    assert.equal(resNegative.isFailure, true);
  });
});

describe('ScoringRuleset — Consulta de Pontos e Faixas de Distância (FIA Art. 6.4 e 6.5)', () => {
  const ruleset = ScoringRuleset.create2025Ruleset().getValue();

  test('deve retornar pontuações de Grand Prix para posições regulares de 1 a 10', () => {
    assert.equal(ruleset.getPointsForPosition('RACE', 1), 25);
    assert.equal(ruleset.getPointsForPosition('RACE', 2), 18);
    assert.equal(ruleset.getPointsForPosition('RACE', 3), 15);
    assert.equal(ruleset.getPointsForPosition('RACE', 4), 12);
    assert.equal(ruleset.getPointsForPosition('RACE', 5), 10);
    assert.equal(ruleset.getPointsForPosition('RACE', 6), 8);
    assert.equal(ruleset.getPointsForPosition('RACE', 7), 6);
    assert.equal(ruleset.getPointsForPosition('RACE', 8), 4);
    assert.equal(ruleset.getPointsForPosition('RACE', 9), 2);
    assert.equal(ruleset.getPointsForPosition('RACE', 10), 1);
  });

  test('deve retornar 0 pontos para posições fora da zona pontuável (11º em diante)', () => {
    assert.equal(ruleset.getPointsForPosition('RACE', 11), 0);
    assert.equal(ruleset.getPointsForPosition('RACE', 20), 0);
  });

  test('deve retornar 0 pontos para posições inválidas (<= 0 ou não inteiras)', () => {
    assert.equal(ruleset.getPointsForPosition('RACE', 0), 0);
    assert.equal(ruleset.getPointsForPosition('RACE', -5), 0);
    assert.equal(ruleset.getPointsForPosition('RACE', 1.5), 0);
  });

  test('deve retornar pontuações de Sprint para posições de 1 a 8', () => {
    assert.equal(ruleset.getPointsForPosition('SPRINT', 1), 8);
    assert.equal(ruleset.getPointsForPosition('SPRINT', 8), 1);
    assert.equal(ruleset.getPointsForPosition('SPRINT', 9), 0);
  });

  test('deve aplicar as escalas de pontos reduzidos do Artigo 6.5 da FIA', () => {
    // UNDER_2_LAPS: 0 pontos para todos
    assert.equal(ruleset.getPointsForPosition('RACE', 1, DistanceBracket.UNDER_2_LAPS), 0);

    // LAP_2_TO_25_PCT: P1..P5 [6, 4, 3, 2, 1]
    assert.equal(ruleset.getPointsForPosition('RACE', 1, DistanceBracket.LAP_2_TO_25_PCT), 6);
    assert.equal(ruleset.getPointsForPosition('RACE', 5, DistanceBracket.LAP_2_TO_25_PCT), 1);
    assert.equal(ruleset.getPointsForPosition('RACE', 6, DistanceBracket.LAP_2_TO_25_PCT), 0);

    // PCT_25_TO_50: P1..P9 [13, 10, 8, 6, 5, 4, 3, 2, 1]
    assert.equal(ruleset.getPointsForPosition('RACE', 1, DistanceBracket.PCT_25_TO_50), 13);
    assert.equal(ruleset.getPointsForPosition('RACE', 9, DistanceBracket.PCT_25_TO_50), 1);
    assert.equal(ruleset.getPointsForPosition('RACE', 10, DistanceBracket.PCT_25_TO_50), 0);

    // PCT_50_TO_75: P1..P10 [19, 14, 12, 10, 8, 6, 4, 3, 2, 1]
    assert.equal(ruleset.getPointsForPosition('RACE', 1, DistanceBracket.PCT_50_TO_75), 19);
    assert.equal(ruleset.getPointsForPosition('RACE', 10, DistanceBracket.PCT_50_TO_75), 1);
    assert.equal(ruleset.getPointsForPosition('RACE', 11, DistanceBracket.PCT_50_TO_75), 0);
  });
});
