/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes de Integração
 * ============================================================================
 *
 * Suíte de Testes de Integração: Seasons <-> Events (M2.1-IT-C)
 * Arquivo: packages/domain/test/integration/seasons-events.integration.test.ts
 *
 * Objetivo Arquitetural:
 * Validar a colaboração contratual entre a governança do calendário anual (Season)
 * e a execução de eventos de pista (GrandPrix, Circuit, Session).
 * ============================================================================
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { EntityId } from '../../src/shared/entity-id.ts';
import { DomainErrorCode } from '../../src/shared/domain-error.ts';
import {
  createSeason,
  scheduleGrandPrix,
  completeGrandPrix,
  startSeason,
  Season,
  ScheduledGrandPrixStatus
} from '../../src/seasons/season.ts';
import { SeasonStatus } from '../../src/seasons/season-status.ts';
import { Circuit } from '../../src/events/circuit.ts';
import {
  GrandPrix,
  GrandPrixFormat,
  GrandPrixStatus
} from '../../src/events/grand-prix.ts';
import { Session, SessionType, SessionStatus } from '../../src/events/session.ts';

describe('M2.1-IT-C — Integração Seasons <-> Events (INT-02)', () => {
  const seasonId = EntityId.from<'season'>('season-2025');
  const gpAustraliaId = EntityId.from<'grand-prix'>('gp-australia-2025');
  const gpChinaId = EntityId.from<'grand-prix'>('gp-china-2025');
  const circuitAlbertParkId = EntityId.from<'circuit'>('circuit-albert-park');
  const circuitShanghaiId = EntityId.from<'circuit'>('circuit-shanghai');

  function createCircuits() {
    const albertPark = Circuit.create({
      id: circuitAlbertParkId,
      name: 'Albert Park Circuit',
      city: 'Melbourne',
      country: 'Australia',
      trackLengthMeters: 5278,
      cornersCount: 14,
      timezone: 'Australia/Melbourne'
    }).getValue();

    const shanghai = Circuit.create({
      id: circuitShanghaiId,
      name: 'Shanghai International Circuit',
      city: 'Shanghai',
      country: 'China',
      trackLengthMeters: 5451,
      cornersCount: 16,
      timezone: 'Asia/Shanghai'
    }).getValue();

    return { albertPark, shanghai };
  }

  test('IT-SE-EV-01 — deve alinhar o agendamento no calendário com a instanciação de GrandPrix e Circuit', () => {
    const { albertPark } = createCircuits();

    // 1. Cria temporada e agenda etapa de Melbourne
    const startGpDate = new Date('2025-03-14T00:00:00.000Z');
    const endGpDate = new Date('2025-03-16T23:59:59.000Z');

    let season = createSeason({ id: seasonId, year: 2025 }).getValue();
    season = scheduleGrandPrix(season, {
      grandPrixId: gpAustraliaId,
      roundNumber: 1,
      name: 'Australian Grand Prix',
      startDate: startGpDate,
      endDate: endGpDate
    }).getValue();

    assert.equal(season.totalRounds, 1);
    const scheduledGp = season.grandPrixList[0];
    assert.equal(scheduledGp.grandPrixId.equals(gpAustraliaId), true);
    assert.equal(scheduledGp.roundNumber, 1);
    assert.equal(scheduledGp.status, ScheduledGrandPrixStatus.SCHEDULED);

    // 2. Criação do Aggregate Root GrandPrix para a rodada 1
    const gpRes = GrandPrix.create({
      id: gpAustraliaId,
      seasonId: season.id,
      circuitId: albertPark.id,
      name: 'Formula 1 Louis Vuitton Australian Grand Prix 2025',
      roundNumber: 1,
      format: GrandPrixFormat.STANDARD,
      startDate: startGpDate,
      endDate: endGpDate
    });

    assert.equal(gpRes.isSuccess, true);
    const gp = gpRes.getValue();

    // Preservação de identidades e consistência de rodada
    assert.equal(gp.id.equals(scheduledGp.grandPrixId), true);
    assert.equal(gp.seasonId.equals(season.id), true);
    assert.equal(gp.circuitId.equals(albertPark.id), true);
    assert.equal(gp.roundNumber, scheduledGp.roundNumber);
    assert.equal(gp.status, GrandPrixStatus.SCHEDULED);
  });

  test('IT-SE-EV-02 — deve adicionar sessões ao GrandPrix garantindo ordenação cronológica estrita', () => {
    const { albertPark } = createCircuits();
    const startGpDate = new Date('2025-03-14T00:00:00.000Z');
    const endGpDate = new Date('2025-03-16T23:59:59.000Z');

    let gp = GrandPrix.create({
      id: gpAustraliaId,
      seasonId,
      circuitId: albertPark.id,
      name: 'Australian Grand Prix',
      roundNumber: 1,
      format: GrandPrixFormat.STANDARD,
      startDate: startGpDate,
      endDate: endGpDate
    }).getValue();

    // Cria sessões em ordem cronológica real
    const sessionFp1 = Session.create({
      id: EntityId.from<'session'>('ses-aus-fp1'),
      grandPrixId: gp.id,
      type: SessionType.FP1,
      scheduledStartTime: new Date('2025-03-14T01:30:00.000Z')
    }).getValue();

    const sessionQuali = Session.create({
      id: EntityId.from<'session'>('ses-aus-quali'),
      grandPrixId: gp.id,
      type: SessionType.QUALIFYING,
      scheduledStartTime: new Date('2025-03-15T05:00:00.000Z')
    }).getValue();

    const sessionRace = Session.create({
      id: EntityId.from<'session'>('ses-aus-race'),
      grandPrixId: gp.id,
      type: SessionType.RACE,
      scheduledStartTime: new Date('2025-03-16T04:00:00.000Z')
    }).getValue();

    // Adiciona ao GP deliberadamente fora de ordem (Race antes de Quali e FP1)
    gp = gp.addSession(sessionRace).getValue();
    gp = gp.addSession(sessionFp1).getValue();
    gp = gp.addSession(sessionQuali).getValue();

    assert.equal(gp.sessions.length, 3);
    // Verifica se o agregado reordenou estritamente por scheduledStartTime
    assert.equal(gp.sessions[0].type, SessionType.FP1);
    assert.equal(gp.sessions[1].type, SessionType.QUALIFYING);
    assert.equal(gp.sessions[2].type, SessionType.RACE);
  });

  test('IT-SE-EV-03 — deve rejeitar sessões inconsistentes com a janela ou GP do evento', () => {
    const { albertPark } = createCircuits();
    const startGpDate = new Date('2025-03-14T00:00:00.000Z');
    const endGpDate = new Date('2025-03-16T23:59:59.000Z');

    const gp = GrandPrix.create({
      id: gpAustraliaId,
      seasonId,
      circuitId: albertPark.id,
      name: 'Australian Grand Prix',
      roundNumber: 1,
      startDate: startGpDate,
      endDate: endGpDate
    }).getValue();

    // 1. Rejeita sessão associada a outro GP
    const sessionOtherGp = Session.create({
      id: EntityId.from<'session'>('ses-other-gp'),
      grandPrixId: gpChinaId, // Pertence a GP China!
      type: SessionType.FP1,
      scheduledStartTime: new Date('2025-03-14T01:30:00.000Z')
    }).getValue();

    const failGpMismatch = gp.addSession(sessionOtherGp);
    assert.equal(failGpMismatch.isSuccess, false);
    assert.equal(failGpMismatch.getError().code, DomainErrorCode.INVARIANT_VIOLATION);

    // 2. Rejeita sessão agendada fora do intervalo do fim de semana do GP (EVT-INV-002)
    const sessionOutsideWindow = Session.create({
      id: EntityId.from<'session'>('ses-outside-window'),
      grandPrixId: gpAustraliaId,
      type: SessionType.FP1,
      scheduledStartTime: new Date('2025-03-18T00:00:00.000Z') // 2 dias depois do encerramento!
    }).getValue();

    const failOutsideWindow = gp.addSession(sessionOutsideWindow);
    assert.equal(failOutsideWindow.isSuccess, false);
    assert.equal(failOutsideWindow.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
  });

  test('IT-SE-EV-04 — deve sincronizar o ciclo de vida entre evento e calendário da temporada', () => {
    const { albertPark } = createCircuits();
    const startGpDate = new Date('2025-03-14T00:00:00.000Z');
    const endGpDate = new Date('2025-03-16T23:59:59.000Z');

    let season = createSeason({ id: seasonId, year: 2025 }).getValue();
    season = scheduleGrandPrix(season, {
      grandPrixId: gpAustraliaId,
      roundNumber: 1,
      name: 'Australian Grand Prix',
      startDate: startGpDate,
      endDate: endGpDate
    }).getValue();

    // Inicia a temporada
    season = startSeason(season).getValue();
    assert.equal(season.status, SeasonStatus.IN_PROGRESS);

    let gp = GrandPrix.create({
      id: gpAustraliaId,
      seasonId: season.id,
      circuitId: albertPark.id,
      name: 'Australian Grand Prix',
      roundNumber: 1,
      startDate: startGpDate,
      endDate: endGpDate
    }).getValue();

    // Conclui o evento do GP
    gp = gp.completeGrandPrix().getValue();
    assert.equal(gp.status, GrandPrixStatus.COMPLETED);

    // Conclui a etapa no calendário da temporada
    season = completeGrandPrix(season, 1).getValue();
    assert.equal(season.grandPrixList[0].status, ScheduledGrandPrixStatus.COMPLETED);

    // Ambas as raízes de agregado agora refletem o status concluído
    assert.equal(gp.status, GrandPrixStatus.COMPLETED);
    assert.equal(season.grandPrixList[0].status, ScheduledGrandPrixStatus.COMPLETED);
  });

  test('IT-SE-EV-05 — lacuna arquitetural: ausência de sincronizador automático entre agregados', () => {
    // Demonstra que alterar GrandPrix NÃO altera Season automaticamente.
    // O modelo adota Reference by Identity para respeitar limites de agregado do DDD.
    const { albertPark } = createCircuits();
    let season = createSeason({ id: seasonId, year: 2025 }).getValue();
    season = scheduleGrandPrix(season, {
      grandPrixId: gpAustraliaId,
      roundNumber: 1,
      name: 'Australian Grand Prix'
    }).getValue();

    let gp = GrandPrix.create({
      id: gpAustraliaId,
      seasonId: season.id,
      circuitId: albertPark.id,
      name: 'Australian Grand Prix',
      roundNumber: 1,
      startDate: new Date('2025-03-14T00:00:00Z'),
      endDate: new Date('2025-03-16T23:59:59Z')
    }).getValue();

    // Cancela o GP no agregado de eventos
    gp = gp.cancelGrandPrix('Mau tempo').getValue();
    assert.equal(gp.status, GrandPrixStatus.CANCELLED);

    // A temporada permanece SCHEDULED até que um orquestrador/caso de uso sincronize explicitamente:
    assert.equal(season.grandPrixList[0].status, ScheduledGrandPrixStatus.SCHEDULED);
    assert.notEqual(season.grandPrixList[0].status, gp.status);
  });
});
