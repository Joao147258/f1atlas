#!/usr/bin/env node
/**
 * @fileoverview Orquestrador de Verificação da Fundação Prisma 7/MySQL — F1Atlas
 *
 * Executa de forma integrada e determinística as validações da fundação de persistência:
 * 1. Validação estática do Schema Prisma (SPEC-PERSIST-001)
 * 2. Validação da integridade dos artefatos gerados pelo Prisma Client (Prisma 7)
 * 3. Validação da integridade e histórico de migrations
 * 4. Verificação de proteção contra regressão para Prisma 6
 *
 * @module scripts/database/run-database-verify
 */

import { PROJECT_ROOT, isMain, STATUS, reportResult } from '../lib/workspace.mjs';
import { validatePrismaSchema } from './validate-schema.mjs';
import { checkGeneratedClient } from './check-generated-client.mjs';
import { checkMigrations } from './check-migrations.mjs';
import { checkPrismaGovernance } from './check-prisma-version.mjs';

/**
 * Executa todas as verificações de governança de banco de dados do workspace.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {{ status: STATUS, results: Array<{ name: string, status: STATUS, issues: string[], message: string }> }}
 */
export function runDatabaseVerify(workspaceRoot = PROJECT_ROOT) {
  const checks = [
    { name: 'Schema Prisma', fn: () => validatePrismaSchema(workspaceRoot) },
    { name: 'Prisma Client Artefatos', fn: () => checkGeneratedClient(workspaceRoot) },
    { name: 'Governança de Migrations', fn: () => checkMigrations(workspaceRoot) },
    { name: 'Proteção Anti-Regressão Prisma 6', fn: () => checkPrismaGovernance(workspaceRoot) }
  ];

  const results = [];
  let hasFail = false;
  let hasError = false;

  for (const check of checks) {
    const outcome = check.fn();
    results.push({ name: check.name, ...outcome });

    if (outcome.status === STATUS.FAIL) hasFail = true;
    if (outcome.status === STATUS.ERROR) hasError = true;
  }

  let finalStatus = STATUS.PASS;
  if (hasError) finalStatus = STATUS.ERROR;
  else if (hasFail) finalStatus = STATUS.FAIL;
  else if (results.every(r => r.status === STATUS.SKIP)) finalStatus = STATUS.SKIP;

  return {
    status: finalStatus,
    results
  };
}

if (isMain(import.meta.url)) {
  const { status, results } = runDatabaseVerify(PROJECT_ROOT);

  for (const checkResult of results) {
    reportResult({ title: `Persistência: ${checkResult.name}`, ...checkResult });
  }

  const exitCode = status === STATUS.PASS || status === STATUS.SKIP ? 0 : 1;
  process.exit(exitCode);
}
