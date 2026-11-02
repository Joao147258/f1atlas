#!/usr/bin/env node
/**
 * @fileoverview Validador Determinístico de Schema Prisma — F1Atlas
 *
 * Assegura conformidade com a SPEC-PERSIST-001 e arquitetura Prisma ORM 7:
 * 1. Verifica existência e localização canônica de `apps/api/prisma/schema.prisma`.
 * 2. Valida configuração do datasource (`provider = "mysql"`).
 * 3. Valida generator client Prisma 7 (`provider = "prisma-client"` com `output` explícito).
 * 4. Bloqueia providers legados do Prisma 6 (`prisma-client-js`).
 * 5. Bloqueia configuração legada de URL no schema (conexão governada via `prisma.config.ts`).
 * 6. Bloqueia criação prematura de modelos esportivos (Drivers, Teams, Races, Telemetry)
 *    sem especificações aprovadas de domínio.
 * 7. Garante execução somente-leitura por padrão, sem efeitos colaterais no workspace.
 *
 * @module scripts/database/validate-schema
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, STATUS, reportResult } from '../lib/workspace.mjs';

/**
 * Modelos especulativos ou de telemetria de alta frequência cuja presença no schema
 * relacional permanece estritamente proibida sem especificação formal de dados e desempenho.
 * Modelos do núcleo esportivo canônico (Driver, Team, Season, GrandPrix, etc.) foram modelados
 * e aprovados conforme a fundação de persistência relacional do F1Atlas.
 * @type {ReadonlyArray<string>}
 */
export const FORBIDDEN_UNAPPROVED_MODELS = Object.freeze([
  'Telemetry',
  'TelemetrySample',
  'CarSensor',
  'HighFrequencyTelemetry',
  'LiveTelemetryStream'
]);

/**
 * Analisa o conteúdo de texto de um schema Prisma e valida suas regras essenciais conforme Prisma 7.
 *
 * @param {string} schemaContent - Conteúdo bruto do schema.prisma.
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function parseAndValidateSchemaContent(schemaContent) {
  const issues = [];

  if (!schemaContent || !schemaContent.trim()) {
    return { valid: false, issues: ['Schema Prisma está vazio'] };
  }

  // 1. Validação do datasource
  const datasourceBlockMatch = schemaContent.match(/datasource\s+([a-zA-Z0-9_]+)\s*\{([^}]+)\}/);
  if (!datasourceBlockMatch) {
    issues.push('Bloco datasource db não encontrado no schema');
  } else {
    const datasourceBody = datasourceBlockMatch[2];
    const providerMatch = datasourceBody.match(/provider\s*=\s*["']([^"']+)["']/);
    if (!providerMatch) {
      issues.push('Provider do datasource ausente');
    } else if (providerMatch[1].toLowerCase() !== 'mysql') {
      issues.push(`Provider do datasource inválido: "${providerMatch[1]}" (esperado: "mysql")`);
    }

    // No Prisma 7, a URL de conexão da CLI reside no prisma.config.ts, não no schema.prisma
    if (/url\s*=\s*/.test(datasourceBody)) {
      issues.push('Configuração de url no datasource do schema é obsoleta no Prisma 7; a URL deve residir em prisma.config.ts');
    }
  }

  // 2. Validação do generator
  const generatorBlockMatch = schemaContent.match(/generator\s+([a-zA-Z0-9_]+)\s*\{([^}]+)\}/);
  if (!generatorBlockMatch) {
    issues.push('Bloco generator client não encontrado no schema');
  } else {
    const generatorBody = generatorBlockMatch[2];
    const providerMatch = generatorBody.match(/provider\s*=\s*["']([^"']+)["']/);
    if (!providerMatch) {
      issues.push('Provider do generator ausente');
    } else if (providerMatch[1] === 'prisma-client-js') {
      issues.push('Provider do generator "prisma-client-js" é legado do Prisma 6; use "prisma-client" (Prisma ORM 7)');
    } else if (providerMatch[1] !== 'prisma-client') {
      issues.push(`Provider do generator inválido: "${providerMatch[1]}" (esperado: "prisma-client")`);
    }

    const outputMatch = generatorBody.match(/output\s*=\s*["']([^"']+)["']/);
    if (!outputMatch) {
      issues.push('Parâmetro output explícito ausente no generator client (obrigatório no Prisma 7)');
    }
  }

  // 3. Verificação contra modelos esportivos não autorizados
  for (const forbiddenModel of FORBIDDEN_UNAPPROVED_MODELS) {
    const regex = new RegExp(`\\bmodel\\s+${forbiddenModel}\\b`, 'i');
    if (regex.test(schemaContent)) {
      issues.push(`Modelo esportivo não autorizado no schema: "${forbiddenModel}" (violação da SPEC-PERSIST-001)`);
    }
  }

  // 4. Verificação de balanceamento básico de chaves
  let braceCount = 0;
  for (const char of schemaContent) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount < 0) {
      issues.push('Chaves desbalanceadas no schema Prisma');
      break;
    }
  }
  if (braceCount !== 0 && !issues.some(i => i.includes('Chaves desbalanceadas'))) {
    issues.push('Bloco não fechado (chaves desbalanceadas) no schema Prisma');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Valida o arquivo canônico do schema Prisma no workspace e a presença de prisma.config.ts.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {{ status: STATUS, issues: string[], message: string }}
 */
export function validatePrismaSchema(workspaceRoot = PROJECT_ROOT) {
  const schemaPath = path.join(workspaceRoot, 'apps/api/prisma/schema.prisma');
  const rootConfigPath = path.join(workspaceRoot, 'prisma.config.ts');
  const apiConfigPath = path.join(workspaceRoot, 'apps/api/prisma.config.ts');

  if (!fs.existsSync(schemaPath)) {
    return {
      status: STATUS.FAIL,
      issues: [`Arquivo canônico do schema Prisma não encontrado: apps/api/prisma/schema.prisma`],
      message: 'Schema Prisma ausente'
    };
  }

  const issues = [];

  // Validação do prisma.config.ts obrigatório na arquitetura Prisma 7
  if (!fs.existsSync(rootConfigPath) && !fs.existsSync(apiConfigPath)) {
    issues.push('Arquivo de configuração prisma.config.ts ausente (obrigatório na arquitetura Prisma ORM 7)');
  }

  try {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const { valid, issues: schemaIssues } = parseAndValidateSchemaContent(schemaContent);
    issues.push(...schemaIssues);

    if (issues.length > 0) {
      return {
        status: STATUS.FAIL,
        issues,
        message: 'Schema Prisma contém violações de governança do Prisma 7'
      };
    }

    return {
      status: STATUS.PASS,
      issues: [],
      message: 'Schema Prisma validado com sucesso (Prisma ORM 7 + MySQL + prisma-client)'
    };
  } catch (error) {
    return {
      status: STATUS.ERROR,
      issues: [`Erro ao ler schema Prisma: ${error.message}`],
      message: 'Falha de leitura do schema'
    };
  }
}

if (isMain(import.meta.url)) {
  const result = validatePrismaSchema(PROJECT_ROOT);
  reportResult({ title: 'Validação do Schema Prisma (SPEC-PERSIST-001)', ...result });
  process.exit(result.status === STATUS.PASS || result.status === STATUS.SKIP ? 0 : 1);
}
