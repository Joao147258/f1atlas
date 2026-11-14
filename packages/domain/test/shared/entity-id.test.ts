/**
 * ============================================================================
 * F1Atlas — Suíte de Testes Unitários: EntityId
 * ============================================================================
 *
 * Módulo: packages/domain/test/shared/entity-id.test.ts
 * Componente testado: packages/domain/src/shared/entity-id.ts
 * Padrão: Test runner nativo do Node.js (node:test + node:assert/strict)
 *
 * Propósito:
 * Verificar rigorosamente contratos, invariantes, imutabilidade, factories,
 * igualdade por valor, propriedades matemáticas de equivalência e comportamento
 * em cenários positivos, negativos e de fronteira do Value Object EntityId.
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId, createEntityId } from '../../src/shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../../src/shared/domain-error.ts';

type DriverId = EntityId<'driver'>;
type ConstructorId = EntityId<'constructor'>;

describe('EntityId — Construção e Validação (Invariantes)', () => {
  it('UT-01: deve criar um identificador válido a partir de string bem formatada', () => {
    const raw = 'driver-044';
    const id = EntityId.from<'driver'>(raw);

    assert.ok(id instanceof EntityId, 'Deve ser instância de EntityId');
    assert.equal(id.value, raw);
    assert.equal(id.toValue(), raw);
    assert.equal(id.toString(), raw);
  });

  it('UT-01b: deve permitir instanciação via createEntityId com mesmo comportamento de from', () => {
    const raw = 'team-ferrari';
    const idFromFunc = createEntityId<'team'>(raw);
    const idFromStatic = EntityId.createEntityId<'team'>(raw);

    assert.ok(idFromFunc instanceof EntityId);
    assert.ok(idFromStatic instanceof EntityId);
    assert.equal(idFromFunc.value, raw);
    assert.equal(idFromStatic.value, raw);
    assert.equal(idFromStatic.toValue(), raw);
    assert.ok(idFromFunc.equals(idFromStatic));
  });

  it('UT-02: deve rejeitar string vazia com erro de domínio (INVALID_ARGUMENT)', () => {
    assert.throws(
      () => EntityId.from<'driver'>(''),
      (err: unknown) => {
        assert.ok(err instanceof DomainError);
        assert.equal((err as DomainError).code, DomainErrorCode.INVALID_ARGUMENT);
        assert.match((err as DomainError).message, /não pode ser vazio/i);
        return true;
      }
    );
  });

  it('UT-03: deve rejeitar string composta apenas por espaços em branco', () => {
    assert.throws(
      () => EntityId.from<'driver'>('   '),
      (err: unknown) => {
        assert.ok(err instanceof DomainError);
        assert.equal((err as DomainError).code, DomainErrorCode.INVALID_ARGUMENT);
        return true;
      }
    );
  });

  it('UT-04: deve rejeitar string com espaços externos (invariante INV-04)', () => {
    assert.throws(
      () => EntityId.from<'driver'>(' driver-044 '),
      (err: unknown) => {
        assert.ok(err instanceof DomainError);
        assert.equal((err as DomainError).code, DomainErrorCode.INVALID_ARGUMENT);
        assert.match((err as DomainError).message, /espaços nas extremidades/i);
        return true;
      }
    );

    assert.throws(
      () => EntityId.from<'driver'>('driver-044 '),
      (err: unknown) => {
        assert.ok(err instanceof DomainError);
        assert.equal((err as DomainError).code, DomainErrorCode.INVALID_ARGUMENT);
        return true;
      }
    );

    assert.throws(
      () => EntityId.from<'driver'>(' driver-044'),
      (err: unknown) => {
        assert.ok(err instanceof DomainError);
        assert.equal((err as DomainError).code, DomainErrorCode.INVALID_ARGUMENT);
        return true;
      }
    );
  });

  it('UT-05: deve rejeitar valor nulo forçado em tempo de execução', () => {
    assert.throws(
      () => EntityId.from<'driver'>(null as unknown as string),
      (err: unknown) => {
        assert.ok(err instanceof DomainError);
        assert.equal((err as DomainError).code, DomainErrorCode.INVALID_ARGUMENT);
        assert.match((err as DomainError).message, /string/i);
        return true;
      }
    );
  });

  it('UT-06: deve rejeitar valor undefined forçado em tempo de execução', () => {
    assert.throws(
      () => EntityId.from<'driver'>(undefined as unknown as string),
      (err: unknown) => {
        assert.ok(err instanceof DomainError);
        assert.equal((err as DomainError).code, DomainErrorCode.INVALID_ARGUMENT);
        assert.match((err as DomainError).message, /string/i);
        return true;
      }
    );
  });

  it('UT-07: deve rejeitar valor numérico ou de outros tipos forçados', () => {
    assert.throws(
      () => EntityId.from<'driver'>(123 as unknown as string),
      (err: unknown) => {
        assert.ok(err instanceof DomainError);
        assert.equal((err as DomainError).code, DomainErrorCode.INVALID_ARGUMENT);
        return true;
      }
    );

    assert.throws(
      () => EntityId.from<'driver'>({} as unknown as string),
      (err: unknown) => {
        assert.ok(err instanceof DomainError);
        assert.equal((err as DomainError).code, DomainErrorCode.INVALID_ARGUMENT);
        return true;
      }
    );
  });
});

describe('EntityId — Imutabilidade e Encapsulamento', () => {
  it('INV-05 / UT-17: deve preservar o estado imutável após chamadas repetidas', () => {
    const id = EntityId.from<'driver'>('driver-001');

    assert.equal(id.value, 'driver-001');
    assert.equal(id.value, 'driver-001');
    assert.equal(id.toValue(), 'driver-001');
    assert.equal(id.toString(), 'driver-001');
  });

  it('INV-05: deve congelar a instância impedindo mutação em tempo de execução', () => {
    const id = EntityId.from<'driver'>('driver-001');

    assert.ok(Object.isFrozen(id), 'A instância de EntityId deve estar congelada');

    assert.throws(() => {
      // @ts-expect-error Tentativa deliberada de mutação em tempo de execução
      id.value = 'outro-id';
    }, /TypeError/);
  });
});

describe('EntityId — Igualdade por Valor e Propriedades Matemáticas', () => {
  it('UT-08 / UT-18: instâncias distintas com mesmo valor devem ser equivalentes segundo equals', () => {
    const id1 = EntityId.from<'driver'>('driver-001');
    const id2 = EntityId.from<'driver'>('driver-001');

    assert.notEqual(id1, id2, 'Devem ser referências de memória distintas');
    assert.ok(id1.equals(id2), 'Devem ser considerados iguais por valor');
    assert.ok(id2.equals(id1), 'Simetria da igualdade');
  });

  it('UT-09: instâncias com valores distintos devem retornar false', () => {
    const id1 = EntityId.from<'driver'>('driver-001');
    const id2 = EntityId.from<'driver'>('driver-002');

    assert.equal(id1.equals(id2), false);
    assert.equal(id2.equals(id1), false);
  });

  it('UT-10 / UT-11: comparação com null ou undefined deve retornar false sem disparar exceção', () => {
    const id = EntityId.from<'driver'>('driver-001');

    assert.equal(id.equals(null), false);
    assert.equal(id.equals(undefined), false);
  });

  it('deve retornar false quando comparado com objeto que não é EntityId', () => {
    const id = EntityId.from<'driver'>('driver-001');
    const fake = { value: 'driver-001' } as unknown as EntityId<'driver'>;

    assert.equal(id.equals(fake), false);
    assert.equal(id.equals('driver-001' as unknown as EntityId<'driver'>), false);
  });

  it('UT-12: Reflexividade — a.equals(a) deve ser sempre true', () => {
    const id = EntityId.from<'driver'>('driver-001');
    assert.ok(id.equals(id));
  });

  it('UT-13: Simetria — a.equals(b) === b.equals(a)', () => {
    const a = EntityId.from<'driver'>('driver-001');
    const b = EntityId.from<'driver'>('driver-001');
    const c = EntityId.from<'driver'>('driver-002');

    assert.equal(a.equals(b), b.equals(a));
    assert.equal(a.equals(c), c.equals(a));
  });

  it('UT-14: Transitividade — se a.equals(b) e b.equals(c), então a.equals(c)', () => {
    const a = EntityId.from<'driver'>('driver-001');
    const b = EntityId.from<'driver'>('driver-001');
    const c = EntityId.from<'driver'>('driver-001');

    assert.ok(a.equals(b));
    assert.ok(b.equals(c));
    assert.ok(a.equals(c));
  });

  it('UT-15: Sensibilidade à capitalização (case-sensitivity preservada)', () => {
    const lower = EntityId.from<'driver'>('driver-senna');
    const upper = EntityId.from<'driver'>('DRIVER-SENNA');

    assert.equal(lower.equals(upper), false);
  });
});

describe('EntityId — Representação Primitiva', () => {
  it('UT-13 / UT-14 / UT-16: deve fornecer representação primitiva canônica idêntica à entrada', () => {
    const raw = 'grand-prix-monaco-2025';
    const id = EntityId.from<'grand-prix'>(raw);

    assert.equal(id.value, raw);
    assert.equal(id.toValue(), raw);
    assert.equal(id.toString(), raw);
  });
});
