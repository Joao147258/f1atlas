/**
 * @fileoverview Serviço Canônico de Gerenciamento do Prisma Client no NestJS — F1Atlas
 *
 * Responsabilidade:
 * Centralizar a instância única (singleton) do PrismaClient no ciclo de vida do NestJS
 * utilizando Prisma ORM 7 com driver adapter oficial (@prisma/adapter-mariadb).
 * Gerencia a abertura e o encerramento gracioso das conexões com o MySQL/MariaDB,
 * integrando-se aos hooks de ciclo de vida OnModuleInit e OnModuleDestroy.
 *
 * Norma Arquitetural:
 * Alinhado com a SPEC-PERSIST-001 e ADR-0002.
 * O PrismaService reside estritamente na camada de infraestrutura e nunca deve ser
 * injetado em classes do domínio puro (packages/domain).
 *
 * @module apps/api/src/infrastructure/database/prisma/prisma.service
 */

import { Injectable, type OnModuleInit, type OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../../generated/prisma/client.js';

/**
 * Cria a instância configurada do driver adapter MariaDB/MySQL para o Prisma 7.
 * Suporta configuração via DATABASE_URL ou variáveis granulares (host, port, user, etc.)
 * respeitando os limites de pool da Hostinger.
 *
 * @param connectionOrConfig - Opcional para injeção em testes
 * @returns Instância de PrismaMariaDb
 */
export function createMariaDbAdapter(connectionOrConfig?: string | object): PrismaMariaDb {
  const connectionUrl = process.env.DATABASE_URL || 'mysql://localhost:3306/f1atlas_dev';
  const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT) || 5;
  const connectTimeout = Number(process.env.DB_CONNECT_TIMEOUT) || 10000;

  if (typeof connectionOrConfig === 'string') {
    return new PrismaMariaDb(connectionOrConfig);
  }

  if (connectionOrConfig && typeof connectionOrConfig === 'object') {
    return new PrismaMariaDb(connectionOrConfig as any);
  }

  if (process.env.DB_HOST) {
    return new PrismaMariaDb({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit,
      connectTimeout,
      ssl: process.env.DB_SSL === 'true'
    });
  }

  return new PrismaMariaDb(connectionUrl);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = createMariaDbAdapter();
    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'error' },
              { emit: 'stdout', level: 'warn' }
            ]
          : [{ emit: 'stdout', level: 'error' }]
    });
  }

  /**
   * Inicializa a conexão com o banco de dados MySQL durante a inicialização do módulo NestJS.
   * Em caso de falha de conexão, registra o diagnóstico sanitizado (sem expor credenciais)
   * e propaga o erro de infraestrutura.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Inicializando conexão com banco MySQL/MariaDB (Prisma ORM 7 + Driver Adapter)...');
      await this.$connect();
      this.logger.log('Conexão com MySQL estabelecida com sucesso.');
    } catch (connectionError: any) {
      this.logger.error(
        `Falha ao conectar com o banco de dados MySQL: ${connectionError?.message || 'Erro desconhecido'}`
      );
      throw connectionError;
    }
  }

  /**
   * Encerra a conexão com o banco de dados graciosamente no encerramento da aplicação,
   * liberando o pool de conexões do MySQL (crítico em ambientes com limites como Hostinger).
   */
  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log('Encerrando pool de conexões com o banco MySQL...');
      await this.$disconnect();
      this.logger.log('Conexões com MySQL finalizadas graciosamente.');
    } catch (disconnectError: any) {
      this.logger.warn(`Aviso durante encerramento de conexões Prisma: ${disconnectError?.message}`);
    }
  }
}
