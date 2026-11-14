/**
 * @fileoverview Orquestrador de Ambiente de Banco de Dados Isolado para Testes de Integração — F1Atlas
 *
 * Responsabilidade:
 * 1. Inicializar ou validar um banco MariaDB/MySQL descartável e isolado.
 * 2. Suporta conexão via DATABASE_URL_TEST ou detecção/provisionamento dinâmico.
 * 3. Se Docker ou banco isolado não estiverem disponíveis, relata status BLOCKED/SKIP
 *    sem emitir falsos positivos nem aprovações fictícias.
 * 4. Fornece instanciação de PrismaClient conectado estritamente ao banco de testes.
 * 5. Provê rotina determinística de truncamento/limpeza de tabelas entre suítes.
 *
 * Norma Arquitetural:
 * Alinhado com a SPEC-PERSIST-001, ADR-0002 e Guia M3-F03.
 *
 * @module apps/api/test/integration/database/setup/database-test-environment
 */

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../../../src/generated/prisma/client.js';
import {
  inspectTestConnectionUrl,
  checkTcpSocket,
  checkDockerAvailability,
  type DatabaseInspectionResult
} from './test-database-guard.js';
import { applyMigrations } from './migration-runner.js';

export interface TestEnvironmentStatus {
  canRun: boolean;
  status: 'READY' | 'BLOCKED' | 'SKIP';
  databaseUrl?: string;
  sanitizedUrl?: string;
  inspection?: DatabaseInspectionResult;
  message: string;
}

export class DatabaseTestEnvironment {
  private static instance: DatabaseTestEnvironment | null = null;
  private currentPrismaClient: PrismaClient | null = null;
  private activeDatabaseUrl: string | null = null;

  private constructor() {}

  public static getInstance(): DatabaseTestEnvironment {
    if (!DatabaseTestEnvironment.instance) {
      DatabaseTestEnvironment.instance = new DatabaseTestEnvironment();
    }
    return DatabaseTestEnvironment.instance;
  }

  /**
   * Prepara e inicializa o ambiente de banco de testes isolado.
   */
  public async setup(): Promise<TestEnvironmentStatus> {
    // 1. Verifica se DATABASE_URL_TEST foi explicitamente fornecida
    const candidateUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
    const inspection = inspectTestConnectionUrl(candidateUrl);

    if (candidateUrl && inspection.isSafeForTesting) {
      const isReachable = await checkTcpSocket(inspection.host, inspection.port);
      if (isReachable) {
        this.activeDatabaseUrl = candidateUrl;
        // Aplica migrations versionadas no banco isolado
        const migResult = await applyMigrations(candidateUrl);
        if (!migResult.success) {
          return {
            canRun: false,
            status: 'BLOCKED',
            databaseUrl: candidateUrl,
            sanitizedUrl: inspection.sanitizedUrl,
            inspection,
            message: `Falha ao aplicar migrations no banco isolado [${inspection.sanitizedUrl}]: ${migResult.error || migResult.stderr}`
          };
        }

        return {
          canRun: true,
          status: 'READY',
          databaseUrl: candidateUrl,
          sanitizedUrl: inspection.sanitizedUrl,
          inspection,
          message: `Banco de dados isolado acessível e homologado em [${inspection.sanitizedUrl}].`
        };
      }
    }

    // 2. Verifica se o Docker está disponível para inicialização de container
    const dockerCheck = checkDockerAvailability();
    if (!dockerCheck.available) {
      return {
        canRun: false,
        status: 'BLOCKED',
        inspection,
        message: `Ambiente de container MariaDB indisponível para testes de integração: ${dockerCheck.reason} E nenhuma DATABASE_URL_TEST isolada e alcançável foi configurada.`
      };
    }

    // Caso o Docker esteja disponível, mas nenhum container tenha sido instanciado previamente:
    return {
      canRun: false,
      status: 'BLOCKED',
      message: 'Docker daemon detectado, porém container MariaDB isolado não instanciado. Configure DATABASE_URL_TEST para instância local.'
    };
  }

  /**
   * Retorna um PrismaClient conectado exclusivamente à instância de teste.
   */
  public getPrismaClient(databaseUrl?: string): PrismaClient {
    const url = databaseUrl || this.activeDatabaseUrl;
    if (!url) {
      throw new Error('Ambiente de testes não inicializado. Chame setup() antes de obter o PrismaClient.');
    }

    if (this.currentPrismaClient) {
      return this.currentPrismaClient;
    }

    const adapter = new PrismaMariaDb(url);
    this.currentPrismaClient = new PrismaClient({
      adapter,
      log: process.env.DEBUG_TEST_DB === 'true' ? ['query', 'error', 'warn'] : ['error']
    });

    return this.currentPrismaClient;
  }

  /**
   * Limpa os dados de teste em ordem topológica reversa respeitando foreign keys.
   */
  public async cleanDatabase(prisma?: PrismaClient): Promise<void> {
    const client = prisma || this.currentPrismaClient;
    if (!client) return;

    // Tabelas limpas em ordem de dependência reversa
    const deleteOperations = [
      client.sessionResult.deleteMany(),
      client.sessionEntry.deleteMany(),
      client.session.deleteMany(),
      client.grandPrix.deleteMany(),
      client.circuitLayout.deleteMany(),
      client.circuit.deleteMany(),
      client.driverStandings.deleteMany(),
      client.constructorStandings.deleteMany(),
      client.seasonEntry.deleteMany(),
      client.constructor.deleteMany(),
      client.team.deleteMany(),
      client.driver.deleteMany(),
      client.season.deleteMany(),
      client.infrastructureHealthCheck.deleteMany()
    ];

    await client.$transaction(deleteOperations);
  }

  /**
   * Desconecta o cliente e encerra recursos.
   */
  public async teardown(): Promise<void> {
    if (this.currentPrismaClient) {
      await this.currentPrismaClient.$disconnect();
      this.currentPrismaClient = null;
    }
    this.activeDatabaseUrl = null;
  }
}
