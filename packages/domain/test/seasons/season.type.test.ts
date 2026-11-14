/**
 * ============================================================================
 * F1Atlas — Testes Estáticos de Tipos: Season
 * ============================================================================
 *
 * Módulo: packages/domain/test/seasons/season.type.test.ts
 * Componente testado: packages/domain/src/seasons/season.ts
 *
 * Propósito:
 * Comprovar estaticamente que Season e suas propriedades impõem tipagem nominal
 * estrita para EntityId<'season'> e EntityId<'grand-prix'>, além de propriedades
 * estritamente readonly e enums estritos de ScheduledGrandPrixStatus.
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Season, ScheduledGrandPrixStatus, type ScheduledGrandPrix } from '../../src/seasons/season.ts';
import { EntityId } from '../../src/shared/entity-id.ts';

type SeasonId = EntityId<'season'>;
type DriverId = EntityId<'driver'>;

describe('Season — Segurança de Tipos em Tempo de Compilação', () => {
  it('TT-01: identificador de Season é nominalmente protegido contra DriverId', () => {
    const seasonId: SeasonId = EntityId.from<'season'>('season-2025');
    const driverId: DriverId = EntityId.from<'driver'>('driver-001');

    const result = Season.create({
      id: seasonId,
      year: 2025
    });

    assert.equal(result.isSuccess, true);

    // As linhas abaixo documentam atribuições inválidas rejeitadas pelo compilador TypeScript:
    // @ts-expect-error DriverId não pode ser passado como SeasonId
    Season.create({ id: driverId, year: 2025 });

    // @ts-expect-error String comum não pode substituir EntityId<'season'>
    Season.create({ id: 'season-2025', year: 2025 });
  });

  it('TT-02: propriedades da Season são estritamente readonly', () => {
    const season = Season.create({
      id: EntityId.from<'season'>('season-2025'),
      year: 2025
    }).getValue();

    assert.equal(season.year, 2025);

    assert.throws(() => {
      // @ts-expect-error year é readonly
      season.year = 2026;
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error status é readonly
      season.status = 'IN_PROGRESS';
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error grandPrixList é readonly
      season.grandPrixList.push({});
    }, TypeError);
  });

  it('TT-03: ScheduledGrandPrixStatus impõe valores válidos de enum', () => {
    const validStatus: ScheduledGrandPrixStatus = ScheduledGrandPrixStatus.SCHEDULED;
    assert.equal(validStatus, 'SCHEDULED');

    // @ts-expect-error Valor arbitrário de string não é aceito como ScheduledGrandPrixStatus
    const invalidStatus: ScheduledGrandPrixStatus = 'INVALID_STATUS';
    assert.ok(invalidStatus);
  });

  it('TT-04: propriedades de ScheduledGrandPrix são estritamente readonly', () => {
    const gp: ScheduledGrandPrix = Object.freeze({
      grandPrixId: EntityId.from<'grand-prix'>('gp-01'),
      roundNumber: 1,
      name: 'GP da Austrália',
      status: ScheduledGrandPrixStatus.SCHEDULED
    });

    assert.equal(gp.roundNumber, 1);

    assert.throws(() => {
      // @ts-expect-error roundNumber é readonly
      gp.roundNumber = 2;
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error name é readonly
      gp.name = 'Outro Nome';
    }, TypeError);
  });
});
