/**
 * @fileoverview Teste de Fluxo Completo: Integração Transversal entre Domínio e Persistência — F1Atlas
 *
 * Valida o ciclo completo representativo da Temporada 2025:
 * 1. Construção das entidades puras do domínio com identidades tipadas.
 * 2. Persistência de Season, Participantes (Drivers, Teams, Constructors, Entries) e Grand Prix.
 * 3. Recuperação em nova sessão/instância do repositório.
 * 4. Validação de que todas as invariantes e contratos homologados no M2.1 permanecem íntegros.
 *
 * @module apps/api/test/integration/database/flows/domain-persistence-flow.integration.spec
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId, SeasonStatus } from '@f1atlas/domain';
import { DatabaseTestEnvironment, type TestEnvironmentStatus } from '../setup/database-test-environment.js';
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

describe('Domain & Persistence Transversal Flow — Season 2025 Lifecycle', () => {
  let envStatus: TestEnvironmentStatus;

  before(async () => {
    envStatus = await DatabaseTestEnvironment.getInstance().setup();
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

  it('deve persistir e reconstituir o ecossistema esportivo da Temporada 2025 preservando contratos', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const prisma = DatabaseTestEnvironment.getInstance().getPrismaClient();
    const seasonRepo = new PrismaSeasonRepository(prisma as any);
    const participantRepo = new PrismaParticipantRepository(prisma as any);
    const gpRepo = new PrismaGrandPrixRepository(prisma as any);

    // Etapa 1: Persistência da Temporada 2025
    const season = createValidSeasonFixture({
      id: 'season-2025-flow',
      year: 2025,
      status: SeasonStatus.IN_PROGRESS
    });
    await seasonRepo.save(season);

    // Etapa 2: Persistência de Construtores, Equipes e Pilotos
    const teamMcLaren = createValidTeamFixture({ id: 'team-mclaren-flow', name: 'McLaren F1 Team' });
    const constMcLaren = createValidConstructorFixture({ id: 'const-mclaren-flow', name: 'McLaren' });
    const driverNorris = createValidDriverFixture({ id: 'driver-norris-flow', code: 'NOR', permanentNumber: 4 });

    await participantRepo.saveTeam(teamMcLaren);
    await participantRepo.saveConstructor(constMcLaren);
    await participantRepo.saveDriver(driverNorris);

    // Inscrição regular na temporada
    const entryNorris = createValidSeasonEntryFixture({
      id: 'entry-norris-flow',
      seasonId: 'season-2025-flow',
      driverId: 'driver-norris-flow',
      teamId: 'team-mclaren-flow',
      constructorId: 'const-mclaren-flow',
      carNumber: 4
    });
    await participantRepo.saveSeasonEntry(entryNorris);

    // Etapa 3: Persistência do Autódromo e do Grande Prêmio
    const circuitAlbertPark = createValidCircuitFixture({ id: 'circuit-albert-park-flow', name: 'Albert Park' });
    await gpRepo.saveCircuit(circuitAlbertPark);

    const gpAustralia = createValidGrandPrixFixture({
      id: 'gp-australia-flow',
      seasonId: 'season-2025-flow',
      circuitId: 'circuit-albert-park-flow',
      name: 'Australian Grand Prix',
      roundNumber: 1
    });
    await gpRepo.saveGrandPrix(gpAustralia);

    // Etapa 4: Reconstituição independente em novos repositórios
    const freshSeasonRepo = new PrismaSeasonRepository(prisma as any);
    const freshParticipantRepo = new PrismaParticipantRepository(prisma as any);
    const freshGpRepo = new PrismaGrandPrixRepository(prisma as any);

    const recoveredSeason = await freshSeasonRepo.findByYear(2025);
    assert.ok(recoveredSeason !== null);
    assert.equal(recoveredSeason.year, 2025);
    assert.equal(recoveredSeason.status, SeasonStatus.IN_PROGRESS);

    const recoveredDriver = await freshParticipantRepo.findDriverByCode('NOR');
    assert.ok(recoveredDriver !== null);
    assert.equal(recoveredDriver.permanentNumber, 4);

    const recoveredEntries = await freshParticipantRepo.findSeasonEntriesBySeasonId(EntityId.from<'season'>('season-2025-flow'));
    assert.equal(recoveredEntries.length, 1);
    assert.equal(recoveredEntries[0].driverId.value, 'driver-norris-flow');

    const recoveredGp = await freshGpRepo.findGrandPrixById(EntityId.from<'grand-prix'>('gp-australia-flow'));
    assert.ok(recoveredGp !== null);
    assert.equal(recoveredGp.name, 'Australian Grand Prix');
    assert.equal(recoveredGp.roundNumber, 1);
  });
});
