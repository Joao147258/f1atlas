/**
 * ============================================================================
 * F1Atlas — Contracts | Shared: ApiError
 * ============================================================================
 *
 * Componente: ApiErrorResponse, ApiErrorDetail
 * Módulo: Shared
 * Papel: Contrato público de representação de erros da API (RFC 7807 / Problem Details)
 *
 * Responsabilidade:
 * Padronizar a estrutura de falhas retornadas pelas rotas HTTP da aplicação para
 * consumidores (Next.js, clientes móveis e integrações públicas), garantindo
 * sanitização de informações sensíveis, códigos semânticos e rastreabilidade.
 *
 * Invariantes:
 * - statusCode deve ser um código HTTP de cliente (4xx) ou servidor (5xx).
 * - error deve ser um slug semântico estável em maiúsculas (ex.: "NOT_FOUND").
 * - timestamp deve ser uma string em formato ISO 8601 UTC.
 * - Nunca deve expor stack traces, segredos ou caminhos físicos do servidor.
 *
 * Restrições:
 * - Totalmente desacoplado de classes de exceção do NestJS (HttpException).
 * - Não depende de DomainError nem de infraestrutura.
 * ============================================================================
 */

import { z } from 'zod';

/**
 * Schema para detalhes granulares de validação de campo.
 */
export const ApiErrorDetailSchema = z.object({
  field: z.string().min(1).optional(),
  message: z.string().min(1),
  code: z.string().min(1).optional()
});

export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

/**
 * Schema principal de resposta de erro público da API.
 */
export const ApiErrorResponseSchema = z.object({
  statusCode: z.number().int().min(400).max(599),
  error: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.string().datetime(),
  path: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
  details: z.array(ApiErrorDetailSchema).optional()
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
