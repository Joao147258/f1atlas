/**
 * ============================================================================
 * F1Atlas — Testes Estáticos de Tipos: Result<T, E>
 * ============================================================================
 *
 * Módulo: packages/domain/test/shared/result.type.test.ts
 * Componente testado: packages/domain/src/shared/result.ts
 *
 * Propósito:
 * Comprovar estaticamente que Result<T, E> preserva a segurança de tipos,
 * inferência genérica correta para valores e erros, compatibilidade
 * de atribuição e integridade das propriedades readonly.
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Result } from '../../src/shared/result.ts';
import { DomainError } from '../../src/shared/domain-error.ts';

describe('Result — Segurança de Tipos em Tempo de Compilação', () => {
  it('TT-01: inferência correta de T e E em Result.ok e Result.fail', () => {
    const successResult = Result.ok<string>('temporada-2025');
    const failureResult = Result.fail<DomainError>(new DomainError('INVALID_STATE', 'Erro'));

    // Validação de atribuição a tipos explícitos:
    const typedSuccess: Result<string, DomainError> = successResult;
    const typedFailure: Result<string, DomainError> = failureResult;

    assert.equal(typedSuccess.isSuccess, true);
    assert.equal(typedFailure.isFailure, true);
  });

  it('TT-02: Result.combine unifica tipos em array de valores', () => {
    const r1 = Result.ok<number>(25);
    const r2 = Result.ok<number>(18);
    const combined: Result<number[], DomainError> = Result.combine([r1, r2]);

    assert.equal(combined.isSuccess, true);
    assert.deepEqual(combined.getValue(), [25, 18]);
  });

  it('TT-03: propriedades públicas são estritamente readonly', () => {
    const res = Result.ok('teste');

    assert.equal(res.isSuccess, true);
    assert.equal(res.isFailure, false);
    assert.equal(res.value, 'teste');

    assert.throws(() => {
      // @ts-expect-error isSuccess é readonly e não pode ser reatribuído
      res.isSuccess = false;
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error isFailure é readonly e não pode ser reatribuído
      res.isFailure = true;
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error value é getter readonly sem setter
      res.value = 'novo';
    }, TypeError);
  });
});
