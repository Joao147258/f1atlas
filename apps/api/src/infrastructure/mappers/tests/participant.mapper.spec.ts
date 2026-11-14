/**
 * @fileoverview Testes Automatizados Unitários de ParticipantMapper — F1Atlas
 *
 * Valida a conversão bidirecional entre registros do Prisma e as entidades de participantes:
 * 1. Driver (Domínio <-> Prisma)
 * 2. Team (Domínio <-> Prisma)
 * 3. Constructor (Domínio <-> Prisma)
 * 4. SeasonEntry (Domínio <-> Prisma)
 * 5. Preservação de identidades duráveis EntityId e tratamento de opcionais
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Driver,
  Team,
  Constructor,
  SeasonEntry,
  EntryRole,
  EntityId
} from '@f1atlas/domain';
import {
  ParticipantMapper,
  type PrismaDriverRecord,
  type PrismaTeamRecord,
  type PrismaConstructorRecord,
  type PrismaSeasonEntryRecord
} from '../participant.mapper.js';

describe('ParticipantMapper — Unit & Round-trip Tests', () => {
  it('deve converter Driver para persistência e reconstituir do Prisma', () => {
    const driverId = EntityId.from<'driver'>('driver-max-uuid');
    const driver = Driver.create({
      id: driverId,
      firstName: 'Max',
      lastName: 'Verstappen',
      code: 'VER',
      nationality: 'Dutch',
      permanentNumber: 1,
      isWorldChampion: true,
      birthDate: '1997-09-30'
    }).getValue();

    const persistence = ParticipantMapper.driverToPersistence(driver);
    assert.equal(persistence.id, 'driver-max-uuid');
    assert.equal(persistence.code, 'VER');
    assert.equal(persistence.permanentNumber, 1);
    assert.equal(persistence.nationality, 'Dutch');

    const prismaRecord: PrismaDriverRecord = {
      id: persistence.id,
      slug: persistence.slug,
      firstName: persistence.firstName,
      lastName: persistence.lastName,
      code: persistence.code,
      nationality: persistence.nationality,
      permanentNumber: persistence.permanentNumber,
      birthDate: persistence.birthDate,
      isActive: true
    };

    const reconstructed = ParticipantMapper.driverToDomain(prismaRecord);
    assert.equal(reconstructed.id.value, driver.id.value);
    assert.equal(reconstructed.firstName, 'Max');
    assert.equal(reconstructed.lastName, 'Verstappen');
    assert.equal(reconstructed.code, 'VER');
    assert.equal(reconstructed.permanentNumber, 1);
  });

  it('deve converter Team para persistência e reconstituir do Prisma', () => {
    const teamId = EntityId.from<'team'>('team-ferrari-uuid');
    const team = Team.create({
      id: teamId,
      legalName: 'Scuderia Ferrari SpA',
      commercialName: 'Ferrari',
      nationality: 'Italian',
      baseLocation: 'Maranello, Italy',
      foundedYear: 1929
    }).getValue();

    const persistence = ParticipantMapper.teamToPersistence(team);
    assert.equal(persistence.id, 'team-ferrari-uuid');
    assert.equal(persistence.commonName, 'Ferrari');
    assert.equal(persistence.foundedYear, 1929);

    const prismaRecord: PrismaTeamRecord = {
      id: persistence.id,
      slug: persistence.slug,
      legalName: persistence.legalName,
      commonName: persistence.commonName,
      nationality: persistence.nationality,
      baseLocation: persistence.baseLocation,
      foundedYear: persistence.foundedYear,
      isActive: true
    };

    const reconstructed = ParticipantMapper.teamToDomain(prismaRecord);
    assert.equal(reconstructed.id.value, team.id.value);
    assert.equal(reconstructed.legalName, 'Scuderia Ferrari SpA');
    assert.equal(reconstructed.commercialName, 'Ferrari');
    assert.equal(reconstructed.foundedYear, 1929);
  });

  it('deve converter Constructor para persistência e reconstituir do Prisma', () => {
    const constructorId = EntityId.from<'constructor'>('constructor-mclaren-uuid');
    const constructor = Constructor.create({
      id: constructorId,
      name: 'McLaren',
      nationality: 'British',
      chassis: 'MCL39',
      engineManufacturer: 'Mercedes'
    }).getValue();

    const persistence = ParticipantMapper.constructorToPersistence(constructor);
    assert.equal(persistence.id, 'constructor-mclaren-uuid');
    assert.equal(persistence.name, 'McLaren');
    assert.equal(persistence.chassis, 'MCL39');

    const prismaRecord: PrismaConstructorRecord = {
      id: persistence.id,
      slug: persistence.slug,
      name: persistence.name,
      nationality: persistence.nationality,
      chassis: persistence.chassis,
      engineManufacturer: persistence.engineManufacturer
    };

    const reconstructed = ParticipantMapper.constructorToDomain(prismaRecord);
    assert.equal(reconstructed.id.value, constructor.id.value);
    assert.equal(reconstructed.name, 'McLaren');
    assert.equal(reconstructed.chassis, 'MCL39');
    assert.equal(reconstructed.engineManufacturer, 'Mercedes');
  });

  it('deve converter SeasonEntry e reconstituir com papéis REGULAR e SUBSTITUTE', () => {
    const entryId = EntityId.from<'season-entry'>('entry-1-uuid');
    const seasonEntry = SeasonEntry.create({
      id: entryId,
      seasonId: EntityId.from<'season'>('season-2025'),
      driverId: EntityId.from<'driver'>('driver-norris'),
      teamId: EntityId.from<'team'>('team-mclaren'),
      constructorId: EntityId.from<'constructor'>('constructor-mclaren'),
      carNumber: 4,
      role: EntryRole.REGULAR,
      startRound: 1
    }).getValue();

    const persistence = ParticipantMapper.seasonEntryToPersistence(seasonEntry);
    assert.equal(persistence.id, 'entry-1-uuid');
    assert.equal(persistence.carNumber, 4);
    assert.equal(persistence.role, 'REGULAR');

    const prismaRecord: PrismaSeasonEntryRecord = {
      id: persistence.id,
      seasonId: persistence.seasonId,
      driverId: persistence.driverId,
      teamId: persistence.teamId,
      constructorId: persistence.constructorId,
      carNumber: persistence.carNumber,
      role: persistence.role,
      startRound: persistence.startRound,
      endRound: persistence.endRound
    };

    const reconstructed = ParticipantMapper.seasonEntryToDomain(prismaRecord);
    assert.equal(reconstructed.id.value, seasonEntry.id.value);
    assert.equal(reconstructed.carNumber, 4);
    assert.equal(reconstructed.role, EntryRole.REGULAR);
  });

  it('deve reconstituir piloto campeão mundial com número de carreira diferente de 1', () => {
    const prismaRecord: PrismaDriverRecord = {
      id: 'driver-hamilton-uuid',
      slug: 'lewis-hamilton',
      firstName: 'Lewis',
      lastName: 'Hamilton',
      code: 'HAM',
      nationality: 'British',
      permanentNumber: 44,
      isWorldChampion: true,
      isActive: true
    };

    const driver = ParticipantMapper.driverToDomain(prismaRecord);
    assert.equal(driver.id.value, 'driver-hamilton-uuid');
    assert.equal(driver.permanentNumber, 44);
    assert.equal(driver.isWorldChampion, true);
  });

  it('deve rejeitar Driver sem ID no registro Prisma', () => {
    assert.throws(
      () => ParticipantMapper.driverToDomain({
        id: '',
        slug: 'invalid',
        firstName: 'Test',
        lastName: 'Driver',
        nationality: 'BR'
      }),
      /ID do piloto ausente/
    );
  });

  it('deve rejeitar Team sem ID no registro Prisma', () => {
    assert.throws(
      () => ParticipantMapper.teamToDomain({
        id: '',
        slug: 'invalid',
        legalName: 'Test Team Ltd',
        commonName: 'Test',
        nationality: 'BR'
      }),
      /ID da equipe ausente/
    );
  });

  it('deve rejeitar Constructor sem ID no registro Prisma', () => {
    assert.throws(
      () => ParticipantMapper.constructorToDomain({
        id: '',
        slug: 'invalid',
        name: 'Test Constructor',
        nationality: 'BR'
      }),
      /ID do construtor ausente/
    );
  });

  it('deve rejeitar SeasonEntry sem ID no registro Prisma', () => {
    assert.throws(
      () => ParticipantMapper.seasonEntryToDomain({
        id: '',
        seasonId: 'season-1',
        driverId: 'driver-1',
        teamId: 'team-1',
        constructorId: 'constructor-1',
        carNumber: 5,
        role: 'REGULAR'
      }),
      /ID da inscrição ausente/
    );
  });
});
