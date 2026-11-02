/**
 * @fileoverview Mapeador entre Modelo de Persistência Prisma e Entidade da Aplicação — F1Atlas
 *
 * Responsável por traduzir registros brutos do banco de dados (Prisma) em modelos puros
 * da aplicação, encapsulando diferenças de tipagem, nulabilidade e formatos temporais.
 *
 * @module apps/api/src/infrastructure/mappers/infrastructure-health.mapper
 */

import type { InfrastructureHealthRecord } from '../../application/ports/infrastructure-health-repository.port.js';

/**
 * Interface representativa do registro retornado pela camada Prisma.
 */
export interface PrismaHealthCheckModel {
  id: string;
  component: string;
  status: string;
  details: string | null;
  checkedAt: Date;
}

export class InfrastructureHealthMapper {
  /**
   * Converte um registro de persistência do Prisma em um modelo puro da aplicação.
   *
   * @param rawModel - Registro bruto retornado pelo Prisma Client.
   * @returns Entidade purificada e tipada da aplicação.
   */
  public static toApplication(rawModel: PrismaHealthCheckModel): InfrastructureHealthRecord {
    const validStatuses = ['INITIALIZED', 'HEALTHY', 'DEGRADED', 'UNHEALTHY'] as const;
    const status = validStatuses.includes(rawModel.status as any)
      ? (rawModel.status as InfrastructureHealthRecord['status'])
      : 'INITIALIZED';

    return {
      id: rawModel.id,
      component: rawModel.component,
      status,
      details: rawModel.details,
      checkedAt: rawModel.checkedAt
    };
  }
}
