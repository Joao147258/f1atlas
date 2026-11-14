/**
 * ============================================================================
 * F1Atlas — Camada Infrastructure | Errors: PrismaErrorHandler
 * ============================================================================
 *
 * @component PrismaErrorHandler
 * @module apps/api/src/infrastructure/database/prisma/errors/prisma-error-handler
 * @layer Infrastructure (Persistência Relacional)
 *
 * Responsabilidade Arquitetural:
 * Centralizar a interceptação, classificação semântica e sanitização defensiva de erros
 * emitidos pelo Prisma Client (incluindo `PrismaClientKnownRequestError`, falhas de rede
 * e exceções de integridade relacional).
 *
 * Princípios e Diretrizes:
 * - Clean Architecture & Boundary Protection: Assegura que instâncias internas do Prisma
 *   não atravessem as fronteiras da camada de infraestrutura em direção aos casos de uso
 *   ou controladores da API.
 * - Sanitização de Segurança: Higieniza mensagens de erro brutas através de expressões regulares,
 *   substituindo credenciais presentes em URIs de conexão (`mysql://user:***@host:port/db`).
 * - Preservação de Diagnóstico: Mantém os metadados contextuais da operação e o código do erro
 *   (ex.: P2002, P2025, P2003) para auditoria e observabilidade técnica sem revelar dados sensíveis.
 *
 * ============================================================================
 */

import { PrismaClientKnownRequestError } from '../../../../generated/prisma/internal/prismaNamespace.js';
import {
  PersistenceError,
  UniqueConstraintViolationError,
  EntityNotFoundError,
  ForeignKeyConstraintViolationError,
  DatabaseConnectionError
} from './persistence-errors.js';

export class PrismaErrorHandler {
  /**
   * Sanitiza e traduz um erro desconhecido capturado na infraestrutura Prisma.
   *
   * @param error - Exceção original capturada em bloco try/catch.
   * @param context - Identificador textual da operação para rastreabilidade (ex.: 'SeasonRepository.save').
   * @returns Instância tipada da hierarquia PersistenceError pronta para ser relançada.
   */
  public static handle(error: unknown, context: string): Error {
    // Repassa instâncias de erro já especializadas da própria camada de infraestrutura
    if (error instanceof PersistenceError) {
      return error;
    }

    // Tradução de erros conhecidos com código específico do Prisma
    if (error instanceof PrismaClientKnownRequestError) {
      return PrismaErrorHandler.handleKnownRequestError(error, context);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Detecção heurística de falhas de conectividade de rede com o servidor MariaDB/MySQL
    if (
      lowerMessage.includes('connection') ||
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('econnrefused') ||
      lowerMessage.includes('etimedout') ||
      lowerMessage.includes('reach database') ||
      lowerMessage.includes("can't reach database server")
    ) {
      return new DatabaseConnectionError(
        `[${context}] Falha de conexão com o banco de dados relacional.`,
        error instanceof Error ? error : undefined
      );
    }

    // Falha inesperada de infraestrutura
    return new PersistenceError(
      `[${context}] Erro de persistência inesperado: ${PrismaErrorHandler.sanitizeMessage(errorMessage)}`,
      undefined,
      error instanceof Error ? error : undefined
    );
  }

  /**
   * Mapeia os códigos conhecidos do Prisma para as classes de exceção correspondentes.
   */
  private static handleKnownRequestError(
    error: PrismaClientKnownRequestError,
    context: string
  ): PersistenceError {
    const code = error.code;
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(', ')
      : typeof error.meta?.target === 'string'
      ? error.meta.target
      : undefined;

    switch (code) {
      case 'P2002': {
        const fieldMsg = target ? ` no campo ou constraint: [${target}]` : '';
        return new UniqueConstraintViolationError(
          `[${context}] Violação de restrição de unicidade${fieldMsg}.`,
          code,
          error
        );
      }

      case 'P2025': {
        const causeMsg = error.meta?.cause ? ` (${error.meta.cause})` : '';
        return new EntityNotFoundError(
          `[${context}] Registro não encontrado para a operação solicitada${causeMsg}.`,
          code,
          error
        );
      }

      case 'P2003': {
        const fieldName = error.meta?.field_name ? ` (campo: ${error.meta.field_name})` : '';
        return new ForeignKeyConstraintViolationError(
          `[${context}] Falha de integridade referencial: chave estrangeira inexistente ou vinculada${fieldName}.`,
          code,
          error
        );
      }

      default:
        return new PersistenceError(
          `[${context}] Erro de persistência Prisma [${code}]: ${PrismaErrorHandler.sanitizeMessage(error.message)}`,
          code,
          error
        );
    }
  }

  /**
   * Remove senhas de connection strings em mensagens de erro para evitar vazamento em logs.
   */
  private static sanitizeMessage(rawMessage: string): string {
    return rawMessage.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:***@');
  }
}
