/**
 * ============================================================================
 * F1Atlas — Suíte de Testes de Contrato: Shared
 * ============================================================================
 *
 * Módulo: packages/contracts/test/shared.contract.test.ts
 * Contratos testados: ApiErrorResponseSchema, PaginationQuerySchema, PaginationMetaSchema
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiErrorResponseSchema,
  ApiErrorDetailSchema,
  PaginationQuerySchema,
  PaginationMetaSchema,
  createPaginatedResponseSchema,
  type ApiErrorResponse,
  type PaginationQuery,
  type PaginationMeta
} from '../src/index.ts';
import { z } from 'zod';

describe('Contracts — ApiErrorResponseSchema', () => {
  it('deve aceitar payload de erro válido e estruturado conforme RFC 7807', () => {
    const validError = {
      statusCode: 404,
      error: 'NOT_FOUND',
      message: 'O piloto informado não foi localizado.',
      timestamp: '2025-11-09T17:00:00.000Z',
      path: '/api/v1/drivers/unknown',
      correlationId: 'req-12345',
      details: [
        { field: 'id', message: 'Identificador inexistente', code: 'ENTITY_NOT_FOUND' }
      ]
    };

    const parsed = ApiErrorResponseSchema.parse(validError);
    assert.equal(parsed.statusCode, 404);
    assert.equal(parsed.error, 'NOT_FOUND');
    assert.equal(parsed.details?.[0].field, 'id');
  });

  it('deve aceitar payload de erro mínimo sem campos opcionais', () => {
    const minimalError = {
      statusCode: 500,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu uma falha inesperada no processamento.',
      timestamp: new Date().toISOString()
    };

    const parsed = ApiErrorResponseSchema.parse(minimalError);
    assert.equal(parsed.statusCode, 500);
    assert.equal(parsed.path, undefined);
    assert.equal(parsed.details, undefined);
  });

  it('deve rejeitar statusCode fora do intervalo HTTP válido (400 a 599)', () => {
    assert.throws(() => {
      ApiErrorResponseSchema.parse({
        statusCode: 200,
        error: 'OK',
        message: 'Sucesso',
        timestamp: new Date().toISOString()
      });
    }, (err: unknown) => {
      assert.ok(err instanceof z.ZodError);
      return true;
    });
  });

  it('deve rejeitar timestamp que não esteja no formato ISO 8601 UTC válido', () => {
    assert.throws(() => {
      ApiErrorResponseSchema.parse({
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Requisição inválida',
        timestamp: '09/11/2025 17:00'
      });
    }, (err: unknown) => {
      assert.ok(err instanceof z.ZodError);
      return true;
    });
  });

  it('deve rejeitar campos obrigatórios ausentes', () => {
    assert.throws(() => {
      ApiErrorResponseSchema.parse({
        statusCode: 400
      });
    }, (err: unknown) => {
      assert.ok(err instanceof z.ZodError);
      return true;
    });
  });
});

describe('Contracts — PaginationSchemas', () => {
  it('deve aplicar valores padrão (page=1, limit=20) quando query params estiverem vazios', () => {
    const parsed = PaginationQuerySchema.parse({});
    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, 20);
  });

  it('deve coercer strings numéricas provenientes de query params HTTP', () => {
    const parsed = PaginationQuerySchema.parse({ page: '3', limit: '50' });
    assert.equal(parsed.page, 3);
    assert.equal(parsed.limit, 50);
  });

  it('deve rejeitar limit superior ao teto máximo de 100 itens', () => {
    assert.throws(() => {
      PaginationQuerySchema.parse({ limit: 150 });
    }, (err: unknown) => {
      assert.ok(err instanceof z.ZodError);
      return true;
    });
  });

  it('deve rejeitar page ou limit negativos ou zero', () => {
    assert.throws(() => {
      PaginationQuerySchema.parse({ page: 0 });
    });
    assert.throws(() => {
      PaginationQuerySchema.parse({ limit: -5 });
    });
  });

  it('deve validar metadados de resposta paginada e factory de envelope', () => {
    const meta: PaginationMeta = {
      total: 58,
      page: 2,
      limit: 20,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true
    };

    const parsedMeta = PaginationMetaSchema.parse(meta);
    assert.equal(parsedMeta.totalPages, 3);

    const ItemSchema = z.object({ id: z.string(), name: z.string() });
    const EnvelopeSchema = createPaginatedResponseSchema(ItemSchema);

    const envelope = {
      data: [{ id: '1', name: 'Item 1' }],
      meta
    };

    const parsedEnvelope = EnvelopeSchema.parse(envelope);
    assert.equal(parsedEnvelope.data.length, 1);
    assert.equal(parsedEnvelope.meta.total, 58);
  });
});
