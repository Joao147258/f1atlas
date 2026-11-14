/**
 * ============================================================================
 * F1Atlas — Suíte de Testes Unitários: Constructor
 * ============================================================================
 *
 * Módulo: packages/domain/test/participants/constructor.test.ts
 * Componente testado: packages/domain/src/participants/constructor.ts
 * Padrão: Test runner nativo do Node.js (node:test + node:assert/strict)
 *
 * Propósito:
 * Verificar a entidade de domínio Constructor, suas invariantes locais (nome técnico,
 * nacionalidade, atributos de chassi e motor), métodos de identidade e imutabilidade estrita.
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Constructor,
  createConstructor,
  type CreateConstructorProps
} from '../../src/participants/constructor.ts';
import { EntityId } from '../../src/shared/entity-id.ts';

const createValidConstructorProps = (
  overrides?: Partial<CreateConstructorProps>
): CreateConstructorProps => ({
  id: EntityId.from<'constructor'>('constructor-ferrari'),
  name: 'Ferrari',
  nationality: 'ITA',
  chassis: 'SF-24',
  engineManufacturer: 'Ferrari',
  ...overrides
});

describe('Constructor — Criação e Invariantes Estruturais', () => {
  it('deve instanciar um construtor válido com todas as propriedades', () => {
    const props = createValidConstructorProps();
    const result = Constructor.create(props);

    assert.equal(result.isSuccess, true);
    const constructor = result.getValue();
    assert.equal(constructor.id.value, 'constructor-ferrari');
    assert.equal(constructor.name, 'Ferrari');
    assert.equal(constructor.nationality, 'ITA');
    assert.equal(constructor.chassis, 'SF-24');
    assert.equal(constructor.engineManufacturer, 'Ferrari');
  });

  it('deve permitir criação com campos opcionais omitidos (chassis e engineManufacturer)', () => {
    const props: CreateConstructorProps = {
      id: EntityId.from<'constructor'>('constructor-mclaren'),
      name: 'McLaren',
      nationality: 'GBR'
    };
    const result = createConstructor(props);

    assert.equal(result.isSuccess, true);
    const constructor = result.getValue();
    assert.equal(constructor.chassis, null);
    assert.equal(constructor.engineManufacturer, null);
  });

  it('deve rejeitar props nulas ou indefinidas', () => {
    // @ts-expect-error teste de runtime
    const result = Constructor.create(null);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });

  it('deve rejeitar identificador ausente ou inválido', () => {
    // @ts-expect-error teste de runtime
    const result = Constructor.create(createValidConstructorProps({ id: null }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });

  it('deve rejeitar nome técnico do construtor vazio', () => {
    const resultEmpty = Constructor.create(createValidConstructorProps({ name: '' }));
    assert.equal(resultEmpty.isFailure, true);
    assert.equal(resultEmpty.getError().code, 'DOMAIN.INVALID_ARGUMENT');

    const resultWhitespace = Constructor.create(createValidConstructorProps({ name: '   ' }));
    assert.equal(resultWhitespace.isFailure, true);
  });

  it('deve rejeitar nacionalidade vazia', () => {
    const result = Constructor.create(createValidConstructorProps({ nationality: '  ' }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });

  it('deve sanitizar whitespace nas extremidades de name e nationality', () => {
    const result = Constructor.create(
      createValidConstructorProps({
        name: '  Williams  ',
        nationality: '  GBR  ',
        chassis: '  FW46  ',
        engineManufacturer: '  Mercedes  '
      })
    );
    assert.equal(result.isSuccess, true);
    const constructor = result.getValue();
    assert.equal(constructor.name, 'Williams');
    assert.equal(constructor.nationality, 'GBR');
    assert.equal(constructor.chassis, 'FW46');
    assert.equal(constructor.engineManufacturer, 'Mercedes');
  });

  it('deve comparar igualdade por identidade (equals)', () => {
    const idA = EntityId.from<'constructor'>('constructor-1');
    const idB = EntityId.from<'constructor'>('constructor-2');

    const constrA1 = Constructor.create(createValidConstructorProps({ id: idA })).getValue();
    const constrA2 = Constructor.create(createValidConstructorProps({ id: idA, name: 'Outro' })).getValue();
    const constrB = Constructor.create(createValidConstructorProps({ id: idB })).getValue();

    assert.equal(constrA1.equals(constrA2), true);
    assert.equal(constrA1.equals(constrB), false);
    assert.equal(constrA1.equals(null), false);
  });

  it('deve garantir imutabilidade estrita da instância congelada (Object.freeze)', () => {
    const constructor = Constructor.create(createValidConstructorProps()).getValue();

    assert.equal(Object.isFrozen(constructor), true);
    assert.throws(() => {
      // @ts-expect-error mutação intencional
      constructor.name = 'Outro';
    }, TypeError);
  });
});
