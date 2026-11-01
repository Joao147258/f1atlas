#!/usr/bin/env node
/**
 * @fileoverview Verificador de Integridade de Links em Documentação Markdown — F1Atlas
 *
 * Analisa todos os arquivos Markdown (.md) versionáveis do workspace para verificar:
 * 1. Links locais relativos que apontam para arquivos inexistentes (links quebrados).
 * 2. Links que tentam escapar da raiz do workspace via diretório pai ("..").
 * 3. Caracteres ou URLs codificadas de forma inválida.
 *
 * Escopo deliberado:
 * - Links externos (http/https), âncoras internas (#), mailto: e data: URLs são ignorados por design.
 *
 * @module scripts/quality/check-docs
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, listWorkspaceFiles, report } from '../lib/workspace.mjs';

/**
 * Expressão regular para capturar links inline Markdown: [texto](destino).
 * Ignora imagens inline (![alt](src)) através de negative lookbehind.
 * @type {RegExp}
 */
const INLINE_MARKDOWN_LINK_REGEX = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;

/**
 * Prefixos de links ignorados na validação local (links externos, âncoras e esquemas especiais).
 * @type {RegExp}
 */
const IGNORED_SCHEMES_REGEX = /^(https?:|mailto:|#|data:)/i;

/**
 * Inspeciona os arquivos Markdown para assegurar que todos os links locais tenham alvos válidos.
 *
 * @param {string} workspaceRoot - Diretório raiz do projeto.
 * @param {string[]} [candidateFiles=listWorkspaceFiles(workspaceRoot)] - Arquivos a analisar.
 * @returns {string[]} Lista de problemas encontrados (links quebrados ou fora da raiz).
 */
export function checkMarkdownLinks(workspaceRoot, candidateFiles = listWorkspaceFiles(workspaceRoot)) {
  const issues = [];
  const markdownFiles = candidateFiles.filter(fileName => fileName.endsWith('.md'));

  for (const relativeFilePath of markdownFiles) {
    const absoluteFilePath = path.join(workspaceRoot, relativeFilePath);
    let fileContent;

    try {
      fileContent = fs.readFileSync(absoluteFilePath, 'utf8');
    } catch {
      continue;
    }

    const matches = fileContent.matchAll(INLINE_MARKDOWN_LINK_REGEX);
    for (const match of matches) {
      const rawTarget = match[1].trim().replace(/^<|>$/g, '');

      // Ignora links externos, âncoras de cabeçalho ou esquemas especiais
      if (IGNORED_SCHEMES_REGEX.test(rawTarget)) {
        continue;
      }

      // Separa parâmetros de query ou fragmentos de âncora (/caminho#ancora -> /caminho)
      const cleanPath = rawTarget.split(/[?#]/)[0];
      if (!cleanPath) {
        continue;
      }

      let decodedPath;
      try {
        decodedPath = decodeURIComponent(cleanPath);
      } catch {
        issues.push(`${relativeFilePath}: caminho inválido no link ${rawTarget}`);
        continue;
      }

      const enclosingDirectory = path.dirname(relativeFilePath);
      const resolvedDestination = path.resolve(workspaceRoot, enclosingDirectory, decodedPath);
      const relativeFromRoot = path.relative(workspaceRoot, resolvedDestination);

      // Valida se o link escapa da raiz do projeto
      const escapesRoot = relativeFromRoot.startsWith('..' + path.sep) ||
                          relativeFromRoot === '..' ||
                          path.isAbsolute(relativeFromRoot);

      if (escapesRoot) {
        issues.push(`${relativeFilePath}: link ultrapassa a raiz: ${rawTarget}`);
      } else if (!fs.existsSync(resolvedDestination)) {
        issues.push(`${relativeFilePath}: destino inexistente: ${rawTarget}`);
      }
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  const issues = checkMarkdownLinks(PROJECT_ROOT);
  report('Links locais de Markdown', issues);
}
