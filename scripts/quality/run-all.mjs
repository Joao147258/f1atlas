#!/usr/bin/env node
/**
 * @fileoverview Orquestrador Central de Quality Gates — F1Atlas
 *
 * Executa determinística e sequencialmente todos os verificadores públicos de governança,
 * segurança, integridade, arquitetura, analytics e SEO, finalizando com a suite de testes
 * automatizados do harness.
 *
 * Características de Observabilidade e Relatório:
 * 1. Captura stdout e stderr de cada verificador e exibe em tempo real no console.
 * 2. Classifica cada etapa conforme o contrato da SPEC-GOV-003: PASS, SKIP, FAIL ou ERROR.
 * 3. Imprime resumo consolidado tabular formatado com contagem exata por estado.
 * 4. Define exitCode = 1 se qualquer verificador obrigatório falhar, ou 0 se todos passarem.
 * 5. Registra aviso caso haja verificadores em estado SKIP (NÃO APLICÁVEL).
 *
 * @module scripts/quality/run-all
 */

import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT, STATUS, isMain } from '../lib/workspace.mjs';

/**
 * Relação dos passos de verificação de qualidade executados pelo orquestrador.
 * @type {ReadonlyArray<{ name: string, script: string }>}
 */
export const QUALITY_GATE_STEPS = Object.freeze([
  { name: 'Integridade da fundação', script: 'scripts/quality/verify-integrity.mjs' },
  { name: 'Arquivos sensíveis', script: 'scripts/security/check-sensitive-files.mjs' },
  { name: 'Scanner de segredos', script: 'scripts/security/check-secrets.mjs' },
  { name: 'Links simbólicos', script: 'scripts/security/check-symlinks.mjs' },
  { name: 'Escopo de publicação', script: 'scripts/security/verify-publication-scope.mjs' },
  { name: 'Variáveis de ambiente', script: 'scripts/security/validate-env.mjs' },
  { name: 'Dependências', script: 'scripts/security/verify-dependencies.mjs' },
  { name: 'Limites arquiteturais', script: 'scripts/architecture/verify-boundaries.mjs' },
  { name: 'Catálogo de analytics', script: 'scripts/analytics/validate-events.mjs' },
  { name: 'Contrato SEO de páginas', script: 'scripts/seo/validate-metadata.mjs' }
]);

/**
 * Executa todos os quality gates configurados e os testes do harness.
 *
 * @param {Object} [options={}] - Opções de execução.
 * @param {string} [options.workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @param {Array<{ name: string, script: string }>} [options.steps=QUALITY_GATE_STEPS] - Etapas a executar.
 * @returns {{ results: Array<{ name: string, script: string, status: STATUS }>, hasFailure: boolean }}
 * Retorna o histórico de execuções e se houve falha impeditiva.
 */
export function runQualityGates({
  workspaceRoot = PROJECT_ROOT,
  steps = QUALITY_GATE_STEPS
} = {}) {
  const executionResults = [];
  let hasFailure = false;

  for (const step of steps) {
    console.log(`\n>>> ${step.script}`);
    const processResult = spawnSync(process.execPath, [step.script], {
      cwd: workspaceRoot,
      encoding: 'utf8'
    });

    if (processResult.stdout) process.stdout.write(processResult.stdout);
    if (processResult.stderr) process.stderr.write(processResult.stderr);

    let stepState = STATUS.PASS;
    if (processResult.status === 2 || processResult.error) {
      stepState = STATUS.ERROR;
      hasFailure = true;
    } else if (processResult.status !== 0) {
      stepState = STATUS.FAIL;
      hasFailure = true;
    } else if (processResult.stdout && processResult.stdout.includes('NÃO APLICÁVEL:')) {
      stepState = STATUS.SKIP;
    }

    executionResults.push({
      name: step.name,
      script: step.script,
      status: stepState
    });
  }

  // Execução da suite de testes automatizados do harness
  console.log('\n>>> Testes do harness');
  const testExecution = spawnSync(process.execPath, ['--test', 'scripts/tests/*.test.mjs'], {
    cwd: workspaceRoot,
    stdio: 'inherit'
  });

  const testStatus = (testExecution.status === 0) ? STATUS.PASS : STATUS.FAIL;
  if (testStatus === STATUS.FAIL) {
    hasFailure = true;
  }

  executionResults.push({
    name: 'Testes automatizados do harness',
    script: 'scripts/tests/*.test.mjs',
    status: testStatus
  });

  return { results: executionResults, hasFailure };
}

/**
 * Formata e imprime a tabela de resumo consolidado de execução dos Quality Gates.
 *
 * @param {Array<{ name: string, script: string, status: STATUS }>} results - Resultados de cada gate.
 * @param {boolean} hasFailure - Se houve alguma reprovação.
 */
export function printConsolidatedSummary(results, hasFailure) {
  const separator = '='.repeat(68);

  console.log(`\n${separator}`);
  console.log('Quality Gates — Resumo de Execução');
  console.log(separator);

  for (const [index, gateResult] of results.entries()) {
    const itemNumber = String(index + 1).padStart(2, '0');
    const paddedName = gateResult.name.padEnd(36, '.');
    console.log(`${itemNumber}. ${paddedName} [${gateResult.status}]`);
  }

  const passCount = results.filter(r => r.status === STATUS.PASS).length;
  const skipCount = results.filter(r => r.status === STATUS.SKIP).length;
  const failCount = results.filter(r => r.status === STATUS.FAIL).length;
  const errorCount = results.filter(r => r.status === STATUS.ERROR).length;

  console.log(separator);
  console.log(`Total: ${results.length} | PASS: ${passCount} | SKIP: ${skipCount} | FAIL: ${failCount} | ERROR: ${errorCount}`);
  console.log(separator);

  if (hasFailure) {
    console.error('\nFALHA: um ou mais quality gates foram reprovados.');
    process.exitCode = 1;
  } else {
    console.log('\nOK: todos os quality gates aplicáveis passaram com sucesso.');
    if (skipCount > 0) {
      console.log(`AVISO: ${skipCount} gate(s) estão em SKIP (NÃO APLICÁVEL) e não constituem aprovação de funcionalidade.`);
    }
    process.exitCode = 0;
  }
}

if (isMain(import.meta.url)) {
  const { results, hasFailure } = runQualityGates();
  printConsolidatedSummary(results, hasFailure);
}
