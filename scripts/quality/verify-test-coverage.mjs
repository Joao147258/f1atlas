#!/usr/bin/env node
/**
 * @fileoverview Verificador de Cobertura de Código de Testes — F1Atlas
 *
 * Executa os testes automatizados da camada Domain com medição nativa de cobertura
 * de código do Node.js (`--experimental-test-coverage`), extraindo e validando
 * métricas de linhas, branches e funções contra thresholds normativos mínimos.
 *
 * Thresholds para Código Novo do Domínio:
 * - Linhas: >= 90%
 * - Branches: >= 85%
 * - Funções: >= 90%
 *
 * @module scripts/quality/verify-test-coverage
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { PROJECT_ROOT, STATUS, isMain, report } from '../lib/workspace.mjs';

/**
 * Thresholds mínimos de cobertura exigidos para código novo do domínio.
 */
export const DEFAULT_THRESHOLDS = Object.freeze({
  lines: 90.0,
  branches: 85.0,
  functions: 90.0
});

/**
 * Analisa a saída tabular do relatório de cobertura do Node.js e extrai métricas.
 *
 * @param {string} coverageOutput - Saída textual emitida pelo Node.js.
 * @param {Object} [thresholds=DEFAULT_THRESHOLDS] - Thresholds mínimos aceitáveis.
 * @returns {{ files: Array<{ name: string, lines: number, branches: number, functions: number, uncovered: string }>, summary: { lines: number, branches: number, functions: number } | null, violations: string[] }}
 */
export function parseAndValidateCoverage(coverageOutput, thresholds = DEFAULT_THRESHOLDS) {
  const violations = [];
  const files = [];
  let summary = null;

  const lines = coverageOutput.split('\n');
  let inCoverageReport = false;

  for (const line of lines) {
    if (line.includes('start of coverage report')) {
      inCoverageReport = true;
      continue;
    }
    if (line.includes('end of coverage report')) {
      inCoverageReport = false;
      continue;
    }

    if (!inCoverageReport) continue;

    // Linha de arquivo ou 'all files':
    // Formato: ℹ <nome> | <line %> | <branch %> | <funcs %> | <uncovered lines>
    const match = line.match(/ℹ\s+([\w./-]+(?:\.ts|\.js|\.mjs)|all files)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)(?:\s*\|\s*([0-9\s-]*))?/);
    if (match) {
      const fileName = match[1].trim();
      const linePct = parseFloat(match[2]);
      const branchPct = parseFloat(match[3]);
      const funcsPct = parseFloat(match[4]);
      const uncovered = (match[5] || '').trim();

      const entry = {
        name: fileName,
        lines: linePct,
        branches: branchPct,
        functions: funcsPct,
        uncovered
      };

      if (fileName === 'all files') {
        summary = entry;
      } else {
        files.push(entry);

        // Validação individual por arquivo de produção
        if (linePct < thresholds.lines) {
          violations.push(`${fileName}: cobertura de linhas (${linePct}%) abaixo do mínimo (${thresholds.lines}%)`);
        }
        if (branchPct < thresholds.branches) {
          violations.push(`${fileName}: cobertura de branches (${branchPct}%) abaixo do mínimo (${thresholds.branches}%)`);
        }
        if (funcsPct < thresholds.functions) {
          violations.push(`${fileName}: cobertura de funções (${funcsPct}%) abaixo do mínimo (${thresholds.functions}%)`);
        }
      }
    }
  }

  if (!summary && files.length === 0) {
    violations.push('Nenhum relatório de cobertura estruturado foi detectado na saída da execução.');
  }

  return { files, summary, violations };
}

/**
 * Executa a suite de testes da camada Domain com cobertura e validação de thresholds.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @param {Object} [thresholds=DEFAULT_THRESHOLDS] - Limites mínimos.
 * @returns {{ violations: string[], status: STATUS, summary: Object | null }}
 */
export function runTestCoverage(workspaceRoot = PROJECT_ROOT, thresholds = DEFAULT_THRESHOLDS) {
  const testPattern = 'packages/domain/test/**/*.test.ts';

  const execution = spawnSync(
    process.execPath,
    ['--experimental-test-coverage', '--test', testPattern],
    {
      cwd: workspaceRoot,
      encoding: 'utf8'
    }
  );

  const rawOutput = (execution.stdout || '') + '\n' + (execution.stderr || '');

  if (execution.status !== 0 && !rawOutput.includes('start of coverage report')) {
    return {
      violations: [`Falha na execução do test runner de cobertura: ${execution.stderr || execution.stdout}`],
      status: STATUS.FAIL,
      summary: null
    };
  }

  const { files, summary, violations } = parseAndValidateCoverage(rawOutput, thresholds);

  if (execution.status !== 0) {
    violations.unshift('Um ou mais testes unitários falharam durante a execução de cobertura.');
  }

  const finalStatus = violations.length === 0 ? STATUS.PASS : STATUS.FAIL;

  return {
    violations,
    status: finalStatus,
    summary,
    files
  };
}

if (isMain(import.meta.url)) {
  const result = runTestCoverage(PROJECT_ROOT);
  report('Cobertura de testes automatizados do Domínio', result.violations);

  if (result.summary) {
    console.log(`\nResumo de Cobertura Consolidada:`);
    console.log(`- Linhas:    ${result.summary.lines}% (alvo: >= ${DEFAULT_THRESHOLDS.lines}%)`);
    console.log(`- Branches:  ${result.summary.branches}% (alvo: >= ${DEFAULT_THRESHOLDS.branches}%)`);
    console.log(`- Funções:   ${result.summary.functions}% (alvo: >= ${DEFAULT_THRESHOLDS.functions}%)`);
  }
}
