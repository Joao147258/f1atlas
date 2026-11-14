/**
 * ============================================================================
 * F1Atlas — Suíte de Testes Unitários: Result<T, E>
 * ============================================================================
 *
 * Módulo: packages/domain/test/shared/result.test.ts
 * Componente testado: packages/domain/src/shared/result.ts
 * Padrão: Test runner nativo do Node.js (node:test + node:assert/strict)
 *
 * Propósito:
 * Verificar rigorosamente contratos, invariantes, imutabilidade, exclusividade
 * de estados, factories ok/fail, método combine e acesso defensivo a valores
 * e erros no container monádico Result.
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Result } from '../../src/shared/result.ts';
import { DomainError, DomainErrorCode } from '../../src/shared/domain-error.ts';

describe('Result — Operação ok e Estado de Sucesso', () => {
  it('deve construir Result bem-sucedido com valor string', () => {
    const res = Result.ok('temporada-2025');

    assert.equal(res.isSuccess, true);
    assert.equal(res.isFailure, false);
    assert.equal(res.getValue(), 'temporada-2025');
    assert.equal(res.value, 'temporada-2025');
  });

  it('deve construir Result bem-sucedido com número (incluindo 0)', () => {
    const resZero = Result.ok(0);

    assert.equal(resZero.isSuccess, true);
    assert.equal(resZero.isFailure, false);
    assert.equal(resZero.getValue(), 0);

    const resPoints = Result.ok(25);
    assert.equal(resPoints.getValue(), 25);
  });

  it('deve construir Result bem-sucedido com booleano (incluindo false)', () => {
    const resFalse = Result.ok(false);

    assert.equal(resFalse.isSuccess, true);
    assert.equal(resFalse.isFailure, false);
    assert.equal(resFalse.getValue(), false);

    const resTrue = Result.ok(true);
    assert.equal(resTrue.getValue(), true);
  });

  it('deve construir Result bem-sucedido com string vazia ("")', () => {
    const resEmpty = Result.ok('');

    assert.equal(resEmpty.isSuccess, true);
    assert.equal(resEmpty.getValue(), '');
  });

  it('deve construir Result bem-sucedido com objeto complexo', () => {
    const payload = { id: 'd1', name: 'Ayrton Senna', titles: 3 };
    const res = Result.ok(payload);

    assert.equal(res.isSuccess, true);
    assert.deepEqual(res.getValue(), payload);
  });

  it('deve construir Result bem-sucedido sem argumentos (void / undefined)', () => {
    const resVoid = Result.ok();

    assert.equal(resVoid.isSuccess, true);
    assert.equal(resVoid.isFailure, false);
    assert.equal(resVoid.getValue(), undefined);
  });

  it('deve construir Result bem-sucedido com valor null explícito', () => {
    const resNull = Result.ok(null);

    assert.equal(resNull.isSuccess, true);
    assert.equal(resNull.getValue(), null);
  });

  it('INV-06: tentar chamar getError() em estado de sucesso deve lançar exceção explícita', () => {
    const res = Result.ok('sucesso');

    assert.throws(
      () => res.getError(),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /não é possível obter o erro de um result em estado de sucesso/i);
        return true;
      }
    );

    assert.throws(
      () => res.error,
      (err: unknown) => {
        assert.ok(err instanceof Error);
        return true;
      }
    );
  });
});

describe('Result — Operação fail e Estado de Falha', () => {
  it('deve construir Result de falha com instância de DomainError', () => {
    const domainError = new DomainError(
      DomainErrorCode.INVALID_ARGUMENT,
      'Piloto não possui inscrição ativa nesta etapa.'
    );
    const res = Result.fail(domainError);

    assert.equal(res.isSuccess, false);
    assert.equal(res.isFailure, true);
    assert.equal(res.getError(), domainError);
    assert.equal(res.error, domainError);
  });

  it('deve construir Result de falha com erros customizados ou strings', () => {
    const customError = { code: 'REGULATION_ERROR', reason: 'Peso abaixo do mínimo' };
    const res = Result.fail(customError);

    assert.equal(res.isSuccess, false);
    assert.equal(res.isFailure, true);
    assert.deepEqual(res.getError(), customError);
  });

  it('INV-06: tentar chamar getValue() em estado de falha deve lançar exceção explícita', () => {
    const error = new DomainError(DomainErrorCode.INVALID_STATE, 'Sessão encerrada');
    const res = Result.fail(error);

    assert.throws(
      () => res.getValue(),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /não é possível obter o valor de um result em estado de falha/i);
        return true;
      }
    );

    assert.throws(
      () => res.value,
      (err: unknown) => {
        assert.ok(err instanceof Error);
        return true;
      }
    );
  });
});

describe('Result — Imutabilidade e Encapsulamento', () => {
  it('INV-05: a instância de Result deve ser congelada via Object.freeze', () => {
    const successRes = Result.ok(100);
    assert.ok(Object.isFrozen(successRes));

    assert.throws(() => {
      // @ts-expect-error Tentativa deliberada de mutação
      successRes.isSuccess = false;
    }, /TypeError/);

    const failRes = Result.fail('falha');
    assert.ok(Object.isFrozen(failRes));
  });

  it('INV-10: não deve aplicar congelamento profundo nos dados de sucesso fornecidos pelo chamador', () => {
    const mutableData = { counter: 1 };
    const res = Result.ok(mutableData);

    // O chamador ainda pode modificar seu próprio objeto caso deseje
    mutableData.counter = 2;
    assert.equal(res.getValue().counter, 2);
  });
});

describe('Result — Operação combine', () => {
  it('deve retornar sucesso com array vazio para lista vazia de resultados', () => {
    const combined = Result.combine([]);

    assert.equal(combined.isSuccess, true);
    assert.deepEqual(combined.getValue(), []);
  });

  it('deve combinar uma lista com um único sucesso', () => {
    const combined = Result.combine([Result.ok('unico')]);

    assert.equal(combined.isSuccess, true);
    assert.deepEqual(combined.getValue(), ['unico']);
  });

  it('INV-08: deve combinar múltiplos sucessos preservando rigorosamente a ordem original', () => {
    const r1 = Result.ok('primeiro');
    const r2 = Result.ok('segundo');
    const r3 = Result.ok('terceiro');

    const combined = Result.combine([r1, r2, r3]);

    assert.equal(combined.isSuccess, true);
    assert.deepEqual(combined.getValue(), ['primeiro', 'segundo', 'terceiro']);
  });

  it('INV-09: deve propagar falha se houver uma única falha na primeira posição', () => {
    const err = new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Erro inicial');
    const combined = Result.combine([Result.fail(err), Result.ok(10), Result.ok(20)]);

    assert.equal(combined.isSuccess, false);
    assert.equal(combined.isFailure, true);
    assert.equal(combined.getError(), err);
  });

  it('INV-09: deve propagar falha se houver uma falha em posição intermediária', () => {
    const err = new DomainError(DomainErrorCode.INVALID_STATE, 'Erro meio');
    const combined = Result.combine([Result.ok(1), Result.fail(err), Result.ok(3)]);

    assert.equal(combined.isSuccess, false);
    assert.equal(combined.isFailure, true);
    assert.equal(combined.getError(), err);
  });

  it('INV-09: deve propagar falha se houver uma falha na última posição', () => {
    const err = new DomainError(DomainErrorCode.OPERATION_NOT_ALLOWED, 'Erro final');
    const combined = Result.combine([Result.ok(1), Result.ok(2), Result.fail(err)]);

    assert.equal(combined.isSuccess, false);
    assert.equal(combined.isFailure, true);
    assert.equal(combined.getError(), err);
  });

  it('INV-09: em caso de múltiplas falhas, deve retornar determinística e estritamente a primeira falha', () => {
    const err1 = new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Primeira falha');
    const err2 = new DomainError(DomainErrorCode.INVALID_STATE, 'Segunda falha');

    const combined = Result.combine([
      Result.ok('ok1'),
      Result.fail(err1),
      Result.ok('ok2'),
      Result.fail(err2)
    ]);

    assert.equal(combined.isSuccess, false);
    assert.equal(combined.getError(), err1);
  });

  it('INV-10: combine não deve mutar o array de resultados fornecido como entrada', () => {
    const originalList = [Result.ok(1), Result.ok(2)];
    const cloneList = [...originalList];

    Result.combine(originalList);

    assert.deepEqual(originalList, cloneList);
  });
});
