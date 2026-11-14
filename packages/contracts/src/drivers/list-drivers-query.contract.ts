/**
 * ============================================================================
 * F1Atlas — Contracts | Drivers: ListDriversQuery
 * ============================================================================
 *
 * Componente: ListDriversQuery
 * Módulo: Drivers
 * Papel: Contrato público de parâmetros de busca e filtragem de pilotos
 *
 * Responsabilidade:
 * Definir parâmetros tipados e sanitizados para consulta paginada da listagem
 * de pilotos, suportando filtros por nacionalidade, status de atividade e termo de busca.
 * ============================================================================
 */

import { z } from 'zod';
import { PaginationQuerySchema } from '../shared/pagination.contract.ts';

export const ListDriversQuerySchema = PaginationQuerySchema.extend({
  nationality: z.string().min(1).optional(),
  isActive: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val === 'true') return true;
      if (val === 'false') return false;
    }
    return val;
  }, z.boolean().optional()),
  search: z.string().min(1).optional()
});

export type ListDriversQuery = z.infer<typeof ListDriversQuerySchema>;
