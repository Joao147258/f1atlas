#!/usr/bin/env node
/**
 * @fileoverview Validador de Conformidade de Especificações Técnicas (SPECs) — F1Atlas
 *
 * Inspeciona recursivamente o diretório `docs/specs/` para validar a conformidade de cada
 * especificação formal (`SPEC-*.md`) com a SPEC-GOV-005 e o padrão normativo de especificações:
 * 1. Nomenclatura: O cabeçalho de primeiro nível (`# SPEC-XXX — ...`) deve coincidir com o nome do arquivo.
 * 2. Estado de Ciclo de Vida: Deve declarar um estado válido (`proposed`, `approved`, `implemented`, `deprecated`).
 * 3. Seções Mandatórias: Deve conter todas as 5 seções canônicas de engenharia.
 *
 * @module scripts/documentation/validate-specs
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

/**
 * Estados formais de ciclo de vida aceitos para uma especificação.
 * @type {ReadonlySet<string>}
 */
const VALID_SPEC_STATES = new Set([
  'proposed',
  'approved',
  'implemented',
  'deprecated'
]);

/**
 * Seções estruturais obrigatórias em toda especificação técnica do projeto.
 * @type {ReadonlyArray<string>}
 */
const MANDATORY_SPEC_SECTIONS = Object.freeze([
  '## Motivação',
  '## Escopo e regras',
  '## Critérios de aceitação',
  '## Falhas, dependências e riscos',
  '## Evidências requeridas'
]);

/**
 * Expressão regular para extração do campo de estado na especificação.
 * @type {RegExp}
 */
const SPEC_STATE_REGEX = /\*\*Estado:\*\*\s*([a-z]+)/;

/**
 * Varre recursivamente um diretório para encontrar todos os arquivos SPEC-*.md.
 *
 * @param {string} directoryPath - Diretório a ser percorrido.
 * @returns {string[]} Lista de caminhos absolutos dos arquivos de especificação.
 */
function findSpecFiles(directoryPath) {
  const specFiles = [];

  if (!fs.existsSync(directoryPath)) {
    return specFiles;
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      specFiles.push(...findSpecFiles(fullPath));
    } else if (entry.isFile() && entry.name.startsWith('SPEC-') && entry.name.endsWith('.md')) {
      specFiles.push(fullPath);
    }
  }

  return specFiles;
}

/**
 * Valida a conformidade de todas as especificações técnicas em `docs/specs/`.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {string[]} Lista de violações encontradas.
 */
export function validateSpecs(workspaceRoot = PROJECT_ROOT) {
  const specsBaseDirectory = path.join(workspaceRoot, 'docs/specs');
  const issues = [];

  if (!fs.existsSync(specsBaseDirectory)) {
    return ['Diretório de specs inexistente'];
  }

  const specFiles = findSpecFiles(specsBaseDirectory);
  for (const absoluteSpecPath of specFiles) {
    const fileName = path.basename(absoluteSpecPath);
    const specIdentifier = fileName.slice(0, -3); // Remove a extensão .md

    let rawContent;
    try {
      rawContent = fs.readFileSync(absoluteSpecPath, 'utf8');
    } catch (readError) {
      issues.push(`${specIdentifier}: falha ao ler arquivo (${readError.message})`);
      continue;
    }

    // 1. Validação de título e identificador
    const expectedTitlePrefix = `# ${specIdentifier} — `;
    if (!rawContent.startsWith(expectedTitlePrefix)) {
      issues.push(`${specIdentifier}: título não corresponde ao nome do arquivo`);
    }

    // 2. Validação de estado
    const stateMatch = rawContent.match(SPEC_STATE_REGEX);
    const declaredState = stateMatch ? stateMatch[1] : null;

    if (!declaredState || !VALID_SPEC_STATES.has(declaredState)) {
      issues.push(`${specIdentifier}: Estado inválido ou ausente`);
    }

    // 3. Validação das seções obrigatórias
    for (const mandatoryHeader of MANDATORY_SPEC_SECTIONS) {
      if (!rawContent.includes(mandatoryHeader)) {
        issues.push(`${specIdentifier}: seção ausente: ${mandatoryHeader}`);
      }
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  const issues = validateSpecs(PROJECT_ROOT);
  report('Contratos das SPECs', issues);
}
