#!/usr/bin/env node
/**
 * @fileoverview Verificador de Proteção Contra Regressão para Prisma 6 — F1Atlas
 *
 * Assegura que o projeto adota estritamente Prisma ORM 7 + NestJS + MySQL e impede a
 * reintrodução de configurações legadas do Prisma 6 ou antecipações instáveis do Prisma 8.
 *
 * Regras auditadas (Seção 9 da Governança de Persistência):
 * 1. Dependências Prisma: `prisma`, `@prisma/client`, `@prisma/adapter-mariadb` com major 7.
 * 2. Schema Prisma: `provider = "prisma-client"`, `output` obrigatório e URL fora do schema.
 * 3. Prisma Config: presença e estrutura válida do `prisma.config.ts`.
 * 4. Imports do PrismaClient: proibido importar de `@prisma/client` diretamente no código ativo.
 * 5. Inicialização: `PrismaClient` deve ser inicializado com driver adapter (`@prisma/adapter-mariadb`).
 * 6. Governança e Skills: sem recomendação ativa de padrões legados (`prisma-client-js`).
 *
 * @module scripts/database/check-prisma-version
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, STATUS, reportResult } from '../lib/workspace.mjs';

/**
 * Pastas históricas ou arquivadas onde menções ao Prisma 6 são permitidas sem constituir violação.
 * @type {ReadonlyArray<string>}
 */
export const HISTORICAL_DOC_PATHS = Object.freeze([
  'docs/Relatorios',
  'docs/architecture/adr'
]);

/**
 * Audita os manifests package.json de todos os workspaces relevantes.
 *
 * @param {string} workspaceRoot
 * @returns {string[]} Lista de issues encontradas
 */
export function auditPackageDependencies(workspaceRoot) {
  const issues = [];
  const manifestPaths = [
    path.join(workspaceRoot, 'package.json'),
    path.join(workspaceRoot, 'apps/api/package.json')
  ];

  for (const manifestPath of manifestPaths) {
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const allDeps = {
        ...(manifest.dependencies || {}),
        ...(manifest.devDependencies || {})
      };

      const prismaPackages = ['prisma', '@prisma/client', '@prisma/adapter-mariadb'];

      for (const pkg of prismaPackages) {
        const version = allDeps[pkg];
        if (!version) continue;

        // Limpa prefixos ^, ~, >=, etc.
        const cleanVersion = version.replace(/^[\^~>=<]+/, '').trim();
        const major = cleanVersion.split('.')[0];

        if (major !== '7') {
          issues.push(
            `Manifest ${path.relative(workspaceRoot, manifestPath)}: pacote "${pkg}" está na versão "${version}" (exigido major 7)`
          );
        }
      }
    } catch (e) {
      issues.push(`Falha ao ler JSON em ${manifestPath}: ${e.message}`);
    }
  }

  return issues;
}

/**
 * Audita o schema canônico contra configurações herdadas do Prisma 6.
 *
 * @param {string} workspaceRoot
 * @returns {string[]} Lista de issues encontradas
 */
export function auditSchemaArchitecture(workspaceRoot) {
  const issues = [];
  const schemaPath = path.join(workspaceRoot, 'apps/api/prisma/schema.prisma');

  if (!fs.existsSync(schemaPath)) {
    return ['apps/api/prisma/schema.prisma: arquivo não encontrado'];
  }

  const content = fs.readFileSync(schemaPath, 'utf8');

  // Generator legado
  if (/provider\s*=\s*["']prisma-client-js["']/.test(content)) {
    issues.push('apps/api/prisma/schema.prisma: generator utiliza provider legado "prisma-client-js" (deve ser "prisma-client")');
  }

  // Falta de output explícito
  const generatorMatch = content.match(/generator\s+[a-zA-Z0-9_]+\s*\{([^}]+)\}/);
  if (generatorMatch && !/output\s*=\s*["'][^"']+["']/.test(generatorMatch[1])) {
    issues.push('apps/api/prisma/schema.prisma: generator client não define output explícito (obrigatório no Prisma 7)');
  }

  // URL no schema (obsoleta no Prisma 7)
  const datasourceMatch = content.match(/datasource\s+[a-zA-Z0-9_]+\s*\{([^}]+)\}/);
  if (datasourceMatch && /url\s*=\s*/.test(datasourceMatch[1])) {
    issues.push('apps/api/prisma/schema.prisma: datasource define url no schema; na linha 7 a conexão é governada via prisma.config.ts');
  }

  return issues;
}

/**
 * Audita arquivos de código em busca de imports legados e inicializações incorretas.
 *
 * @param {string} workspaceRoot
 * @returns {string[]} Lista de issues encontradas
 */
export function auditCodeImportsAndInstantiation(workspaceRoot) {
  const issues = [];
  const sourceDirs = [
    path.join(workspaceRoot, 'apps/api/src'),
    path.join(workspaceRoot, 'apps/api/prisma')
  ];

  for (const srcDir of sourceDirs) {
    if (!fs.existsSync(srcDir)) continue;

    const files = fs.readdirSync(srcDir, { recursive: true });
    for (const relFile of files) {
      const fileName = typeof relFile === 'string' ? relFile : relFile.name;
      if (!fileName.endsWith('.ts') && !fileName.endsWith('.js')) continue;

      const fullPath = path.join(srcDir, fileName);
      // Ignora pasta de código gerado pelo Prisma
      if (fullPath.includes('src/generated/prisma')) continue;

      const code = fs.readFileSync(fullPath, 'utf8');

      // Proibição de importar PrismaClient diretamente de '@prisma/client'
      if (/import\s*\{[^}]*PrismaClient[^}]*\}\s*from\s*['"]@prisma\/client['"]/.test(code)) {
        issues.push(
          `${path.relative(workspaceRoot, fullPath)}: importa PrismaClient diretamente de '@prisma/client' (deve importar do output gerado)`
        );
      }

      // Proibição de new PrismaClient() sem adapter
      if (/new\s+PrismaClient\s*\(\s*\)/.test(code)) {
        issues.push(
          `${path.relative(workspaceRoot, fullPath)}: PrismaClient instanciado sem driver adapter (obrigatório adapter MariaDB/MySQL)`
        );
      }
    }
  }

  return issues;
}

/**
 * Audita skills e templates de agentes ativos contra recomendações legadas do Prisma 6.
 *
 * @param {string} workspaceRoot
 * @returns {string[]} Lista de issues encontradas
 */
export function auditActiveSkillsAndAgents(workspaceRoot) {
  const issues = [];
  const checkPaths = [
    path.join(workspaceRoot, '.gemini/agents/prisma-engineer.md'),
    path.join(workspaceRoot, '.agents/skills/prisma-schema-modeling/SKILL.md'),
    path.join(workspaceRoot, '.agents/skills/prisma-nestjs-integration/SKILL.md'),
    path.join(workspaceRoot, '.agents/skills/prisma-operations/SKILL.md')
  ];

  for (const fullPath of checkPaths) {
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf8');

    const lines = content.split('\n');
    for (const [idx, line] of lines.entries()) {
      if (/prisma-client-js/.test(line)) {
        // Ignora menções de proibição explícita ou histórico documental
        if (/(proibido|não|nunca|evitar|legado|obsolet|rejeit|bloque)/i.test(line)) {
          continue;
        }
        issues.push(
          `${path.relative(workspaceRoot, fullPath)}:${idx + 1}: contém recomendação legada "prisma-client-js" (atualizar para "prisma-client")`
        );
      }
    }
  }

  return issues;
}

/**
 * Executa a auditoria completa contra regressões do Prisma 6.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT]
 * @returns {{ status: STATUS, issues: string[], message: string }}
 */
export function checkPrismaGovernance(workspaceRoot = PROJECT_ROOT) {
  const issues = [
    ...auditPackageDependencies(workspaceRoot),
    ...auditSchemaArchitecture(workspaceRoot),
    ...auditCodeImportsAndInstantiation(workspaceRoot),
    ...auditActiveSkillsAndAgents(workspaceRoot)
  ];

  // Verifica existência de prisma.config.ts
  const rootConfig = path.join(workspaceRoot, 'prisma.config.ts');
  const apiConfig = path.join(workspaceRoot, 'apps/api/prisma.config.ts');
  if (!fs.existsSync(rootConfig) && !fs.existsSync(apiConfig)) {
    issues.push('prisma.config.ts ausente no workspace (obrigatório na arquitetura Prisma ORM 7)');
  }

  if (issues.length > 0) {
    return {
      status: STATUS.FAIL,
      issues,
      message: 'Detectadas inconsistências ou padrões legados incompatíveis com Prisma ORM 7'
    };
  }

  return {
    status: STATUS.PASS,
    issues: [],
    message: 'Nenhuma regressão detectada; conformidade total com Prisma ORM 7 + NestJS + MySQL'
  };
}

if (isMain(import.meta.url)) {
  const result = checkPrismaGovernance(PROJECT_ROOT);
  reportResult({ title: 'Proteção Contra Regressão Prisma 6 (Prisma ORM 7 Canonical)', ...result });
  process.exit(result.status === STATUS.PASS || result.status === STATUS.SKIP ? 0 : 1);
}
