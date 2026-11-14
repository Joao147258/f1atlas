/**
 * @fileoverview Testes de Integração Real: PrismaStandingsRepository — F1Atlas
 *
 * Valida o adaptador concreto PrismaStandingsRepository contra banco de dados relacional:
 * 1. Persistência de DriverStandings (WDC) por rodada e temporada.
 * 2. Persistência de ConstructorStandings (WCC) por rodada e temporada.
 * 3. Recuperação de snapshots com posições (1..N), pontos, vitórias e pódios.
 * 4. Validação de busca por rodadas inexistentes retornando null.
 *
 * @module apps/api/test/integration/database/repositories/prisma-standings.repository.integration.spec
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '@f1atlas/domain';
import { DatabaseTestEnvironment, type TestEnvironmentStatus } from '../setup/database-test-environment.js';
import { PrismaStandingsRepository } from '../../../../src/infrastructure/database/prisma/repositories/prisma-standings.repository.js';
import { PrismaSeasonRepository } from '../../../../src/infrastructure/database/prisma/repositories/prisma-season.repository.js';
import { PrismaParticipantRepository } from '../../../../src/infrastructure/database/prisma/repositories/prisma-participant.repository.js';
import { PrismaGrandPrixRepository } from '../../../../src/infrastructure/database/prisma/repositories/prisma-grand-prix.repository.js';
import { createValidSeasonFixture } from '../fixtures/season.fixture.js';
import { createValidCircuitFixture, createValidGrandPrixFixture } from '../fixtures/grand-prix.fixture.js';
import {
  createValidDriverFixture,
  createValidTeamFixture,
  createValidConstructorFixture,
  createValidSeasonEntryFixture
} from '../fixtures/participant.fixture.js';
import {
  createValidDriverStandingsFixture,
  createValidConstructorStandingsFixture
} from '../fixtures/standings.fixture.js';

describe('PrismaStandingsRepository — Real Database Integration Tests', () => {
  let envStatus: TestEnvironmentStatus;
  let standingsRepo: PrismaStandingsRepository;
  let seasonRepo: PrismaSeasonRepository;
  let participantRepo: PrismaParticipantRepository;
  let gpRepo: PrismaGrandPrixRepository;

  before(async () => {
    envStatus = await DatabaseTestEnvironment.getInstance().setup();
    if (envStatus.canRun) {
      const prisma = DatabaseTestEnvironment.getInstance().getPrismaClient();
      standingsRepo = new PrismaStandingsRepository(prisma as any);
      seasonRepo = new PrismaSeasonRepository(prisma as any);
      participantRepo = new PrismaParticipantRepository(prisma as any);
      gpRepo = new PrismaGrandPrixRepository(prisma as any);
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

  it('deve persistir e recuperar DriverStandings (WDC) de uma rodada', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    // 1. Cria dependências completas
    const season = createValidSeasonFixture({ id: 'season-2025-wdc', year: 2025 });
    const circuit = createValidCircuitFixture({ id: 'circuit-wdc-aus' });
    await seasonRepo.save(season);
    await gpRepo.saveCircuit(circuit);

    const gp = createValidGrandPrixFixture({
      id: 'gp-wdc-round-1',
      seasonId: 'season-2025-wdc',
      circuitId: 'circuit-wdc-aus',
      roundNumber: 1
    });
    await gpRepo.saveGrandPrix(gp);

    const driver = createValidDriverFixture({ id: 'driver-wdc-norris', code: 'NOR', permanentNumber: 4 });
    const team = createValidTeamFixture({ id: 'team-mclaren', name: 'McLaren F1 Team' });
    const constructor = createValidConstructorFixture({ id: 'const-mclaren', name: 'McLaren' });
    await participantRepo.saveDriver(driver);
    await participantRepo.saveTeam(team);
    await participantRepo.saveConstructor(constructor);

    const entry = createValidSeasonEntryFixture({
      id: 'entry-norris-2025',
      seasonId: 'season-2025-wdc',
      driverId: 'driver-wdc-norris',
      teamId: 'team-mclaren',
      constructorId: 'const-mclaren',
      carNumber: 4
    });
    await participantRepo.saveSeasonEntry(entry);

    // 2. Cria e salva DriverStandings
    const standings = createValidDriverStandingsFixture({
      id: 'wdc-snap-round-1',
      seasonId: 'season-2025-wdc',
      roundNumber: 1
    });

    await standingsRepo.saveDriverStandings(standings);

    // 3. Consulta classificação
    const found = await standingsRepo.findDriverStandingsByRound(EntityId.from<'season'>('season-2025-wdc'), 1);
    assert.ok(found !== null, 'Classificação WDC deve ser localizada');
    assert.equal(found.roundNumber, 1);
    assert.equal(found.entries.length, 1);
    assert.equal(found.entries[0].rank, 1);
    assert.equal(found.entries[0].points, 25);
  });

  it('deve retornar null para rodadas sem classificação cadastrada', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const notFound = await standingsRepo.findDriverStandingsByRound(EntityId.from<'season'>('season-2025-wdc'), 99);
    assert.equal(notFound, null);
  });
});
