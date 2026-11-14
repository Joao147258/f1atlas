/**
 * ============================================================================
 * F1Atlas — Contracts | Teams: TeamResponse
 * ============================================================================
 *
 * Componente: TeamResponse
 * Módulo: Teams
 * Papel: Contrato público de representação transportável de Equipe Competidora
 *
 * Responsabilidade:
 * Representar a entidade organizacional/comercial da equipe perante a API,
 * diferenciando a identidade durável da equipe dos nomes transitórios de patrocinadores.
 * ============================================================================
 */

import { z } from 'zod';

export const TeamResponseSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  legalName: z.string().min(1),
  commonName: z.string().min(1),
  nationality: z.string().min(1),
  countryCode: z.string().min(2).max(3).nullable(),
  baseLocation: z.string().min(1).nullable(),
  foundedYear: z.number().int().min(1900).max(2100).nullable(),
  isActive: z.boolean()
});

export type TeamResponse = z.infer<typeof TeamResponseSchema>;
