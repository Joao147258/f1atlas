/**
 * @fileoverview Testes de Unidade do Adaptador PrismaInfrastructureHealthRepository — F1Atlas
 *
 * Valida a conformidade de IInfrastructureHealthRepository:
 * 1. Criação de registros de health-check de infraestrutura com sanitização e mapeamento.
 * 2. Consulta do registro mais recente por componente.
 * 3. Tratamento de registros inexistentes (retorno null).
 * 4. Tratamento defensivo de falhas do banco de dados relacional.
 *
 * @module apps/api/src/infrastructure/database/prisma/tests/prisma-infrastructure-health.repository.spec
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaInfrastructureHealthRepository } from '../repositories/prisma-infrastructure-health.repository.js';
import type { CreateHealthRecordDTO } from '../../../../application/ports/infrastructure-health-repository.port.js';

describe('PrismaInfrastructureHealthRepository — Unit & Health-check Tests', () => {
  it('deve criar um registro de verificação de saúde com campos preenchidos', async () => {
    let createArgsCaptured: any = null;

    const mockPrisma: any = {
      infrastructureHealthCheck: {
        create: async (args: any) => {
          createArgsCaptured = args;
          return {
            id: 'check-uuid-1',
            component: args.data.component,
            status: args.data.status,
            details: args.data.details,
            checkedAt: new Date('2026-11-03T12:00:00Z')
          };
        }
      }
    };

    const repo = new PrismaInfrastructureHealthRepository(mockPrisma);
    const dto: CreateHealthRecordDTO = {
      component: 'mariadb-connection',
      status: 'HEALTHY',
      details: 'Pool de conexões operando com latência 1.2ms'
    };

    const result = await repo.createRecord(dto);

    assert.ok(result);
    assert.equal(result.id, 'check-uuid-1');
    assert.equal(result.component, 'mariadb-connection');
    assert.equal(result.status, 'HEALTHY');
    assert.equal(result.details, 'Pool de conexões operando com latência 1.2ms');
    assert.equal(createArgsCaptured?.data?.component, 'mariadb-connection');
    assert.equal(createArgsCaptured?.data?.status, 'HEALTHY');
  });

  it('deve criar registro tratando campo details ausente como null', async () => {
    let createArgsCaptured: any = null;

    const mockPrisma: any = {
      infrastructureHealthCheck: {
        create: async (args: any) => {
          createArgsCaptured = args;
          return {
            id: 'check-uuid-2',
            component: args.data.component,
            status: args.data.status,
            details: null,
            checkedAt: new Date('2026-11-03T12:05:00Z')
          };
        }
      }
    };

    const repo = new PrismaInfrastructureHealthRepository(mockPrisma);
    const dto: CreateHealthRecordDTO = {
      component: 'redis-cache',
      status: 'UNHEALTHY'
    };

    const result = await repo.createRecord(dto);

    assert.ok(result);
    assert.equal(result.component, 'redis-cache');
    assert.equal(result.status, 'UNHEALTHY');
    assert.equal(result.details, null);
    assert.equal(createArgsCaptured?.data?.details, null);
  });

  it('deve consultar o registro mais recente por componente ordenando por checkedAt desc', async () => {
    let findFirstArgsCaptured: any = null;

    const mockPrisma: any = {
      infrastructureHealthCheck: {
        findFirst: async (args: any) => {
          findFirstArgsCaptured = args;
          return {
            id: 'check-uuid-latest',
            component: 'mariadb-connection',
            status: 'UP',
            details: 'Operacional',
            checkedAt: new Date('2026-11-03T13:00:00Z')
          };
        }
      }
    };

    const repo = new PrismaInfrastructureHealthRepository(mockPrisma);
    const result = await repo.findLatestByComponent('mariadb-connection');

    assert.ok(result);
    assert.equal(result.id, 'check-uuid-latest');
    assert.equal(findFirstArgsCaptured?.where?.component, 'mariadb-connection');
    assert.deepEqual(findFirstArgsCaptured?.orderBy, { checkedAt: 'desc' });
  });

  it('deve retornar null se nenhum registro for encontrado para o componente', async () => {
    const mockPrisma: any = {
      infrastructureHealthCheck: {
        findFirst: async () => null
      }
    };

    const repo = new PrismaInfrastructureHealthRepository(mockPrisma);
    const result = await repo.findLatestByComponent('componente-inexistente');

    assert.equal(result, null);
  });

  it('deve propagar erro quando a consulta no Prisma falhar', async () => {
    const mockPrisma: any = {
      infrastructureHealthCheck: {
        findFirst: async () => {
          throw new Error('Falha de timeout no pool MySQL');
        }
      }
    };

    const repo = new PrismaInfrastructureHealthRepository(mockPrisma);

    await assert.rejects(
      async () => repo.findLatestByComponent('mariadb-connection'),
      (err: any) => {
        assert.match(err.message, /Falha de timeout no pool MySQL/);
        return true;
      }
    );
  });
});
