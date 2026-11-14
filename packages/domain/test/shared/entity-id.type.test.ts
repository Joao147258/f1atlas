/**
 * ============================================================================
 * F1Atlas — Testes Estáticos de Tipos: EntityId
 * ============================================================================
 *
 * Módulo: packages/domain/test/shared/entity-id.type.test.ts
 * Componente testado: packages/domain/src/shared/entity-id.ts
 *
 * Propósito:
 * Comprovar estaticamente que EntityId<TKind> implementa tipagem nominal
 * eficaz (via phantom type), impedindo atribuição cruzada entre categorias
 * distintas (ex.: DriverId vs ConstructorId) e prevenindo que strings comuns
 * sejam aceitas no lugar de identidades tipadas.
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';

type DriverId = EntityId<'driver'>;
type ConstructorId = EntityId<'constructor'>;

describe('EntityId — Segurança de Tipos em Tempo de Compilação', () => {
  it('TT-01 / UT-16: tipos de entidades diferentes devem ser incompatíveis no sistema de tipos', () => {
    const driverId = EntityId.from<'driver'>('driver-001');
    const constructorId = EntityId.from<'constructor'>('constructor-001');

    // Validação de atribuição legítima:
    const validDriver: DriverId = driverId;
    const validConstructor: ConstructorId = constructorId;

    assert.ok(validDriver instanceof EntityId);
    assert.ok(validConstructor instanceof EntityId);

    // As linhas abaixo documentam atribuições inválidas que o TypeScript rejeita:
    // @ts-expect-error ConstructorId não pode ser atribuído a DriverId
    const invalidAssignment: DriverId = constructorId;
    assert.ok(invalidAssignment);

    // @ts-expect-error String comum não pode substituir uma identidade tipada
    const stringAssign: DriverId = "driver-001";
    assert.ok(stringAssign);
  });

  it('TT-02: a interface de EntityId não permite mutação de propriedades pelo código tipado', () => {
    const id = EntityId.from<'driver'>('driver-001');
    assert.equal(id.value, 'driver-001');

    assert.throws(() => {
      // @ts-expect-error value é readonly e não pode ser reatribuído
      id.value = 'novo-id';
    }, TypeError);
  });
});
