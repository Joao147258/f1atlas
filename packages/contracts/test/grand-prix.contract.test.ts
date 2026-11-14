/**
 * ============================================================================
 * F1Atlas — Suíte de Testes de Contrato: Grand Prix
 * ============================================================================
 *
 * Módulo: packages/contracts/test/grand-prix.contract.test.ts
 * Contratos testados: GrandPrixResponseSchema, EventFormatSchema, EventStatusSchema
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GrandPrixResponseSchema,
  type GrandPrixResponse
} from '../src/index.ts';
import { z } from 'zod';

describe('Contracts — GrandPrixResponseSchema', () => {
  it('deve validar etapa oficial de GP completa com autódromo aninhado', () => {
    const gp: GrandPrixResponse = {
      id: 'gp-monaco-2025-uuid',
      seasonId: 'season-2025-uuid',
      roundNumber: 8,
      slug: 'monaco-grand-prix',
      officialName: 'Formula 1 Grand Prix de Monaco 2025',
      format: 'STANDARD',
      status: 'SCHEDULED',
      startDate: '2025-05-23',
      endDate: '2025-05-25',
      scheduledLaps: 78,
      circuit: {
        id: 'circuit-monaco-uuid',
        slug: 'monaco-circuit',
        name: 'Circuit de Monaco',
        location: 'Monte Carlo',
        country: 'Monaco',
        timezone: 'Europe/Monaco'
      }
    };

    const parsed = GrandPrixResponseSchema.parse(gp);
    assert.equal(parsed.roundNumber, 8);
    assert.equal(parsed.format, 'STANDARD');
    assert.equal(parsed.circuit.country, 'Monaco');
  });

  it('deve validar etapa com formato SPRINT', () => {
    const sprintGp = {
      id: 'gp-interlagos-2025-uuid',
      seasonId: 'season-2025-uuid',
      roundNumber: 21,
      slug: 'sao-paulo-grand-prix',
      officialName: 'Formula 1 Lenovo Grande Prêmio de São Paulo 2025',
      format: 'SPRINT',
      status: 'COMPLETED',
      startDate: '2025-11-07',
      endDate: '2025-11-09',
      scheduledLaps: 71,
      circuit: {
        id: 'circuit-interlagos-uuid',
        slug: 'interlagos',
        name: 'Autódromo José Carlos Pace',
        location: 'São Paulo',
        country: 'Brazil',
        timezone: 'America/Sao_Paulo'
      }
    };

    const parsed = GrandPrixResponseSchema.parse(sprintGp);
    assert.equal(parsed.format, 'SPRINT');
    assert.equal(parsed.status, 'COMPLETED');
  });

  it('deve rejeitar roundNumber menor ou igual a zero', () => {
    assert.throws(() => {
      GrandPrixResponseSchema.parse({
        id: '1',
        seasonId: 's',
        roundNumber: 0,
        slug: 'slug',
        officialName: 'Name',
        format: 'STANDARD',
        status: 'SCHEDULED',
        startDate: '2025-05-23',
        endDate: '2025-05-25',
        scheduledLaps: null,
        circuit: {
          id: 'c',
          slug: 'c',
          name: 'C',
          location: 'L',
          country: 'C',
          timezone: 'UTC'
        }
      });
    }, (err: unknown) => {
      assert.ok(err instanceof z.ZodError);
      return true;
    });
  });
});
