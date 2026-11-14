/**
 * ============================================================================
 * F1Atlas — Contracts | Standings: ConstructorStandingsResponse
 * ============================================================================
 *
 * Componente: ConstructorStandingsResponse, ConstructorStandingEntry
 * Módulo: Standings
 * Papel: Contrato público de classificação do Campeonato de Construtores (WCC)
 *
 * Responsabilidade:
 * Transportar a tabela de classificação acumulada de equipes/construtores após determinada
 * etapa, garantindo identificação explícita entre resultados oficiais e simulações.
 * ============================================================================
 */

import { z } from 'zod';
import { StandingSnapshotTypeSchema } from './driver-standing.contract.ts';

export const ConstructorStandingEntrySchema = z.object({
  position: z.number().int().positive(),
  teamId: z.string().min(1),
  teamSlug: z.string().min(1),
  teamName: z.string().min(1),
  constructorName: z.string().min(1).nullable(),
  points: z.number().nonnegative(),
  winsCount: z.number().int().nonnegative(),
  podiumsCount: z.number().int().nonnegative(),
  tiebreakerRank: z.number().int().positive().nullable().optional()
});

export type ConstructorStandingEntry = z.infer<typeof ConstructorStandingEntrySchema>;

export const ConstructorStandingsResponseSchema = z.object({
  seasonYear: z.number().int().min(1950),
  roundNumber: z.number().int().positive(),
  snapshotType: StandingSnapshotTypeSchema,
  isSimulation: z.boolean(),
  calculatedAt: z.string().datetime(),
  entries: z.array(ConstructorStandingEntrySchema)
});

export type ConstructorStandingsResponse = z.infer<typeof ConstructorStandingsResponseSchema>;
