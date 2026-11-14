/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes Unitários: Circuit
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { DomainErrorCode } from '../../src/shared/domain-error.ts';
import {
  Circuit,
  createCircuit,
  CIRCUIT_CONSTRAINTS,
  type CreateCircuitProps
} from '../../src/events/circuit.ts';

function createValidCircuitProps(overrides?: Partial<CreateCircuitProps>): CreateCircuitProps {
  const id = EntityId.from<'circuit'>('circuit-interlagos');

  return {
    id,
    name: 'Autódromo José Carlos Pace',
    city: 'São Paulo',
    country: 'Brasil',
    trackLengthMeters: 4309,
    cornersCount: 15,
    timezone: 'America/Sao_Paulo',
    ...overrides
  };
}

describe('Circuit — Criação e Invariantes Estruturais', () => {
  it('deve instanciar um circuito válido com todas as propriedades', () => {
    const props = createValidCircuitProps();
    const result = Circuit.create(props);

    assert.ok(result.isSuccess);
    const circuit = result.getValue();

    assert.equal(circuit.id.toValue(), 'circuit-interlagos');
    assert.equal(circuit.name, 'Autódromo José Carlos Pace');
    assert.equal(circuit.city, 'São Paulo');
    assert.equal(circuit.country, 'Brasil');
    assert.equal(circuit.trackLengthMeters, 4309);
    assert.equal(circuit.cornersCount, 15);
    assert.equal(circuit.timezone, 'America/Sao_Paulo');
  });

  it('deve permitir criação via função utilitária createCircuit e reconstituição via reconstitute', () => {
    const props = createValidCircuitProps();
    const result = createCircuit(props);

    assert.ok(result.isSuccess);
    assert.equal(result.getValue().name, 'Autódromo José Carlos Pace');

    const reconstituteResult = Circuit.reconstitute(props);
    assert.ok(reconstituteResult.isSuccess);
    assert.equal(reconstituteResult.getValue().name, 'Autódromo José Carlos Pace');
  });

  it('deve rejeitar props nulas ou indefinidas', () => {
    // @ts-expect-error teste de robustez em runtime
    const resultNull = Circuit.create(null);
    assert.ok(resultNull.isFailure);
    assert.equal(resultNull.getError().code, DomainErrorCode.INVALID_ARGUMENT);

    // @ts-expect-error teste de robustez em runtime
    const resultUndef = Circuit.create(undefined);
    assert.ok(resultUndef.isFailure);
    assert.equal(resultUndef.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar identificador ausente ou inválido', () => {
    const props = createValidCircuitProps({
      // @ts-expect-error teste de robustez em runtime
      id: null
    });
    const result = Circuit.create(props);

    assert.ok(result.isFailure);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve sanitizar whitespace nas extremidades de strings (name, city, country, timezone)', () => {
    const props = createValidCircuitProps({
      name: '  Silverstone Circuit  ',
      city: '  Silverstone  ',
      country: '  United Kingdom  ',
      timezone: '  Europe/London  '
    });
    const result = Circuit.create(props);

    assert.ok(result.isSuccess);
    const circuit = result.getValue();
    assert.equal(circuit.name, 'Silverstone Circuit');
    assert.equal(circuit.city, 'Silverstone');
    assert.equal(circuit.country, 'United Kingdom');
    assert.equal(circuit.timezone, 'Europe/London');
  });

  it('deve rejeitar strings vazias ou compostas apenas por espaços', () => {
    assert.ok(Circuit.create(createValidCircuitProps({ name: '' })).isFailure);
    assert.ok(Circuit.create(createValidCircuitProps({ name: '   ' })).isFailure);
    assert.ok(Circuit.create(createValidCircuitProps({ city: '' })).isFailure);
    assert.ok(Circuit.create(createValidCircuitProps({ country: '' })).isFailure);
    assert.ok(Circuit.create(createValidCircuitProps({ timezone: '' })).isFailure);
  });

  it('deve garantir imutabilidade estrita da instância congelada (Object.freeze)', () => {
    const circuit = Circuit.create(createValidCircuitProps()).getValue();

    assert.ok(Object.isFrozen(circuit));
    assert.throws(() => {
      // @ts-expect-error mutação proibida
      circuit.name = 'Outro Nome';
    }, TypeError);
  });

  it('deve comparar igualdade por identidade (equals)', () => {
    const circuit1 = Circuit.create(createValidCircuitProps()).getValue();
    const circuit2 = Circuit.create(createValidCircuitProps({ name: 'Diferente' })).getValue();

    const otherId = EntityId.from<'circuit'>('circuit-monza');
    const circuit3 = Circuit.create(createValidCircuitProps({ id: otherId })).getValue();

    assert.ok(circuit1.equals(circuit2));
    assert.equal(circuit1.equals(circuit3), false);
    assert.equal(circuit1.equals(null), false);
    assert.equal(circuit1.equals({}), false);
  });
});

describe('Circuit — Validações Físicas e Regulamentares FIA (EVT-INV-007)', () => {
  it('deve rejeitar extensão métrica menor que o limite mínimo homologado (2000m)', () => {
    const props = createValidCircuitProps({ trackLengthMeters: 1999 });
    const result = Circuit.create(props);

    assert.ok(result.isFailure);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /EVT-INV-007/);
  });

  it('deve rejeitar extensão métrica maior que o limite máximo homologado (15000m)', () => {
    const props = createValidCircuitProps({ trackLengthMeters: 15001 });
    const result = Circuit.create(props);

    assert.ok(result.isFailure);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
  });

  it('deve rejeitar extensão métrica não numérica, NaN, zero ou negativa', () => {
    assert.ok(Circuit.create(createValidCircuitProps({ trackLengthMeters: 0 })).isFailure);
    assert.ok(Circuit.create(createValidCircuitProps({ trackLengthMeters: -4000 })).isFailure);
    assert.ok(Circuit.create(createValidCircuitProps({ trackLengthMeters: Number.NaN })).isFailure);
    assert.ok(Circuit.create(createValidCircuitProps({ trackLengthMeters: Number.POSITIVE_INFINITY })).isFailure);
  });

  it('deve rejeitar quantidade de curvas menor que 3 ou não inteira', () => {
    assert.ok(Circuit.create(createValidCircuitProps({ cornersCount: 2 })).isFailure);
    assert.ok(Circuit.create(createValidCircuitProps({ cornersCount: 0 })).isFailure);
    assert.ok(Circuit.create(createValidCircuitProps({ cornersCount: -5 })).isFailure);
    assert.ok(Circuit.create(createValidCircuitProps({ cornersCount: 14.5 })).isFailure);
  });
});

describe('Circuit — Cálculo Determinístico de Distância de Corrida (EVT-INV-008)', () => {
  it('deve calcular corretamente as voltas de Interlagos (4309m -> 71 voltas excedendo 305km)', () => {
    const circuit = Circuit.create(createValidCircuitProps({ trackLengthMeters: 4309 })).getValue();

    const laps = circuit.calculateRaceLaps();
    assert.equal(laps, 71);

    const totalDistance = circuit.calculateRaceDistanceMeters();
    assert.equal(totalDistance, 71 * 4309); // 305.939m > 305.000m
    assert.ok(totalDistance > CIRCUIT_CONSTRAINTS.STANDARD_RACE_DISTANCE_METERS);
    assert.ok((laps - 1) * 4309 <= CIRCUIT_CONSTRAINTS.STANDARD_RACE_DISTANCE_METERS);
  });

  it('deve calcular corretamente as voltas de Spa-Francorchamps (7004m -> 44 voltas)', () => {
    const circuit = Circuit.create(createValidCircuitProps({ trackLengthMeters: 7004 })).getValue();

    const laps = circuit.calculateRaceLaps();
    assert.equal(laps, 44);
    assert.ok(laps * 7004 > 305000);
    assert.ok((laps - 1) * 7004 <= 305000);
  });

  it('deve calcular corretamente as voltas de Monza (5793m -> 53 voltas)', () => {
    const circuit = Circuit.create(createValidCircuitProps({ trackLengthMeters: 5793 })).getValue();

    const laps = circuit.calculateRaceLaps();
    assert.equal(laps, 53);
    assert.ok(laps * 5793 > 305000);
    assert.ok((laps - 1) * 5793 <= 305000);
  });

  it('deve respeitar a exigência regulamentar de exceder estritamente 305km quando a distância for exatamente divisível', () => {
    // 5000m divide 305000m exatamente em 61 voltas.
    // 61 * 5000 = 305000 (não excede 305km).
    // Para exceder 305km conforme Art. 5.4 da FIA, são necessárias 62 voltas!
    const circuit = Circuit.create(createValidCircuitProps({ trackLengthMeters: 5000 })).getValue();

    const laps = circuit.calculateRaceLaps();
    assert.equal(laps, 62);
    assert.ok(laps * 5000 > 305000);
  });

  it('deve calcular a exceção de Mônaco com teto de 260km (3337m -> 78 voltas)', () => {
    const circuit = Circuit.create(createValidCircuitProps({ trackLengthMeters: 3337 })).getValue();

    const lapsMonaco = circuit.calculateRaceLaps(true);
    assert.equal(lapsMonaco, 78);

    const distanceMonaco = circuit.calculateRaceDistanceMeters(true);
    assert.equal(distanceMonaco, 78 * 3337); // 260.286m > 260.000m
    assert.ok(distanceMonaco > CIRCUIT_CONSTRAINTS.MONACO_RACE_DISTANCE_METERS);
    assert.ok((lapsMonaco - 1) * 3337 <= CIRCUIT_CONSTRAINTS.MONACO_RACE_DISTANCE_METERS);
  });
});

describe('Circuit — Atualização de Traçado (updateTrackConfiguration)', () => {
  it('deve atualizar o traçado gerando nova instância imutável (copy-on-write)', () => {
    const original = Circuit.create(createValidCircuitProps({
      trackLengthMeters: 5891,
      cornersCount: 18
    })).getValue();

    const updateResult = original.updateTrackConfiguration({
      trackLengthMeters: 5891,
      cornersCount: 19
    });

    assert.ok(updateResult.isSuccess);
    const updated = updateResult.getValue();

    assert.equal(updated.id.toValue(), original.id.toValue());
    assert.equal(updated.name, original.name);
    assert.equal(updated.cornersCount, 19);
    assert.equal(original.cornersCount, 18); // preserva original intacto
    assert.notEqual(updated, original);
  });

  it('deve rejeitar atualização com parâmetros que violem invariantes físicas', () => {
    const original = Circuit.create(createValidCircuitProps()).getValue();

    const updateResult = original.updateTrackConfiguration({
      trackLengthMeters: 1000, // < 2000m
      cornersCount: 15
    });

    assert.ok(updateResult.isFailure);
    assert.equal(updateResult.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
  });
});
