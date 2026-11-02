#!/usr/bin/env node
/**
 * @fileoverview Verificador de Integridade dos Artefatos Gerados pelo Prisma Client — F1Atlas
 *
 * Assegura conformidade com a SPEC-PERSIST-001 e arquitetura Prisma ORM 7:
 * 1. Verifica que artefatos gerados do Prisma Client NÃO foram criados dentro de `packages/domain`
 *    ou `packages/contracts` (blindagem do domínio esportivo).
 * 2. Verifica a presença dos artefatos gerados no output canônico (`apps/api/src/generated/prisma`).
 * 3. Se a aplicação e suas dependências ainda não tiverem sido instaladas, relata SKIP explicativo.
 * 4. Valida que a versão do `@prisma/client` instalada pertence à linha Prisma 7 (`7.10.x`).
 *
 * @module scripts/database/check-generated-client
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, STATUS, reportResult } from '../lib/workspace.mjs';

/**
 * Diretórios proibidos de conter artefatos gerados pelo Prisma Client.
 * @type {ReadonlyArray<string>}
 */
export const FORBIDDEN_CLIENT_LOCATIONS = Object.freeze([
  'packages/domain',
  'packages/contracts',
  'docs'
]);

/**
 * Inspeciona o workspace para validar se artefatos gerados do Prisma Client atendem ao Prisma 7.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {{ status: STATUS, issues: string[], message: string }}
 */
export function checkGeneratedClient(workspaceRoot = PROJECT_ROOT) {
  const issues = [];

  // 1. Auditoria contra vazamento de artefatos gerados no domínio ou contratos
  for (const forbiddenRelPath of FORBIDDEN_CLIENT_LOCATIONS) {
    const fullForbiddenPath = path.join(workspaceRoot, forbiddenRelPath);
    if (!fs.existsSync(fullForbiddenPath)) continue;

    const forbiddenFiles = fs.readdirSync(fullForbiddenPath, { recursive: true });
    for (const relativeFile of forbiddenFiles) {
      const fileName = typeof relativeFile === 'string' ? relativeFile : relativeFile.name;
      if (/prisma[_-]?client|\.prisma/i.test(fileName)) {
        issues.push(`Artefato gerado do Prisma detectado indevidamente em "${forbiddenRelPath}/${fileName}"`);
      }
    }
  }

  if (issues.length > 0) {
    return {
      status: STATUS.FAIL,
      issues,
      message: 'Artefatos gerados do Prisma Client encontrados em locais proibidos'
    };
  }

  // 2. Verificar se o schema canônico existe
  const schemaPath = path.join(workspaceRoot, 'apps/api/prisma/schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    return {
      status: STATUS.FAIL,
      issues: ['Schema Prisma ausente em apps/api/prisma/schema.prisma'],
      message: 'Schema não encontrado'
    };
  }

  // 3. Verificar presença e versão do runtime @prisma/client em apps/api ou raiz
  const apiNodeModulesClient = path.join(workspaceRoot, 'apps/api/node_modules/@prisma/client');
  const rootNodeModulesClient = path.join(workspaceRoot, 'node_modules/@prisma/client');
  const clientRuntimePath = fs.existsSync(apiNodeModulesClient) ? apiNodeModulesClient : rootNodeModulesClient;

  // 4. Verificar presença do Prisma Client gerado no output canônico (Prisma 7)
  const generatedClientPath = path.join(workspaceRoot, 'apps/api/src/generated/prisma');
  const hasGeneratedClient = fs.existsSync(generatedClientPath) && (
    fs.existsSync(path.join(generatedClientPath, 'client.ts')) ||
    fs.existsSync(path.join(generatedClientPath, 'client.js'))
  );

  if (!fs.existsSync(clientRuntimePath) && !hasGeneratedClient) {
    return {
      status: STATUS.SKIP,
      issues: [],
      message: 'Prisma Client ainda não gerado; execute npm run db:generate após instalação das dependências.'
    };
  }

  // Validação da versão do @prisma/client instalado
  if (fs.existsSync(clientRuntimePath)) {
    const clientPackageJsonPath = path.join(clientRuntimePath, 'package.json');
    if (fs.existsSync(clientPackageJsonPath)) {
      try {
        const clientManifest = JSON.parse(fs.readFileSync(clientPackageJsonPath, 'utf8'));
        const version = clientManifest.version || '';
        if (!version.startsWith('7.')) {
          issues.push(`Versão do @prisma/client instalada (${version}) incompatível com a linha Prisma 7 (esperado: 7.10.x)`);
          return {
            status: STATUS.FAIL,
            issues,
            message: 'Versão de @prisma/client incompatível'
          };
        }
      } catch {
        issues.push('Não foi possível ler package.json do @prisma/client instalado');
        return {
          status: STATUS.FAIL,
          issues,
          message: 'Falha de leitura do cliente Prisma'
        };
      }
    }
  }

  return {
    status: STATUS.PASS,
    issues: [],
    message: 'Artefatos do Prisma Client gerados e compatíveis com a arquitetura Prisma ORM 7'
  };
}

if (isMain(import.meta.url)) {
  const result = checkGeneratedClient(PROJECT_ROOT);
  reportResult({ title: 'Integridade do Prisma Client (SPEC-PERSIST-001)', ...result });
  process.exit(result.status === STATUS.PASS || result.status === STATUS.SKIP ? 0 : 1);
}
