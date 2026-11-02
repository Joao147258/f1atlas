/**
 * @fileoverview Testes Automatizados dos Scripts de Governança de Testes — F1Atlas
 *
 * Valida o comportamento mecânico e a capacidade de detecção de defeitos dos verificadores:
 * - `verify-test-quality.mjs`: detecção de testes vazios, superficiais, sem asserção,
 *   com supressão indevida ou com skips não documentados.
 * - `verify-test-coverage.mjs`: parsing estruturado da saída do Node.js e validação contra
 *   thresholds mínimos de linha, branch e funções.
 * - `verify-mutation-quality.mjs`: integridade do catálogo de mutantes e restauração de arquivos.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { auditTestContent } from '../quality/verify-test-quality.mjs';
import { parseAndValidateCoverage, DEFAULT_THRESHOLDS } from '../quality/verify-test-coverage.mjs';
import { DOMAIN_ERROR_MUTANTS } from '../quality/verify-mutation-quality.mjs';

test('Test Governance — verify-test-quality', async (t) => {
  await t.test('deve aprovar conteúdo de teste válido e com asserções explícitas', () => {
    const validTestContent = `
      import test from 'node:test';
      import assert from 'node:assert/strict';

      test('cenário positivo', () => {
        const resultado = 2 + 2;
        assert.equal(resultado, 4);
      });
    `;

    const issues = auditTestContent('/fake/path/test.test.ts', validTestContent);
    assert.equal(issues.length, 0);
  });

  await t.test('deve reprovar arquivo de teste vazio', () => {
    const emptyContent = '   \n  \t  \n';
    const issues = auditTestContent('/fake/path/empty.test.ts', emptyContent);
    assert.ok(issues.length > 0);
    assert.match(issues[0], /arquivo de teste vazio/);
  });

  await t.test('deve reprovar arquivo sem blocos de teste declarados', () => {
    const noBlocksContent = `
      const x = 10;
      console.log(x);
    `;
    const issues = auditTestContent('/fake/path/noblocks.test.ts', noBlocksContent);
    assert.ok(issues.length > 0);
    assert.match(issues[0], /nenhum bloco de teste/);
  });

  await t.test('deve reprovar suíte de teste sem asserções explícitas', () => {
    const noAssertionContent = `
      import test from 'node:test';

      test('teste superficial sem assert', () => {
        const x = 1 + 1;
        // nenhum assert chamado
      });
    `;
    const issues = auditTestContent('/fake/path/noassert.test.ts', noAssertionContent);
    assert.ok(issues.length > 0);
    assert.match(issues[0], /nenhuma asserção explícita/);
  });

  await t.test('deve reprovar teste com .skip sem justificativa em comentário', () => {
    // Monta fixture via concatenação para não acionar falso positivo no analisador estático do próprio arquivo
    const skippedWithoutJustification = [
      "import test from 'node:test';",
      "import assert from 'node:assert/strict';",
      "test" + ".skip('cenário pulado silenciosamente', () => {",
      "  assert.ok(true);",
      "});"
    ].join('\n');
    const issues = auditTestContent('/fake/path/skip.test.ts', skippedWithoutJustification);
    assert.ok(issues.length > 0);
    assert.match(issues[0], /teste desabilitado \(\.skip ou \.todo\) sem justificativa/);
  });

  await t.test('deve aceitar teste com .skip quando acompanhado de comentário de justificativa', () => {
    const skippedWithJustification = [
      "import test from 'node:test';",
      "import assert from 'node:assert/strict';",
      "// Aguardando implementação do provedor externo na milestone M2",
      "test" + ".skip('cenário pulado com justificativa', () => {",
      "  assert.ok(true);",
      "});"
    ].join('\n');
    const issues = auditTestContent('/fake/path/skip-ok.test.ts', skippedWithJustification);
    assert.equal(issues.length, 0);
  });

  await t.test('deve reprovar bloco catch vazio que mascara falhas', () => {
    const emptyCatchContent = [
      "import test from 'node:test';",
      "import assert from 'node:assert/strict';",
      "test('mascaramento de erro', () => {",
      "  try {",
      "    throw new Error('Falha simulada');",
      "  } catch " + "{}",
      "  assert.ok(true);",
      "});"
    ].join('\n');
    const issues = auditTestContent('/fake/path/catch.test.ts', emptyCatchContent);
    assert.ok(issues.length > 0);
    assert.match(issues[0], /bloco 'catch \{\}' vazio detectado/);
  });
});

test('Test Governance — verify-test-coverage', async (t) => {
  await t.test('deve aprovar relatório que atende todos os thresholds normativos', () => {
    const validReportOutput = `
      start of coverage report
      ℹ packages/domain/src/shared/domain-error.ts | 100.00 | 93.75 | 100.00 |
      ℹ all files                                  | 100.00 | 93.75 | 100.00 |
      end of coverage report
    `;

    const { violations, files, summary } = parseAndValidateCoverage(validReportOutput, DEFAULT_THRESHOLDS);
    assert.equal(violations.length, 0);
    assert.equal(files.length, 1);
    assert.equal(files[0].lines, 100.0);
    assert.equal(summary?.lines, 100.0);
  });

  await t.test('deve reprovar quando a cobertura de linhas estiver abaixo do mínimo', () => {
    const lowLinesReport = `
      start of coverage report
      ℹ packages/domain/src/shared/domain-error.ts | 85.50 | 90.00 | 95.00 | 10-15
      ℹ all files                                  | 85.50 | 90.00 | 95.00 |
      end of coverage report
    `;

    const { violations } = parseAndValidateCoverage(lowLinesReport, DEFAULT_THRESHOLDS);
    assert.ok(violations.length > 0);
    assert.match(violations[0], /cobertura de linhas \(85.5%\) abaixo do mínimo/);
  });

  await t.test('deve reprovar quando a cobertura de branches estiver abaixo do mínimo', () => {
    const lowBranchesReport = `
      start of coverage report
      ℹ packages/domain/src/shared/domain-error.ts | 95.00 | 80.00 | 95.00 |
      ℹ all files                                  | 95.00 | 80.00 | 95.00 |
      end of coverage report
    `;

    const { violations } = parseAndValidateCoverage(lowBranchesReport, DEFAULT_THRESHOLDS);
    assert.ok(violations.length > 0);
    assert.match(violations[0], /cobertura de branches \(80%\) abaixo do mínimo/);
  });

  await t.test('deve reprovar quando nenhum relatório estruturado for detectado', () => {
    const emptyOutput = 'Execução sem métricas emitidas\nTestes passaram com sucesso.';
    const { violations } = parseAndValidateCoverage(emptyOutput, DEFAULT_THRESHOLDS);
    assert.ok(violations.length > 0);
    assert.match(violations[0], /Nenhum relatório de cobertura estruturado/);
  });
});

test('Test Governance — verify-mutation-quality catalog', async (t) => {
  await t.test('catálogo de mutantes de DomainError deve conter mutantes válidos e imutáveis', () => {
    assert.ok(Array.isArray(DOMAIN_ERROR_MUTANTS));
    assert.ok(DOMAIN_ERROR_MUTANTS.length >= 5);
    assert.ok(Object.isFrozen(DOMAIN_ERROR_MUTANTS));

    for (const mutant of DOMAIN_ERROR_MUTANTS) {
      assert.ok(mutant.id && typeof mutant.id === 'string');
      assert.ok(mutant.description && typeof mutant.description === 'string');
      assert.ok(mutant.target && typeof mutant.target === 'string');
      assert.ok(mutant.replacement && typeof mutant.replacement === 'string');
      assert.notEqual(mutant.target, mutant.replacement);
    }
  });
});
