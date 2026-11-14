/**
 * ============================================================================
 * F1Atlas — Contracts | Seasons: SeasonResponse
 * ============================================================================
 *
 * Componente: SeasonResponse, SeasonStatus
 * Módulo: Seasons
 * Papel: Contrato público de representação transportável de Temporada de F1
 *
 * Responsabilidade:
 * Transportar informações oficiais de uma edição anual do campeonato, incluindo
 * ano, nome oficial, status regulamentar e datas de início e término.
 * ============================================================================
 */

import { z } from 'zod';

export const SeasonStatusSchema = z.enum([
  'PLANNED',
  'ACTIVE',
  'COMPLETED',
  'SUSPENDED'
]);

export type SeasonStatus = z.infer<typeof SeasonStatusSchema>;

export const SeasonResponseSchema = z.object({
  id: z.string().min(1),
  year: z.number().int().min(1950).max(2050),
  officialName: z.string().min(1),
  status: SeasonStatusSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início deve seguir formato YYYY-MM-DD').nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de término deve seguir formato YYYY-MM-DD').nullable()
});

export type SeasonResponse = z.infer<typeof SeasonResponseSchema>;
