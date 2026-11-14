/**
 * ============================================================================
 * F1Atlas — Contracts | Shared: Pagination
 * ============================================================================
 *
 * Componente: PaginationQuery, PaginationMeta, PaginatedResponse
 * Módulo: Shared
 * Papel: Contratos públicos de paginação baseada em página/limite
 *
 * Responsabilidade:
 * Definir parâmetros padronizados de paginação para requisições de listagem
 * e a respectiva estrutura de metadados retornada aos consumidores da API.
 *
 * Invariantes:
 * - page deve ser um inteiro positivo (>= 1), padrão 1.
 * - limit deve ser um inteiro positivo entre 1 e 100, padrão 20.
 * - total e totalPages não podem ser negativos.
 * - hasNextPage e hasPreviousPage devem ser booleanos explícitos.
 * ============================================================================
 */

import { z } from 'zod';

/**
 * Parâmetros de consulta (Query Params) padronizados para endpoints paginados.
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Metadados de paginação retornados no corpo da resposta HTTP.
 */
export const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean()
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Construtor declarativo de Schema para envelopes de respostas paginadas.
 *
 * @param itemSchema Schema Zod representativo do item individual da coleção.
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema
  });
}

/**
 * Tipo genérico utilitário para respostas paginadas.
 */
export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};
