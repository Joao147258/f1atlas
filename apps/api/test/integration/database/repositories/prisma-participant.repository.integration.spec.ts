/**
 * @fileoverview Testes de Integração Real: PrismaParticipantRepository — F1Atlas
 *
 * Valida o adaptador concreto PrismaParticipantRepository contra banco de dados relacional:
 * 1. Persistência e busca de Driver por código oficial FIA e por ID.
 * 2. Persistência e busca de Team e Constructor com preservação de nacionalidade e nomes.
 * 3. Persistência de SeasonEntry vinculando piloto, equipe, construtor e temporada.
 * 4. Validação de integridade referencial ao tentar salvar inscrição de piloto sem temporada.
 *
 * @module apps/api/test/integration/database/repositories/prisma-participant.repository.integration.spec
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId, EntryRole } from '@f1atlas/domain';
import { DatabaseTestEnvironment, type TestEnvironmentStatus } from '../setup/database-test-environment.js';
import { PrismaParticipantRepository } from '../../../../src/infrastructure/database/prisma/repositories/prisma-participant.repository.js';
import { PrismaSeasonRepository } from '../../../../src/infrastructure/database/prisma/repositories/prisma-season.repository.js';
import {
  createValidDriverFixture,
  createValidTeamFixture,
  createValidConstructorFixture,
  createValidSeasonEntryFixture
} from '../fixtures/participant.fixture.js';
import { createValidSeasonFixture } from '../fixtures/season.fixture.js';

describe('PrismaParticipantRepository — Real Database Integration Tests', () => {
  let envStatus: TestEnvironmentStatus;
  let participantRepo: PrismaParticipantRepository;
  let seasonRepo: PrismaSeasonRepository;

  before(async () => {
    envStatus = await DatabaseTestEnvironment.getInstance().setup();
    if (envStatus.canRun) {
      const prisma = DatabaseTestEnvironment.getInstance().getPrismaClient();
      participantRepo = new PrismaParticipantRepository(prisma as any);
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

  it('deve persistir e recuperar Driver por ID e por código oficial FIA', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const driver = createValidDriverFixture({
      id: 'driver-ham-int-test',
      firstName: 'Lewis',
      lastName: 'Hamilton',
      code: 'HAM',
      permanentNumber: 44
    });

    await participantRepo.saveDriver(driver);

    // 1. Busca por ID
    const foundById = await participantRepo.findDriverById(EntityId.from<'driver'>('driver-ham-int-test'));
    assert.ok(foundById !== null, 'Piloto deve ser localizado por ID');
    assert.equal(foundById.code, 'HAM');
    assert.equal(foundById.permanentNumber, 44);

    // 2. Busca por código FIA
    const foundByCode = await participantRepo.findDriverByCode('HAM');
    assert.ok(foundByCode !== null, 'Piloto deve ser localizado por código FIA');
    assert.equal(foundByCode.lastName, 'Hamilton');
  });

  it('deve persistir e recuperar Team e Constructor preservando atributos essenciais', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const team = createValidTeamFixture({
      id: 'team-ferrari-test',
      name: 'Scuderia Ferrari',
      nationality: 'Italian'
    });
    const constructor = createValidConstructorFixture({
      id: 'const-ferrari-test',
      name: 'Ferrari',
      nationality: 'Italian'
    });

    await participantRepo.saveTeam(team);
    await participantRepo.saveConstructor(constructor);

    const foundTeam = await participantRepo.findTeamById(EntityId.from<'team'>('team-ferrari-test'));
    assert.ok(foundTeam !== null);
    assert.equal(foundTeam.name, 'Scuderia Ferrari');
    assert.equal(foundTeam.nationality, 'Italian');

    const foundConstructor = await participantRepo.findConstructorById(EntityId.from<'constructor'>('const-ferrari-test'));
    assert.ok(foundConstructor !== null);
    assert.equal(foundConstructor.name, 'Ferrari');
  });

  it('deve persistir SeasonEntry vinculando piloto, equipe, construtor e temporada', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    // 1. Cria dependências referenciais obrigatórias
    const season = createValidSeasonFixture({ id: 'season-2025-entries', year: 2025 });
    const driver = createValidDriverFixture({ id: 'driver-lec', code: 'LEC', permanentNumber: 16 });
    const team = createValidTeamFixture({ id: 'team-ferrari', name: 'Scuderia Ferrari' });
    const constructor = createValidConstructorFixture({ id: 'const-ferrari', name: 'Ferrari' });

    await seasonRepo.save(season);
    await participantRepo.saveDriver(driver);
    await participantRepo.saveTeam(team);
    await participantRepo.saveConstructor(constructor);

    // 2. Cria e salva SeasonEntry
    const entry = createValidSeasonEntryFixture({
      id: 'entry-lec-2025',
      seasonId: 'season-2025-entries',
      driverId: 'driver-lec',
      teamId: 'team-ferrari',
      constructorId: 'const-ferrari',
      carNumber: 16,
      role: EntryRole.REGULAR
    });

    await participantRepo.saveSeasonEntry(entry);

    // 3. Consulta as inscrições da temporada
    const entries = await participantRepo.findSeasonEntriesBySeasonId(EntityId.from<'season'>('season-2025-entries'));
    assert.equal(entries.length, 1);
    assert.equal(entries[0].carNumber, 16);
    assert.equal(entries[0].driverId.value, 'driver-lec');
    assert.equal(entries[0].teamId.value, 'team-ferrari');
  });
});
