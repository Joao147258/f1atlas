/**
 * @fileoverview Fixtures Determinísticas de Circuit e GrandPrix — F1Atlas
 *
 * @module apps/api/test/integration/database/fixtures/grand-prix.fixture
 */

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

export function createValidCircuitFixture(params?: {
  id?: string;
  name?: string;
}): Circuit {
  const circuitId = EntityId.from<'circuit'>(params?.id || 'circuit-test-albert-park');
  const result = Circuit.create({
    id: circuitId,
    name: params?.name || 'Albert Park Circuit',
    city: 'Melbourne',
    country: 'Australia',
    trackLengthMeters: 5278,
    cornersCount: 14,
    timezone: 'Australia/Melbourne'
  });

  if (!result.isSuccess) {
    throw new Error(`Falha ao criar Circuit fixture: ${result.getError().message}`);
  }

  return result.getValue();
}

export function createValidGrandPrixFixture(params?: {
  id?: string;
  seasonId?: string;
  circuitId?: string;
  name?: string;
  roundNumber?: number;
}): GrandPrix {
  const gpId = EntityId.from<'grand-prix'>(params?.id || 'gp-test-australia-2025');
  const result = GrandPrix.create({
    id: gpId,
    seasonId: EntityId.from<'season'>(params?.seasonId || 'season-2025-test'),
    circuitId: EntityId.from<'circuit'>(params?.circuitId || 'circuit-test-albert-park'),
    name: params?.name || 'Australian Grand Prix',
    roundNumber: params?.roundNumber ?? 1,
    format: GrandPrixFormat.STANDARD,
    startDate: new Date('2025-03-14T00:00:00Z'),
    endDate: new Date('2025-03-16T23:59:59Z')
  });

  if (!result.isSuccess) {
    throw new Error(`Falha ao criar GrandPrix fixture: ${result.getError().message}`);
  }

  return result.getValue();
}
