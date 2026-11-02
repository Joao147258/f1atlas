/**
 * @fileoverview Adaptador de Repositório Prisma para Saúde de Infraestrutura — F1Atlas
 *
 * Implementa a porta da aplicação IInfrastructureHealthRepository consumindo o PrismaService.
 * Aplica o padrão Data Mapper para garantir que as estruturas da tabela MySQL nunca vazem
 * para as regras de negócio da aplicação.
 *
 * @module apps/api/src/infrastructure/database/prisma/repositories/prisma-infrastructure-health.repository
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  IInfrastructureHealthRepository,
  InfrastructureHealthRecord,
  CreateHealthRecordDTO
} from '../../../../application/ports/infrastructure-health-repository.port.js';
import { PrismaService } from '../prisma.service.js';
import { InfrastructureHealthMapper } from '../../../mappers/infrastructure-health.mapper.js';

@Injectable()
export class PrismaInfrastructureHealthRepository implements IInfrastructureHealthRepository {
  private readonly logger = new Logger(PrismaInfrastructureHealthRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persiste um novo registro de verificação de saúde da infraestrutura no MySQL.
   *
   * @param data - Dados do registro.
   * @returns Entidade purificada e tipada.
   */
  async createRecord(data: CreateHealthRecordDTO): Promise<InfrastructureHealthRecord> {
    try {
      const created = await this.prisma.infrastructureHealthCheck.create({
        data: {
          component: data.component,
          status: data.status,
          details: data.details ?? null
        }
      });

      return InfrastructureHealthMapper.toApplication(created);
    } catch (error: any) {
      this.logger.error(`Erro ao criar registro de saúde no MySQL: ${error?.message}`);
      throw error;
    }
  }

  /**
   * Consulta o registro mais recente para um determinado componente.
   *
   * @param component - Nome identificador do componente.
   * @returns O registro correspondente ou null caso não encontrado.
   */
  async findLatestByComponent(component: string): Promise<InfrastructureHealthRecord | null> {
    try {
      const record = await this.prisma.infrastructureHealthCheck.findFirst({
        where: { component },
        orderBy: { checkedAt: 'desc' }
      });

      if (!record) {
        return null;
      }

      return InfrastructureHealthMapper.toApplication(record);
    } catch (error: any) {
      this.logger.error(`Erro ao consultar registro de saúde no MySQL: ${error?.message}`);
      throw error;
    }
  }
}
