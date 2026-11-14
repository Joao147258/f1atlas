/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes Estáticos de Tipos: Circuit
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { Circuit } from '../../src/events/circuit.ts';

type CircuitId = EntityId<'circuit'>;
type GrandPrixId = EntityId<'grand-prix'>;

describe('Circuit — Segurança de Tipos em Tempo de Compilação', () => {
  it('TT-01: identificadores de Circuit e GrandPrix são nominalmente distintos', () => {
    const circuitId: CircuitId = EntityId.from<'circuit'>('circuit-interlagos');
    const grandPrixId: GrandPrixId = EntityId.from<'grand-prix'>('gp-brazil-2025');

    const result = Circuit.create({
      id: circuitId,
      name: 'Interlagos',
      city: 'São Paulo',
      country: 'Brasil',
      trackLengthMeters: 4309,
      cornersCount: 15,
      timezone: 'America/Sao_Paulo'
    });

    assert.equal(result.isSuccess, true);

    // As linhas documentam incompatibilidades nominais estáticas:
    // @ts-expect-error GrandPrixId não pode ser passado como CircuitId
    Circuit.create({ id: grandPrixId, name: 'Interlagos', city: 'SP', country: 'BR', trackLengthMeters: 4309, cornersCount: 15, timezone: 'UTC' });
  });

  it('TT-02: propriedades públicas do Circuit são estritamente readonly', () => {
    const circuit = Circuit.create({
      id: EntityId.from<'circuit'>('circuit-silverstone'),
      name: 'Silverstone',
      city: 'Silverstone',
      country: 'UK',
      trackLengthMeters: 5891,
      cornersCount: 18,
      timezone: 'Europe/London'
    }).getValue();

    assert.equal(circuit.name, 'Silverstone');

    // Valida que em compilação é readonly e em runtime lança TypeError (Object.freeze):
    assert.throws(() => {
      // @ts-expect-error name é readonly
      circuit.name = 'Another Name';
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error trackLengthMeters é readonly
      circuit.trackLengthMeters = 6000;
    }, TypeError);
  });
});
