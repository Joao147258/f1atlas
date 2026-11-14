/**
 * ============================================================================
 * F1Atlas — Suíte de Testes de Contrato: Drivers
 * ============================================================================
 *
 * Módulo: packages/contracts/test/drivers.contract.test.ts
 * Contratos testados: DriverResponseSchema, ListDriversQuerySchema
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DriverResponseSchema,
  ListDriversQuerySchema,
  type DriverResponse,
  type ListDriversQuery
} from '../src/index.ts';
import { z } from 'zod';

describe('Contracts — DriverResponseSchema', () => {
  it('deve validar um payload completo de piloto com campos nulos e presentes', () => {
    const validDriver: DriverResponse = {
      id: 'd9e0f6c2-4a7b-4d3b-9e45-123456789abc',
      slug: 'lewis-hamilton',
      firstName: 'Lewis',
      lastName: 'Hamilton',
      fullName: 'Lewis Hamilton',
      displayName: 'L. Hamilton',
      permanentNumber: 44,
      code: 'HAM',
      nationality: 'British',
      countryCode: 'GBR',
      birthDate: '1985-01-07',
      isActive: true
    };

    const parsed = DriverResponseSchema.parse(validDriver);
    assert.equal(parsed.permanentNumber, 44);
    assert.equal(parsed.code, 'HAM');
    assert.equal(parsed.isActive, true);
  });

  it('deve aceitar campos opcionais expressos como null de acordo com o contrato', () => {
    const minimalDriver = {
      id: 'driver-slug-id',
      slug: 'rookie-driver',
      firstName: 'Rookie',
      lastName: 'Driver',
      fullName: 'Rookie Driver',
      displayName: 'R. Driver',
      permanentNumber: null,
      code: null,
      nationality: 'Brazilian',
      countryCode: null,
      birthDate: null,
      isActive: false
    };

    const parsed = DriverResponseSchema.parse(minimalDriver);
    assert.equal(parsed.permanentNumber, null);
    assert.equal(parsed.code, null);
  });

  it('deve rejeitar código de piloto fora do padrão de 3 letras maiúsculas', () => {
    assert.throws(() => {
      DriverResponseSchema.parse({
        id: '1',
        slug: 'test',
        firstName: 'A',
        lastName: 'B',
        fullName: 'A B',
        displayName: 'A. B',
        permanentNumber: 10,
        code: 'ham', // minúsculo
        nationality: 'BR',
        countryCode: null,
        birthDate: null,
        isActive: true
      });
    }, (err: unknown) => {
      assert.ok(err instanceof z.ZodError);
      return true;
    });

    assert.throws(() => {
      DriverResponseSchema.parse({
        id: '1',
        slug: 'test',
        firstName: 'A',
        lastName: 'B',
        fullName: 'A B',
        displayName: 'A. B',
        permanentNumber: 10,
        code: 'HAMILTON', // mais de 3 letras
        nationality: 'BR',
        countryCode: null,
        birthDate: null,
        isActive: true
      });
    });
  });

  it('deve rejeitar número permanente fora do limite regulamentar FIA (1 a 99)', () => {
    assert.throws(() => {
      DriverResponseSchema.parse({
        id: '1',
        slug: 'test',
        firstName: 'A',
        lastName: 'B',
        fullName: 'A B',
        displayName: 'A. B',
        permanentNumber: 100, // FIA permite até 99
        code: 'TEST',
        nationality: 'BR',
        countryCode: null,
        birthDate: null,
        isActive: true
      });
    });

    assert.throws(() => {
      DriverResponseSchema.parse({
        id: '1',
        slug: 'test',
        firstName: 'A',
        lastName: 'B',
        fullName: 'A B',
        displayName: 'A. B',
        permanentNumber: 0, // menor que 1
        code: 'TEST',
        nationality: 'BR',
        countryCode: null,
        birthDate: null,
        isActive: true
      });
    });
  });

  it('deve rejeitar data de nascimento em formato inválido', () => {
    assert.throws(() => {
      DriverResponseSchema.parse({
        id: '1',
        slug: 'test',
        firstName: 'A',
        lastName: 'B',
        fullName: 'A B',
        displayName: 'A. B',
        permanentNumber: 10,
        code: 'HAM',
        nationality: 'BR',
        countryCode: null,
        birthDate: '1985/01/07', // formato errado
        isActive: true
      });
    });
  });
});

describe('Contracts — ListDriversQuerySchema', () => {
  it('deve parsear e transformar boolean strings de query params HTTP', () => {
    const query = {
      page: '2',
      limit: '15',
      nationality: 'Brazilian',
      isActive: 'true',
      search: 'Senna'
    };

    const parsed = ListDriversQuerySchema.parse(query);
    assert.equal(parsed.page, 2);
    assert.equal(parsed.limit, 15);
    assert.equal(parsed.isActive, true);
    assert.equal(parsed.search, 'Senna');
  });

  it('deve aceitar query params sem filtros opcionais', () => {
    const parsed = ListDriversQuerySchema.parse({});
    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, 20);
    assert.equal(parsed.nationality, undefined);
    assert.equal(parsed.isActive, undefined);
  });
});
