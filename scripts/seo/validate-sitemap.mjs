#!/usr/bin/env node
/**
 * @fileoverview Validador de Estrutura de Sitemap XML — F1Atlas
 *
 * Avalia a conformidade do arquivo `sitemap.xml` da aplicação web (`apps/web/public/sitemap.xml`).
 *
 * No estágio Foundation v0.2, na ausência do arquivo compilado ou gerado estaticamente,
 * relata como NÃO APLICÁVEL (SKIP), registrando que o sitemap dinâmico será verificado
 * após a implementação do Next.js.
 *
 * @module scripts/seo/validate-sitemap
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

/**
 * Valida o conteúdo bruto de um arquivo sitemap.xml contra requisitos mínimos de conformidade.
 *
 * @param {string} xmlContent - Conteúdo em texto do XML de sitemap.
 * @returns {string[]} Lista de problemas identificados.
 */
export function validateSitemapContent(xmlContent) {
  const issues = [];

  const hasOpeningTag = xmlContent.includes('<urlset');
  const hasClosingTag = xmlContent.includes('</urlset>');
  const hasValidLocation = /<loc>https?:\/\//i.test(xmlContent);

  if (!hasOpeningTag || !hasClosingTag || !hasValidLocation) {
    issues.push('Sitemap estático sem estrutura esperada; requer tags <urlset> e URLs <loc> válidas.');
  }

  return issues;
}

if (isMain(import.meta.url)) {
  const sitemapPath = path.join(PROJECT_ROOT, 'apps/web/public/sitemap.xml');

  if (!fs.existsSync(sitemapPath)) {
    console.log('NÃO APLICÁVEL: sitemap.xml inexistente; verificar rota dinâmica quando Next.js for implementado.');
  } else {
    const xmlContent = fs.readFileSync(sitemapPath, 'utf8');
    const issues = validateSitemapContent(xmlContent);
    report('Sitemap estático (validação superficial)', issues);
  }
}
