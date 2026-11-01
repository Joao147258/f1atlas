#!/usr/bin/env node
/**
 * @fileoverview Validador de Diretivas de Importação de Contexto do Gemini — F1Atlas
 *
 * Inspeciona as diretivas de importação de contexto (`@./caminho`) em arquivos de orquestração
 * (como `GEMINI.example.md` e `GEMINI.md`) para garantir que:
 * 1. Todos os arquivos referenciados existam fisicamente no repositório.
 * 2. Nenhuma diretiva tente escapar da raiz do workspace via path traversal ("..").
 *
 * @module scripts/documentation/validate-references
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

/**
 * Expressão regular para capturar diretivas de inclusão de contexto no início de linha: @caminho.
 * @type {RegExp}
 */
const CONTEXT_IMPORT_REGEX = /^@([^\s]+)$/gm;

/**
 * Valida as diretivas de importação de contexto nos arquivos indicados.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @param {string[]} [targetFiles=['GEMINI.example.md']] - Lista de arquivos a validar.
 * @returns {string[]} Lista de violações identificadas.
 */
export function validateImports(workspaceRoot = PROJECT_ROOT, targetFiles = ['GEMINI.example.md']) {
  const issues = [];

  for (const relativeTargetFile of targetFiles) {
    const absoluteTargetFile = path.join(workspaceRoot, relativeTargetFile);

    if (!fs.existsSync(absoluteTargetFile)) {
      issues.push(`Arquivo inexistente: ${relativeTargetFile}`);
      continue;
    }

    let fileContent;
    try {
      fileContent = fs.readFileSync(absoluteTargetFile, 'utf8');
    } catch (readError) {
      issues.push(`Falha ao ler ${relativeTargetFile}: ${readError.message}`);
      continue;
    }

    const matches = fileContent.matchAll(CONTEXT_IMPORT_REGEX);
    for (const match of matches) {
      const declaredImportPath = match[1];
      const enclosingDir = path.dirname(relativeTargetFile);
      const normalizedPath = path.normalize(path.join(enclosingDir, declaredImportPath));

      const escapesRoot = normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath);
      const targetExists = fs.existsSync(path.join(workspaceRoot, normalizedPath));

      if (escapesRoot || !targetExists) {
        issues.push(`${relativeTargetFile}: importação não encontrada ou fora da raiz: ${declaredImportPath}`);
      }
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  const issues = validateImports(PROJECT_ROOT);
  report('Importações de contexto do Gemini', issues);
}
