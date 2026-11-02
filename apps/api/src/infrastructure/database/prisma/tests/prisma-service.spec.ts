/**
 * @fileoverview Testes Automatizados de Unidade e Ciclo de Vida do PrismaService — F1Atlas
 *
 * Valida os requisitos da SPEC-PERSIST-001 e arquitetura Prisma ORM 7:
 * 1. Inicialização do PrismaService com driver adapter MariaDB
 * 2. Disponibilidade dos modelos mapeados (infrastructureHealthCheck)
 * 3. Encerramento gracioso no onModuleDestroy
 * 4. Carregamento dentro do container IoC do NestJS
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService, createMariaDbAdapter } from '../prisma.service.js';
import { PrismaModule } from '../prisma.module.js';

describe('PrismaService — Prisma ORM 7 + NestJS Integration', () => {
  it('deve instanciar o adapter MariaDB com URL válida ou configuração padrão', () => {
    const adapter = createMariaDbAdapter('mysql://user:pass@localhost:3306/test_db');
    assert.ok(adapter, 'Adapter MariaDB deve ser instanciado');
    assert.equal(adapter.provider, 'mysql', 'Provider do adapter deve ser mysql');
  });

  it('deve instanciar o PrismaService contendo o modelo InfrastructureHealthCheck do Prisma 7', () => {
    const prismaService = new PrismaService();
    assert.ok(prismaService, 'PrismaService deve ser instanciado');
    assert.ok(
      typeof prismaService.infrastructureHealthCheck === 'object',
      'Modelo infrastructureHealthCheck deve existir no PrismaClient gerado'
    );
  });

  it('deve carregar com sucesso através do container de injeção de dependências do NestJS', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule]
    }).compile();

    const service = moduleRef.get<PrismaService>(PrismaService);
    assert.ok(service, 'PrismaService deve ser resolvido pelo PrismaModule');
    assert.ok(
      typeof service.infrastructureHealthCheck === 'object',
      'Instância resolvida deve conter os modelos gerados do Prisma 7'
    );
    assert.equal(
      typeof service.onModuleDestroy,
      'function',
      'Instância resolvida deve implementar OnModuleDestroy'
    );

    // Testa encerramento gracioso
    await service.onModuleDestroy();
  });
});
