#!/usr/bin/env node
/**
 * @fileoverview Verificador Estático de Conformidade de Privacidade de Analytics — F1Atlas
 *
 * Avalia o catálogo oficial de eventos analíticos (`docs/analytics/events.catalog.json`)
 * garantindo que nenhum evento declare propriedades contendo informações de identificação
 * pessoal (PII) ou credenciais em conformidade com as diretrizes da LGPD e SPEC-AN-001.
 *
 * @module scripts/analytics/validate-privacy
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';
import { validateEventCatalog } from './validate-events.mjs';

/**
 * Valida a privacidade estática do catálogo de eventos a partir do diretório raiz.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {string[]} Lista de problemas de privacidade encontrados.
 */
export function validateEventPrivacy(workspaceRoot = PROJECT_ROOT) {
  const catalogFilePath = path.join(workspaceRoot, 'docs/analytics/events.catalog.json');

  if (!fs.existsSync(catalogFilePath)) {
    return ['Catálogo docs/analytics/events.catalog.json inexistente'];
  }

  try {
    const rawContent = fs.readFileSync(catalogFilePath, 'utf8');
    const catalog = JSON.parse(rawContent);
    return validateEventCatalog(catalog);
  } catch (error) {
    return [`Falha ao processar catálogo: ${error.message}`];
  }
}

if (isMain(import.meta.url)) {
  const issues = validateEventPrivacy(PROJECT_ROOT);
  report('Privacidade do catálogo de eventos (estática)', issues);
}
