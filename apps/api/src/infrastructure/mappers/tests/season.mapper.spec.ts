/**
 * @fileoverview Testes Automatizados Unitários de SeasonMapper — F1Atlas
 *
 * Valida a conversão bidirecional entre registros do Prisma e a raiz de agregado Season:
 * 1. Conversão de Domínio para Persistência Prisma (toPersistence)
 * 2. Reconstituição da raiz de agregado Season a partir de registros Prisma (toDomain)
 * 3. Preservação de identidades duráveis EntityId<'season'> e EntityId<'grand-prix'>
 * 4. Validação e conversão de enums de status (PLANNED, IN_PROGRESS, CONCLUDED, CANCELLED)
 * 5. Rejeição de registros inconsistentes ou IDs ausentes
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Season,
  SeasonStatus as DomainSeasonStatus,
  ScheduledGrandPrixStatus,
  EntityId
} from '@f1atlas/domain';
import {
  SeasonMapper,
  type PrismaSeasonRecord
} from '../season.mapper.js';

describe('SeasonMapper — Unit & Round-trip Tests', () => {
  it('deve converter Season do domínio para persistência Prisma com sucesso', () => {
    const seasonId = EntityId.from<'season'>('season-2025-uuid');
    const seasonResult = Season.create({
      id: seasonId,
      year: 2025,
      status: DomainSeasonStatus.PLANNED,
      description: 'FIA Formula One World Championship 2025'
    });

    assert.equal(seasonResult.isSuccess, true);
    const season = seasonResult.getValue();

    const persistenceDTO = SeasonMapper.toPersistence(season);

    assert.equal(persistenceDTO.id, 'season-2025-uuid');
    assert.equal(persistenceDTO.year, 2025);
    assert.equal(persistenceDTO.status, 'PLANNED');
    assert.ok(persistenceDTO.officialName.includes('2025'));
  });

  it('deve reconstituir a raiz de agregado Season a partir de registro do Prisma com calendário', () => {
    const prismaRecord: PrismaSeasonRecord = {
      id: 'season-2025-uuid',
      year: 2025,
      officialName: 'FIA Formula One World Championship 2025',
      status: 'IN_PROGRESS',
      grandsPrix: [
        {
          id: 'gp-australia-uuid',
          roundNumber: 1,
          officialName: 'Australian Grand Prix',
          status: 'COMPLETED',
          startDate: new Date('2025-03-14T00:00:00Z'),
          endDate: new Date('2025-03-16T00:00:00Z')
        },
        {
          id: 'gp-china-uuid',
          roundNumber: 2,
          officialName: 'Chinese Grand Prix',
          status: 'SCHEDULED',
          startDate: new Date('2025-03-21T00:00:00Z'),
          endDate: new Date('2025-03-23T00:00:00Z')
        }
      ]
    };

    const season = SeasonMapper.toDomain(prismaRecord);

    assert.equal(season.id.value, 'season-2025-uuid');
    assert.equal(season.year, 2025);
    assert.equal(season.status, DomainSeasonStatus.IN_PROGRESS);
    assert.equal(season.totalRounds, 2);

    const round1 = season.getGrandPrixByRound(1);
    assert.ok(round1);
    assert.equal(round1.name, 'Australian Grand Prix');
    assert.equal(round1.status, ScheduledGrandPrixStatus.COMPLETED);
    assert.equal(round1.grandPrixId.value, 'gp-australia-uuid');

    const round2 = season.getGrandPrixByRound(2);
    assert.ok(round2);
    assert.equal(round2.name, 'Chinese Grand Prix');
    assert.equal(round2.status, ScheduledGrandPrixStatus.SCHEDULED);
  });

  it('deve realizar round-trip (Domínio -> Prisma -> Domínio) preservando invariantes e identidades', () => {
    const seasonId = EntityId.from<'season'>('season-roundtrip-uuid');
    const season = Season.create({
      id: seasonId,
      year: 2026,
      status: DomainSeasonStatus.PLANNED
    }).getValue();

    const persistence = SeasonMapper.toPersistence(season);

    const reconstructed = SeasonMapper.toDomain({
      id: persistence.id,
      year: persistence.year,
      officialName: persistence.officialName,
      status: persistence.status
    });

    assert.equal(reconstructed.id.equals(season.id), true);
    assert.equal(reconstructed.year, season.year);
    assert.equal(reconstructed.status, season.status);
  });

  it('deve rejeitar registros Prisma sem ID ou com ano inválido', () => {
    assert.throws(
      () => SeasonMapper.toDomain({ id: '', year: 2025, officialName: 'F1', status: 'PLANNED' }),
      /ID da temporada ausente/
    );

    assert.throws(
      () => SeasonMapper.toDomain({ id: 'valid-id', year: 1940, officialName: 'F1', status: 'PLANNED' }),
      /maior ou igual a 1950/
    );
  });

  it('deve interromper a reconstituição e lançar erro explícito se etapa do calendário falhar', () => {
    const invalidCalendarRecord: PrismaSeasonRecord = {
      id: 'season-corrupted-calendar',
      year: 2025,
      officialName: 'FIA Formula One World Championship 2025',
      status: 'IN_PROGRESS',
      grandsPrix: [
        {
          id: 'gp-1',
          roundNumber: 1,
          officialName: 'GP 1',
          status: 'COMPLETED'
        },
        {
          id: 'gp-2-duplicate',
          roundNumber: 1, // Rodada 1 duplicada quebra a sequencialidade de Season
          officialName: 'GP 2 Duplicate',
          status: 'SCHEDULED'
        }
      ]
    };

    assert.throws(
      () => SeasonMapper.toDomain(invalidCalendarRecord),
      /Falha ao reidratar etapa de calendário/
    );
  });

  it('deve preservar a descrição do domínio como officialName na persistência', () => {
    const season = Season.create({
      id: EntityId.from<'season'>('season-1950'),
      year: 1950,
      status: DomainSeasonStatus.CONCLUDED,
      description: 'World Championship of Drivers 1950'
    }).getValue();

    const persistence = SeasonMapper.toPersistence(season);
    assert.equal(persistence.officialName, 'World Championship of Drivers 1950');
  });

  it('deve mapear status COMPLETED do Prisma para CONCLUDED do domínio', () => {
    const domainStatus = SeasonMapper.toDomainStatus('COMPLETED');
    assert.equal(domainStatus, DomainSeasonStatus.CONCLUDED);

    const prismaStatus = SeasonMapper.toPrismaStatus(DomainSeasonStatus.CONCLUDED);
    assert.equal(prismaStatus, 'COMPLETED');
  });
});
