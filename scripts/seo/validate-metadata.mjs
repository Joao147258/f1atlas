#!/usr/bin/env node
/**
 * @fileoverview Validador de Metadados e Contrato SEO de Páginas — F1Atlas
 *
 * Assegura conformidade com a SPEC-SEO-001 (SEO Técnico e Metadados):
 * 1. Estrutura do Manifesto: Lista `pages` obrigatória.
 * 2. Validação por Rota:
 *    - `path` deve ser absoluto em relação à URL base (iniciar com `/`).
 *    - `title` e `description` obrigatórios e preenchidos.
 *    - `canonical` obrigatório e em protocolo estritamente seguro (`https://`).
 * 3. Unicidade: Proíbe rotas duplicadas no manifesto de páginas.
 *
 * No estágio Foundation v0.2, na ausência de `docs/seo/pages.manifest.json`, relata
 * como NÃO APLICÁVEL (SKIP), preservando o contrato formal para o futuro frontend.
 *
 * @module scripts/seo/validate-metadata
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

/**
 * Expressão regular para validação do protocolo seguro HTTPS no canonical.
 * @type {RegExp}
 */
const HTTPS_URL_REGEX = /^https:\/\//i;

/**
 * Valida a lista de páginas de um manifesto de SEO contra as regras da SPEC-SEO-001.
 *
 * @param {Array<Object>} pages - Lista de definições de páginas.
 * @returns {string[]} Lista de violações identificadas.
 */
export function validateSeoPages(pages) {
  const issues = [];
  const seenPaths = new Set();

  if (!Array.isArray(pages)) {
    return ['pages deve ser uma lista'];
  }

  for (const [index, page] of pages.entries()) {
    const pagePrefix = `pages[${index}]`;

    if (!page || typeof page !== 'object') {
      issues.push(`${pagePrefix}: entrada inválida`);
      continue;
    }

    if (!page.path || typeof page.path !== 'string' || !page.path.startsWith('/')) {
      issues.push(`${pagePrefix}: path inválido (deve iniciar com "/")`);
    }

    if (!page.title || !page.description) {
      issues.push(`${pagePrefix}: title/description ausentes`);
    }

    if (!page.canonical || !HTTPS_URL_REGEX.test(page.canonical)) {
      issues.push(`${pagePrefix}: canonical HTTPS ausente`);
    }

    if (page.path) {
      if (seenPaths.has(page.path)) {
        issues.push(`${pagePrefix}: path repetido: "${page.path}"`);
      }
      seenPaths.add(page.path);
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  const manifestPath = path.join(PROJECT_ROOT, 'docs/seo/pages.manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.log('NÃO APLICÁVEL: manifesto de páginas ausente; somente contrato preparado, frontend não implementado.');
  } else {
    let parsedPages;
    try {
      const rawContent = fs.readFileSync(manifestPath, 'utf8');
      parsedPages = JSON.parse(rawContent).pages;
    } catch (error) {
      console.error(`FALHA: JSON inválido (${error.message})`);
      process.exit(1);
    }

    const issues = validateSeoPages(parsedPages);
    report('Contrato SEO de páginas', issues);
  }
}
