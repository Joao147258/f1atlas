/**
 * @fileoverview Guarda de Segurança para Testes de Integração com Banco de Dados — F1Atlas
 *
 * Responsabilidade:
 * 1. Sanitizar URLs e parâmetros de conexão para impedir vazamento de credenciais.
 * 2. Impedir terminantemente a execução de testes contra bancos de produção, homologação remota ou bancos não qualificados.
 * 3. Validar se o nome da base de dados possui sufixo ou prefixo explícito de teste (_test, test_, f1atlas_test).
 * 4. Fornecer checagem não bloqueante de conectividade TCP com timeout estrito.
 * 5. Verificar a disponibilidade do socket Docker (/var/run/docker.sock) com permissões de leitura/escrita.
 *
 * Norma Arquitetural:
 * Alinhado com a SPEC-PERSIST-001, ADR-0002 e Guia M3-F03.
 *
 * @module apps/api/test/integration/database/setup/test-database-guard
 */

import net from 'node:net';
import fs from 'node:fs';
import { URL } from 'node:url';

/**
 * Padrões de hosts e nomes de banco estritamente proibidos para testes.
 */
export const FORBIDDEN_HOST_AND_DB_PATTERNS: ReadonlyArray<RegExp> = Object.freeze([
  /prod/i,
  /production/i,
  /f1atlas\.com/i,
  /hostinger/i,
  /live/i,
  /staging/i,
  /hml/i
]);

export interface DatabaseInspectionResult {
  valid: boolean;
  isSafeForTesting: boolean;
  isProduction: boolean;
  host: string;
  port: number;
  database: string;
  sanitizedUrl: string;
  rejectionReason?: string;
}

/**
 * Sanitiza e valida a URL de conexão para garantir que seja um banco isolado de teste.
 *
 * @param rawUrl - URL de conexão (ex: mysql://user:pass@localhost:3306/f1atlas_test)
 * @returns Diagnóstico detalhado de segurança
 */
export function inspectTestConnectionUrl(rawUrl?: string): DatabaseInspectionResult {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    return {
      valid: false,
      isSafeForTesting: false,
      isProduction: false,
      host: '',
      port: 3306,
      database: '',
      sanitizedUrl: '',
      rejectionReason: 'DATABASE_URL não informada ou vazia'
    };
  }

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname || 'localhost';
    const port = parsed.port ? Number(parsed.port) : 3306;
    const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : '';
    const sanitizedUrl = `${parsed.protocol}//${parsed.username ? '***:***@' : ''}${host}:${port}/${database}`;

    // 1. Verifica se host ou nome do banco combinam com padrões proibidos de produção
    const isProductionHost = FORBIDDEN_HOST_AND_DB_PATTERNS.some((pattern) => pattern.test(host));
    const isProductionDb = FORBIDDEN_HOST_AND_DB_PATTERNS.some((pattern) => pattern.test(database));

    if (isProductionHost || isProductionDb) {
      return {
        valid: true,
        isSafeForTesting: false,
        isProduction: true,
        host,
        port,
        database,
        sanitizedUrl,
        rejectionReason: `Conexão rejeitada por segurança: host ou database [${sanitizedUrl}] aparenta ser ambiente de produção/remoto.`
      };
    }

    // 2. Valida se o banco é explicitamente qualificado como ambiente descartável de teste
    const lowerDb = database.toLowerCase();
    const isExplicitTestDb =
      lowerDb.endsWith('_test') ||
      lowerDb.includes('test_') ||
      lowerDb === 'f1atlas_test' ||
      lowerDb.startsWith('test_');

    if (!isExplicitTestDb) {
      return {
        valid: true,
        isSafeForTesting: false,
        isProduction: false,
        host,
        port,
        database,
        sanitizedUrl,
        rejectionReason: `Conexão rejeitada: o banco de dados [${database}] não possui sufixo/prefixo de teste (_test, test_, f1atlas_test).`
      };
    }

    return {
      valid: true,
      isSafeForTesting: true,
      isProduction: false,
      host,
      port,
      database,
      sanitizedUrl
    };
  } catch (err) {
    return {
      valid: false,
      isSafeForTesting: false,
      isProduction: false,
      host: '',
      port: 3306,
      database: '',
      sanitizedUrl: '',
      rejectionReason: `URL de conexão inválida: ${(err as Error).message}`
    };
  }
}

/**
 * Verifica se um socket TCP está ouvindo na porta e host especificados com timeout seguro.
 */
export async function checkTcpSocket(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      cleanup();
      resolve(true);
    });

    socket.once('timeout', () => {
      cleanup();
      resolve(false);
    });

    socket.once('error', () => {
      cleanup();
      resolve(false);
    });

    try {
      socket.connect(port, host);
    } catch {
      cleanup();
      resolve(false);
    }
  });
}

/**
 * Verifica a disponibilidade do Docker Daemon via socket unix padrão.
 */
export function checkDockerAvailability(): { available: boolean; reason?: string } {
  const socketPath = process.env.DOCKER_HOST?.startsWith('unix://')
    ? process.env.DOCKER_HOST.replace('unix://', '')
    : '/var/run/docker.sock';

  if (!fs.existsSync(socketPath)) {
    return {
      available: false,
      reason: `Socket do Docker não encontrado em [${socketPath}]. Docker daemon não está instalado ou ativo.`
    };
  }

  try {
    fs.accessSync(socketPath, fs.constants.R_OK | fs.constants.W_OK);
    return { available: true };
  } catch (err) {
    return {
      available: false,
      reason: `Permissão negada ao acessar [${socketPath}] (EACCES). Usuário corrente não pertence ao grupo 'docker'.`
    };
  }
}
