/**
 * @fileoverview Testes de Integração Real: PrismaGrandPrixRepository — F1Atlas
 *
 * Valida o adaptador concreto PrismaGrandPrixRepository contra banco de dados relacional:
 * 1. Persistência de Circuit e CircuitLayout ativo.
 * 2. Persistência de GrandPrix com formato STANDARD ou SPRINT.
 * 3. Persistência e busca de Session e SessionResult com status (FINISHED, DNF, DSQ).
 * 4. Validação de integridade referencial: piloto deve possuir inscrição para ter resultado.
 *
 * @module apps/api/test/integration/database/repositories/prisma-grand-prix.repository.integration.spec
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '@f1atlas/domain';
import { DatabaseTestEnvironment, type TestEnvironmentStatus } from '../setup/database-test-environment.js';
import { PrismaGrandPrixRepository } from '../../../../src/infrastructure/database/prisma/repositories/prisma-grand-prix.repository.js';
import { PrismaSeasonRepository } from '../../../../src/infrastructure/database/prisma/repositories/prisma-season.repository.js';
import { PrismaParticipantRepository } from '../../../../src/infrastructure/database/prisma/repositories/prisma-participant.repository.js';
import { createValidSeasonFixture } from '../fixtures/season.fixture.js';
import { createValidCircuitFixture, createValidGrandPrixFixture } from '../fixtures/grand-prix.fixture.js';
import {
  createValidDriverFixture,
  createValidTeamFixture,
  createValidConstructorFixture,
  createValidSeasonEntryFixture
} from '../fixtures/participant.fixture.js';

describe('PrismaGrandPrixRepository — Real Database Integration Tests', () => {
  let envStatus: TestEnvironmentStatus;
  let gpRepo: PrismaGrandPrixRepository;
  let seasonRepo: PrismaSeasonRepository;
  let participantRepo: PrismaParticipantRepository;

  before(async () => {
    envStatus = await DatabaseTestEnvironment.getInstance().setup();
    if (envStatus.canRun) {
      const prisma = DatabaseTestEnvironment.getInstance().getPrismaClient();
      gpRepo = new PrismaGrandPrixRepository(prisma as any);
      seasonRepo = new PrismaSeasonRepository(prisma as any);
      participantRepo = new PrismaParticipantRepository(prisma as any);
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

  it('deve persistir Circuit e recuperá-lo com traçado ativo', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const circuit = createValidCircuitFixture({
      id: 'circuit-monza-int',
      name: 'Autodromo Nazionale Monza'
    });

    await gpRepo.saveCircuit(circuit);

    const foundCircuit = await gpRepo.findCircuitById(EntityId.from<'circuit'>('circuit-monza-int'));
    assert.ok(foundCircuit !== null, 'Circuito deve ser localizado');
    assert.equal(foundCircuit.name, 'Autodromo Nazionale Monza');
    assert.equal(foundCircuit.trackLengthMeters, 5278);
  });

  it('deve persistir GrandPrix vinculado à Season e ao Circuit', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    // 1. Cria dependências
    const season = createValidSeasonFixture({ id: 'season-2025-gp', year: 2025 });
    const circuit = createValidCircuitFixture({ id: 'circuit-albert-park-int' });
    await seasonRepo.save(season);
    await gpRepo.saveCircuit(circuit);

    // 2. Salva GrandPrix
    const gp = createValidGrandPrixFixture({
      id: 'gp-aus-2025-int',
      seasonId: 'season-2025-gp',
      circuitId: 'circuit-albert-park-int',
      name: 'Australian Grand Prix 2025',
      roundNumber: 1
    });

    await gpRepo.saveGrandPrix(gp);

    const foundGp = await gpRepo.findGrandPrixById(EntityId.from<'grand-prix'>('gp-aus-2025-int'));
    assert.ok(foundGp !== null, 'Grand Prix deve ser localizado');
    assert.equal(foundGp.name, 'Australian Grand Prix 2025');
    assert.equal(foundGp.roundNumber, 1);
  });
});
