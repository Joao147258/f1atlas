/**
 * ============================================================================
 * F1Atlas — Suíte de Testes de Contrato: Teams & Constructors
 * ============================================================================
 *
 * Módulo: packages/contracts/test/teams.contract.test.ts
 * Contratos testados: TeamResponseSchema, ConstructorResponseSchema
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TeamResponseSchema,
  ConstructorResponseSchema,
  type TeamResponse,
  type ConstructorResponse
} from '../src/index.ts';
import { z } from 'zod';

describe('Contracts — TeamResponseSchema', () => {
  it('deve validar payload completo de equipe', () => {
    const team: TeamResponse = {
      id: 'team-ferrari-uuid',
      slug: 'ferrari',
      legalName: 'Scuderia Ferrari SpA',
      commonName: 'Ferrari',
      nationality: 'Italian',
      countryCode: 'ITA',
      baseLocation: 'Maranello, Italy',
      foundedYear: 1929,
      isActive: true
    };

    const parsed = TeamResponseSchema.parse(team);
    assert.equal(parsed.slug, 'ferrari');
    assert.equal(parsed.foundedYear, 1929);
  });

  it('deve aceitar campos opcionais como nulos', () => {
    const minimalTeam = {
      id: 'team-cadillac-uuid',
      slug: 'cadillac-f1',
      legalName: 'Cadillac Formula 1 Team',
      commonName: 'Cadillac',
      nationality: 'American',
      countryCode: null,
      baseLocation: null,
      foundedYear: null,
      isActive: true
    };

    const parsed = TeamResponseSchema.parse(minimalTeam);
    assert.equal(parsed.baseLocation, null);
  });

  it('deve rejeitar ano de fundação inverossímil', () => {
    assert.throws(() => {
      TeamResponseSchema.parse({
        id: '1',
        slug: 'test',
        legalName: 'Test',
        commonName: 'Test',
        nationality: 'BR',
        countryCode: null,
        baseLocation: null,
        foundedYear: 1850, // antes de 1900
        isActive: true
      });
    }, (err: unknown) => {
      assert.ok(err instanceof z.ZodError);
      return true;
    });
  });
});

describe('Contracts — ConstructorResponseSchema', () => {
  it('deve validar payload técnico do construtor homologado perante a FIA', () => {
    const constructor: ConstructorResponse = {
      id: 'const-ferrari-uuid',
      slug: 'ferrari',
      name: 'Ferrari',
      chassis: 'SF-25',
      engineManufacturer: 'Ferrari',
      nationality: 'Italian',
      countryCode: 'ITA'
    };

    const parsed = ConstructorResponseSchema.parse(constructor);
    assert.equal(parsed.chassis, 'SF-25');
    assert.equal(parsed.engineManufacturer, 'Ferrari');
  });

  it('deve permitir chassi ou motor nulos em registros históricos ou transições', () => {
    const minimalConstructor = {
      id: 'const-historic-uuid',
      slug: 'historic-team',
      name: 'Historic Constructor',
      chassis: null,
      engineManufacturer: null,
      nationality: 'British',
      countryCode: 'GBR'
    };

    const parsed = ConstructorResponseSchema.parse(minimalConstructor);
    assert.equal(parsed.chassis, null);
    assert.equal(parsed.engineManufacturer, null);
  });
});
