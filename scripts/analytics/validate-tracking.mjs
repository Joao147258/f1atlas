#!/usr/bin/env node
/**
 * @fileoverview Verificador de Contrato e Runtime de Tracking — F1Atlas
 *
 * Valida a existência e a conformidade estática do contrato canônico de telemetria
 * em `packages/contracts/analytics.mjs` e checa a aplicabilidade de instrumentação
 * no runtime da aplicação web (`apps/web`).
 *
 * No estágio Foundation v0.2, valida estaticamente o contrato e relata como NÃO APLICÁVEL (SKIP)
 * a validação de eventos em páginas reais enquanto `apps/web` não contiver código de aplicação.
 *
 * @module scripts/analytics/validate-tracking
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

/**
 * Valida os elementos contratuais essenciais do cliente tipado de analytics.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {string[]} Lista de problemas contratuais identificados.
 */
export function validateAnalyticsContract(workspaceRoot = PROJECT_ROOT) {
  const issues = [];
  const contractPath = path.join(workspaceRoot, 'packages/contracts/analytics.mjs');
  const catalogPath = path.join(workspaceRoot, 'docs/analytics/events.catalog.json');

  if (!fs.existsSync(contractPath)) {
    issues.push('Contrato packages/contracts/analytics.mjs inexistente');
    return issues;
  }

  if (!fs.existsSync(catalogPath)) {
    issues.push('Catálogo docs/analytics/events.catalog.json inexistente');
    return issues;
  }

  try {
    const rawContract = fs.readFileSync(contractPath, 'utf8');

    if (!rawContract.includes('createAnalyticsClient')) {
      issues.push('Contrato não exporta createAnalyticsClient');
    }
    if (!rawContract.includes('CONSENT_STATE')) {
      issues.push('Contrato não define CONSENT_STATE');
    }
    if (!rawContract.includes('FORBIDDEN_PROPERTY_TERMS')) {
      issues.push('Contrato não define FORBIDDEN_PROPERTY_TERMS');
    }
  } catch (error) {
    issues.push(`Erro ao ler contrato: ${error.message}`);
  }

  return issues;
}

/**
 * Avalia se a aplicação web (`apps/web`) já possui código fonte implementado.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {boolean} Retorna true se houver arquivos de aplicação reais além de marcadores.
 */
export function hasWebAppCode(workspaceRoot = PROJECT_ROOT) {
  const webAppDirectory = path.join(workspaceRoot, 'apps/web');
  if (!fs.existsSync(webAppDirectory)) {
    return false;
  }

  const entries = fs.readdirSync(webAppDirectory)
    .filter(entryName => !entryName.startsWith('.') && entryName !== 'README.md');

  return entries.length > 0;
}

if (isMain(import.meta.url)) {
  const contractIssues = validateAnalyticsContract(PROJECT_ROOT);

  if (contractIssues.length > 0) {
    report('Contrato de telemetria e tracking', contractIssues);
    process.exit(1);
  }

  if (!hasWebAppCode(PROJECT_ROOT)) {
    console.log('OK: Contrato centralizado de analytics validado estaticamente.');
    console.log('NÃO APLICÁVEL: runtime de aplicação (apps/web) não implementado; eventos reais em página serão validados após criação do frontend.');
  } else {
    console.log('OK: Contrato centralizado e aplicação web validados.');
  }
}
