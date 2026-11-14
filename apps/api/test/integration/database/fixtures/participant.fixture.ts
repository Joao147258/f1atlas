/**
 * @fileoverview Fixtures Determinísticas de Participantes (Driver, Team, Constructor, SeasonEntry) — F1Atlas
 *
 * @module apps/api/test/integration/database/fixtures/participant.fixture
 */

import {
  Driver,
  Team,
  Constructor,
  SeasonEntry,
  EntryRole,
  EntityId
} from '@f1atlas/domain';

export function createValidDriverFixture(params?: {
  id?: string;
  firstName?: string;
  lastName?: string;
  code?: string;
  permanentNumber?: number;
}): Driver {
  const driverId = EntityId.from<'driver'>(params?.id || 'driver-test-ver');
  const result = Driver.create({
    id: driverId,
    firstName: params?.firstName || 'Max',
    lastName: params?.lastName || 'Verstappen',
    code: params?.code || 'VER',
    nationality: 'Dutch',
    permanentNumber: params?.permanentNumber ?? 1,
    isWorldChampion: true
  });

  if (!result.isSuccess) {
    throw new Error(`Falha ao criar Driver fixture: ${result.getError().message}`);
  }

  return result.getValue();
}

export function createValidTeamFixture(params?: {
  id?: string;
  name?: string;
  nationality?: string;
}): Team {
  const teamId = EntityId.from<'team'>(params?.id || 'team-test-redbull');
  const result = Team.create({
    id: teamId,
    name: params?.name || 'Red Bull Racing',
    legalName: params?.name ? `${params.name} Ltd` : 'Red Bull Racing Ltd',
    nationality: params?.nationality || 'Austrian'
  });

  if (!result.isSuccess) {
    throw new Error(`Falha ao criar Team fixture: ${result.getError().message}`);
  }

  return result.getValue();
}

export function createValidConstructorFixture(params?: {
  id?: string;
  name?: string;
  nationality?: string;
}): Constructor {
  const constructorId = EntityId.from<'constructor'>(params?.id || 'const-test-redbull');
  const result = Constructor.create({
    id: constructorId,
    name: params?.name || 'Red Bull Racing RBPT',
    nationality: params?.nationality || 'Austrian'
  });

  if (!result.isSuccess) {
    throw new Error(`Falha ao criar Constructor fixture: ${result.getError().message}`);
  }

  return result.getValue();
}

export function createValidSeasonEntryFixture(params?: {
  id?: string;
  seasonId?: string;
  driverId?: string;
  teamId?: string;
  constructorId?: string;
  carNumber?: number;
  role?: EntryRole;
}): SeasonEntry {
  const entryId = EntityId.from<'season-entry'>(params?.id || 'entry-test-ver-2025');
  const result = SeasonEntry.create({
    id: entryId,
    seasonId: EntityId.from<'season'>(params?.seasonId || 'season-2025-test'),
    driverId: EntityId.from<'driver'>(params?.driverId || 'driver-test-ver'),
    teamId: EntityId.from<'team'>(params?.teamId || 'team-test-redbull'),
    constructorId: EntityId.from<'constructor'>(params?.constructorId || 'const-test-redbull'),
    carNumber: params?.carNumber ?? 1,
    role: params?.role || EntryRole.REGULAR,
    status: 'CONFIRMED'
  });

  if (!result.isSuccess) {
    throw new Error(`Falha ao criar SeasonEntry fixture: ${result.getError().message}`);
  }

  return result.getValue();
}
