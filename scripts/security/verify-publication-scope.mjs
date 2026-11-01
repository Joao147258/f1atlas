#!/usr/bin/env node
/**
 * @fileoverview Verificador de Escopo de Publicação e Regras de Ignore — F1Atlas
 *
 * Assegura que nenhum arquivo de escopo privado, arquivo de configuração local do operador
 * ou arquivo real de variáveis de ambiente entre no conjunto de arquivos versionáveis ou publicáveis.
 *
 * Verifica simultaneamente:
 * 1. Escopo de arquivos: examina os arquivos listados no workspace para barrar `.local/`, `GEMINI.md`,
 *    `.gemini/settings.json` e arquivos `.env` reais.
 * 2. Política de `.gitignore`: assegura que o arquivo `.gitignore` contenha explicitamente as regras
 *    mínimas mandatórias de exclusão para esses caminhos sensíveis.
 *
 * @module scripts/security/verify-publication-scope
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, listWorkspaceFiles, report } from '../lib/workspace.mjs';

/**
 * Modelos de ambiente públicos expressamente permitidos para documentação e setup.
 * @type {ReadonlySet<string>}
 */
const ALLOWED_TEMPLATES = new Set([
  '.env.example',
  '.env.sample',
  '.env.template'
]);

/**
 * Regras mandatórias que devem constar no arquivo `.gitignore` da raiz.
 * @type {ReadonlyArray<string>}
 */
const MANDATORY_IGNORE_RULES = Object.freeze([
  '/GEMINI.md',
  '/.local/',
  '/.gemini/settings.json'
]);

/**
 * Padrões de arquivos ou caminhos estritamente proibidos de publicação no repositório.
 * @type {RegExp}
 */
const FORBIDDEN_PATHS_REGEX = /^(?:\.local\/|GEMINI\.md$|\.gemini\/settings\.json$)/i;

/**
 * Padrões de arquivos de ambiente reais (.env, .env.local, .env.development, etc.).
 * @type {RegExp}
 */
const FORBIDDEN_ENV_REGEX = /(?:^|\/)\.env(?:\.|$)/i;

/**
 * Avalia se determinado caminho de arquivo relativo representa um recurso de publicação proibida.
 *
 * @param {string} relativeFilePath - Caminho do arquivo relativo à raiz do workspace.
 * @returns {boolean} Retorna true caso o arquivo pertença ao escopo estritamente privado.
 */
export function isForbiddenPublication(relativeFilePath) {
  const normalizedPath = relativeFilePath.replaceAll('\\', '/');
  const baseName = path.posix.basename(normalizedPath);

  // Modelos de exemplo autorizados são permitidos
  if (ALLOWED_TEMPLATES.has(baseName)) {
    return false;
  }

  // Verifica caminhos proibidos (.local/, GEMINI.md, etc.) ou arquivos de ambiente reais
  const isPrivateResource = FORBIDDEN_PATHS_REGEX.test(normalizedPath);
  const isRealEnvFile = FORBIDDEN_ENV_REGEX.test(normalizedPath);

  return isPrivateResource || isRealEnvFile;
}

/**
 * Inspeciona uma lista de caminhos de arquivos e identifica violações de escopo de publicação.
 *
 * @param {string[]} fileList - Lista de arquivos versionáveis a verificar.
 * @returns {string[]} Mensagens de violação encontradas.
 */
export function checkPublicationScope(fileList) {
  return fileList
    .filter(isForbiddenPublication)
    .map(relativeFilePath => `Arquivo privado entrou no conjunto publicável: ${relativeFilePath}`);
}

/**
 * Verifica se as regras essenciais de exclusão de arquivos privados estão presentes no `.gitignore`.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {string[]} Lista de regras de ignore ausentes ou erro de arquivo ausente.
 */
export function checkIgnorePolicy(workspaceRoot = PROJECT_ROOT) {
  const gitignorePath = path.join(workspaceRoot, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return ['.gitignore ausente'];
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  const existingRules = gitignoreContent.split(/\r?\n/).map(line => line.trim());

  const missingRules = [];
  for (const requiredRule of MANDATORY_IGNORE_RULES) {
    if (!existingRules.includes(requiredRule)) {
      missingRules.push(`Regra de ignore ausente: ${requiredRule}`);
    }
  }

  return missingRules;
}

if (isMain(import.meta.url)) {
  const candidateFiles = listWorkspaceFiles(PROJECT_ROOT);
  const publicationIssues = checkPublicationScope(candidateFiles);
  const ignoreIssues = checkIgnorePolicy(PROJECT_ROOT);

  report('Escopo de publicação', [...publicationIssues, ...ignoreIssues]);
}
