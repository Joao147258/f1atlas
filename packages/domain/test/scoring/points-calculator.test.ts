import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { SessionResult, ResultStatus, PublicationState } from '../../src/events/session-result.ts';
import { ScoringRuleset, DistanceBracket } from '../../src/scoring/scoring-ruleset.ts';
import { PointsCalculator } from '../../src/scoring/points-calculator.ts';

function createMockResult(props: {
  id?: string;
  driverId?: string;
  constructorId?: string;
  position?: number | null;
  lapsCompleted?: number;
  status?: ResultStatus;
  fastestLapRank?: number | null;
}): SessionResult {
  const res = SessionResult.create({
    id: EntityId.from<'session-result'>(props.id ?? 'res-1'),
    sessionId: EntityId.from<'session'>('ses-1'),
    driverId: EntityId.from<'driver'>(props.driverId ?? 'drv-1'),
    teamId: EntityId.from<'team'>('tea-1'),
    constructorId: EntityId.from<'constructor'>(props.constructorId ?? 'con-1'),
    position: props.position !== undefined ? props.position : 1,
    lapsCompleted: props.lapsCompleted ?? 70,
    status: props.status ?? ResultStatus.FINISHED,
    fastestLapRank: props.fastestLapRank ?? null,
    publicationState: PublicationState.OFFICIAL
  });

  return res.getValue();
}

describe('PointsCalculator — Apuração Individual de Sessões', () => {
  const ruleset2025 = ScoringRuleset.create2025Ruleset().getValue();
  const ruleset2024 = ScoringRuleset.create2024Ruleset().getValue();

  test('deve chamar getPointsForPosition como método utilitário estático', () => {
    assert.equal(PointsCalculator.getPointsForPosition(ruleset2025, 'RACE', 1), 25);
    assert.equal(PointsCalculator.getPointsForPosition(ruleset2025, 'SPRINT', 1), 8);
  });

  test('deve calcular corretamente os pontos para o vencedor (P1) em Grand Prix regular de 2025 (25 pontos)', () => {
    const result = createMockResult({ position: 1 });
    const breakdown = PointsCalculator.calculateSessionPoints(result, 'RACE', ruleset2025);

    assert.equal(breakdown.totalPoints, 25);
    assert.equal(breakdown.positionPoints, 25);
    assert.equal(breakdown.fastestLapPoints, 0);
  });

  test('deve confirmar que volta mais rápida em 2025 não confere pontos de bonificação (0 pts)', () => {
    const result = createMockResult({ position: 1, fastestLapRank: 1 });
    const breakdown = PointsCalculator.calculateSessionPoints(result, 'RACE', ruleset2025);

    assert.equal(breakdown.totalPoints, 25);
    assert.equal(breakdown.positionPoints, 25);
    assert.equal(breakdown.fastestLapPoints, 0);
  });

  test('deve conceder 1 ponto de volta mais rápida em 2024 para piloto classificado no top 10', () => {
    const resultTop10 = createMockResult({ position: 4, fastestLapRank: 1 });
    const breakdownTop10 = PointsCalculator.calculateSessionPoints(resultTop10, 'RACE', ruleset2024);

    assert.equal(breakdownTop10.totalPoints, 13); // 12 + 1
    assert.equal(breakdownTop10.positionPoints, 12);
    assert.equal(breakdownTop10.fastestLapPoints, 1);
  });

  test('não deve conceder ponto de volta mais rápida em 2024 se piloto terminar fora do top 10', () => {
    const resultOutside = createMockResult({ position: 11, fastestLapRank: 1 });
    const breakdownOutside = PointsCalculator.calculateSessionPoints(resultOutside, 'RACE', ruleset2024);

    assert.equal(breakdownOutside.totalPoints, 0);
    assert.equal(breakdownOutside.positionPoints, 0);
    assert.equal(breakdownOutside.fastestLapPoints, 0);
  });

  test('INV-SC-04: piloto desclassificado (DSQ) recebe rigorosamente 0 pontos mesmo se mantiver position numérica', () => {
    const resultDsq = createMockResult({
      position: null,
      status: ResultStatus.DSQ,
      fastestLapRank: 1
    });

    const breakdown = PointsCalculator.calculateSessionPoints(resultDsq, 'RACE', ruleset2024);
    assert.equal(breakdown.totalPoints, 0);
    assert.equal(breakdown.positionPoints, 0);
    assert.equal(breakdown.fastestLapPoints, 0);

    // Teste de mutação: objeto com status DSQ forçado com position: 1 não pode pontuar
    const forcedDsqWithPos = Object.assign(Object.create(Object.getPrototypeOf(resultDsq)), resultDsq, {
      status: ResultStatus.DSQ,
      position: 1,
      fastestLapRank: 1
    });
    const forcedBreakdown = PointsCalculator.calculateSessionPoints(forcedDsqWithPos, 'RACE', ruleset2024);
    assert.equal(forcedBreakdown.totalPoints, 0);
    assert.equal(forcedBreakdown.positionPoints, 0);
  });

  test('piloto DNF classificado com >= 90% das voltas pontua conforme sua colocação homologada', () => {
    // Piloto abandonou mas completou 65/70 voltas e foi homologado em P9
    const resultDnfClassified = createMockResult({
      position: 9,
      lapsCompleted: 65,
      status: ResultStatus.DNF
    });

    const breakdown = PointsCalculator.calculateSessionPoints(resultDnfClassified, 'RACE', ruleset2025);
    assert.equal(breakdown.totalPoints, 2);
    assert.equal(breakdown.positionPoints, 2);
  });

  test('piloto com status NC ou DNS recebe 0 pontos', () => {
    const resultNc = createMockResult({
      position: null,
      status: ResultStatus.NC
    });
    const resultDns = createMockResult({
      position: null,
      status: ResultStatus.DNS,
      lapsCompleted: 0
    });

    assert.equal(PointsCalculator.calculateSessionPoints(resultNc, 'RACE', ruleset2025).totalPoints, 0);
    assert.equal(PointsCalculator.calculateSessionPoints(resultDns, 'RACE', ruleset2025).totalPoints, 0);
  });

  test('deve calcular corretamente pontos em sessão Sprint', () => {
    const resultSprintP1 = createMockResult({ position: 1 });
    const resultSprintP8 = createMockResult({ position: 8 });
    const resultSprintP9 = createMockResult({ position: 9 });

    assert.equal(PointsCalculator.calculateSessionPoints(resultSprintP1, 'SPRINT', ruleset2025).totalPoints, 8);
    assert.equal(PointsCalculator.calculateSessionPoints(resultSprintP8, 'SPRINT', ruleset2025).totalPoints, 1);
    assert.equal(PointsCalculator.calculateSessionPoints(resultSprintP9, 'SPRINT', ruleset2025).totalPoints, 0);
  });

  test('deve aplicar faixas de distância reduzida (Artigo 6.5) em Grand Prix encurtados', () => {
    const resultP1 = createMockResult({ position: 1 });
    const resultP6 = createMockResult({ position: 6 });

    // Faixa 25% a 50%: P1 ganha 13 pontos; P6 ganha 4 pontos
    const b1 = PointsCalculator.calculateSessionPoints(resultP1, 'RACE', ruleset2025, DistanceBracket.PCT_25_TO_50);
    const b6 = PointsCalculator.calculateSessionPoints(resultP6, 'RACE', ruleset2025, DistanceBracket.PCT_25_TO_50);

    assert.equal(b1.totalPoints, 13);
    assert.equal(b6.totalPoints, 4);
  });
});

describe('PointsCalculator — Apuração Coletiva de Construtores', () => {
  const ruleset = ScoringRuleset.create2025Ruleset().getValue();

  test('deve somar a pontuação de todos os carros válidos da equipe em uma corrida', () => {
    const car1 = createMockResult({ id: 'r-1', constructorId: 'ferrari', position: 1 }); // 25 pts
    const car2 = createMockResult({ id: 'r-2', constructorId: 'ferrari', position: 3 }); // 15 pts

    const teamPoints = PointsCalculator.calculateConstructorPoints([car1, car2], 'RACE', ruleset);
    assert.equal(teamPoints, 40);
  });

  test('deve desconsiderar carros desclassificados na pontuação de construtores', () => {
    const car1 = createMockResult({ id: 'r-1', constructorId: 'mclaren', position: 2 }); // 18 pts
    const car2 = createMockResult({ id: 'r-2', constructorId: 'mclaren', position: null, status: ResultStatus.DSQ }); // 0 pts

    const teamPoints = PointsCalculator.calculateConstructorPoints([car1, car2], 'RACE', ruleset);
    assert.equal(teamPoints, 18);
  });

  test('deve retornar 0 pontos para lista vazia de carros', () => {
    const teamPoints = PointsCalculator.calculateConstructorPoints([], 'RACE', ruleset);
    assert.equal(teamPoints, 0);
  });
});
