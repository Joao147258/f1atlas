/**
 * @fileoverview Executor Programático de Migrations Prisma 7 — F1Atlas
 *
 * Responsabilidade:
 * 1. Aplicar migrations versionadas (prisma migrate deploy) de forma determinística em banco isolado.
 * 2. Verificar status e integridade do histórico (prisma migrate status).
 * 3. Garantir resolução correta de diretórios de schema e configuração.
 *
 * Norma Arquitetural:
 * Alinhado com a SPEC-PERSIST-001 e Guia M3-F03.
 *
 * @module apps/api/test/integration/database/setup/migration-runner
 */

import { exec } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../../../../');
const API_ROOT = path.resolve(REPO_ROOT, 'apps/api');

export interface MigrationRunResult {
  success: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

/**
 * Executa um comando Prisma com a variável DATABASE_URL apontando para o banco isolado.
 */
function runPrismaCommand(command: string, databaseUrl: string): Promise<MigrationRunResult> {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      DATABASE_URL: databaseUrl
    };

    exec(command, { cwd: API_ROOT, env, timeout: 30000 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        command,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: error ? error.code || 1 : 0,
        error: error ? error.message : undefined
      });
    });
  });
}

/**
 * Aplica migrations versionadas ao banco temporário via `prisma migrate deploy`.
 *
 * @param databaseUrl - URL do banco isolado
 */
export async function applyMigrations(databaseUrl: string): Promise<MigrationRunResult> {
  return runPrismaCommand('npx prisma migrate deploy', databaseUrl);
}

/**
 * Verifica o status das migrations aplicadas via `prisma migrate status`.
 *
 * @param databaseUrl - URL do banco isolado
 */
export async function checkMigrationStatus(databaseUrl: string): Promise<MigrationRunResult> {
  return runPrismaCommand('npx prisma migrate status', databaseUrl);
}
