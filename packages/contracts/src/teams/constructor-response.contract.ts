/**
 * ============================================================================
 * F1Atlas — Contracts | Teams: ConstructorResponse
 * ============================================================================
 *
 * Componente: ConstructorResponse
 * Módulo: Teams
 * Papel: Contrato público de representação transportável de Construtor FIA
 *
 * Responsabilidade:
 * Representar o construtor técnico oficial registrado na FIA (fabricante de chassi/motor),
 * distinguindo categoricamente a entidade técnica do construtor da entidade da equipe.
 * ============================================================================
 */

import { z } from 'zod';

export const ConstructorResponseSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  chassis: z.string().min(1).nullable(),
  engineManufacturer: z.string().min(1).nullable(),
  nationality: z.string().min(1),
  countryCode: z.string().min(2).max(3).nullable()
});

export type ConstructorResponse = z.infer<typeof ConstructorResponseSchema>;
