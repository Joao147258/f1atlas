#!/usr/bin/env node
/**
 * @fileoverview Validador de Dados Estruturados Schema.org (JSON-LD) — F1Atlas
 *
 * Inspeciona os esquemas de dados estruturados Schema.org (`docs/seo/structured-data.examples.json`),
 * garantindo a presença dos campos obrigatórios `@context: "https://schema.org"` e `@type`.
 *
 * No estágio Foundation v0.2, na ausência de exemplos ou geradores de JSON-LD, relata
 * como NÃO APLICÁVEL (SKIP).
 *
 * @module scripts/seo/validate-structured-data
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

/**
 * Valida uma lista ou objeto único de dados estruturados JSON-LD.
 *
 * @param {Object|Array<Object>} structuredData - Objeto ou array de objetos JSON-LD.
 * @returns {string[]} Lista de violações encontradas.
 */
export function validateStructuredData(structuredData) {
  const issues = [];
  const entries = Array.isArray(structuredData) ? structuredData : [structuredData];

  for (const [index, entry] of entries.entries()) {
    const entryPrefix = `JSON-LD[${index}]`;

    if (!entry || typeof entry !== 'object') {
      issues.push(`${entryPrefix}: entrada inválida`);
      continue;
    }

    const hasValidContext = entry['@context'] === 'https://schema.org' || entry['@context'] === 'http://schema.org';
    const hasValidType = Boolean(entry['@type']);

    if (!hasValidContext || !hasValidType) {
      issues.push(`${entryPrefix} sem @context/@type válido de Schema.org`);
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  const dataPath = path.join(PROJECT_ROOT, 'docs/seo/structured-data.examples.json');

  if (!fs.existsSync(dataPath)) {
    console.log('NÃO APLICÁVEL: ainda não há exemplos ou JSON-LD gerados para validar.');
  } else {
    let rawJson;
    try {
      const rawContent = fs.readFileSync(dataPath, 'utf8');
      rawJson = JSON.parse(rawContent);
    } catch (error) {
      console.error(`FALHA: ${error.message}`);
      process.exit(1);
    }

    const issues = validateStructuredData(rawJson);
    report('JSON-LD de exemplo', issues);
  }
}
