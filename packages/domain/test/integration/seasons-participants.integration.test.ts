/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes de Integração
 * ============================================================================
 *
 * Suíte de Testes de Integração: Seasons <-> Participants (M2.1-IT-B)
 * Arquivo: packages/domain/test/integration/seasons-participants.integration.test.ts
 *
 * Objetivo Arquitetural:
 * Validar a colaboração contratual entre o ciclo anual de disputa (Season)
 * e as entidades de competidores (Driver, Team, Constructor) através da
 * agregação temporal de inscrição oficial (SeasonEntry).
 * ============================================================================
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { EntityId } from '../../src/shared/entity-id.ts';
import { Result } from '../../src/shared/result.ts';
import { createSeason, scheduleGrandPrix, Season } from '../../src/seasons/season.ts';
import { SeasonStatus } from '../../src/seasons/season-status.ts';
import { Driver } from '../../src/participants/driver.ts';
import { Team } from '../../src/participants/team.ts';
import { Constructor } from '../../src/participants/constructor.ts';
import { SeasonEntry, deactivateEntry } from '../../src/participants/season-entry.ts';
import { EntryRole } from '../../src/participants/entry-role.ts';

describe('M2.1-IT-B — Integração Seasons <-> Participants (INT-01)', () => {
  const season2025Id = EntityId.from<'season'>('season-2025');

  // Helper para criar uma temporada com 24 GPs agendados
  function buildSeason2025(): Season {
    let season = createSeason({ id: season2025Id, year: 2025 }).getValue();
    for (let r = 1; r <= 24; r++) {
      const scheduleRes = scheduleGrandPrix(season, {
        grandPrixId: EntityId.from<'grand-prix'>(`gp-round-${r}`),
        roundNumber: r,
        name: `Grand Prix Round ${r}`
      });
      season = scheduleRes.getValue();
    }
    return season;
  }

  test('IT-SE-PA-01 — deve vincular formalmente participantes a uma temporada através de SeasonEntry', () => {
    const season = buildSeason2025();

    const driverRes = Driver.create({
      id: EntityId.from<'driver'>('driver-norris'),
      firstName: 'Lando',
      lastName: 'Norris',
      code: 'NOR',
      nationality: 'British',
      permanentNumber: 4
    });
    const teamRes = Team.create({
      id: EntityId.from<'team'>('team-mclaren'),
      legalName: 'McLaren Racing Limited',
      commercialName: 'McLaren Formula 1 Team',
      nationality: 'British'
    });
    const constructorRes = Constructor.create({
      id: EntityId.from<'constructor'>('mclaren'),
      name: 'McLaren',
      nationality: 'British'
    });

    assert.equal(driverRes.isSuccess, true);
    assert.equal(teamRes.isSuccess, true);
    assert.equal(constructorRes.isSuccess, true);

    const driver = driverRes.getValue();
    const team = teamRes.getValue();
    const constructorEntity = constructorRes.getValue();

    // Cria a inscrição para a temporada inteira
    const entryRes = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-norris-2025'),
      seasonId: season.id,
      driverId: driver.id,
      teamId: team.id,
      constructorId: constructorEntity.id,
      carNumber: 4,
      role: EntryRole.REGULAR,
      startRound: 1
    });

    assert.equal(entryRes.isSuccess, true);
    const entry = entryRes.getValue();

    // Verificação da preservação das identidades através da fronteira
    assert.equal(entry.seasonId.equals(season.id), true);
    assert.equal(entry.driverId.equals(driver.id), true);
    assert.equal(entry.teamId.equals(team.id), true);
    assert.equal(entry.constructorId.equals(constructorEntity.id), true);
    assert.equal(entry.carNumber, 4);
    assert.equal(entry.role, EntryRole.REGULAR);
    assert.equal(entry.isActive, true);
  });

  test('IT-SE-PA-02 — deve gerenciar vigência por rodada em substituição intra-temporada (Sainz / Bearman)', () => {
    const season = buildSeason2025();

    const team = Team.create({
      id: EntityId.from<'team'>('team-ferrari'),
      legalName: 'Ferrari S.p.A.',
      commercialName: 'Scuderia Ferrari HP',
      nationality: 'Italian'
    }).getValue();

    const constructorEntity = Constructor.create({
      id: EntityId.from<'constructor'>('ferrari'),
      name: 'Ferrari',
      nationality: 'Italian'
    }).getValue();

    const sainz = Driver.create({
      id: EntityId.from<'driver'>('driver-sainz'),
      firstName: 'Carlos',
      lastName: 'Sainz',
      code: 'SAI',
      nationality: 'Spanish',
      permanentNumber: 55
    }).getValue();

    const bearman = Driver.create({
      id: EntityId.from<'driver'>('driver-bearman'),
      firstName: 'Oliver',
      lastName: 'Bearman',
      code: 'BEA',
      nationality: 'British',
      permanentNumber: 38
    }).getValue();

    // Inscrição regular de Sainz ativa de Round 1 até Round 1 (antes de apendicite)
    const sainzEntryRound1 = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-sainz-r1'),
      seasonId: season.id,
      driverId: sainz.id,
      teamId: team.id,
      constructorId: constructorEntity.id,
      carNumber: 55,
      role: EntryRole.REGULAR,
      startRound: 1,
      endRound: 1
    }).getValue();

    // Inscrição substituta de Bearman convocada exclusivamente para Round 2 (Arábia Saudita)
    const bearmanSubstituteEntry = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-bearman-r2'),
      seasonId: season.id,
      driverId: bearman.id,
      teamId: team.id,
      constructorId: constructorEntity.id,
      carNumber: 38,
      role: EntryRole.SUBSTITUTE,
      startRound: 2,
      endRound: 2
    }).getValue();

    // Retorno de Sainz a partir do Round 3 em diante
    const sainzEntryRound3Onwards = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-sainz-r3-onwards'),
      seasonId: season.id,
      driverId: sainz.id,
      teamId: team.id,
      constructorId: constructorEntity.id,
      carNumber: 55,
      role: EntryRole.REGULAR,
      startRound: 3
    }).getValue();

    // Verificação de elegibilidade por rodada
    // Rodada 1 (Bahrein): Sainz ativo, Bearman inativo
    assert.equal(sainzEntryRound1.isActiveInRound(1), true);
    assert.equal(bearmanSubstituteEntry.isActiveInRound(1), false);
    assert.equal(sainzEntryRound3Onwards.isActiveInRound(1), false);

    // Rodada 2 (Jeddah): Sainz inativo, Bearman ativo
    assert.equal(sainzEntryRound1.isActiveInRound(2), false);
    assert.equal(bearmanSubstituteEntry.isActiveInRound(2), true);
    assert.equal(sainzEntryRound3Onwards.isActiveInRound(2), false);

    // Rodada 3 (Melbourne): Sainz ativo, Bearman inativo
    assert.equal(sainzEntryRound1.isActiveInRound(3), false);
    assert.equal(bearmanSubstituteEntry.isActiveInRound(3), false);
    assert.equal(sainzEntryRound3Onwards.isActiveInRound(3), true);

    // Rodada 24 (Abu Dhabi): Sainz continua ativo
    assert.equal(sainzEntryRound3Onwards.isActiveInRound(24), true);
  });

  test('IT-SE-PA-03 — deve garantir imutabilidade e cópia defensiva em desativação copy-on-write', () => {
    const season = buildSeason2025();

    const originalEntry = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-sargeant-2025'),
      seasonId: season.id,
      driverId: EntityId.from<'driver'>('driver-sargeant'),
      teamId: EntityId.from<'team'>('team-williams'),
      constructorId: EntityId.from<'constructor'>('williams'),
      carNumber: 2,
      role: EntryRole.REGULAR,
      startRound: 1
    }).getValue();

    assert.equal(originalEntry.isActive, true);
    assert.equal(originalEntry.endRound, undefined);

    // Desativação a partir da rodada 14 (substituição Colapinto)
    const deactivationRes = deactivateEntry(originalEntry, 14);
    assert.equal(deactivationRes.isSuccess, true);
    const deactivatedEntry = deactivationRes.getValue();

    // A nova instância tem vigência encerrada na rodada 14
    assert.equal(deactivatedEntry.isActive, false);
    assert.equal(deactivatedEntry.endRound, 14);
    assert.equal(deactivatedEntry.isActiveInRound(14), true);
    assert.equal(deactivatedEntry.isActiveInRound(15), false);

    // A instância original permanece imutável e inalterada
    assert.equal(originalEntry.isActive, true);
    assert.equal(originalEntry.endRound, undefined);
    assert.equal(originalEntry.isActiveInRound(15), true);
  });

  test('IT-SE-PA-04 — lacuna arquitetural: SeasonEntry não valida automaticamente se temporada está bloqueada', () => {
    // Demonstra que Season e SeasonEntry mantêm isolamento desacoplado (Reference by Identity).
    // SeasonEntry não sabe se a Season está CONCLUDED ou se totalRounds foi excedido.
    const season = buildSeason2025();

    // Inscrição hipotética com startRound maior que o número de corridas do calendário
    const outOfBoundsEntryRes = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-future'),
      seasonId: season.id,
      driverId: EntityId.from<'driver'>('driver-future'),
      teamId: EntityId.from<'team'>('team-generic'),
      constructorId: EntityId.from<'constructor'>('generic'),
      carNumber: 99,
      role: EntryRole.REGULAR,
      startRound: 50 // O calendário possui 24 GPs!
    });

    // A factory do SeasonEntry aceita porque valida apenas suas próprias invariantes (startRound >= 1)
    assert.equal(outOfBoundsEntryRes.isSuccess, true);
    const entry = outOfBoundsEntryRes.getValue();

    // A validação de consistência relacional é responsabilidade de orquestração externa:
    const isRoundWithinSeason = entry.startRound <= season.totalRounds;
    assert.equal(isRoundWithinSeason, false); // Comprova que a regra relacional deve ser aplicada pelo caso de uso!
  });
});
