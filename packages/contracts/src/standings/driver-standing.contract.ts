/**
 * ============================================================================
 * F1Atlas — Contracts | Standings: DriverStandingsResponse
 * ============================================================================
 *
 * Componente: DriverStandingsResponse, DriverStandingEntry, StandingSnapshotType
 * Módulo: Standings
 * Papel: Contrato público de classificação do Campeonato de Pilotos (WDC)
 *
 * Responsabilidade:
 * Transportar a tabela de classificação acumulada de pilotos após determinada
 * etapa, garantindo identificação explícita entre resultados oficiais e simulações.
 *
 * Invariantes:
 * - position é um inteiro positivo (1, 2, 3...).
 * - points é um valor numérico não negativo.
 * - isSimulation deve ser explicitamente booleano (discriminador estrito de simulação).
 * - calculatedAt deve ser string no formato ISO 8601 UTC.
 * ============================================================================
 */

import { z } from 'zod';

export const StandingSnapshotTypeSchema = z.enum([
  'OFFICIAL_FIA',
  'CALCULATED',
  'SIMULATED'
]);

export type StandingSnapshotType = z.infer<typeof StandingSnapshotTypeSchema>;

export const DriverStandingEntrySchema = z.object({
  position: z.number().int().positive(),
  driverId: z.string().min(1),
  driverSlug: z.string().min(1),
  driverName: z.string().min(1),
  teamName: z.string().min(1),
  points: z.number().nonnegative(),
  winsCount: z.number().int().nonnegative(),
  podiumsCount: z.number().int().nonnegative(),
  tiebreakerRank: z.number().int().positive().nullable().optional()
});

export type DriverStandingEntry = z.infer<typeof DriverStandingEntrySchema>;

export const DriverStandingsResponseSchema = z.object({
  seasonYear: z.number().int().min(1950),
  roundNumber: z.number().int().positive(),
  snapshotType: StandingSnapshotTypeSchema,
  isSimulation: z.boolean(),
  calculatedAt: z.string().datetime(),
  entries: z.array(DriverStandingEntrySchema)
});

export type DriverStandingsResponse = z.infer<typeof DriverStandingsResponseSchema>;
