/**
 * ============================================================================
 * F1Atlas — Contracts | Drivers: DriverResponse
 * ============================================================================
 *
 * Componente: DriverResponse
 * Módulo: Drivers
 * Papel: Contrato público de representação transportável de Piloto
 *
 * Responsabilidade:
 * Definir a estrutura e validação dos dados de um piloto expostos para o frontend
 * e consumidores públicos, preservando identificadores opacos e sanitizados.
 *
 * Invariantes:
 * - id e slug devem ser strings não vazias.
 * - permanentNumber, quando presente, é um número entre 1 e 99 (regra FIA).
 * - code, quando presente, possui exatamente 3 letras maiúsculas (ex.: "HAM").
 * - birthDate é uma data de calendário em formato ISO 8601 (YYYY-MM-DD) ou nula.
 * ============================================================================
 */

import { z } from 'zod';

export const DriverResponseSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  fullName: z.string().min(1),
  displayName: z.string().min(1),
  permanentNumber: z.number().int().min(1).max(99).nullable(),
  code: z.string().regex(/^[A-Z]{3}$/, 'Código do piloto deve conter exatamente 3 letras maiúsculas').nullable(),
  nationality: z.string().min(1),
  countryCode: z.string().min(2).max(3).nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento deve seguir o formato YYYY-MM-DD').nullable(),
  isActive: z.boolean()
});

export type DriverResponse = z.infer<typeof DriverResponseSchema>;
