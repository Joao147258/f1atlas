/**
 * ============================================================================
 * F1Atlas — Testes de Tipagem Estática: Participants
 * ============================================================================
 *
 * Módulo: packages/domain/test/participants/participants.type.test.ts
 * Padrão: Test runner nativo do Node.js + asserções de compilação TypeScript
 *
 * Propósito:
 * Garantir em tempo de compilação que identidades tipadas de diferentes tipos
 * de entidades (driver, team, constructor, season, season-entry) não possam ser
 * intercambiadas acidentalmente (combate à Primitive Obsession).
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { Driver } from '../../src/participants/driver.ts';
import { Team } from '../../src/participants/team.ts';
import { Constructor } from '../../src/participants/constructor.ts';
import { SeasonEntry } from '../../src/participants/season-entry.ts';
import { EntryRole } from '../../src/participants/entry-role.ts';

describe('Participants — Testes de Tipagem Estática e Nominalismo de Identidades', () => {
  it('deve assegurar compatibilidade estrita de EntityId por tipo genérico', () => {
    const driverId: EntityId<'driver'> = EntityId.from<'driver'>('driver-1');
    const teamId: EntityId<'team'> = EntityId.from<'team'>('team-1');
    const constructorId: EntityId<'constructor'> = EntityId.from<'constructor'>('constructor-1');
    const seasonId: EntityId<'season'> = EntityId.from<'season'>('season-2025');
    const entryId: EntityId<'season-entry'> = EntityId.from<'season-entry'>('entry-1');

    const driverResult = Driver.create({
      id: driverId,
      firstName: 'Max',
      lastName: 'Verstappen',
      code: 'VER',
      nationality: 'NLD'
    });

    const teamResult = Team.create({
      id: teamId,
      legalName: 'Ferrari S.p.A.',
      commercialName: 'Ferrari',
      nationality: 'ITA'
    });

    const constrResult = Constructor.create({
      id: constructorId,
      name: 'Ferrari',
      nationality: 'ITA'
    });

    const entryResult = SeasonEntry.create({
      id: entryId,
      seasonId,
      driverId,
      teamId,
      constructorId,
      carNumber: 44,
      role: EntryRole.REGULAR
    });

    assert.equal(driverResult.isSuccess, true);
    assert.equal(teamResult.isSuccess, true);
    assert.equal(constrResult.isSuccess, true);
    assert.equal(entryResult.isSuccess, true);
  });

  it('deve comprovar que strings primitivas puras exigem instanciação via EntityId', () => {
    const invalidProps: Parameters<typeof Driver.create>[0] = {
      // @ts-expect-error String pura não deve ser aceita onde EntityId<'driver'> é exigido
      id: 'driver-string-pura',
      firstName: 'Test',
      lastName: 'Driver',
      code: 'TST',
      nationality: 'BRA'
    };

    const result = Driver.create(invalidProps);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });
});
