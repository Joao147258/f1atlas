/**
 * ============================================================================
 * F1Atlas — Suíte de Testes de Contrato: Seasons
 * ============================================================================
 *
 * Módulo: packages/contracts/test/seasons.contract.test.ts
 * Contratos testados: SeasonResponseSchema, SeasonStatusSchema
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SeasonResponseSchema,
  SeasonStatusSchema,
  type SeasonResponse
} from '../src/index.ts';
import { z } from 'zod';

describe('Contracts — SeasonResponseSchema', () => {
  it('deve validar temporada com ciclo ativo e datas oficiais', () => {
    const season: SeasonResponse = {
      id: 'season-2025-uuid',
      year: 2025,
      officialName: '2025 FIA Formula One World Championship',
      status: 'ACTIVE',
      startDate: '2025-03-14',
      endDate: '2025-12-07'
    };

    const parsed = SeasonResponseSchema.parse(season);
    assert.equal(parsed.year, 2025);
    assert.equal(parsed.status, 'ACTIVE');
  });

  it('deve validar temporada planejada sem datas definidas', () => {
    const plannedSeason = {
      id: 'season-2026-uuid',
      year: 2026,
      officialName: '2026 FIA Formula One World Championship',
      status: 'PLANNED',
      startDate: null,
      endDate: null
    };

    const parsed = SeasonResponseSchema.parse(plannedSeason);
    assert.equal(parsed.status, 'PLANNED');
    assert.equal(parsed.startDate, null);
  });

  it('deve rejeitar status de temporada não regulamentado', () => {
    assert.throws(() => {
      SeasonResponseSchema.parse({
        id: '1',
        year: 2025,
        officialName: 'F1',
        status: 'INVALID_STATUS',
        startDate: null,
        endDate: null
      });
    }, (err: unknown) => {
      assert.ok(err instanceof z.ZodError);
      return true;
    });
  });

  it('deve rejeitar ano fora do intervalo histórico e futuro aceitável (1950 a 2050)', () => {
    assert.throws(() => {
      SeasonResponseSchema.parse({
        id: '1',
        year: 1949, // anterior ao primeiro campeonato oficial
        officialName: 'F1',
        status: 'COMPLETED',
        startDate: null,
        endDate: null
      });
    });
  });
});
