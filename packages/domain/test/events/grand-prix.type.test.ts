/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes Estáticos de Tipos: GrandPrix
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { GrandPrix, GrandPrixFormat, GrandPrixStatus } from '../../src/events/grand-prix.ts';

type GrandPrixId = EntityId<'grand-prix'>;
type SeasonId = EntityId<'season'>;
type CircuitId = EntityId<'circuit'>;

describe('GrandPrix — Segurança de Tipos em Tempo de Compilação', () => {
  it('TT-01: identificadores de GrandPrix, Season e Circuit são nominalmente distintos', () => {
    const gpId: GrandPrixId = EntityId.from<'grand-prix'>('gp-001');
    const seasonId: SeasonId = EntityId.from<'season'>('season-2025');
    const circuitId: CircuitId = EntityId.from<'circuit'>('circuit-001');

    const result = GrandPrix.create({
      id: gpId,
      seasonId,
      circuitId,
      name: 'GP Test',
      roundNumber: 1,
      format: GrandPrixFormat.STANDARD,
      startDate: new Date('2025-03-14T00:00:00Z'),
      endDate: new Date('2025-03-16T23:59:59Z')
    });

    assert.equal(result.isSuccess, true);

    // As linhas documentam incompatibilidades estáticas nominais:
    // @ts-expect-error seasonId não pode ser passado como GrandPrixId
    GrandPrix.create({ id: seasonId, seasonId, circuitId, name: 'GP', roundNumber: 1, startDate: new Date(), endDate: new Date() });
    // @ts-expect-error circuitId não pode ser passado como SeasonId
    GrandPrix.create({ id: gpId, seasonId: circuitId, circuitId, name: 'GP', roundNumber: 1, startDate: new Date(), endDate: new Date() });
  });

  it('TT-02: propriedades públicas do GrandPrix são estritamente readonly', () => {
    const gp = GrandPrix.create({
      id: EntityId.from<'grand-prix'>('gp-001'),
      seasonId: EntityId.from<'season'>('season-2025'),
      circuitId: EntityId.from<'circuit'>('circuit-001'),
      name: 'GP Test',
      roundNumber: 1,
      startDate: new Date('2025-03-14T00:00:00Z'),
      endDate: new Date('2025-03-16T23:59:59Z')
    }).getValue();

    assert.equal(gp.name, 'GP Test');

    assert.throws(() => {
      // @ts-expect-error name é readonly
      gp.name = 'New Name';
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error roundNumber é readonly
      gp.roundNumber = 2;
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error format é readonly
      gp.format = GrandPrixFormat.SPRINT;
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error status é readonly
      gp.status = GrandPrixStatus.ACTIVE;
    }, TypeError);
  });
});
