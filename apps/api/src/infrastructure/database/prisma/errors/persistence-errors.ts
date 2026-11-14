/**
 * ============================================================================
 * F1Atlas — Camada Infrastructure | Errors: PersistenceErrors
 * ============================================================================
 *
 * @component PersistenceError & Subclasses Especializadas
 * @module apps/api/src/infrastructure/database/prisma/errors/persistence-errors
 * @layer Infrastructure (Persistência Relacional)
 *
 * Responsabilidade Arquitetural:
 * Fornecer a hierarquia semântica e fortemente tipada de exceções de persistência
 * da aplicação F1Atlas, permitindo que a infraestrutura encapsule falhas concretas do
 * Prisma ORM 7 e do MySQL/MariaDB sem contaminar ou vazar classes de baixo nível
 * para as camadas de Aplicação (`apps/api/src/application/`) ou Domínio (`packages/domain/`).
 *
 * Princípios e Decisões:
 * - Desacoplamento de Frameworks: As classes herdam nativamente de `Error` do JavaScript/TypeScript,
 *   garantindo rastreamento de pilha sem dependência de classes do NestJS (HttpException).
 * - Sanitização e Segurança: As mensagens de erro e propriedades dessas exceções são
 *   higienizadas pelo `PrismaErrorHandler`, prevenindo a exposição acidental de credenciais
 *   ou caminhos confidenciais em logs de produção.
 *
 * ============================================================================
 */

/**
 * Classe base para qualquer falha técnica originada no motor de persistência relacional.
 */
export class PersistenceError extends Error {
  /**
   * Código de erro do banco ou do ORM (ex.: 'P2002', 'CONNECTION_ERROR').
   */
  public readonly code?: string;

  /**
   * Causa original do erro para depuração interna controlada.
   */
  public readonly originalError?: Error;

  constructor(message: string, code?: string, originalError?: Error) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.originalError = originalError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Sinaliza a violação de uma restrição de unicidade (Unique Constraint / P2002).
 * Exemplo: Tentativa de persistir duas temporadas com o mesmo ano, ou dois pilotos com mesmo código FIA.
 */
export class UniqueConstraintViolationError extends PersistenceError {
  constructor(message: string, code = 'P2002', originalError?: Error) {
    super(message, code, originalError);
  }
}

/**
 * Sinaliza que um registro ou relacionamento obrigatório não foi encontrado para a operação (P2025).
 * Exemplo: Tentativa de salvar resultados para uma sessão que não possui inscrição do piloto.
 */
export class EntityNotFoundError extends PersistenceError {
  constructor(message: string, code = 'P2025', originalError?: Error) {
    super(message, code, originalError);
  }
}

/**
 * Sinaliza a violação de uma chave estrangeira ou integridade referencial (P2003).
 * Exemplo: Vínculo com uma chave primária inexistente na tabela mestre.
 */
export class ForeignKeyConstraintViolationError extends PersistenceError {
  constructor(message: string, code = 'P2003', originalError?: Error) {
    super(message, code, originalError);
  }
}

/**
 * Sinaliza falhas de conectividade física com o servidor MariaDB/MySQL (timeout, recusa de porta ou queda de rede).
 */
export class DatabaseConnectionError extends PersistenceError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CONNECTION_ERROR', originalError);
  }
}
