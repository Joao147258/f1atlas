#!/usr/bin/env node
/**
 * @fileoverview Validador do Catálogo Oficial de Eventos Analíticos — F1Atlas
 *
 * Assegura conformidade com a SPEC-AN-001 (Telemetria e Analytics de Produto):
 * 1. Formato do Catálogo: `schemaVersion === 1` e array `events` obrigatório.
 * 2. Nomenclatura de Eventos: Padrão snake_case (`^[a-z][a-z0-9_]*$`) e unicidade de nomes.
 * 3. Finalidade e Propósito: Cada evento deve possuir descrição de propósito (mínimo 12 caracteres).
 * 4. Privacidade e Minimização de Dados: Propriedades não podem conter termos identificadores de dados pessoais (PII).
 * 5. Governança de Consentimento: Categoria de consentimento deve ser estritamente `analytics` ou `essential`.
 *
 * @module scripts/analytics/validate-events
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

/**
 * Expressão regular para validação do identificador de evento analítico em snake_case.
 * @type {RegExp}
 */
const EVENT_NAME_REGEX = /^[a-z][a-z0-9_]*$/;

/**
 * Padrões de propriedades que indicam potencial vazamento de PII (Personally Identifiable Information).
 * @type {RegExp}
 */
export const FORBIDDEN_PII_REGEX = /(?:email|phone|ip_address|cpf|password|token|secret|api_key|access_key|birthdate)/i;

/**
 * Categorias de consentimento permitidas pela política de privacidade e Basic Consent Mode.
 * @type {ReadonlySet<string>}
 */
const VALID_CONSENT_CATEGORIES = new Set(['analytics', 'essential']);

/**
 * Valida a integridade formal, regras de nomenclatura e políticas de privacidade de um catálogo de eventos.
 *
 * @param {Object} catalog - Objeto deserializado do catálogo de eventos.
 * @returns {string[]} Lista de problemas encontrados no catálogo (vazia se estiver válido).
 */
export function validateEventCatalog(catalog) {
  const issues = [];
  const seenEventNames = new Set();

  if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.events)) {
    return ['Catálogo inválido: schemaVersion=1 e events[] são obrigatórios'];
  }

  for (const [index, event] of catalog.events.entries()) {
    const eventPrefix = `events[${index}]`;

    if (!event || typeof event !== 'object') {
      issues.push(`${eventPrefix}: entrada inválida no catálogo`);
      continue;
    }

    const eventName = event.name ?? '';
    if (!EVENT_NAME_REGEX.test(eventName)) {
      issues.push(`${eventPrefix}: nome inválido (deve ser snake_case iniciando com letra)`);
    }

    if (seenEventNames.has(eventName)) {
      issues.push(`${eventPrefix}: nome duplicado: "${eventName}"`);
    }
    seenEventNames.add(eventName);

    if (!event.purpose || typeof event.purpose !== 'string' || event.purpose.length < 12) {
      issues.push(`${eventPrefix}: purpose insuficiente (mínimo 12 caracteres com justificativa de mensuração)`);
    }

    if (!Array.isArray(event.properties)) {
      issues.push(`${eventPrefix}: properties deve ser um array de strings`);
    } else {
      for (const propertyName of event.properties) {
        if (FORBIDDEN_PII_REGEX.test(propertyName)) {
          issues.push(`${eventPrefix}: propriedade potencialmente sensível: ${propertyName}`);
        }
      }
    }

    if (!VALID_CONSENT_CATEGORIES.has(event.consentCategory)) {
      issues.push(`${eventPrefix}: consentCategory ausente ou inválida (permitidas: analytics, essential)`);
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  const catalogPath = path.join(PROJECT_ROOT, 'docs/analytics/events.catalog.json');
  let parsedCatalog;

  try {
    const rawContent = fs.readFileSync(catalogPath, 'utf8');
    parsedCatalog = JSON.parse(rawContent);
  } catch (error) {
    console.error(`FALHA ao carregar catálogo: ${error.message}`);
    process.exit(1);
  }

  const issues = validateEventCatalog(parsedCatalog);
  report('Catálogo de eventos analíticos (não instrumentação)', issues);
}
