/**
 * @fileoverview Porta de Repositório de Verificação de Infraestrutura — F1Atlas
 *
 * Define o contrato puro da aplicação para registro e verificação de saúde da persistência.
 * Em conformidade estrita com a Clean Architecture e SPEC-ARCH-001, esta interface NÃO
 * importa frameworks (@nestjs) nem ORMs (@prisma/client).
 *
 * @module apps/api/src/application/ports/infrastructure-health-repository.port
 */

/**
 * Entidade de domínio / modelo de aplicação para saúde da infraestrutura.
 */
export interface InfrastructureHealthRecord {
  id: string;
  component: string;
  status: 'INITIALIZED' | 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  details?: string | null;
  checkedAt: Date;
}

/**
 * Dados de entrada para criação de um novo registro de verificação de persistência.
 */
export interface CreateHealthRecordDTO {
  component: string;
  status: 'INITIALIZED' | 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  details?: string | null;
}

/**
 * Contrato abstrato (Port) para operações de persistência de saúde da infraestrutura.
 */
export interface IInfrastructureHealthRepository {
  /**
   * Registra um novo evento de verificação de saúde da persistência.
   *
   * @param data - Dados sanitizados do registro.
   * @returns Registro persistido tipado.
   */
  createRecord(data: CreateHealthRecordDTO): Promise<InfrastructureHealthRecord>;

  /**
   * Localiza o registro mais recente para um determinado componente de infraestrutura.
   *
   * @param component - Nome identificador do componente.
   * @returns O registro mais recente ou nulo caso não exista.
   */
  findLatestByComponent(component: string): Promise<InfrastructureHealthRecord | null>;
}
