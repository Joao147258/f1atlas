#!/usr/bin/env node
/**
 * @fileoverview Verificador de Eficácia de Testes — Mutation Testing — F1Atlas
 *
 * Avalia a capacidade da suíte de testes de detectar defeitos intencionais introduzidos
 * no código de produção da camada Domain (Mutation Testing).
 *
 * Aplica mutadores semânticos controlados em memória e execução isolada:
 * 1. Inversão de operadores condicionais e lógicos.
 * 2. Modificação de retornos e predicados de tipo.
 * 3. Remoção de salvaguardas de imutabilidade (Object.freeze).
 * 4. Alteração de argumentos e cópias defensivas.
 *
 * Threshold Mínimo de Aprovação:
 * - Mutation Score >= 80% para componentes do Domínio.
 *
 * @module scripts/quality/verify-mutation-quality
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT, STATUS, isMain, report } from '../lib/workspace.mjs';

/**
 * Limite mínimo de pontuação de mutação exigido para código crítico.
 * @type {number}
 */
export const DEFAULT_MUTATION_THRESHOLD = 80.0;

/**
 * Catálogo de mutações semânticas controladas para o componente piloto DomainError.
 * Cada mutante possui uma descrição, trecho original (target) e substituição (replacement).
 */
export const DOMAIN_ERROR_MUTANTS = Object.freeze([
  {
    id: 'MUT_01_TYPE_GUARD_INSTANCEOF',
    description: 'Inversão do retorno de instanceof no type guard isDomainError',
    target: 'if (error instanceof DomainError) {\n    return true;\n  }',
    replacement: 'if (error instanceof DomainError) {\n    return false;\n  }'
  },
  {
    id: 'MUT_02_NAME_SUFFIX_CHECK',
    description: 'Alteração de endsWith("Error") para startsWith("Error")',
    target: "candidate.name.endsWith('Error')",
    replacement: "candidate.name.startsWith('Error')"
  },
  {
    id: 'MUT_03_IMMUTABILITY_INSTANCE',
    description: 'Remoção do congelamento de instância (Object.freeze(this))',
    target: 'Object.freeze(this);',
    replacement: '/* Object.freeze(this); */'
  },
  {
    id: 'MUT_04_CONTEXT_SHALLOW_COPY',
    description: 'Remoção da cópia defensiva do contexto (não isola objeto original)',
    target: 'this.context = context ? Object.freeze({ ...context }) : undefined;',
    replacement: 'this.context = context ? Object.freeze(context as any) : undefined;'
  },
  {
    id: 'MUT_05_FACTORY_MESSAGE_CORRUPTION',
    description: 'Corrupção de mensagem retornada pela factory createDomainError',
    target: 'return new DomainError(code, message, context);',
    replacement: "return new DomainError(code, 'MENSAGEM_MUTADA_CORROMPIDA', context);"
  },
  {
    id: 'MUT_06_CODE_TYPE_CHECK',
    description: 'Inversão da verificação de tipo de candidate.code',
    target: "typeof candidate.code === 'string'",
    replacement: "typeof candidate.code !== 'string'"
  },
  {
    id: 'MUT_07_NAME_PRESERVATION',
    description: 'Forçamento de nome estático genérico em vez do nome da subclasse',
    target: "this.name = new.target.name || 'DomainError';",
    replacement: "this.name = 'GenericStaticError';"
  }
]);

/**
 * Executa um ciclo de teste de mutação aplicando mutantes sobre um arquivo alvo.
 *
 * @param {Object} options - Configurações da execução.
 * @param {string} options.targetFile - Caminho absoluto do arquivo de produção.
 * @param {string} options.testCommand - Argumentos para executar o teste do componente.
 * @param {Array<Object>} options.mutants - Lista de mutações a serem avaliadas.
 * @param {number} [options.threshold=DEFAULT_MUTATION_THRESHOLD] - Score mínimo.
 * @param {string} [options.workspaceRoot=PROJECT_ROOT] - Raiz do projeto.
 * @returns {{ score: number, killed: number, survived: number, total: number, violations: string[], details: Array<Object> }}
 */
export function runMutationTesting({
  targetFile,
  testCommand,
  mutants,
  threshold = DEFAULT_MUTATION_THRESHOLD,
  workspaceRoot = PROJECT_ROOT
}) {
  if (!fs.existsSync(targetFile)) {
    return {
      score: 0,
      killed: 0,
      survived: 0,
      total: 0,
      violations: [`Arquivo alvo de mutação não encontrado: ${targetFile}`],
      details: []
    };
  }

  const originalContent = fs.readFileSync(targetFile, 'utf8');
  const details = [];
  let killedCount = 0;
  let survivedCount = 0;

  for (const mutant of mutants) {
    if (!originalContent.includes(mutant.target)) {
      details.push({
        id: mutant.id,
        description: mutant.description,
        status: 'SKIPPED',
        reason: 'Trecho alvo do mutante não localizado no código atual'
      });
      continue;
    }

    const mutatedContent = originalContent.replace(mutant.target, mutant.replacement);

    try {
      // Aplica a mutação temporária
      fs.writeFileSync(targetFile, mutatedContent, 'utf8');

      // Sanitiza o ambiente para evitar que execuções aninhadas no node:test sejam ignoradas
      const cleanEnv = { ...process.env };
      delete cleanEnv.NODE_TEST_CONTEXT;
      delete cleanEnv.NODE_TEST_WORKER_ID;

      // Executa o teste contra o código mutado
      const testRun = spawnSync(
        process.execPath,
        testCommand,
        {
          cwd: workspaceRoot,
          encoding: 'utf8',
          stdio: 'pipe',
          env: cleanEnv
        }
      );

      // Se o teste FALHAR, o mutante foi MORTO (Detectado com sucesso)
      if (testRun.status !== 0) {
        killedCount++;
        details.push({
          id: mutant.id,
          description: mutant.description,
          status: 'KILLED'
        });
      } else {
        // Se o teste PASSAR, o mutante SOBREVIVEU (Falha de cobertura da suite)
        survivedCount++;
        details.push({
          id: mutant.id,
          description: mutant.description,
          status: 'SURVIVED'
        });
      }
    } finally {
      // Restaura incondicionalmente o arquivo de produção original
      fs.writeFileSync(targetFile, originalContent, 'utf8');
    }
  }

  const evaluatedTotal = killedCount + survivedCount;
  const score = evaluatedTotal > 0 ? (killedCount / evaluatedTotal) * 100 : 0;
  const violations = [];

  if (score < threshold) {
    violations.push(
      `Mutation score (${score.toFixed(1)}%) abaixo do threshold mínimo exigido (${threshold}%). ${survivedCount} mutante(s) sobreviveram.`
    );
  }

  if (survivedCount > 0) {
    for (const item of details.filter(d => d.status === 'SURVIVED')) {
      violations.push(`Mutante SOBREVIVEU [${item.id}]: ${item.description}`);
    }
  }

  return {
    score,
    killed: killedCount,
    survived: survivedCount,
    total: evaluatedTotal,
    violations,
    details
  };
}

if (isMain(import.meta.url)) {
  const targetFile = path.join(PROJECT_ROOT, 'packages/domain/src/shared/domain-error.ts');
  const testCommand = ['--test', 'packages/domain/test/shared/domain-error.test.ts'];

  const result = runMutationTesting({
    targetFile,
    testCommand,
    mutants: DOMAIN_ERROR_MUTANTS,
    threshold: DEFAULT_MUTATION_THRESHOLD,
    workspaceRoot: PROJECT_ROOT
  });

  report('Eficácia de detecção de defeitos (Mutation Testing)', result.violations);

  console.log(`\nResumo da Análise de Mutação:`);
  console.log(`- Total de mutantes avaliados: ${result.total}`);
  console.log(`- Mutantes eliminados (Killed): ${result.killed}`);
  console.log(`- Mutantes sobreviventes:       ${result.survived}`);
  console.log(`- Mutation Score:               ${result.score.toFixed(1)}% (alvo: >= ${DEFAULT_MUTATION_THRESHOLD}%)`);

  for (const item of result.details) {
    const symbol = item.status === 'KILLED' ? '✔' : '✖';
    console.log(`  ${symbol} [${item.status}] ${item.id}: ${item.description}`);
  }
}
