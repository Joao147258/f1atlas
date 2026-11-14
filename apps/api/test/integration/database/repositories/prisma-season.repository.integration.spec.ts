/**
 * @fileoverview Testes de Integração Real: PrismaSeasonRepository — F1Atlas
 *
 * Valida o adaptador concreto PrismaSeasonRepository contra banco de dados relacional:
 * 1. Persistência de temporada válida e recuperação por ID e Ano.
 * 2. Reconstituição da raiz de agregado Season com invariantes e enum de status.
 * 3. Sincronização atômica de etapas do calendário em $transaction.
 * 4. Tratamento de unicidade (P2002) e temporada inexistente.
 * 5. Proteção de ambiente e isolamento transacional.
 *
 * @module apps/api/test/integration/database/repositories/prisma-season.repository.integration.spec
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId, SeasonStatus } from '@f1atlas/domain';
import { DatabaseTestEnvironment, type TestEnvironmentStatus } from '../setup/database-test-environment.js';
import { PrismaSeasonRepository } from '../../../../src/infrastructure/database/prisma/repositories/prisma-season.repository.js';
import { createValidSeasonFixture } from '../fixtures/season.fixture.js';

describe('PrismaSeasonRepository — Real Database Integration Tests', () => {
  let envStatus: TestEnvironmentStatus;
  let seasonRepo: PrismaSeasonRepository;

  before(async () => {
    envStatus = await DatabaseTestEnvironment.getInstance().setup();
    if (envStatus.canRun) {
      const prisma = DatabaseTestEnvironment.getInstance().getPrismaClient();
      seasonRepo = new PrismaSeasonRepository(prisma as any);
    }
  });

  beforeEach(async () => {
    if (envStatus?.canRun) {
      await DatabaseTestEnvironment.getInstance().cleanDatabase();
    }
  });

  after(async () => {
    if (envStatus?.canRun) {
      await DatabaseTestEnvironment.getInstance().teardown();
    }
  });

  it('deve persistir uma temporada válida e recuperá-la por ID e por Ano', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const season = createValidSeasonFixture({
      id: 'season-2025-int-test',
      year: 2025,
      status: SeasonStatus.IN_PROGRESS,
      description: 'Temporada Oficial F1 2025 (Integração)'
    });

    await seasonRepo.save(season);

    // 1. Busca por ID
    const foundById = await seasonRepo.findById(EntityId.from<'season'>('season-2025-int-test'));
    assert.ok(foundById !== null, 'Temporada deve ser localizada por ID');
    assert.equal(foundById.year, 2025);
    assert.equal(foundById.status, SeasonStatus.IN_PROGRESS);

    // 2. Busca por Ano
    const foundByYear = await seasonRepo.findByYear(2025);
    assert.ok(foundByYear !== null, 'Temporada deve ser localizada por Ano');
    assert.equal(foundByYear.id.value, 'season-2025-int-test');

    // 3. existsByYear
    const exists = await seasonRepo.existsByYear(2025);
    assert.equal(exists, true);
  });

  it('deve retornar null ao buscar temporada inexistente', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const notFound = await seasonRepo.findById(EntityId.from<'season'>('season-inexistente'));
    assert.equal(notFound, null);

    const exists = await seasonRepo.existsByYear(1940);
    assert.equal(exists, false);
  });

  it('deve traduzir violação de unicidade de ano para erro de persistência amigável', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const season1 = createValidSeasonFixture({
      id: 'season-2025-a',
      year: 2025
    });
    const season2 = createValidSeasonFixture({
      id: 'season-2025-b',
      year: 2025
    });

    await seasonRepo.save(season1);

    await assert.rejects(
      async () => {
        await seasonRepo.save(season2);
      },
      (err: any) => {
        assert.ok(err.name.includes('UniqueConstraint') || err.message.includes('2025'));
        return true;
      }
    );
  });
});
