#!/usr/bin/env node
/**
 * @fileoverview Scanner Determinístico de Padrões de Segredos e Chaves Privadas — F1Atlas
 *
 * Realiza varredura estática de conteúdo textual para detectar credenciais de provedores
 * conhecidos (AWS, Google, GitHub, OpenAI, Slack, Stripe) e blocos de chaves privadas (RSA/PGP/SSH).
 *
 * Princípios de Segurança e Governança (SPEC-GOV-003):
 * 1. Não exposição: NUNCA imprime ou registra o valor textual do segredo identificado.
 * 2. Limite de tamanho: Arquivos maiores que 1 MB são ignorados para evitar degradação de performance.
 * 3. Ignora binários: Arquivos contendo bytes nulos (\0) são ignorados.
 * 4. Padrões de regex ancorados e com flag global reinicializada para evitar falso-positivo.
 *
 * @module scripts/security/check-secrets
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, listWorkspaceFiles, report } from '../lib/workspace.mjs';

/**
 * Limite máximo em bytes para análise de arquivos de texto (1 Megabyte).
 * @type {number}
 */
const MAX_SCAN_BYTES = 1024 * 1024;

/**
 * Catálogo de regras de detecção de segredos de alta precisão.
 * @type {ReadonlyArray<{ name: string, re: RegExp }>}
 */
export const RULES = Object.freeze([
  {
    name: 'AWS access key ID',
    re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g
  },
  {
    name: 'Google API key',
    re: /\bAIza[A-Za-z0-9_-]{35}\b/g
  },
  {
    name: 'GitHub token',
    re: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9_]{36,}\b/g
  },
  {
    name: 'OpenAI token',
    re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/g
  },
  {
    name: 'Slack token',
    re: /\bxox[baprs]-[0-9]{10,}-[0-9A-Za-z_-]{20,}\b/g
  },
  {
    name: 'Stripe secret key',
    re: /\b[rs]k_(?:live|test)_[0-9a-zA-Z]{24,}\b/g
  },
  {
    name: 'Private key block',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/g
  }
]);

/**
 * Varre uma cadeia de texto contra o catálogo de padrões de segredos conhecidos.
 *
 * @param {string} textContent - Conteúdo de texto a ser analisado.
 * @returns {string[]} Lista de nomes das regras violadas (ex: ['AWS access key ID']).
 */
export function scanText(textContent) {
  const matchedRules = [];

  for (const { name, re } of RULES) {
    // Reinicia o índice de busca da regex para evitar problemas com reuso de regex global (/g)
    re.lastIndex = 0;
    if (re.test(textContent)) {
      matchedRules.push(name);
    }
  }

  return matchedRules;
}

/**
 * Executa a verificação de segredos nos arquivos versionáveis do workspace.
 *
 * @param {string} workspaceRoot - Diretório raiz do projeto.
 * @param {string[]} [candidateFiles=listWorkspaceFiles(workspaceRoot)] - Arquivos a analisar.
 * @returns {string[]} Lista de violações encontradas com caminho e nome da regra (sem o valor secreto).
 */
export function checkSecrets(workspaceRoot, candidateFiles = listWorkspaceFiles(workspaceRoot)) {
  const securityIssues = [];

  for (const relativeFilePath of candidateFiles) {
    const absoluteFilePath = path.join(workspaceRoot, relativeFilePath);
    let fileStat;

    try {
      fileStat = fs.statSync(absoluteFilePath);
    } catch {
      // Ignora arquivos que deixaram de existir durante a análise
      continue;
    }

    // Ignora diretórios e arquivos acima do limite de tamanho
    if (!fileStat.isFile() || fileStat.size > MAX_SCAN_BYTES) {
      continue;
    }

    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(absoluteFilePath);
    } catch {
      continue;
    }

    // Heurística determinística: presença de byte nulo (\0) indica arquivo binário (imagens, PDFs, etc.)
    if (fileBuffer.includes(0)) {
      continue;
    }

    const textContent = fileBuffer.toString('utf8');
    const detectedPatterns = scanText(textContent);

    for (const ruleName of detectedPatterns) {
      securityIssues.push(`${relativeFilePath}: padrão compatível com ${ruleName} (valor ocultado)`);
    }
  }

  return securityIssues;
}

if (isMain(import.meta.url)) {
  const issues = checkSecrets(PROJECT_ROOT);
  report('Padrões de segredos conhecidos', issues);
}
