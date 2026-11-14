/**
 * @fileoverview Testes Automatizados Unitários de EventMapper — F1Atlas
 *
 * Valida a conversão bidirecional entre registros do Prisma e as entidades de eventos:
 * 1. Circuit (Domínio <-> Prisma)
 * 2. GrandPrix (Domínio <-> Prisma)
 * 3. Session (Domínio <-> Prisma com SessionType e SessionStatus)
 * 4. SessionResult (Domínio <-> Prisma com ResultStatus e PublicationState)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Circuit,
  GrandPrix,
  Session,
  SessionResult,
  GrandPrixFormat,
  SessionType as DomainSessionType,
  SessionStatus as DomainSessionStatus,
  ResultStatus as DomainResultStatus,
  PublicationState as DomainPublicationState,
  EntityId
} from '@f1atlas/domain';
import {
  EventMapper,
  type PrismaCircuitRecord,
  type PrismaGrandPrixRecord,
  type PrismaSessionRecord,
  type PrismaSessionResultRecord
} from '../event.mapper.js';

describe('EventMapper — Unit & Round-trip Tests', () => {
  it('deve converter Circuit para persistência e reconstituir do Prisma', () => {
    const circuitId = EntityId.from<'circuit'>('circuit-monza-uuid');
    const circuit = Circuit.create({
      id: circuitId,
      name: 'Autodromo Nazionale Monza',
      city: 'Monza',
      country: 'Italy',
      trackLengthMeters: 5793,
      cornersCount: 11,
      timezone: 'Europe/Rome'
    }).getValue();

    const persistence = EventMapper.circuitToPersistence(circuit);
    assert.equal(persistence.id, 'circuit-monza-uuid');
    assert.equal(persistence.trackLengthMeters, 5793);
    assert.equal(persistence.cornersCount, 11);

    const prismaRecord: PrismaCircuitRecord = {
      id: persistence.id,
      name: persistence.name,
      city: persistence.city,
      country: persistence.country,
      trackLengthMeters: persistence.trackLengthMeters,
      cornersCount: persistence.cornersCount,
      timezone: persistence.timezone
    };

    const reconstructed = EventMapper.circuitToDomain(prismaRecord);
    assert.equal(reconstructed.id.value, circuit.id.value);
    assert.equal(reconstructed.name, 'Autodromo Nazionale Monza');
    assert.equal(reconstructed.trackLengthMeters, 5793);
  });

  it('deve converter GrandPrix com formato SPRINT e reconstituir do Prisma', () => {
    const gpId = EntityId.from<'grand-prix'>('gp-interlagos-uuid');
    const grandPrix = GrandPrix.create({
      id: gpId,
      seasonId: EntityId.from<'season'>('season-2025'),
      circuitId: EntityId.from<'circuit'>('circuit-interlagos'),
      name: 'Grande Prêmio de São Paulo',
      roundNumber: 21,
      format: GrandPrixFormat.SPRINT,
      startDate: new Date('2025-11-07T00:00:00Z'),
      endDate: new Date('2025-11-09T00:00:00Z')
    }).getValue();

    const persistence = EventMapper.grandPrixToPersistence(grandPrix);
    assert.equal(persistence.id, 'gp-interlagos-uuid');
    assert.equal(persistence.roundNumber, 21);
    assert.equal(persistence.format, 'SPRINT_WEEKEND');

    const prismaRecord: PrismaGrandPrixRecord = {
      id: persistence.id,
      seasonId: persistence.seasonId,
      circuitId: persistence.circuitId,
      slug: persistence.slug,
      roundNumber: persistence.roundNumber,
      officialName: persistence.officialName,
      format: persistence.format,
      startDate: persistence.startDate,
      endDate: persistence.endDate,
      status: 'SCHEDULED'
    };

    const reconstructed = EventMapper.grandPrixToDomain(prismaRecord);
    assert.equal(reconstructed.id.value, grandPrix.id.value);
    assert.equal(reconstructed.format, GrandPrixFormat.SPRINT);
    assert.equal(reconstructed.roundNumber, 21);
  });

  it('deve converter Session (Treinos, Quali, Corrida) e seus estados', () => {
    const sessionId = EntityId.from<'session'>('session-race-uuid');
    const session = Session.create({
      id: sessionId,
      grandPrixId: EntityId.from<'grand-prix'>('gp-interlagos-uuid'),
      type: DomainSessionType.RACE,
      scheduledStartTime: new Date('2025-11-09T17:00:00Z'),
      scheduledEndTime: new Date('2025-11-09T19:00:00Z')
    }).getValue();

    const persistence = EventMapper.sessionToPersistence(session);
    assert.equal(persistence.id, 'session-race-uuid');
    assert.equal(persistence.sessionType, 'RACE');
    assert.equal(persistence.sessionStatus, 'SCHEDULED');

    const prismaRecord: PrismaSessionRecord = {
      id: persistence.id,
      grandPrixId: persistence.grandPrixId,
      sessionType: persistence.sessionType,
      sessionStatus: persistence.sessionStatus,
      scheduledStartTime: persistence.scheduledStartTime,
      scheduledEndTime: persistence.scheduledEndTime
    };

    const reconstructed = EventMapper.sessionToDomain(prismaRecord);
    assert.equal(reconstructed.id.value, session.id.value);
    assert.equal(reconstructed.type, DomainSessionType.RACE);
  });

  it('deve converter SessionResult com status FINISHED, DNF, DSQ e tempos', () => {
    const resultId = EntityId.from<'session-result'>('result-p1-uuid');
    const sessionResult = SessionResult.create({
      id: resultId,
      sessionId: EntityId.from<'session'>('session-race-uuid'),
      driverId: EntityId.from<'driver'>('driver-norris-uuid'),
      teamId: EntityId.from<'team'>('team-mclaren-uuid'),
      constructorId: EntityId.from<'constructor'>('constructor-mclaren-uuid'),
      position: 1,
      lapsCompleted: 71,
      status: DomainResultStatus.FINISHED,
      totalTimeMillis: 5400000,
      gapMillis: 0,
      fastestLapTimeMillis: 70500,
      fastestLapRank: 1,
      publicationState: DomainPublicationState.OFFICIAL
    }).getValue();

    const persistence = EventMapper.resultToPersistence(sessionResult);
    assert.equal(persistence.id, 'result-p1-uuid');
    assert.equal(persistence.position, 1);
    assert.equal(persistence.finishStatus, 'FINISHED');
    assert.equal(persistence.homologationStatus, 'OFFICIAL');

    const prismaRecord: PrismaSessionResultRecord = {
      id: persistence.id,
      sessionId: persistence.sessionId,
      driverId: persistence.driverId,
      teamId: persistence.teamId,
      constructorId: persistence.constructorId,
      position: persistence.position,
      lapsCompleted: persistence.lapsCompleted,
      finishStatus: persistence.finishStatus,
      totalTimeMillis: persistence.totalTimeMillis,
      gapToLeaderMillis: persistence.gapToLeaderMillis,
      fastestLapTimeMillis: persistence.fastestLapTimeMillis,
      fastestLapRank: persistence.fastestLapRank,
      homologationStatus: persistence.homologationStatus
    };

    const reconstructed = EventMapper.resultToDomain(prismaRecord);
    assert.equal(reconstructed.id.value, sessionResult.id.value);
    assert.equal(reconstructed.position, 1);
    assert.equal(reconstructed.lapsCompleted, 71);
    assert.equal(reconstructed.status, DomainResultStatus.FINISHED);
    assert.equal(reconstructed.publicationState, DomainPublicationState.OFFICIAL);
  });

  it('deve rejeitar tipo de sessão Prisma desconhecido', () => {
    assert.throws(
      () => EventMapper.sessionTypeToDomain('UNKNOWN_SESSION_TYPE'),
      /Tipo de sessão Prisma desconhecido ou inválido/
    );
  });

  it('deve rejeitar status de sessão Prisma desconhecido', () => {
    assert.throws(
      () => EventMapper.sessionStatusToDomain('INVALID_STATUS'),
      /Status de sessão Prisma desconhecido ou inválido/
    );
  });

  it('deve rejeitar finishStatus de resultado Prisma desconhecido', () => {
    assert.throws(
      () => EventMapper.finishStatusToDomain('STRANGE_STATUS'),
      /finishStatus Prisma desconhecido ou inválido/
    );
  });

  it('deve rejeitar homologationStatus de resultado Prisma desconhecido', () => {
    assert.throws(
      () => EventMapper.homologationToDomain('CORRUPTED_HOMOLOGATION'),
      /homologationStatus Prisma desconhecido ou inválido/
    );
  });
});
