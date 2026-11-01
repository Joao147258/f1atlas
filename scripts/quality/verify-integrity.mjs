#!/usr/bin/env node
/**
 * @fileoverview Orquestrador de Integridade Documental e Governança — F1Atlas
 *
 * Executa em sequência a validação dos cinco pilares fundamentais da integridade do harness:
 * 1. Estrutura de arquivos obrigatórios da fundação (`check-structure.mjs`).
 * 2. Contratos e integridade dos agentes e skills (`check-agent-contracts.mjs`).
 * 3. Validação formal das especificações técnicas (`validate-specs.mjs`).
 * 4. Validação de importações de contexto do Gemini (`validate-references.mjs`).
 * 5. Integridade de links locais em documentos Markdown (`check-docs.mjs`).
 *
 * @module scripts/quality/verify-integrity
 */

import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT } from '../lib/workspace.mjs';

/**
 * Lista de scripts de validação de integridade executados sequencialmente.
 * @type {ReadonlyArray<string>}
 */
const INTEGRITY_STEPS = Object.freeze([
  'scripts/quality/check-structure.mjs',
  'scripts/quality/check-agent-contracts.mjs',
  'scripts/documentation/validate-specs.mjs',
  'scripts/documentation/validate-references.mjs',
  'scripts/quality/check-docs.mjs'
]);

let hasIntegrityFailure = false;

for (const scriptPath of INTEGRITY_STEPS) {
  const execution = spawnSync(process.execPath, [scriptPath], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  });

  if (execution.status !== 0) {
    hasIntegrityFailure = true;
  }
}

if (hasIntegrityFailure) {
  process.exitCode = 1;
}
