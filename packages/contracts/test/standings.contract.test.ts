/**
 * ============================================================================
 * F1Atlas — Suíte de Testes de Contrato: Standings
 * ============================================================================
 *
 * Módulo: packages/contracts/test/standings.contract.test.ts
 * Contratos testados: DriverStandingsResponseSchema, ConstructorStandingsResponseSchema
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DriverStandingsResponseSchema,
  ConstructorStandingsResponseSchema,
  type DriverStandingsResponse,
  type ConstructorStandingsResponse
} from '../src/index.ts';
import { z } from 'zod';

describe('Contracts — DriverStandingsResponseSchema', () => {
  it('deve validar classificação oficial de pilotos com discriminação estrita de simulação', () => {
    const standings: DriverStandingsResponse = {
      seasonYear: 2025,
      roundNumber: 1,
      snapshotType: 'OFFICIAL_FIA',
      isSimulation: false,
      calculatedAt: '2025-03-16T18:00:00.000Z',
      entries: [
        {
          position: 1,
          driverId: 'driver-norris',
          driverSlug: 'lando-norris',
          driverName: 'Lando Norris',
          teamName: 'McLaren',
          points: 25,
          winsCount: 1,
          podiumsCount: 1,
          tiebreakerRank: 1
        },
        {
          position: 2,
          driverId: 'driver-piastri',
          driverSlug: 'oscar-piastri',
          driverName: 'Oscar Piastri',
          teamName: 'McLaren',
          points: 18,
          winsCount: 0,
          podiumsCount: 1,
          tiebreakerRank: 2
        }
      ]
    };

    const parsed = DriverStandingsResponseSchema.parse(standings);
    assert.equal(parsed.entries.length, 2);
    assert.equal(parsed.isSimulation, false);
    assert.equal(parsed.snapshotType, 'OFFICIAL_FIA');
  });

  it('deve validar classificação hipotética (simulação) com isSimulation marcado como true', () => {
    const simStandings = {
      seasonYear: 2025,
      roundNumber: 20,
      snapshotType: 'SIMULATED',
      isSimulation: true,
      calculatedAt: new Date().toISOString(),
      entries: [
        {
          position: 1,
          driverId: 'driver-leclerc',
          driverSlug: 'charles-leclerc',
          driverName: 'Charles Leclerc',
          teamName: 'Ferrari',
          points: 350.5,
          winsCount: 8,
          podiumsCount: 15
        }
      ]
    };

    const parsed = DriverStandingsResponseSchema.parse(simStandings);
    assert.equal(parsed.isSimulation, true);
    assert.equal(parsed.snapshotType, 'SIMULATED');
  });

  it('deve rejeitar pontuação negativa na tabela', () => {
    assert.throws(() => {
      DriverStandingsResponseSchema.parse({
        seasonYear: 2025,
        roundNumber: 1,
        snapshotType: 'OFFICIAL_FIA',
        isSimulation: false,
        calculatedAt: new Date().toISOString(),
        entries: [
          {
            position: 1,
            driverId: 'd',
            driverSlug: 'd',
            driverName: 'D',
            teamName: 'T',
            points: -10, // inválido
            winsCount: 0,
            podiumsCount: 0
          }
        ]
      });
    }, (err: unknown) => {
      assert.ok(err instanceof z.ZodError);
      return true;
    });
  });
});

describe('Contracts — ConstructorStandingsResponseSchema', () => {
  it('deve validar tabela de construtores/equipes com posições ordenadas e pontos', () => {
    const standings: ConstructorStandingsResponse = {
      seasonYear: 2025,
      roundNumber: 1,
      snapshotType: 'OFFICIAL_FIA',
      isSimulation: false,
      calculatedAt: '2025-03-16T18:00:00.000Z',
      entries: [
        {
          position: 1,
          teamId: 'team-mclaren',
          teamSlug: 'mclaren',
          teamName: 'McLaren Formula 1 Team',
          constructorName: 'McLaren-Mercedes',
          points: 43,
          winsCount: 1,
          podiumsCount: 2
        }
      ]
    };

    const parsed = ConstructorStandingsResponseSchema.parse(standings);
    assert.equal(parsed.entries[0].points, 43);
    assert.equal(parsed.entries[0].constructorName, 'McLaren-Mercedes');
  });
});
