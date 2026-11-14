/**
 * @fileoverview Fixtures Determinísticas de Standings (DriverStandings e ConstructorStandings) — F1Atlas
 *
 * @module apps/api/test/integration/database/fixtures/standings.fixture
 */

import {
  DriverStandings,
  ConstructorStandings,
  StandingStatus as DomainStandingStatus,
  EntityId
} from '@f1atlas/domain';

export function createValidDriverStandingsFixture(params?: {
  id?: string;
  seasonId?: string;
  roundNumber?: number;
}): DriverStandings {
  const standingsId = EntityId.from<'driver-standings'>(params?.id || 'wdc-test-round-1');
  const result = DriverStandings.create({
    id: standingsId,
    seasonId: EntityId.from<'season'>(params?.seasonId || 'season-2025-test'),
    roundNumber: params?.roundNumber ?? 1,
    status: DomainStandingStatus.OFFICIAL,
    entries: [
      {
        rank: 1,
        driverId: EntityId.from<'driver'>('driver-test-ver'),
        constructorId: EntityId.from<'constructor'>('const-test-redbull'),
        points: 25,
        wins: 1,
        podiums: 1,
        gpFinishes: [1],
        sprintFinishes: [],
        rankChange: 0
      }
    ]
  });

  if (!result.isSuccess) {
    throw new Error(`Falha ao criar DriverStandings fixture: ${result.getError().message}`);
  }

  return result.getValue();
}

export function createValidConstructorStandingsFixture(params?: {
  id?: string;
  seasonId?: string;
  roundNumber?: number;
}): ConstructorStandings {
  const standingsId = EntityId.from<'constructor-standings'>(params?.id || 'wcc-test-round-1');
  const result = ConstructorStandings.create({
    id: standingsId,
    seasonId: EntityId.from<'season'>(params?.seasonId || 'season-2025-test'),
    roundNumber: params?.roundNumber ?? 1,
    status: DomainStandingStatus.OFFICIAL,
    entries: [
      {
        rank: 1,
        constructorId: EntityId.from<'constructor'>('const-test-redbull'),
        points: 25,
        wins: 1,
        podiums: 1,
        rankChange: 0
      }
    ]
  });

  if (!result.isSuccess) {
    throw new Error(`Falha ao criar ConstructorStandings fixture: ${result.getError().message}`);
  }

  return result.getValue();
}
