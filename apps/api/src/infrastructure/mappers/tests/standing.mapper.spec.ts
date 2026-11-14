/**
 * @fileoverview Testes Automatizados Unitários de StandingMapper — F1Atlas
 *
 * Valida a conversão bidirecional entre registros do Prisma e as projeções de classificação:
 * 1. DriverStandings (WDC) (Domínio <-> Prisma)
 * 2. ConstructorStandings (WCC) (Domínio <-> Prisma)
 * 3. Preservação de pontuação, posições, vitórias e ordenação estrita 1..N
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DriverStandings,
  ConstructorStandings,
  StandingStatus as DomainStandingStatus,
  EntityId
} from '@f1atlas/domain';
import {
  StandingMapper,
  type PrismaDriverStandingsRecord,
  type PrismaConstructorStandingsRecord
} from '../standing.mapper.js';

describe('StandingMapper — Unit & Round-trip Tests', () => {
  it('deve converter DriverStandings para persistência e reconstituir do Prisma', () => {
    const standingsId = EntityId.from<'driver-standings'>('wdc-round-1-uuid');
    const standings = DriverStandings.create({
      id: standingsId,
      seasonId: EntityId.from<'season'>('season-2025'),
      roundNumber: 1,
      status: DomainStandingStatus.OFFICIAL,
      entries: [
        {
          rank: 1,
          driverId: EntityId.from<'driver'>('driver-norris'),
          constructorId: EntityId.from<'constructor'>('constructor-mclaren'),
          points: 25,
          wins: 1,
          podiums: 1,
          gpFinishes: [1],
          sprintFinishes: [],
          rankChange: 0
        },
        {
          rank: 2,
          driverId: EntityId.from<'driver'>('driver-verstappen'),
          constructorId: EntityId.from<'constructor'>('constructor-redbull'),
          points: 18,
          wins: 0,
          podiums: 1,
          gpFinishes: [2],
          sprintFinishes: [],
          rankChange: 0
        }
      ]
    }).getValue();

    const persistence = StandingMapper.driverStandingsToPersistence(standings);
    assert.equal(persistence.id, 'wdc-round-1-uuid');
    assert.equal(persistence.roundNumber, 1);
    assert.equal(persistence.entries.length, 2);
    assert.equal(persistence.entries[0].points, 25);

    const prismaRecord: PrismaDriverStandingsRecord = {
      id: persistence.id,
      seasonId: persistence.seasonId,
      roundNumber: persistence.roundNumber,
      calculatedAt: persistence.calculatedAt,
      driverEntries: persistence.entries.map(e => ({
        driverId: e.driverId,
        constructorId: e.constructorId,
        position: e.position,
        points: e.points,
        winsCount: e.winsCount,
        podiumsCount: e.podiumsCount,
        tiebreakerRank: e.tiebreakerRank
      }))
    };

    const reconstructed = StandingMapper.driverStandingsToDomain(prismaRecord);
    assert.equal(reconstructed.id.value, standings.id.value);
    assert.equal(reconstructed.roundNumber, 1);
    assert.equal(reconstructed.entries.length, 2);
    assert.equal(reconstructed.entries[0].driverId.value, 'driver-norris');
    assert.equal(reconstructed.entries[0].points, 25);
    assert.equal(reconstructed.entries[1].driverId.value, 'driver-verstappen');
    assert.equal(reconstructed.entries[1].points, 18);
  });

  it('deve converter ConstructorStandings para persistência e reconstituir do Prisma', () => {
    const standingsId = EntityId.from<'constructor-standings'>('wcc-round-1-uuid');
    const standings = ConstructorStandings.create({
      id: standingsId,
      seasonId: EntityId.from<'season'>('season-2025'),
      roundNumber: 1,
      status: DomainStandingStatus.OFFICIAL,
      entries: [
        {
          rank: 1,
          constructorId: EntityId.from<'constructor'>('constructor-mclaren'),
          points: 40,
          wins: 1,
          podiums: 2,
          gpFinishes: [1, 3],
          sprintFinishes: [],
          rankChange: 0
        },
        {
          rank: 2,
          constructorId: EntityId.from<'constructor'>('constructor-ferrari'),
          points: 27,
          wins: 0,
          podiums: 1,
          gpFinishes: [2, 4],
          sprintFinishes: [],
          rankChange: 0
        }
      ]
    }).getValue();

    const persistence = StandingMapper.constructorStandingsToPersistence(standings);
    assert.equal(persistence.id, 'wcc-round-1-uuid');
    assert.equal(persistence.entries.length, 2);
    assert.equal(persistence.entries[0].points, 40);

    const prismaRecord: PrismaConstructorStandingsRecord = {
      id: persistence.id,
      seasonId: persistence.seasonId,
      roundNumber: persistence.roundNumber,
      calculatedAt: persistence.calculatedAt,
      constructorEntries: persistence.entries.map(e => ({
        constructorId: e.constructorId,
        teamId: e.teamId,
        position: e.position,
        points: e.points,
        winsCount: e.winsCount,
        podiumsCount: e.podiumsCount,
        tiebreakerRank: e.tiebreakerRank
      }))
    };

    const reconstructed = StandingMapper.constructorStandingsToDomain(prismaRecord);
    assert.equal(reconstructed.id.value, standings.id.value);
    assert.equal(reconstructed.entries.length, 2);
    assert.equal(reconstructed.entries[0].constructorId.value, 'constructor-mclaren');
    assert.equal(reconstructed.entries[0].points, 40);
  });

  it('deve rejeitar DriverStandings com constructorId ausente', () => {
    const invalidRecord: PrismaDriverStandingsRecord = {
      id: 'wdc-invalid-uuid',
      seasonId: 'season-2025',
      roundNumber: 1,
      calculatedAt: new Date(),
      driverEntries: [
        {
          driverId: 'driver-norris',
          constructorId: '', // Vazio / ausente
          position: 1,
          points: 25,
          winsCount: 1,
          podiumsCount: 1
        }
      ]
    };

    assert.throws(
      () => StandingMapper.driverStandingsToDomain(invalidRecord),
      /constructorId ausente para o piloto "driver-norris"/
    );
  });

  it('deve usar teamIdResolver ao persistir ConstructorStandings com IDs distintos', () => {
    const standings = ConstructorStandings.create({
      id: EntityId.from<'constructor-standings'>('wcc-custom-uuid'),
      seasonId: EntityId.from<'season'>('season-2025'),
      roundNumber: 1,
      status: DomainStandingStatus.OFFICIAL,
      entries: [
        {
          rank: 1,
          constructorId: EntityId.from<'constructor'>('constructor-mercedes'),
          points: 25,
          wins: 1,
          podiums: 1,
          gpFinishes: [1],
          sprintFinishes: [],
          rankChange: 0
        }
      ]
    }).getValue();

    const persistence = StandingMapper.constructorStandingsToPersistence(
      standings,
      (constructorId) => (constructorId === 'constructor-mercedes' ? 'team-mercedes-corporate' : null)
    );

    assert.equal(persistence.entries[0].constructorId, 'constructor-mercedes');
    assert.equal(persistence.entries[0].teamId, 'team-mercedes-corporate');
  });
});
