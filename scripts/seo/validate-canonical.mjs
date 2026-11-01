#!/usr/bin/env node
/**
 * @fileoverview Validador de URLs Canônicas no Manifesto de SEO — F1Atlas
 *
 * Inspeciona cada URL canônica declarada no manifesto de páginas para assegurar que:
 * 1. Seja uma URL válida e parseável pelo construtor URL nativo.
 * 2. Utilize estritamente o protocolo seguro HTTPS (`https:`).
 *
 * @module scripts/seo/validate-canonical
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

/**
 * Valida se as URLs canônicas da lista de páginas utilizam protocolo HTTPS válido.
 *
 * @param {Array<Object>} pages - Lista de páginas com campo `canonical`.
 * @returns {string[]} Lista de violações encontradas.
 */
export function validateCanonicalUrls(pages) {
  if (!Array.isArray(pages)) {
    return ['Lista pages inválida'];
  }

  const issues = [];
  for (const [index, page] of pages.entries()) {
    const pagePrefix = `pages[${index}]`;

    if (!page || typeof page !== 'object' || !page.canonical) {
      issues.push(`${pagePrefix}: canonical ausente ou inválido`);
      continue;
    }

    try {
      const parsedUrl = new URL(page.canonical);
      if (parsedUrl.protocol !== 'https:') {
        issues.push(`${pagePrefix}: canonical deve usar HTTPS`);
      }
    } catch {
      issues.push(`${pagePrefix}: canonical inválido`);
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  const manifestPath = path.join(PROJECT_ROOT, 'docs/seo/pages.manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.log('NÃO APLICÁVEL: canonical será validado quando existir manifesto de páginas.');
  } else {
    let parsedPages;
    try {
      const rawContent = fs.readFileSync(manifestPath, 'utf8');
      parsedPages = JSON.parse(rawContent).pages;
    } catch (error) {
      console.error(`FALHA: ${error.message}`);
      process.exit(1);
    }

    const issues = validateCanonicalUrls(parsedPages);
    report('Canonical em manifesto', issues);
  }
}
