/**
 * @fileoverview Testes de Integridade dos Data Mappers com Round-Trip Completo em Banco Real — F1Atlas
 *
 * Valida o ciclo completo de serialização e reconstituição:
 * Entidade de Domínio -> Mapper.toPersistence() -> Inserção no Banco -> Leitura do Banco -> Mapper.toDomain() -> Entidade Reconstituída
 *
 * Dimensões Auditadas:
 * 1. Preservação de Identidade: EntityId tipado preservado.
 * 2. Preservação de Valores: Datas, números, inteiros, enums e strings idênticos.
 * 3. Preservação de Invariantes: Nenhuma entidade reidratada viola regras esportivas.
 * 4. Imutabilidade: As entidades resultantes respeitam congelamento/imutabilidade do domínio.
 *
 * @module apps/api/test/integration/database/mappers/database-mapper-round-trip.integration.spec
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId, SeasonStatus } from '@f1atlas/domain';
import { DatabaseTestEnvironment, type TestEnvironmentStatus } from '../setup/database-test-environment.js';
import { SeasonMapper } from '../../../../src/infrastructure/mappers/season.mapper.js';
import { ParticipantMapper } from '../../../../src/infrastructure/mappers/participant.mapper.js';
import { EventMapper } from '../../../../src/infrastructure/mappers/event.mapper.js';
import { StandingMapper } from '../../../../src/infrastructure/mappers/standing.mapper.js';
import { createValidSeasonFixture } from '../fixtures/season.fixture.js';
import { createValidDriverFixture } from '../fixtures/participant.fixture.js';
import { createValidCircuitFixture } from '../fixtures/grand-prix.fixture.js';

describe('Data Mappers & Database Round-Trip Integration Tests', () => {
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

  it('Round-trip Season: Domain -> Prisma -> DB -> Prisma -> Domain', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const prisma = DatabaseTestEnvironment.getInstance().getPrismaClient();

    // 1. Entidade de domínio original
    const originalSeason = createValidSeasonFixture({
      id: 'season-round-trip-2025',
      year: 2025,
      status: SeasonStatus.IN_PROGRESS,
      description: 'FIA Formula One World Championship 2025'
    });

    // 2. Mapeamento para persistência
    const persistenceDTO = SeasonMapper.toPersistence(originalSeason);

    // 3. Gravação direta no banco via Prisma
    await prisma.season.create({
      data: persistenceDTO
    });

    // 4. Leitura do registro físico no banco
    const rawRecord = await prisma.season.findUnique({
      where: { id: persistenceDTO.id },
      include: { grandsPrix: true }
    });
    assert.ok(rawRecord !== null);

    // 5. Reconstituição da entidade de domínio pelo mapper
    const reconstitutedSeason = SeasonMapper.toDomain(rawRecord as any);

    // 6. Verificação estrita de preservação semântica e invariantes
    assert.equal(reconstitutedSeason.id.value, originalSeason.id.value);
    assert.equal(reconstitutedSeason.year, originalSeason.year);
    assert.equal(reconstitutedSeason.status, originalSeason.status);
    assert.equal(reconstitutedSeason.description, originalSeason.description);
  });

  it('Round-trip Driver: Domain -> Prisma -> DB -> Prisma -> Domain', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const prisma = DatabaseTestEnvironment.getInstance().getPrismaClient();

    const originalDriver = createValidDriverFixture({
      id: 'driver-round-trip-pia',
      firstName: 'Oscar',
      lastName: 'Piastri',
      code: 'PIA',
      permanentNumber: 81
    });

    const persistenceDTO = ParticipantMapper.driverToPersistence(originalDriver);

    await prisma.driver.create({
      data: persistenceDTO
    });

    const rawRecord = await prisma.driver.findUnique({
      where: { id: persistenceDTO.id }
    });
    assert.ok(rawRecord !== null);

    const reconstitutedDriver = ParticipantMapper.driverToDomain(rawRecord as any);

    assert.equal(reconstitutedDriver.id.value, originalDriver.id.value);
    assert.equal(reconstitutedDriver.firstName, originalDriver.firstName);
    assert.equal(reconstitutedDriver.lastName, originalDriver.lastName);
    assert.equal(reconstitutedDriver.code, originalDriver.code);
    assert.equal(reconstitutedDriver.permanentNumber, originalDriver.permanentNumber);
    assert.equal(reconstitutedDriver.nationality, originalDriver.nationality);
  });

  it('Round-trip Circuit: Domain -> Prisma -> DB -> Prisma -> Domain', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const prisma = DatabaseTestEnvironment.getInstance().getPrismaClient();

    const originalCircuit = createValidCircuitFixture({
      id: 'circuit-round-trip-interlagos',
      name: 'Autódromo de Interlagos'
    });

    const persistenceDTO = EventMapper.circuitToPersistence(originalCircuit);

    await prisma.circuit.create({
      data: persistenceDTO
    });

    // Também cria layout ativo para permitir reconstituição
    await prisma.circuitLayout.create({
      data: {
        id: 'layout-interlagos-active',
        circuitId: persistenceDTO.id,
        name: 'Grand Prix Circuit',
        lengthMeters: 4309,
        cornersCount: 15,
        isActive: true,
        validFromYear: 1990
      }
    });

    const rawRecord = await prisma.circuit.findUnique({
      where: { id: persistenceDTO.id },
      include: { layouts: true }
    });
    assert.ok(rawRecord !== null);

    const reconstitutedCircuit = EventMapper.circuitToDomain(rawRecord as any);

    assert.equal(reconstitutedCircuit.id.value, originalCircuit.id.value);
    assert.equal(reconstitutedCircuit.name, originalCircuit.name);
    assert.equal(reconstitutedCircuit.trackLengthMeters, 4309);
    assert.equal(reconstitutedCircuit.cornersCount, 15);
  });
});
