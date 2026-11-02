#!/usr/bin/env node
/**
 * @fileoverview Verificador de Integridade e Histórico de Migrations Prisma — F1Atlas
 *
 * Assegura conformidade com a SPEC-PERSIST-001 e SPEC-GOV-003:
 * 1. Inspeciona o diretório `apps/api/prisma/migrations`.
 * 2. Valida convenção de nomenclatura de cada migration (timestamp YYYYMMDDHHMMSS_nome).
 * 3. Valida presença e integridade do arquivo `migration.sql` em cada subdiretório.
 * 4. Bloqueia comandos SQL perigosos ou destrutivos em migrations versionadas
 *    (ex.: `DROP DATABASE`, comandos ilegais que comprometem persistência de dados).
 * 5. Garante execução somente-leitura por padrão.
 *
 * @module scripts/database/check-migrations
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, STATUS, reportResult } from '../lib/workspace.mjs';

/**
 * Padrão canônico de nomenclatura de migrations do Prisma:
 * Ex: `20261101120000_init_foundation`
 * @type {RegExp}
 */
export const PRISMA_MIGRATION_DIR_REGEX = /^\d{14}_[a-z0-9_]+$/;

/**
 * Padrões SQL considerados destrutivos e proibidos em migrations declarativas padrão.
 * @type {ReadonlyArray<{ pattern: RegExp, description: string }>}
 */
export const FORBIDDEN_SQL_PATTERNS = Object.freeze([
  { pattern: /\bDROP\s+DATABASE\b/i, description: 'Comando DROP DATABASE proibido' },
  { pattern: /\bTRUNCATE\s+(?!TABLE\s+_test_)\w+/i, description: 'Comando TRUNCATE não autorizado em migration de produção' },
  { pattern: /\bGRANT\s+ALL\s+PRIVILEGES\b/i, description: 'Comando GRANT ALL PRIVILEGES proibido em migrations' }
]);

/**
 * Analisa o diretório de migrations e valida a integridade de seus arquivos.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {{ status: STATUS, issues: string[], message: string }}
 */
export function checkMigrations(workspaceRoot = PROJECT_ROOT) {
  const issues = [];
  const migrationsDir = path.join(workspaceRoot, 'apps/api/prisma/migrations');

  if (!fs.existsSync(migrationsDir)) {
    return {
      status: STATUS.SKIP,
      issues: [],
      message: 'Diretório apps/api/prisma/migrations ainda não criado; nenhuma migration gerada.'
    };
  }

  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const migrationDirs = entries.filter(e => e.isDirectory() && e.name !== 'migration_lock.toml').map(e => e.name);

  if (migrationDirs.length === 0) {
    return {
      status: STATUS.SKIP,
      issues: [],
      message: 'Nenhuma migration encontrada em apps/api/prisma/migrations.'
    };
  }

  // Ordena para checagem cronológica
  migrationDirs.sort();

  let previousTimestamp = '';

  for (const dirName of migrationDirs) {
    // 1. Validar padrão de nomenclatura
    if (!PRISMA_MIGRATION_DIR_REGEX.test(dirName)) {
      issues.push(`Diretório de migration com nomenclatura fora do padrão Prisma (esperado YYYYMMDDHHMMSS_nome): "${dirName}"`);
      continue;
    }

    const currentTimestamp = dirName.slice(0, 14);
    if (previousTimestamp && currentTimestamp < previousTimestamp) {
      issues.push(`Ordem cronológica invertida na migration "${dirName}"`);
    }
    previousTimestamp = currentTimestamp;

    // 2. Validar existência de migration.sql
    const migrationSqlPath = path.join(migrationsDir, dirName, 'migration.sql');
    if (!fs.existsSync(migrationSqlPath)) {
      issues.push(`Arquivo migration.sql ausente na pasta "${dirName}"`);
      continue;
    }

    // 3. Validar conteúdo SQL
    try {
      const sqlContent = fs.readFileSync(migrationSqlPath, 'utf8');
      if (!sqlContent.trim()) {
        issues.push(`Arquivo migration.sql está vazio em "${dirName}"`);
      }

      for (const { pattern, description } of FORBIDDEN_SQL_PATTERNS) {
        if (pattern.test(sqlContent)) {
          issues.push(`Migration "${dirName}": ${description}`);
        }
      }
    } catch (readError) {
      issues.push(`Erro ao ler migration.sql em "${dirName}": ${readError.message}`);
    }
  }

  if (issues.length > 0) {
    return {
      status: STATUS.FAIL,
      issues,
      message: 'Problemas encontrados nas migrations Prisma'
    };
  }

  return {
    status: STATUS.PASS,
    issues: [],
    message: `${migrationDirs.length} migration(s) Prisma verificada(s) e válidas.`
  };
}

if (isMain(import.meta.url)) {
  const result = checkMigrations(PROJECT_ROOT);
  reportResult({ title: 'Governança de Migrations Prisma (SPEC-PERSIST-001)', ...result });
  process.exit(result.status === STATUS.PASS || result.status === STATUS.SKIP ? 0 : 1);
}
