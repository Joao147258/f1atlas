/**
 * @fileoverview Fixtures Determinísticas de Season — F1Atlas
 *
 * @module apps/api/test/integration/database/fixtures/season.fixture
 */

import {
  Season,
  SeasonStatus as DomainSeasonStatus,
  EntityId
} from '@f1atlas/domain';

export function createValidSeasonFixture(params?: {
  id?: string;
  year?: number;
  status?: DomainSeasonStatus;
  description?: string;
}): Season {
  const seasonId = EntityId.from<'season'>(params?.id || 'season-2025-test');
  const result = Season.create({
    id: seasonId,
    year: params?.year ?? 2025,
    status: params?.status ?? DomainSeasonStatus.PLANNED,
    description: params?.description ?? 'FIA Formula One World Championship 2025 (Test)'
  });

  if (!result.isSuccess) {
    throw new Error(`Falha ao criar Season fixture: ${result.getError().message}`);
  }

  return result.getValue();
}
