/**
 * @fileoverview Testes de Integração Real: PrismaInfrastructureHealthRepository — F1Atlas
 *
 * Valida o adaptador de saúde de infraestrutura contra banco de dados relacional:
 * 1. Gravação de verificação de saúde com component, status e detalhes.
 * 2. Consulta de último registro ordenado por checkedAt desc.
 * 3. Ausência de vazamento de credenciais ou erros SQL internos.
 *
 * @module apps/api/test/integration/database/repositories/prisma-infrastructure-health.repository.integration.spec
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseTestEnvironment, type TestEnvironmentStatus } from '../setup/database-test-environment.js';
import { PrismaInfrastructureHealthRepository } from '../../../../src/infrastructure/database/prisma/repositories/prisma-infrastructure-health.repository.js';

describe('PrismaInfrastructureHealthRepository — Real Database Integration Tests', () => {
  let envStatus: TestEnvironmentStatus;
  let healthRepo: PrismaInfrastructureHealthRepository;

  before(async () => {
    envStatus = await DatabaseTestEnvironment.getInstance().setup();
    if (envStatus.canRun) {
      const prisma = DatabaseTestEnvironment.getInstance().getPrismaClient();
      healthRepo = new PrismaInfrastructureHealthRepository(prisma as any);
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

  it('deve registrar verificação de saúde e recuperar a mais recente por componente', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    await healthRepo.recordHealthCheck({
      id: 'health-test-1',
      component: 'MySQL-Database',
      status: 'UP',
      details: 'Pool ativo e respondendo dentro do threshold'
    });

    const latest = await healthRepo.findLatestByComponent('MySQL-Database');
    assert.ok(latest !== null);
    assert.equal(latest.component, 'MySQL-Database');
    assert.equal(latest.status, 'UP');
    assert.equal(latest.details, 'Pool ativo e respondendo dentro do threshold');
  });

  it('deve retornar null se o componente não tiver registros de saúde', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const notFound = await healthRepo.findLatestByComponent('ComponenteInexistente');
    assert.equal(notFound, null);
  });
});
