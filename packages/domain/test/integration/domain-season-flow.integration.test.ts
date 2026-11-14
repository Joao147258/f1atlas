/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes de Integração
 * ============================================================================
 *
 * Suíte de Testes de Integração: Ciclo Esportivo Completo do Domínio (M2.1-IT-G)
 * Arquivo: packages/domain/test/integration/domain-season-flow.integration.test.ts
 *
 * Objetivo Arquitetural:
 * Comprovar a integração ponta a ponta em domínio puro de uma temporada da F1
 * através de duas etapas completas (Grand Prix tradicional e fim de semana Sprint),
 * exercitando a colaboração entre todos os 6 módulos:
 * Season -> Participants -> Circuit -> GrandPrix -> Session -> SessionResult ->
 * PointsCalculator -> StandingsCalculator -> DriverStandings & ConstructorStandings.
 * ============================================================================
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { EntityId } from '../../src/shared/entity-id.ts';
import { createSeason, scheduleGrandPrix, startSeason, completeGrandPrix } from '../../src/seasons/season.ts';
import { Driver } from '../../src/participants/driver.ts';
import { Team } from '../../src/participants/team.ts';
import { Constructor } from '../../src/participants/constructor.ts';
import { SeasonEntry } from '../../src/participants/season-entry.ts';
import { EntryRole } from '../../src/participants/entry-role.ts';
import { Circuit } from '../../src/events/circuit.ts';
import { GrandPrix, GrandPrixFormat } from '../../src/events/grand-prix.ts';
import { Session, SessionType } from '../../src/events/session.ts';
import { SessionEntry, validateSessionEntries } from '../../src/events/session-entry.ts';
import { SessionResult, ResultStatus, PublicationState } from '../../src/events/session-result.ts';
import { ScoringRuleset } from '../../src/scoring/scoring-ruleset.ts';
import { PointsCalculator } from '../../src/scoring/points-calculator.ts';
import { StandingsCalculator, type ScoredSessionData } from '../../src/championships/standings-calculator.ts';

describe('M2.1-IT-G — Integração Completa do Ciclo Esportivo do Domínio', () => {
  const season2025Id = EntityId.from<'season'>('season-2025');
  const ruleset2025 = ScoringRuleset.create2025Ruleset().getValue();

  test('IT-E2E-DOM-01 — deve executar o ciclo completo de duas etapas com inversão de liderança no WDC e WCC', () => {
    // ========================================================================
    // ETAPA 1: CRIAÇÃO DA TEMPORADA E CALENDÁRIO
    // ========================================================================
    const seasonId = season2025Id;
    let season = createSeason({ id: season2025Id, year: 2025, rulesetId: ruleset2025.id }).getValue();

    const gpAusId = EntityId.from<'grand-prix'>('gp-australia');
    const gpChnId = EntityId.from<'grand-prix'>('gp-china');

    season = scheduleGrandPrix(season, {
      grandPrixId: gpAusId,
      roundNumber: 1,
      name: 'Australian Grand Prix',
      startDate: new Date('2025-03-14T00:00:00Z'),
      endDate: new Date('2025-03-16T23:59:59Z')
    }).getValue();

    season = scheduleGrandPrix(season, {
      grandPrixId: gpChnId,
      roundNumber: 2,
      name: 'Chinese Grand Prix',
      startDate: new Date('2025-03-21T00:00:00Z'),
      endDate: new Date('2025-03-23T23:59:59Z')
    }).getValue();

    season = startSeason(season).getValue();
    assert.equal(season.totalRounds, 2);

    // ========================================================================
    // ETAPA 2: PRAÇAS ESPORTIVAS (CIRCUITOS)
    // ========================================================================
    const circuitMelbourne = Circuit.create({
      id: EntityId.from<'circuit'>('circuit-melbourne'),
      name: 'Albert Park Circuit',
      city: 'Melbourne',
      country: 'Australia',
      trackLengthMeters: 5278,
      cornersCount: 14,
      timezone: 'Australia/Melbourne'
    }).getValue();

    const circuitShanghai = Circuit.create({
      id: EntityId.from<'circuit'>('circuit-shanghai'),
      name: 'Shanghai International Circuit',
      city: 'Shanghai',
      country: 'China',
      trackLengthMeters: 5451,
      cornersCount: 16,
      timezone: 'Asia/Shanghai'
    }).getValue();

    assert.equal(circuitMelbourne.calculateRaceLaps(), 58);
    assert.equal(circuitShanghai.calculateRaceLaps(), 56);

    // ========================================================================
    // ETAPA 3: EQUIPES, CONSTRUTORES E PILOTOS (4 EQUIPES / 8 PILOTOS)
    // ========================================================================
    const constMcLaren = Constructor.create({ id: EntityId.from<'constructor'>('mclaren'), name: 'McLaren', nationality: 'British' }).getValue();
    const constRedBull = Constructor.create({ id: EntityId.from<'constructor'>('redbull'), name: 'Red Bull Racing', nationality: 'Austrian' }).getValue();
    const constFerrari = Constructor.create({ id: EntityId.from<'constructor'>('ferrari'), name: 'Ferrari', nationality: 'Italian' }).getValue();
    const constMercedes = Constructor.create({ id: EntityId.from<'constructor'>('mercedes'), name: 'Mercedes', nationality: 'German' }).getValue();

    const teamMcLaren = Team.create({ id: EntityId.from<'team'>('team-mclaren'), legalName: 'McLaren Racing Ltd', commercialName: 'McLaren F1 Team', nationality: 'British' }).getValue();
    const teamRedBull = Team.create({ id: EntityId.from<'team'>('team-redbull'), legalName: 'Red Bull Racing Ltd', commercialName: 'Oracle Red Bull Racing', nationality: 'Austrian' }).getValue();
    const teamFerrari = Team.create({ id: EntityId.from<'team'>('team-ferrari'), legalName: 'Ferrari S.p.A.', commercialName: 'Scuderia Ferrari HP', nationality: 'Italian' }).getValue();
    const teamMercedes = Team.create({ id: EntityId.from<'team'>('team-mercedes'), legalName: 'Mercedes-Benz Grand Prix Ltd', commercialName: 'Mercedes-AMG PETRONAS', nationality: 'German' }).getValue();

    const driverNorris = Driver.create({ id: EntityId.from<'driver'>('norris'), firstName: 'Lando', lastName: 'Norris', code: 'NOR', nationality: 'British', permanentNumber: 4 }).getValue();
    const driverPiastri = Driver.create({ id: EntityId.from<'driver'>('piastri'), firstName: 'Oscar', lastName: 'Piastri', code: 'PIA', nationality: 'Australian', permanentNumber: 81 }).getValue();
    const driverVerstappen = Driver.create({ id: EntityId.from<'driver'>('verstappen'), firstName: 'Max', lastName: 'Verstappen', code: 'VER', nationality: 'Dutch', permanentNumber: 1, isWorldChampion: true }).getValue();
    const driverPerez = Driver.create({ id: EntityId.from<'driver'>('perez'), firstName: 'Sergio', lastName: 'Perez', code: 'PER', nationality: 'Mexican', permanentNumber: 11 }).getValue();
    const driverLeclerc = Driver.create({ id: EntityId.from<'driver'>('leclerc'), firstName: 'Charles', lastName: 'Leclerc', code: 'LEC', nationality: 'Monegasque', permanentNumber: 16 }).getValue();
    const driverHamilton = Driver.create({ id: EntityId.from<'driver'>('hamilton'), firstName: 'Lewis', lastName: 'Hamilton', code: 'HAM', nationality: 'British', permanentNumber: 44, isWorldChampion: true }).getValue();
    const driverRussell = Driver.create({ id: EntityId.from<'driver'>('russell'), firstName: 'George', lastName: 'Russell', code: 'RUS', nationality: 'British', permanentNumber: 63 }).getValue();
    const driverAntonelli = Driver.create({ id: EntityId.from<'driver'>('antonelli'), firstName: 'Andrea Kimi', lastName: 'Antonelli', code: 'ANT', nationality: 'Italian', permanentNumber: 12 }).getValue();

    // Inscrições oficiais da temporada
    const entries = [
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-nor'), seasonId, driverId: driverNorris.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, carNumber: 4, role: EntryRole.REGULAR, startRound: 1 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-pia'), seasonId, driverId: driverPiastri.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, carNumber: 81, role: EntryRole.REGULAR, startRound: 1 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-ver'), seasonId, driverId: driverVerstappen.id, teamId: teamRedBull.id, constructorId: constRedBull.id, carNumber: 1, role: EntryRole.REGULAR, startRound: 1 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-per'), seasonId, driverId: driverPerez.id, teamId: teamRedBull.id, constructorId: constRedBull.id, carNumber: 11, role: EntryRole.REGULAR, startRound: 1 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-lec'), seasonId, driverId: driverLeclerc.id, teamId: teamFerrari.id, constructorId: constFerrari.id, carNumber: 16, role: EntryRole.REGULAR, startRound: 1 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-ham'), seasonId, driverId: driverHamilton.id, teamId: teamFerrari.id, constructorId: constFerrari.id, carNumber: 44, role: EntryRole.REGULAR, startRound: 1 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-rus'), seasonId, driverId: driverRussell.id, teamId: teamMercedes.id, constructorId: constMercedes.id, carNumber: 63, role: EntryRole.REGULAR, startRound: 1 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-ant'), seasonId, driverId: driverAntonelli.id, teamId: teamMercedes.id, constructorId: constMercedes.id, carNumber: 12, role: EntryRole.REGULAR, startRound: 1 }).getValue()
    ];
    assert.equal(entries.length, 8);

    // ========================================================================
    // ETAPA 4: RODADA 1 — GRANDE PRÊMIO DA AUSTRÁLIA (STANDARD)
    // ========================================================================
    let gpAus = GrandPrix.create({
      id: gpAusId,
      seasonId,
      circuitId: circuitMelbourne.id,
      name: 'Australian Grand Prix',
      roundNumber: 1,
      format: GrandPrixFormat.STANDARD,
      startDate: new Date('2025-03-14T00:00:00Z'),
      endDate: new Date('2025-03-16T23:59:59Z')
    }).getValue();

    const sesAusRace = Session.create({
      id: EntityId.from<'session'>('ses-aus-race'),
      grandPrixId: gpAus.id,
      type: SessionType.RACE,
      scheduledStartTime: new Date('2025-03-16T04:00:00Z')
    }).getValue();

    gpAus = gpAus.addSession(sesAusRace).getValue();

    // Súmula Oficial de Chegada (Round 1):
    // P1 Norris (25), P2 Verstappen (18), P3 Leclerc (15), P4 Russell (12),
    // P5 Piastri (10), P6 Hamilton (8), P7 Perez (6), P8 Antonelli (4)
    const r1Results: SessionResult[] = [
      SessionResult.create({ id: EntityId.from<'session-result'>('r1-nor'), sessionId: sesAusRace.id, driverId: driverNorris.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: 1, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r1-ver'), sessionId: sesAusRace.id, driverId: driverVerstappen.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 2, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r1-lec'), sessionId: sesAusRace.id, driverId: driverLeclerc.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 3, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r1-rus'), sessionId: sesAusRace.id, driverId: driverRussell.id, teamId: teamMercedes.id, constructorId: constMercedes.id, position: 4, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r1-pia'), sessionId: sesAusRace.id, driverId: driverPiastri.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: 5, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r1-ham'), sessionId: sesAusRace.id, driverId: driverHamilton.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 6, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r1-per'), sessionId: sesAusRace.id, driverId: driverPerez.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 7, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r1-ant'), sessionId: sesAusRace.id, driverId: driverAntonelli.id, teamId: teamMercedes.id, constructorId: constMercedes.id, position: 8, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue()
    ];

    const r1Sessions: ScoredSessionData[] = [
      { roundNumber: 1, sessionType: 'RACE', results: r1Results }
    ];

    // Apuração WDC e WCC Round 1
    const wdcRound1 = StandingsCalculator.calculateDriverStandings({
      seasonId,
      roundNumber: 1,
      sessions: r1Sessions,
      ruleset: ruleset2025
    }).getValue();

    const wccRound1 = StandingsCalculator.calculateConstructorStandings({
      seasonId,
      roundNumber: 1,
      sessions: r1Sessions,
      ruleset: ruleset2025
    }).getValue();

    // Verificações Round 1:
    assert.equal(wdcRound1.getLeader()?.driverId.value, 'norris');
    assert.equal(wdcRound1.getEntry(driverNorris.id)?.points, 25);
    assert.equal(wdcRound1.getEntry(driverVerstappen.id)?.points, 18);
    assert.equal(wdcRound1.getEntry(driverLeclerc.id)?.points, 15);
    assert.equal(wdcRound1.getEntry(driverRussell.id)?.points, 12);
    assert.equal(wdcRound1.getEntry(driverPiastri.id)?.points, 10);
    assert.equal(wdcRound1.getEntry(driverHamilton.id)?.points, 8);
    assert.equal(wdcRound1.getEntry(driverPerez.id)?.points, 6);
    assert.equal(wdcRound1.getEntry(driverAntonelli.id)?.points, 4);

    // WCC: McLaren (25 + 10 = 35), Red Bull (18 + 6 = 24), Ferrari (15 + 8 = 23), Mercedes (12 + 4 = 16)
    assert.equal(wccRound1.getLeader()?.constructorId.value, 'mclaren');
    assert.equal(wccRound1.getEntry(constMcLaren.id)?.points, 35);
    assert.equal(wccRound1.getEntry(constRedBull.id)?.points, 24);
    assert.equal(wccRound1.getEntry(constFerrari.id)?.points, 23);
    assert.equal(wccRound1.getEntry(constMercedes.id)?.points, 16);

    // Conclusão oficial da etapa 1 no calendário
    season = completeGrandPrix(season, 1).getValue();
    gpAus = gpAus.completeGrandPrix().getValue();

    // ========================================================================
    // ETAPA 5: RODADA 2 — GRANDE PRÊMIO DA CHINA (SPRINT + RACE)
    // ========================================================================
    let gpChn = GrandPrix.create({
      id: gpChnId,
      seasonId,
      circuitId: circuitShanghai.id,
      name: 'Chinese Grand Prix',
      roundNumber: 2,
      format: GrandPrixFormat.SPRINT,
      startDate: new Date('2025-03-21T00:00:00Z'),
      endDate: new Date('2025-03-23T23:59:59Z')
    }).getValue();

    const sesChnSprint = Session.create({
      id: EntityId.from<'session'>('ses-chn-sprint'),
      grandPrixId: gpChn.id,
      type: SessionType.SPRINT,
      scheduledStartTime: new Date('2025-03-22T03:00:00Z')
    }).getValue();

    const sesChnRace = Session.create({
      id: EntityId.from<'session'>('ses-chn-race'),
      grandPrixId: gpChn.id,
      type: SessionType.RACE,
      scheduledStartTime: new Date('2025-03-23T06:00:00Z')
    }).getValue();

    gpChn = gpChn.addSession(sesChnSprint).getValue();
    gpChn = gpChn.addSession(sesChnRace).getValue();

    // Súmula Sprint China:
    // P1 Verstappen (8), P2 Norris (7), P3 Leclerc (6), P4 Piastri (5),
    // P5 Russell (4), P6 Hamilton (3), P7 Perez (2), P8 Antonelli (1)
    const r2SprintResults: SessionResult[] = [
      SessionResult.create({ id: EntityId.from<'session-result'>('r2s-ver'), sessionId: sesChnSprint.id, driverId: driverVerstappen.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 1, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2s-nor'), sessionId: sesChnSprint.id, driverId: driverNorris.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: 2, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2s-lec'), sessionId: sesChnSprint.id, driverId: driverLeclerc.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 3, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2s-pia'), sessionId: sesChnSprint.id, driverId: driverPiastri.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: 4, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2s-rus'), sessionId: sesChnSprint.id, driverId: driverRussell.id, teamId: teamMercedes.id, constructorId: constMercedes.id, position: 5, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2s-ham'), sessionId: sesChnSprint.id, driverId: driverHamilton.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 6, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2s-per'), sessionId: sesChnSprint.id, driverId: driverPerez.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 7, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2s-ant'), sessionId: sesChnSprint.id, driverId: driverAntonelli.id, teamId: teamMercedes.id, constructorId: constMercedes.id, position: 8, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue()
    ];

    // Súmula Corrida China:
    // P1 Verstappen (25), P2 Leclerc (18), P3 Norris (15), P4 Piastri (12),
    // P5 Hamilton (10), P6 Russell (8), P7 Perez (6), P8 Antonelli (4)
    const r2RaceResults: SessionResult[] = [
      SessionResult.create({ id: EntityId.from<'session-result'>('r2r-ver'), sessionId: sesChnRace.id, driverId: driverVerstappen.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 1, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2r-lec'), sessionId: sesChnRace.id, driverId: driverLeclerc.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 2, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2r-nor'), sessionId: sesChnRace.id, driverId: driverNorris.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: 3, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2r-pia'), sessionId: sesChnRace.id, driverId: driverPiastri.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: 4, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2r-ham'), sessionId: sesChnRace.id, driverId: driverHamilton.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 5, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2r-rus'), sessionId: sesChnRace.id, driverId: driverRussell.id, teamId: teamMercedes.id, constructorId: constMercedes.id, position: 6, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2r-per'), sessionId: sesChnRace.id, driverId: driverPerez.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 7, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('r2r-ant'), sessionId: sesChnRace.id, driverId: driverAntonelli.id, teamId: teamMercedes.id, constructorId: constMercedes.id, position: 8, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue()
    ];

    const allSessionsUpToRound2: ScoredSessionData[] = [
      { roundNumber: 1, sessionType: 'RACE', results: r1Results },
      { roundNumber: 2, sessionType: 'SPRINT', results: r2SprintResults },
      { roundNumber: 2, sessionType: 'RACE', results: r2RaceResults }
    ];

    // ========================================================================
    // ETAPA 6: RECALCULO E EVOLUÇÃO DO CAMPEONATO (ROUND 2)
    // ========================================================================
    const wdcRound2 = StandingsCalculator.calculateDriverStandings({
      seasonId,
      roundNumber: 2,
      sessions: allSessionsUpToRound2,
      ruleset: ruleset2025,
      previousStandings: wdcRound1
    }).getValue();

    const wccRound2 = StandingsCalculator.calculateConstructorStandings({
      seasonId,
      roundNumber: 2,
      sessions: allSessionsUpToRound2,
      ruleset: ruleset2025,
      previousStandings: wccRound1
    }).getValue();

    // Verificação de Totais Acumulados e Inversão de Liderança no WDC:
    // Verstappen: 18 (R1) + 8 (R2S) + 25 (R2R) = 51 pts (Novo líder! rankChange: +1)
    const verEntry = wdcRound2.getEntry(driverVerstappen.id)!;
    assert.equal(verEntry.rank, 1);
    assert.equal(verEntry.points, 51);
    assert.equal(verEntry.wins, 1);
    assert.equal(verEntry.rankChange, 1); // Subiu de P2 para P1 (+1)
    assert.equal(wdcRound2.getLeader()?.driverId.value, 'verstappen');

    // Norris: 25 (R1) + 7 (R2S) + 15 (R2R) = 47 pts (Caiu para P2! rankChange: -1)
    const norEntry = wdcRound2.getEntry(driverNorris.id)!;
    assert.equal(norEntry.rank, 2);
    assert.equal(norEntry.points, 47);
    assert.equal(norEntry.wins, 1);
    assert.equal(norEntry.rankChange, -1);

    // Leclerc: 15 (R1) + 6 (R2S) + 18 (R2R) = 39 pts (P3 estável)
    const lecEntry = wdcRound2.getEntry(driverLeclerc.id)!;
    assert.equal(lecEntry.rank, 3);
    assert.equal(lecEntry.points, 39);
    assert.equal(lecEntry.rankChange, 0);

    // Piastri: 10 (R1) + 5 (R2S) + 12 (R2R) = 27 pts (Subiu de P5 para P4, +1)
    const piaEntry = wdcRound2.getEntry(driverPiastri.id)!;
    assert.equal(piaEntry.rank, 4);
    assert.equal(piaEntry.points, 27);
    assert.equal(piaEntry.rankChange, 1);

    // Russell: 12 (R1) + 4 (R2S) + 8 (R2R) = 24 pts (Caiu de P4 para P5, -1)
    const rusEntry = wdcRound2.getEntry(driverRussell.id)!;
    assert.equal(rusEntry.rank, 5);
    assert.equal(rusEntry.points, 24);
    assert.equal(rusEntry.rankChange, -1);

    // Hamilton: 8 (R1) + 3 (R2S) + 10 (R2R) = 21 pts (P6)
    assert.equal(wdcRound2.getEntry(driverHamilton.id)?.points, 21);

    // Perez: 6 (R1) + 2 (R2S) + 6 (R2R) = 14 pts (P7)
    assert.equal(wdcRound2.getEntry(driverPerez.id)?.points, 14);

    // Antonelli: 4 (R1) + 1 (R2S) + 4 (R2R) = 9 pts (P8)
    assert.equal(wdcRound2.getEntry(driverAntonelli.id)?.points, 9);

    // ========================================================================
    // VERIFICAÇÃO DO WCC ROUND 2
    // ========================================================================
    // McLaren: Norris (47) + Piastri (27) = 74 pts (Mantém liderança P1!)
    const mclarenWcc = wccRound2.getEntry(constMcLaren.id)!;
    assert.equal(mclarenWcc.rank, 1);
    assert.equal(mclarenWcc.points, 74);
    assert.equal(wccRound2.getLeader()?.constructorId.value, 'mclaren');

    // Red Bull: Verstappen (51) + Perez (14) = 65 pts (P2)
    const redbullWcc = wccRound2.getEntry(constRedBull.id)!;
    assert.equal(redbullWcc.rank, 2);
    assert.equal(redbullWcc.points, 65);

    // Ferrari: Leclerc (39) + Hamilton (21) = 60 pts (P3)
    const ferrariWcc = wccRound2.getEntry(constFerrari.id)!;
    assert.equal(ferrariWcc.rank, 3);
    assert.equal(ferrariWcc.points, 60);

    // Mercedes: Russell (24) + Antonelli (9) = 33 pts (P4)
    const mercedesWcc = wccRound2.getEntry(constMercedes.id)!;
    assert.equal(mercedesWcc.rank, 4);
    assert.equal(mercedesWcc.points, 33);

    // ========================================================================
    // VERIFICAÇÕES DE INVARIANTES E DETERMINISMO
    // ========================================================================
    // 1. Sequencialidade estrita 1..N
    assert.equal(wdcRound2.entries.length, 8);
    for (let idx = 0; idx < wdcRound2.entries.length; idx++) {
      assert.equal(wdcRound2.entries[idx].rank, idx + 1);
    }

    // 2. Monotonia não-crescente de pontos
    for (let idx = 0; idx < wdcRound2.entries.length - 1; idx++) {
      assert.ok(wdcRound2.entries[idx].points >= wdcRound2.entries[idx + 1].points);
    }

    // 3. Imutabilidade absoluta das instâncias
    assert.equal(Object.isFrozen(wdcRound2), true);
    assert.equal(Object.isFrozen(wccRound2), true);
    assert.equal(Object.isFrozen(season), true);

    // 4. Idempotência de reprocessamento: re-executar com os mesmos dados gera o mesmo líder e pontos
    const wdcReprocessed = StandingsCalculator.calculateDriverStandings({
      seasonId,
      roundNumber: 2,
      sessions: allSessionsUpToRound2,
      ruleset: ruleset2025
    }).getValue();

    assert.equal(wdcReprocessed.getLeader()?.driverId.value, 'verstappen');
    assert.equal(wdcReprocessed.getLeader()?.points, 51);
  });
});
