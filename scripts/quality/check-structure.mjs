#!/usr/bin/env node
/**
 * @fileoverview Verificador da Estrutura Obrigatória da Fundação — F1Atlas
 *
 * Valida a presença física de todos os arquivos canônicos mandatórios exigidos
 * para a integridade da fundação de governança do F1Atlas (v0.2.0):
 * - Documentos de raiz (README, ARCHITECTURE, DESIGN, AGENTS, etc.)
 * - Configurações públicas (.gitignore, .env.example, package.json, etc.)
 * - Políticas e especificações de produto, arquitetura e engenharia
 * - Templates de governança para agentes e skills
 * - Scripts canônicos de segurança, qualidade e testes automatizados
 *
 * @module scripts/quality/check-structure
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

/**
 * Relação exaustiva dos arquivos que compõem a fundação mínima obrigatória do projeto.
 * @type {ReadonlyArray<string>}
 */
export const REQUIRED_FILES = Object.freeze([
  // 1. Documentos normativos e de visão na raiz
  'README.md',
  'ARCHITECTURE.md',
  'DESIGN.md',
  'AGENTS.md',
  'GEMINI.example.md',
  '.gitignore',
  '.geminiignore',
  '.gemini/settings.example.json',
  '.env.example',
  'package.json',

  // 2. Documentação de produto
  'docs/product/vision.md',
  'docs/product/roadmap.md',

  // 3. Documentação de arquitetura
  'docs/architecture/domain-model.md',
  'docs/architecture/module-boundaries.md',
  'docs/architecture/data-flow.md',
  'docs/architecture/integration-strategy.md',
  'docs/architecture/adr/README.md',

  // 4. Políticas normativas de desenvolvimento e governança
  'docs/development/README.md',
  'docs/development/agent-governance.md',
  'docs/development/skill-governance.md',
  'docs/development/script-governance.md',
  'docs/development/documentation-standard.md',
  'docs/development/security-governance.md',
  'docs/development/technology-governance.md',
  'docs/development/quality-gates.md',
  'docs/development/specification-standard.md',
  'docs/development/git-workflow.md',

  // 5. Especificações formais (SPECs)
  'docs/specs/README.md',
  'docs/specs/product/SPEC-PROD-001.md',
  'docs/specs/domain/SPEC-DOM-001.md',
  'docs/specs/governance/SPEC-GOV-001.md',
  'docs/specs/governance/SPEC-GOV-002.md',
  'docs/specs/governance/SPEC-GOV-003.md',
  'docs/specs/governance/SPEC-GOV-004.md',
  'docs/specs/governance/SPEC-GOV-005.md',

  // 6. Templates reutilizáveis
  '.agents/templates/agent.template.md',
  '.agents/templates/skill.template.md',

  // 7. Scripts canônicos de governança e testes
  'scripts/quality/check-agent-contracts.mjs',
  'scripts/documentation/validate-specs.mjs',
  'scripts/quality/run-all.mjs',
  'scripts/security/check-secrets.mjs',
  'scripts/security/check-sensitive-files.mjs',
  'scripts/security/verify-publication-scope.mjs',
  'scripts/tests/harness.test.mjs'
]);

/**
 * Inspeciona o workspace para identificar se algum dos arquivos obrigatórios está ausente.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {string[]} Lista de mensagens de arquivos ausentes.
 */
export function checkStructure(workspaceRoot = PROJECT_ROOT) {
  const missingFiles = [];

  for (const requiredFile of REQUIRED_FILES) {
    const absolutePath = path.join(workspaceRoot, requiredFile);
    if (!fs.existsSync(absolutePath)) {
      missingFiles.push(`Arquivo obrigatório ausente: ${requiredFile}`);
    }
  }

  return missingFiles;
}

if (isMain(import.meta.url)) {
  const issues = checkStructure(PROJECT_ROOT);
  report('Estrutura da fundação', issues);
}
