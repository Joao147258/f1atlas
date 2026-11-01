#!/usr/bin/env node
/**
 * @fileoverview Verificador de Limites Arquiteturais do Domínio — F1Atlas
 *
 * Aplica os princípios de Clean Architecture, DDD e Backend First no F1Atlas:
 * 1. O Domínio é independente de frameworks web (Next.js, NestJS, React).
 * 2. O Domínio é agnóstico à persistência e ORMs (Prisma, Drizzle).
 * 3. O Domínio nunca importa camadas externas de infraestrutura ou apresentação.
 *
 * Inspeciona o código-fonte em `apps/api/src/domain/` e `packages/domain/`.
 * Se esses módulos ainda não estiverem criados (estado Foundation v0.2), relata como
 * NÃO APLICÁVEL (SKIP) de forma transparente.
 *
 * @module scripts/architecture/verify-boundaries
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

/**
 * Expressão regular que detecta importações proibidas no domínio:
 * - Frameworks HTTP/Web: @nestjs, next, react
 * - ORMs e drivers de persistência: @prisma, drizzle-orm
 * - Camadas externas: /infrastructure/ e /presentation/
 * @type {RegExp}
 */
const FORBIDDEN_DOMAIN_IMPORTS_REGEX = /(?:from\s*['"]|import\s*\(\s*['"]|require\s*\(\s*['"])(?:@nestjs\/|next(?:\/|['"])|react(?:\/|['"])|@prisma\/|drizzle-orm(?:\/|['"])|[^'"]*\/(?:infrastructure|presentation)\/)/;

/**
 * Extensões de arquivos de código fonte sujeitas à verificação arquitetural.
 * @type {RegExp}
 */
const SOURCE_CODE_EXTENSIONS_REGEX = /\.(?:ts|tsx|js|mjs)$/;

/**
 * Analisa uma lista de arquivos de domínio para verificar se algum deles viola as regras de isolamento.
 *
 * @param {string} workspaceRoot - Diretório raiz do projeto.
 * @param {string[]} relativeFiles - Lista de arquivos relativos à raiz a serem inspecionados.
 * @returns {string[]} Lista de violações encontradas.
 */
export function checkBoundaryFiles(workspaceRoot, relativeFiles) {
  const boundaryIssues = [];

  for (const relativeFilePath of relativeFiles) {
    if (!SOURCE_CODE_EXTENSIONS_REGEX.test(relativeFilePath)) {
      continue;
    }

    const absoluteFilePath = path.join(workspaceRoot, relativeFilePath);
    let sourceContent;

    try {
      sourceContent = fs.readFileSync(absoluteFilePath, 'utf8');
    } catch {
      continue;
    }

    if (FORBIDDEN_DOMAIN_IMPORTS_REGEX.test(sourceContent)) {
      boundaryIssues.push(`${relativeFilePath}: domínio importa framework ou infraestrutura`);
    }
  }

  return boundaryIssues;
}

/**
 * Coleta recursivamente todos os arquivos de código-fonte a partir de um diretório base.
 *
 * @param {string} directoryPath - Caminho absoluto do diretório a inspecionar.
 * @param {string} [prefixPath=''] - Prefixo relativo acumulado.
 * @returns {string[]} Lista de caminhos relativos ao prefixPath.
 */
function collectSourceFiles(directoryPath, prefixPath = '') {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const collected = [];
  const directoryEntries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of directoryEntries) {
    const entryRelativePath = prefixPath ? path.posix.join(prefixPath, entry.name) : entry.name;
    const entryAbsolutePath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      collected.push(...collectSourceFiles(entryAbsolutePath, entryRelativePath));
    } else if (entry.isFile()) {
      collected.push(entryRelativePath);
    }
  }

  return collected;
}

/**
 * Realiza a verificação de conformidade arquitetural dos limites do domínio.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {{ applicable: boolean, issues: string[] }}
 * Retorna se a verificação é aplicável (se há módulos de domínio existentes) e as eventuais violações.
 */
export function checkArchitecture(workspaceRoot = PROJECT_ROOT) {
  const domainRoots = [
    'apps/api/src/domain',
    'packages/domain'
  ];

  const availableDomainRoots = domainRoots.filter(rootCandidate =>
    fs.existsSync(path.join(workspaceRoot, rootCandidate))
  );

  if (availableDomainRoots.length === 0) {
    return { applicable: false, issues: [] };
  }

  const sourceFiles = availableDomainRoots
    .flatMap(rootDirectory => collectSourceFiles(path.join(workspaceRoot, rootDirectory), rootDirectory))
    .filter(filePath => SOURCE_CODE_EXTENSIONS_REGEX.test(filePath));

  if (sourceFiles.length === 0) {
    return { applicable: false, issues: [] };
  }

  const detectedIssues = checkBoundaryFiles(workspaceRoot, sourceFiles);
  return { applicable: true, issues: detectedIssues };
}

if (isMain(import.meta.url)) {
  const result = checkArchitecture(PROJECT_ROOT);
  if (!result.applicable) {
    console.log('NÃO APLICÁVEL: sem módulos de domínio implementados; limites arquiteturais de código aguardam apps/ ou packages/domain/.');
  } else {
    report('Limites de dependências do domínio (checagem inicial)', result.issues);
  }
}
