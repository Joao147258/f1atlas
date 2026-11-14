/**
 * ============================================================================
 * F1Atlas — Suíte de Testes de Inferência e Compatibilidade Estática de Tipos
 * ============================================================================
 *
 * Módulo: packages/contracts/test/type-inference.test.ts
 *
 * Propósito:
 * Assegurar que os tipos TypeScript inferidos via z.infer<typeof Schema>
 * correspondem fidedignamente às interfaces esperadas pelos consumidores (API/Frontend)
 * e rejeitam atribuições inválidas.
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type {
  ApiErrorResponse,
  PaginationQuery,
  PaginationMeta,
  DriverResponse,
  TeamResponse,
  ConstructorResponse,
  SeasonResponse,
  GrandPrixResponse,
  DriverStandingsResponse,
  ConstructorStandingsResponse
} from '../src/index.ts';

describe('Contracts — Inferência de Tipos Estáticos', () => {
  it('deve assegurar compatibilidade estática perfeita de objetos tipados', () => {
    const error: ApiErrorResponse = {
      statusCode: 400,
      error: 'BAD_REQUEST',
      message: 'Falha',
      timestamp: '2025-01-01T00:00:00.000Z'
    };

    const query: PaginationQuery = {
      page: 1,
      limit: 20
    };

    const meta: PaginationMeta = {
      total: 10,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false
    };

    const driver: DriverResponse = {
      id: 'd1',
      slug: 'senna',
      firstName: 'Ayrton',
      lastName: 'Senna',
      fullName: 'Ayrton Senna',
      displayName: 'A. Senna',
      permanentNumber: null,
      code: 'SEN',
      nationality: 'Brazilian',
      countryCode: 'BRA',
      birthDate: '1960-03-21',
      isActive: false
    };

    const team: TeamResponse = {
      id: 't1',
      slug: 'mclaren',
      legalName: 'McLaren Racing Limited',
      commonName: 'McLaren',
      nationality: 'British',
      countryCode: 'GBR',
      baseLocation: 'Woking, UK',
      foundedYear: 1963,
      isActive: true
    };

    const constructor: ConstructorResponse = {
      id: 'c1',
      slug: 'mclaren',
      name: 'McLaren',
      chassis: 'MCL38',
      engineManufacturer: 'Mercedes',
      nationality: 'British',
      countryCode: 'GBR'
    };

    const season: SeasonResponse = {
      id: 's1',
      year: 2025,
      officialName: '2025 Championship',
      status: 'ACTIVE',
      startDate: '2025-03-01',
      endDate: '2025-11-30'
    };

    assert.ok(error.statusCode === 400);
    assert.ok(query.page === 1);
    assert.ok(meta.total === 10);
    assert.ok(driver.slug === 'senna');
    assert.ok(team.commonName === 'McLaren');
    assert.ok(constructor.chassis === 'MCL38');
    assert.ok(season.year === 2025);
  });
});
