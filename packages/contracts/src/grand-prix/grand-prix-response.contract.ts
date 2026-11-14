/**
 * ============================================================================
 * F1Atlas — Contracts | Grand Prix: GrandPrixResponse
 * ============================================================================
 *
 * Componente: GrandPrixResponse, EventFormat, EventStatus, CircuitSummary
 * Módulo: Grand Prix
 * Papel: Contrato público de representação transportável de Etapa de Grande Prêmio
 *
 * Responsabilidade:
 * Transportar dados da etapa do campeonato, formato do evento (Sprint vs Padrão),
 * status de execução e informações resumidas do autódromo/circuito.
 * ============================================================================
 */

import { z } from 'zod';

export const EventFormatSchema = z.enum([
  'STANDARD',
  'SPRINT'
]);

export type EventFormat = z.infer<typeof EventFormatSchema>;

export const EventStatusSchema = z.enum([
  'SCHEDULED',
  'LIVE',
  'COMPLETED',
  'POSTPONED',
  'CANCELLED'
]);

export type EventStatus = z.infer<typeof EventStatusSchema>;

export const CircuitSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  location: z.string().min(1),
  country: z.string().min(1),
  timezone: z.string().min(1)
});

export type CircuitSummary = z.infer<typeof CircuitSummarySchema>;

export const GrandPrixResponseSchema = z.object({
  id: z.string().min(1),
  seasonId: z.string().min(1),
  roundNumber: z.number().int().positive(),
  slug: z.string().min(1),
  officialName: z.string().min(1),
  format: EventFormatSchema,
  status: EventStatusSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início deve seguir formato YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de término deve seguir formato YYYY-MM-DD'),
  scheduledLaps: z.number().int().positive().nullable(),
  circuit: CircuitSummarySchema
});

export type GrandPrixResponse = z.infer<typeof GrandPrixResponseSchema>;
