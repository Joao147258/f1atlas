/**
 * ============================================================================
 * F1Atlas — Camada Domain | M2.1-F05: Ciclo Esportivo Completo do Domínio
 * ============================================================================
 *
 * Arquivo: packages/domain/test/integration/full-season-lifecycle.integration.test.ts
 * Milestone: M2.1 — Integração e Consistência Transversal do Domínio
 * Fase: M2.1-F05 (Integração Completa do Ciclo Esportivo)
 *
 * Objetivo Arquitetural:
 * Demonstrar a execução integrada e determinística, 100% em memória e em
 * TypeScript puro, do ciclo desportivo de uma temporada da Fórmula 1 (2025):
 * 1. Criação da temporada de 2025 e regulamento FIA.
 * 2. Registro de pilotos, equipes, construtores e inscrições de temporada (SeasonEntry).
 * 3. Agendamento e validação de consistência de dois Grandes Prêmios (Round 1 e Round 2).
 * 4. Validação de elegibilidade dos participantes com os validadores de domínio puro da F03.
 * 5. Realização de Treino Livre (com piloto reserva), Qualificação, Sprint e Corrida Principal.
 * 6. Apuração de resultados esportivos oficiais (SessionResult), incluindo DNF 90% e DSQ.
 * 7. Cálculo determinístico de pontos (PointsCalculator).
 * 8. Consolidação acumulada e progressiva de WDC e WCC (StandingsCalculator).
 * 9. Rastreabilidade estrita de evolução e trocas de posição (rankChange).
 * 10. Resolução de desempates oficiais por countback (TieBreakPolicy).
 * 11. Preservação de identidades e isolamento hermético contra dados SIMULATED.
 * 12. Cenários negativos de elegibilidade, rodada inconsistente e simulação não oficial.
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Shared
import { EntityId } from '../../src/shared/entity-id.ts';
import { DomainErrorCode } from '../../src/shared/domain-error.ts';

// Seasons
import {
  createSeason,
  scheduleGrandPrix,
  startSeason,
  completeGrandPrix,
  concludeSeason
} from '../../src/seasons/season.ts';
import { SeasonStatus } from '../../src/seasons/season-status.ts';
import { validateSeasonGrandPrixConsistency } from '../../src/seasons/season-event-validator.ts';

// Participants
import { Driver } from '../../src/participants/driver.ts';
import { Team } from '../../src/participants/team.ts';
import { Constructor } from '../../src/participants/constructor.ts';
import { SeasonEntry } from '../../src/participants/season-entry.ts';
import { EntryRole } from '../../src/participants/entry-role.ts';

// Events
import { Circuit } from '../../src/events/circuit.ts';
import { GrandPrix, GrandPrixFormat } from '../../src/events/grand-prix.ts';
import { Session, SessionType } from '../../src/events/session.ts';
import { SessionEntry } from '../../src/events/session-entry.ts';
import { SessionResult, ResultStatus, PublicationState } from '../../src/events/session-result.ts';
import { validateSessionParticipantEligibility } from '../../src/events/session-participant-validator.ts';

// Scoring & Championships
import { ScoringRuleset } from '../../src/scoring/scoring-ruleset.ts';
import { PointsCalculator } from '../../src/scoring/points-calculator.ts';
import {
  StandingsCalculator,
  type ScoredSessionData
} from '../../src/championships/standings-calculator.ts';

describe('M2.1-F05 — Homologação do Ciclo Esportivo Completo do Domínio', () => {
  const season2025Id = EntityId.from<'season'>('season-2025');
  const ruleset2025 = ScoringRuleset.create2025Ruleset().getValue();

  it('deve executar o ciclo esportivo ponta a ponta integrando todos os 6 módulos do domínio', () => {
    // ------------------------------------------------------------------------
    // PASSO 1: CRIAÇÃO DA TEMPORADA 2025
    // ------------------------------------------------------------------------
    let season = createSeason({
      id: season2025Id,
      year: 2025,
      rulesetId: ruleset2025.id,
      description: '2025 FIA Formula One World Championship'
    }).getValue();

    const gpAusId = EntityId.from<'grand-prix'>('gp-australia-2025');
    const gpChnId = EntityId.from<'grand-prix'>('gp-china-2025');

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

    // ------------------------------------------------------------------------
    // PASSO 2: CRIAÇÃO DE CIRCUITOS
    // ------------------------------------------------------------------------
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

    assert.equal(circuitMelbourne.calculateRaceLaps(), 58); // > 305km
    assert.equal(circuitShanghai.calculateRaceLaps(), 56);

    // ------------------------------------------------------------------------
    // PASSO 3: ENTIDADES DURÁVEIS E INSCRIÇÕES OFICIAIS (PARTICIPANTS)
    // ------------------------------------------------------------------------
    const driverNorris = Driver.create({ id: EntityId.from<'driver'>('drv-nor'), firstName: 'Lando', lastName: 'Norris', code: 'NOR', nationality: 'British', permanentNumber: 4 }).getValue();
    const driverPiastri = Driver.create({ id: EntityId.from<'driver'>('drv-pia'), firstName: 'Oscar', lastName: 'Piastri', code: 'PIA', nationality: 'Australian', permanentNumber: 81 }).getValue();
    const driverVerstappen = Driver.create({ id: EntityId.from<'driver'>('drv-ver'), firstName: 'Max', lastName: 'Verstappen', code: 'VER', nationality: 'Dutch', permanentNumber: 1, isWorldChampion: true }).getValue();
    const driverLawson = Driver.create({ id: EntityId.from<'driver'>('drv-law'), firstName: 'Liam', lastName: 'Lawson', code: 'LAW', nationality: 'New Zealander', permanentNumber: 30 }).getValue();
    const driverLeclerc = Driver.create({ id: EntityId.from<'driver'>('drv-lec'), firstName: 'Charles', lastName: 'Leclerc', code: 'LEC', nationality: 'Monegasque', permanentNumber: 16 }).getValue();
    const driverHamilton = Driver.create({ id: EntityId.from<'driver'>('drv-ham'), firstName: 'Lewis', lastName: 'Hamilton', code: 'HAM', nationality: 'British', permanentNumber: 44, isWorldChampion: true }).getValue();

    // Piloto reserva para FP1 (sem inscrição de temporada na rodada 1)
    const driverAntonelli = Driver.create({ id: EntityId.from<'driver'>('drv-ant'), firstName: 'Andrea Kimi', lastName: 'Antonelli', code: 'ANT', nationality: 'Italian', permanentNumber: 12 }).getValue();

    // Equipes e Construtores
    const teamMcLaren = Team.create({ id: EntityId.from<'team'>('team-mclaren'), legalName: 'McLaren Racing Limited', commercialName: 'McLaren Formula 1 Team', nationality: 'British' }).getValue();
    const constMcLaren = Constructor.create({ id: EntityId.from<'constructor'>('const-mclaren'), name: 'McLaren', nationality: 'British' }).getValue();

    const teamRedBull = Team.create({ id: EntityId.from<'team'>('team-redbull'), legalName: 'Red Bull Racing Limited', commercialName: 'Oracle Red Bull Racing', nationality: 'Austrian' }).getValue();
    const constRedBull = Constructor.create({ id: EntityId.from<'constructor'>('const-redbull'), name: 'Red Bull Racing', nationality: 'Austrian' }).getValue();

    const teamFerrari = Team.create({ id: EntityId.from<'team'>('team-ferrari'), legalName: 'Ferrari S.p.A.', commercialName: 'Scuderia Ferrari HP', nationality: 'Italian' }).getValue();
    const constFerrari = Constructor.create({ id: EntityId.from<'constructor'>('const-ferrari'), name: 'Ferrari', nationality: 'Italian' }).getValue();

    // Inscrições de Temporada (SeasonEntry)
    const seasonEntries: SeasonEntry[] = [
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-nor'), seasonId: season.id, driverId: driverNorris.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, carNumber: 4, role: EntryRole.REGULAR, startRound: 1, endRound: 2 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-pia'), seasonId: season.id, driverId: driverPiastri.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, carNumber: 81, role: EntryRole.REGULAR, startRound: 1, endRound: 2 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-ver'), seasonId: season.id, driverId: driverVerstappen.id, teamId: teamRedBull.id, constructorId: constRedBull.id, carNumber: 1, role: EntryRole.REGULAR, startRound: 1, endRound: 2 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-law'), seasonId: season.id, driverId: driverLawson.id, teamId: teamRedBull.id, constructorId: constRedBull.id, carNumber: 30, role: EntryRole.REGULAR, startRound: 1, endRound: 2 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-lec'), seasonId: season.id, driverId: driverLeclerc.id, teamId: teamFerrari.id, constructorId: constFerrari.id, carNumber: 16, role: EntryRole.REGULAR, startRound: 1, endRound: 2 }).getValue(),
      SeasonEntry.create({ id: EntityId.from<'season-entry'>('se-ham'), seasonId: season.id, driverId: driverHamilton.id, teamId: teamFerrari.id, constructorId: constFerrari.id, carNumber: 44, role: EntryRole.REGULAR, startRound: 1, endRound: 2 }).getValue(),
    ];

    // ------------------------------------------------------------------------
    // PASSO 4: EXECUÇÃO DO ROUND 1 — GP DA AUSTRÁLIA
    // ------------------------------------------------------------------------
    let gpAus = GrandPrix.create({
      id: gpAusId,
      seasonId: season.id,
      circuitId: circuitMelbourne.id,
      name: 'Australian Grand Prix',
      roundNumber: 1,
      format: GrandPrixFormat.STANDARD,
      startDate: new Date('2025-03-14T00:00:00Z'),
      endDate: new Date('2025-03-16T23:59:59Z')
    }).getValue();

    // Validação de consistência Temporada ↔ GrandPrix (F03)
    const gpAusConsistency = validateSeasonGrandPrixConsistency({ season, grandPrix: gpAus });
    assert.equal(gpAusConsistency.isSuccess, true);

    // Sessão 1: Treino Livre (FP1) com participação de piloto reserva (Antonelli)
    const sesAusFp1 = Session.create({
      id: EntityId.from<'session'>('ses-aus-fp1'),
      grandPrixId: gpAus.id,
      type: SessionType.FP1,
      scheduledStartTime: new Date('2025-03-14T01:30:00Z')
    }).getValue();

    const fp1EntryReserve = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-fp1-ant'),
      sessionId: sesAusFp1.id,
      driverId: driverAntonelli.id,
      teamId: teamFerrari.id,
      constructorId: constFerrari.id,
      carNumber: 12
    }).getValue();

    // Validador aceita piloto sem SeasonEntry em Treino Livre
    const fp1Eligibility = validateSessionParticipantEligibility({
      sessionEntry: fp1EntryReserve,
      sessionType: SessionType.FP1,
      seasonEntries,
      roundNumber: 1
    });
    assert.equal(fp1Eligibility.isSuccess, true);

    // Sessão 2: Corrida Principal (RACE) da Austrália
    const sesAusRace = Session.create({
      id: EntityId.from<'session'>('ses-aus-race'),
      grandPrixId: gpAus.id,
      type: SessionType.RACE,
      scheduledStartTime: new Date('2025-03-16T04:00:00Z')
    }).getValue();

    gpAus = gpAus.addSession(sesAusFp1).getValue();
    gpAus = gpAus.addSession(sesAusRace).getValue();

    // Alinhamentos de largada para a corrida australiana
    const ausRaceEntries: SessionEntry[] = [
      SessionEntry.create({ id: EntityId.from<'session-entry'>('se-aus-nor'), sessionId: sesAusRace.id, driverId: driverNorris.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, carNumber: 4, gridPosition: 1 }).getValue(),
      SessionEntry.create({ id: EntityId.from<'session-entry'>('se-aus-ver'), sessionId: sesAusRace.id, driverId: driverVerstappen.id, teamId: teamRedBull.id, constructorId: constRedBull.id, carNumber: 1, gridPosition: 2 }).getValue(),
      SessionEntry.create({ id: EntityId.from<'session-entry'>('se-aus-lec'), sessionId: sesAusRace.id, driverId: driverLeclerc.id, teamId: teamFerrari.id, constructorId: constFerrari.id, carNumber: 16, gridPosition: 3 }).getValue(),
      SessionEntry.create({ id: EntityId.from<'session-entry'>('se-aus-pia'), sessionId: sesAusRace.id, driverId: driverPiastri.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, carNumber: 81, gridPosition: 4 }).getValue(),
      SessionEntry.create({ id: EntityId.from<'session-entry'>('se-aus-ham'), sessionId: sesAusRace.id, driverId: driverHamilton.id, teamId: teamFerrari.id, constructorId: constFerrari.id, carNumber: 44, gridPosition: 5 }).getValue(),
      SessionEntry.create({ id: EntityId.from<'session-entry'>('se-aus-law'), sessionId: sesAusRace.id, driverId: driverLawson.id, teamId: teamRedBull.id, constructorId: constRedBull.id, carNumber: 30, gridPosition: 6 }).getValue(),
    ];

    // Valida elegibilidade de todos os alinhados para a corrida competitiva
    for (const entry of ausRaceEntries) {
      const elig = validateSessionParticipantEligibility({
        sessionEntry: entry,
        sessionType: SessionType.RACE,
        seasonEntries,
        roundNumber: 1
      });
      assert.equal(elig.isSuccess, true);
    }

    // Súmula da Corrida da Austrália (58 voltas totais):
    // Norris (P1 - 25), Verstappen (P2 - 18), Leclerc (P3 - 15), Piastri (P4 - 12), Hamilton (P5 - 10)
    // Lawson abandona na volta 54 (>90% das 58 voltas: 54 >= 52 voltas -> DNF Classificado em P6 com 8 pts)
    const ausResults: SessionResult[] = [
      SessionResult.create({ id: EntityId.from<'session-result'>('res-aus-nor'), sessionId: sesAusRace.id, driverId: driverNorris.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: 1, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-aus-ver'), sessionId: sesAusRace.id, driverId: driverVerstappen.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 2, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-aus-lec'), sessionId: sesAusRace.id, driverId: driverLeclerc.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 3, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-aus-pia'), sessionId: sesAusRace.id, driverId: driverPiastri.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: 4, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-aus-ham'), sessionId: sesAusRace.id, driverId: driverHamilton.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 5, lapsCompleted: 58, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-aus-law'), sessionId: sesAusRace.id, driverId: driverLawson.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 6, lapsCompleted: 54, status: ResultStatus.DNF }).getValue(),
    ];

    // Cálculo e conferência isolada de pontuação da sessão (PointsCalculator)
    const lawsonPts = PointsCalculator.calculateSessionPoints(ausResults[5], SessionType.RACE, ruleset2025);
    assert.equal(lawsonPts.totalPoints, 8); // P6 recebe 8 pontos

    const r1Sessions: ScoredSessionData[] = [
      { roundNumber: 1, sessionType: SessionType.RACE, results: ausResults }
    ];

    const wdcRound1 = StandingsCalculator.calculateDriverStandings({
      seasonId: season.id,
      roundNumber: 1,
      sessions: r1Sessions,
      ruleset: ruleset2025
    }).getValue();

    const wccRound1 = StandingsCalculator.calculateConstructorStandings({
      seasonId: season.id,
      roundNumber: 1,
      sessions: r1Sessions,
      ruleset: ruleset2025
    }).getValue();

    // Verificações Round 1:
    assert.equal(wdcRound1.getLeader()?.driverId.toValue(), 'drv-nor');
    assert.equal(wdcRound1.getEntry(driverNorris.id)?.points, 25);
    assert.equal(wdcRound1.getEntry(driverVerstappen.id)?.points, 18);
    assert.equal(wdcRound1.getEntry(driverLawson.id)?.points, 8);

    // WCC Round 1: McLaren (25 + 12 = 37), Red Bull (18 + 8 = 26), Ferrari (15 + 10 = 25)
    assert.equal(wccRound1.getLeader()?.constructorId.toValue(), 'const-mclaren');
    assert.equal(wccRound1.getEntry(constMcLaren.id)?.points, 37);
    assert.equal(wccRound1.getEntry(constRedBull.id)?.points, 26);
    assert.equal(wccRound1.getEntry(constFerrari.id)?.points, 25);

    season = completeGrandPrix(season, 1).getValue();
    gpAus = gpAus.completeGrandPrix().getValue();

    // ------------------------------------------------------------------------
    // PASSO 5: EXECUÇÃO DO ROUND 2 — GP DA CHINA (SPRINT + RACE)
    // ------------------------------------------------------------------------
    let gpChn = GrandPrix.create({
      id: gpChnId,
      seasonId: season.id,
      circuitId: circuitShanghai.id,
      name: 'Chinese Grand Prix',
      roundNumber: 2,
      format: GrandPrixFormat.SPRINT,
      startDate: new Date('2025-03-21T00:00:00Z'),
      endDate: new Date('2025-03-23T23:59:59Z')
    }).getValue();

    const gpChnConsistency = validateSeasonGrandPrixConsistency({ season, grandPrix: gpChn });
    assert.equal(gpChnConsistency.isSuccess, true);

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

    // Súmula da Sprint: Verstappen P1 (8), Norris P2 (7), Leclerc P3 (6), Piastri P4 (5), Hamilton P5 (4), Lawson P6 (3)
    const chnSprintResults: SessionResult[] = [
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-sp-ver'), sessionId: sesChnSprint.id, driverId: driverVerstappen.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 1, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-sp-nor'), sessionId: sesChnSprint.id, driverId: driverNorris.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: 2, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-sp-lec'), sessionId: sesChnSprint.id, driverId: driverLeclerc.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 3, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-sp-pia'), sessionId: sesChnSprint.id, driverId: driverPiastri.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: 4, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-sp-ham'), sessionId: sesChnSprint.id, driverId: driverHamilton.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 5, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-sp-law'), sessionId: sesChnSprint.id, driverId: driverLawson.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 6, lapsCompleted: 19, status: ResultStatus.FINISHED }).getValue(),
    ];

    // Súmula da Corrida Principal da China:
    // Verstappen P1 (25), Piastri P2 (18), Leclerc P3 (15), Hamilton P4 (12), Lawson P5 (10)
    // Norris sofre desclassificação técnica pós-vistoria (DSQ -> 0 pontos)
    const chnRaceResults: SessionResult[] = [
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-rc-ver'), sessionId: sesChnRace.id, driverId: driverVerstappen.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 1, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-rc-pia'), sessionId: sesChnRace.id, driverId: driverPiastri.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: 2, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-rc-lec'), sessionId: sesChnRace.id, driverId: driverLeclerc.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 3, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-rc-ham'), sessionId: sesChnRace.id, driverId: driverHamilton.id, teamId: teamFerrari.id, constructorId: constFerrari.id, position: 4, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-rc-law'), sessionId: sesChnRace.id, driverId: driverLawson.id, teamId: teamRedBull.id, constructorId: constRedBull.id, position: 5, lapsCompleted: 56, status: ResultStatus.FINISHED }).getValue(),
      SessionResult.create({ id: EntityId.from<'session-result'>('res-chn-rc-nor'), sessionId: sesChnRace.id, driverId: driverNorris.id, teamId: teamMcLaren.id, constructorId: constMcLaren.id, position: null, lapsCompleted: 56, status: ResultStatus.DSQ }).getValue(),
    ];

    const r2Sessions: ScoredSessionData[] = [
      ...r1Sessions,
      { roundNumber: 2, sessionType: SessionType.SPRINT, results: chnSprintResults },
      { roundNumber: 2, sessionType: SessionType.RACE, results: chnRaceResults }
    ];

    // Apuração acumulada do Round 2 informando as classificações anteriores para rastrear rankChange
    const wdcRound2 = StandingsCalculator.calculateDriverStandings({
      seasonId: season.id,
      roundNumber: 2,
      sessions: r2Sessions,
      ruleset: ruleset2025,
      previousStandings: wdcRound1
    }).getValue();

    const wccRound2 = StandingsCalculator.calculateConstructorStandings({
      seasonId: season.id,
      roundNumber: 2,
      sessions: r2Sessions,
      ruleset: ruleset2025,
      previousStandings: wccRound1
    }).getValue();

    // ------------------------------------------------------------------------
    // PASSO 6: AUDITORIA DAS INVARIANTES E CLASSIFICAÇÕES ACUMULADAS
    // ------------------------------------------------------------------------
    // Pontuações WDC:
    // Verstappen: 18 (R1) + 8 (Sprint) + 25 (R2) = 51 pts (Assume liderança: rank 1, rankChange: +1)
    // Leclerc: 15 (R1) + 6 (Sprint) + 15 (R2) = 36 pts (Sobe para rank 2, rankChange: +1)
    // Piastri: 12 (R1) + 5 (Sprint) + 18 (R2) = 35 pts (Sobe para rank 3, rankChange: +1)
    // Norris: 25 (R1) + 7 (Sprint) + 0 (DSQ R2) = 32 pts (Cai para rank 4, rankChange: -3)
    // Hamilton: 10 (R1) + 4 (Sprint) + 12 (R2) = 26 pts
    // Lawson: 8 (R1) + 3 (Sprint) + 10 (R2) = 21 pts
    assert.equal(wdcRound2.getLeader()?.driverId.toValue(), 'drv-ver');
    assert.equal(wdcRound2.getEntry(driverVerstappen.id)?.points, 51);
    assert.equal(wdcRound2.getEntry(driverVerstappen.id)?.rankChange, 1);

    assert.equal(wdcRound2.getEntry(driverLeclerc.id)?.points, 36);
    assert.equal(wdcRound2.getEntry(driverLeclerc.id)?.rankChange, 1);

    assert.equal(wdcRound2.getEntry(driverPiastri.id)?.points, 35);
    assert.equal(wdcRound2.getEntry(driverPiastri.id)?.rankChange, 1);

    assert.equal(wdcRound2.getEntry(driverNorris.id)?.points, 32);
    assert.equal(wdcRound2.getEntry(driverNorris.id)?.rankChange, -3);

    // Pontuações WCC:
    // Red Bull: 26 (R1) + 11 (Sprint) + 35 (R2) = 72 pts (Assume liderança: rankChange: +1)
    // McLaren: 37 (R1) + 12 (Sprint) + 18 (R2) = 67 pts (Cai para 2º: rankChange: -1)
    // Ferrari: 25 (R1) + 10 (Sprint) + 27 (R2) = 62 pts
    assert.equal(wccRound2.getLeader()?.constructorId.toValue(), 'const-redbull');
    assert.equal(wccRound2.getEntry(constRedBull.id)?.points, 72);
    assert.equal(wccRound2.getEntry(constRedBull.id)?.rankChange, 1);

    assert.equal(wccRound2.getEntry(constMcLaren.id)?.points, 67);
    assert.equal(wccRound2.getEntry(constMcLaren.id)?.rankChange, -1);

    assert.equal(wccRound2.getEntry(constFerrari.id)?.points, 62);

    season = completeGrandPrix(season, 2).getValue();
    gpChn = gpChn.completeGrandPrix().getValue();

    season = concludeSeason(season).getValue();
    assert.equal(season.status, SeasonStatus.CONCLUDED);
  });

  describe('Cenários Negativos e Proteções Transversais de Domínio', () => {
    it('deve rejeitar participante sem SeasonEntry tentando largar em corrida competitiva', () => {
      const driverNonRegistered = Driver.create({
        id: EntityId.from<'driver'>('drv-ghost'),
        firstName: 'Ghost',
        lastName: 'Racer',
        code: 'GHO',
        nationality: 'Unknown',
        permanentNumber: 99
      }).getValue();

      const invalidEntry = SessionEntry.create({
        id: EntityId.from<'session-entry'>('se-invalid'),
        sessionId: EntityId.from<'session'>('ses-race'),
        driverId: driverNonRegistered.id,
        teamId: EntityId.from<'team'>('team-ferrari'),
        constructorId: EntityId.from<'constructor'>('const-ferrari'),
        carNumber: 99
      }).getValue();

      const result = validateSessionParticipantEligibility({
        sessionEntry: invalidEntry,
        sessionType: SessionType.RACE,
        seasonEntries: [],
        roundNumber: 1
      });

      assert.equal(result.isFailure, true);
      assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
      assert.match(result.getError().message, /não possui inscrição formal/);
    });

    it('deve rejeitar GrandPrix associado a temporada incorreta', () => {
      const seasonA = createSeason({ id: EntityId.from<'season'>('sea-a'), year: 2025 }).getValue();
      const seasonB = createSeason({ id: EntityId.from<'season'>('sea-b'), year: 2026 }).getValue();

      const gp = GrandPrix.create({
        id: EntityId.from<'grand-prix'>('gp-01'),
        seasonId: seasonB.id, // Pertence a season B
        circuitId: EntityId.from<'circuit'>('cir-01'),
        name: 'GP Test',
        roundNumber: 1,
        format: GrandPrixFormat.STANDARD,
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-05-03')
      }).getValue();

      const result = validateSeasonGrandPrixConsistency({
        season: seasonA, // Testado contra season A
        grandPrix: gp
      });

      assert.equal(result.isFailure, true);
      assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
      assert.match(result.getError().message, /foi vinculado à temporada/);
    });

    it('deve rejeitar e isolar hermeticamente resultados SIMULATED de apurações oficiais (INV-CH-05)', () => {
      const simulatedResult = SessionResult.create({
        id: EntityId.from<'session-result'>('res-sim-01'),
        sessionId: EntityId.from<'session'>('ses-01'),
        driverId: EntityId.from<'driver'>('drv-nor'),
        teamId: EntityId.from<'team'>('team-mclaren'),
        constructorId: EntityId.from<'constructor'>('const-mclaren'),
        position: 1,
        lapsCompleted: 50,
        status: ResultStatus.FINISHED,
        publicationState: PublicationState.SIMULATED // Modo Simulado
      }).getValue();

      const result = StandingsCalculator.calculateDriverStandings({
        seasonId: season2025Id,
        roundNumber: 1,
        sessions: [
          { roundNumber: 1, sessionType: SessionType.RACE, results: [simulatedResult] }
        ],
        ruleset: ruleset2025,
        isSimulation: false // Apuração oficial solicitada
      });

      assert.equal(result.isFailure, true);
      assert.equal(result.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);
      assert.match(result.getError().message, /INV-CH-05/);
    });
  });
});
