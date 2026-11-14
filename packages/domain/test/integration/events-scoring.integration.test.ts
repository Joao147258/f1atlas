/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes de Integração
 * ============================================================================
 *
 * Suíte de Testes de Integração: Events -> Scoring (M2.1-IT-E)
 * Arquivo: packages/domain/test/integration/events-scoring.integration.test.ts
 *
 * Objetivo Arquitetural:
 * Validar o consumo de resultados de corrida e súmulas de pista (events) pelo motor
 * determinístico de cálculo de pontos da FIA (scoring), cobrindo regras de volta
 * mais rápida, distâncias proporcionais (Art. 6.5) e elegibilidade (Art. 62.1).
 * ============================================================================
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { EntityId } from '../../src/shared/entity-id.ts';
import { Circuit } from '../../src/events/circuit.ts';
import { SessionResult, ResultStatus, PublicationState } from '../../src/events/session-result.ts';
import {
  ScoringRuleset,
  DistanceBracket
} from '../../src/scoring/scoring-ruleset.ts';
import { PointsCalculator } from '../../src/scoring/points-calculator.ts';

describe('M2.1-IT-E — Integração Events -> Scoring (INT-04)', () => {
  const sessionId = EntityId.from<'session'>('ses-race-interlagos');
  const ruleset2025 = ScoringRuleset.create2025Ruleset().getValue();
  const ruleset2024 = ScoringRuleset.create2024Ruleset().getValue();

  test('IT-EV-SC-01 — deve calcular voltas regulamentares pelo Circuito e apurar pontuação completa de Grand Prix', () => {
    // 1. Circuito de Interlagos (4.309m): Art. 5.4 da FIA determina voltas para exceder 305km
    const circuit = Circuit.create({
      id: EntityId.from<'circuit'>('interlagos'),
      name: 'Autódromo José Carlos Pace',
      city: 'São Paulo',
      country: 'Brazil',
      trackLengthMeters: 4309,
      cornersCount: 15,
      timezone: 'America/Sao_Paulo'
    }).getValue();

    const expectedLaps = circuit.calculateRaceLaps();
    assert.equal(expectedLaps, 71); // Math.floor(305000 / 4309) + 1 = 70 + 1 = 71 voltas!

    // 2. Cria resultados de chegada para 12 pilotos
    const expectedPointsTable2025 = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0];
    const results: SessionResult[] = [];

    for (let pos = 1; pos <= 12; pos++) {
      const res = SessionResult.create({
        id: EntityId.from<'session-result'>(`res-p${pos}`),
        sessionId,
        driverId: EntityId.from<'driver'>(`driver-${pos}`),
        teamId: EntityId.from<'team'>(`team-${pos}`),
        constructorId: EntityId.from<'constructor'>(`const-${pos}`),
        position: pos,
        lapsCompleted: expectedLaps,
        status: ResultStatus.FINISHED,
        publicationState: PublicationState.OFFICIAL
      }).getValue();

      results.push(res);
    }

    // 3. Apuração via PointsCalculator para cada competidor
    for (let i = 0; i < results.length; i++) {
      const breakdown = PointsCalculator.calculateSessionPoints(
        results[i],
        'RACE',
        ruleset2025,
        DistanceBracket.FULL_DISTANCE
      );

      assert.equal(breakdown.positionPoints, expectedPointsTable2025[i]);
      assert.equal(breakdown.fastestLapPoints, 0); // 2025 aboliu volta rápida
      assert.equal(breakdown.totalPoints, expectedPointsTable2025[i]);
    }
  });

  test('IT-EV-SC-02 — deve aplicar a abolição formal de volta mais rápida em 2025 e manter compatibilidade em 2024', () => {
    // Piloto P1 registrou a volta mais rápida da prova (fastestLapRank: 1)
    const p1FastestLap = SessionResult.create({
      id: EntityId.from<'session-result'>('res-p1-fl'),
      sessionId,
      driverId: EntityId.from<'driver'>('verstappen'),
      teamId: EntityId.from<'team'>('redbull-team'),
      constructorId: EntityId.from<'constructor'>('redbull'),
      position: 1,
      lapsCompleted: 71,
      status: ResultStatus.FINISHED,
      fastestLapRank: 1,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    // Em 2025: 25 pontos regulares + 0 bônus = 25 pontos
    const breakdown2025 = PointsCalculator.calculateSessionPoints(p1FastestLap, 'RACE', ruleset2025);
    assert.equal(breakdown2025.positionPoints, 25);
    assert.equal(breakdown2025.fastestLapPoints, 0);
    assert.equal(breakdown2025.totalPoints, 25);

    // Em 2024: 25 pontos regulares + 1 bônus = 26 pontos
    const breakdown2024 = PointsCalculator.calculateSessionPoints(p1FastestLap, 'RACE', ruleset2024);
    assert.equal(breakdown2024.positionPoints, 25);
    assert.equal(breakdown2024.fastestLapPoints, 1);
    assert.equal(breakdown2024.totalPoints, 26);

    // Piloto em P11 com volta mais rápida em 2024: 0 bônus (exige Top 10)
    const p11FastestLap = SessionResult.create({
      id: EntityId.from<'session-result'>('res-p11-fl'),
      sessionId,
      driverId: EntityId.from<'driver'>('ricciardo'),
      teamId: EntityId.from<'team'>('rb-team'),
      constructorId: EntityId.from<'constructor'>('rb'),
      position: 11,
      lapsCompleted: 71,
      status: ResultStatus.FINISHED,
      fastestLapRank: 1,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    const breakdownP11 = PointsCalculator.calculateSessionPoints(p11FastestLap, 'RACE', ruleset2024);
    assert.equal(breakdownP11.positionPoints, 0);
    assert.equal(breakdownP11.fastestLapPoints, 0);
    assert.equal(breakdownP11.totalPoints, 0);
  });

  test('IT-EV-SC-03 — deve calcular pontos da Corrida Sprint conforme Artigo 6.3 da FIA', () => {
    // Na Sprint, apenas os 8 primeiros pontuam: [8, 7, 6, 5, 4, 3, 2, 1]
    const expectedSprintPoints = [8, 7, 6, 5, 4, 3, 2, 1, 0, 0];

    for (let pos = 1; pos <= 10; pos++) {
      const res = SessionResult.create({
        id: EntityId.from<'session-result'>(`res-sprint-p${pos}`),
        sessionId,
        driverId: EntityId.from<'driver'>(`driver-sp-${pos}`),
        teamId: EntityId.from<'team'>('team-generic'),
        constructorId: EntityId.from<'constructor'>('const-generic'),
        position: pos,
        lapsCompleted: 24,
        status: ResultStatus.FINISHED,
        publicationState: PublicationState.OFFICIAL
      }).getValue();

      const breakdown = PointsCalculator.calculateSessionPoints(res, 'SPRINT', ruleset2025);
      assert.equal(breakdown.totalPoints, expectedSprintPoints[pos - 1]);
    }
  });

  test('IT-EV-SC-04 — deve aplicar regras estritas de elegibilidade (DSQ, DNS, NC e DNF 90%)', () => {
    // 1. Piloto desclassificado (DSQ) recebe estritamente 0 pontos (INV-SC-04)
    const dsqResult = SessionResult.create({
      id: EntityId.from<'session-result'>('res-dsq'),
      sessionId,
      driverId: EntityId.from<'driver'>('dsq-driver'),
      teamId: EntityId.from<'team'>('team-x'),
      constructorId: EntityId.from<'constructor'>('const-x'),
      position: null,
      lapsCompleted: 71,
      status: ResultStatus.DSQ,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    const dsqBreakdown = PointsCalculator.calculateSessionPoints(dsqResult, 'RACE', ruleset2025);
    assert.equal(dsqBreakdown.totalPoints, 0);

    // 2. Não largou (DNS) recebe 0 pontos
    const dnsResult = SessionResult.create({
      id: EntityId.from<'session-result'>('res-dns'),
      sessionId,
      driverId: EntityId.from<'driver'>('dns-driver'),
      teamId: EntityId.from<'team'>('team-x'),
      constructorId: EntityId.from<'constructor'>('const-x'),
      position: null,
      lapsCompleted: 0,
      status: ResultStatus.DNS,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    const dnsBreakdown = PointsCalculator.calculateSessionPoints(dnsResult, 'RACE', ruleset2025);
    assert.equal(dnsBreakdown.totalPoints, 0);

    // 3. Abandono com >= 90% das voltas do vencedor (DNF classificado em P8)
    const dnfClassified = SessionResult.create({
      id: EntityId.from<'session-result'>('res-dnf-classified'),
      sessionId,
      driverId: EntityId.from<'driver'>('dnf-driver'),
      teamId: EntityId.from<'team'>('team-x'),
      constructorId: EntityId.from<'constructor'>('const-x'),
      position: 8, // Homologado em P8
      lapsCompleted: 65,
      status: ResultStatus.DNF,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    const dnfBreakdown = PointsCalculator.calculateSessionPoints(dnfClassified, 'RACE', ruleset2025);
    assert.equal(dnfBreakdown.totalPoints, 4); // P8 confere 4 pontos!
  });

  test('IT-EV-SC-05 — deve calcular tabelas de pontuação reduzida por suspensão climática (Artigo 6.5 FIA)', () => {
    // Piloto em P1
    const p1Result = SessionResult.create({
      id: EntityId.from<'session-result'>('res-p1-short'),
      sessionId,
      driverId: EntityId.from<'driver'>('driver-1'),
      teamId: EntityId.from<'team'>('team-1'),
      constructorId: EntityId.from<'constructor'>('const-1'),
      position: 1,
      lapsCompleted: 15,
      status: ResultStatus.FINISHED,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    // Faixa 1: < 2 voltas -> 0 pontos
    assert.equal(
      PointsCalculator.calculateSessionPoints(p1Result, 'RACE', ruleset2025, DistanceBracket.UNDER_2_LAPS).totalPoints,
      0
    );

    // Faixa 2: 2 voltas a 25% da distância -> P1 ganha 6 pontos
    assert.equal(
      PointsCalculator.calculateSessionPoints(p1Result, 'RACE', ruleset2025, DistanceBracket.LAP_2_TO_25_PCT).totalPoints,
      6
    );

    // Faixa 3: 25% a 50% da distância -> P1 ganha 13 pontos
    assert.equal(
      PointsCalculator.calculateSessionPoints(p1Result, 'RACE', ruleset2025, DistanceBracket.PCT_25_TO_50).totalPoints,
      13
    );

    // Faixa 4: 50% a 75% da distância -> P1 ganha 19 pontos
    assert.equal(
      PointsCalculator.calculateSessionPoints(p1Result, 'RACE', ruleset2025, DistanceBracket.PCT_50_TO_75).totalPoints,
      19
    );

    // Faixa 5: Distância integral -> P1 ganha 25 pontos
    assert.equal(
      PointsCalculator.calculateSessionPoints(p1Result, 'RACE', ruleset2025, DistanceBracket.FULL_DISTANCE).totalPoints,
      25
    );
  });

  test('IT-EV-SC-06 — deve agregar os pontos de múltiplos carros para o construtor na sessão', () => {
    const ferrariId = EntityId.from<'constructor'>('ferrari');

    // Carro 1 da Ferrari: Leclerc em P2 (18 pts)
    const leclercRes = SessionResult.create({
      id: EntityId.from<'session-result'>('res-lec'),
      sessionId,
      driverId: EntityId.from<'driver'>('leclerc'),
      teamId: EntityId.from<'team'>('ferrari-team'),
      constructorId: ferrariId,
      position: 2,
      lapsCompleted: 71,
      status: ResultStatus.FINISHED,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    // Carro 2 da Ferrari: Hamilton em P4 (12 pts)
    const hamiltonRes = SessionResult.create({
      id: EntityId.from<'session-result'>('res-ham'),
      sessionId,
      driverId: EntityId.from<'driver'>('hamilton'),
      teamId: EntityId.from<'team'>('ferrari-team'),
      constructorId: ferrariId,
      position: 4,
      lapsCompleted: 71,
      status: ResultStatus.FINISHED,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    const constructorPoints = PointsCalculator.calculateConstructorPoints(
      [leclercRes, hamiltonRes],
      'RACE',
      ruleset2025
    );

    // 18 + 12 = 30 pontos para a Ferrari na prova
    assert.equal(constructorPoints, 30);
  });
});
