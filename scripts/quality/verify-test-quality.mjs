#!/usr/bin/env node
/**
 * @fileoverview Verificador de Integridade e Qualidade dos Testes — F1Atlas
 *
 * Analisa os arquivos de teste automatizados para verificar:
 * 1. Descoberta de suítes e arquivos de teste válidos.
 * 2. Suítes vazias ou sem testes executáveis declarados.
 * 3. Testes ignorados (`.skip`) ou pendentes (`.todo`) sem justificativa formal.
 * 4. Testes superficiais ou sem asserções (`assert.` / `expect(`).
 * 5. Supressão indevida de falhas (blocos catch vazios que mascaram asserções).
 *
 * @module scripts/quality/verify-test-quality
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, STATUS, isMain, report } from '../lib/workspace.mjs';

/**
 * Padrões de arquivos de teste suportados no repositório.
 * @type {RegExp}
 */
const TEST_FILE_REGEX = /\.(?:test|spec)\.(?:ts|mjs|js)$/;

/**
 * Padrões de asserção legítimos aceitos nos testes.
 * @type {RegExp}
 */
const ASSERTION_REGEX = /(?:assert\s*\.\s*(?:equal|strictEqual|deepEqual|ok|throws|rejects|match)|expect\s*\()/;

/**
 * Padrão para detecção de testes ignorados ou incompletos.
 * @type {RegExp}
 */
const SKIPPED_TEST_REGEX = /\b(?:test|it|describe)\s*\.\s*(?:skip|todo)\s*\(/;

/**
 * Padrão para detecção de captura vazia de exceções que pode mascarar asserções.
 * @type {RegExp}
 */
const EMPTY_CATCH_REGEX = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/;

/**
 * Coleta recursivamente todos os arquivos de teste do diretório informado.
 *
 * @param {string} directoryPath - Diretório a ser pesquisado.
 * @returns {string[]} Lista de caminhos absolutos dos arquivos de teste.
 */
export function findTestFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const collected = [];
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', '.local'].includes(entry.name)) {
        continue;
      }
      collected.push(...findTestFiles(fullPath));
    } else if (entry.isFile() && TEST_FILE_REGEX.test(entry.name)) {
      collected.push(fullPath);
    }
  }

  return collected;
}

/**
 * Inspeciona o conteúdo de um arquivo de teste e identifica problemas de qualidade.
 *
 * @param {string} filePath - Caminho do arquivo de teste.
 * @param {string} content - Conteúdo textual do arquivo.
 * @returns {string[]} Lista de problemas detectados no arquivo.
 */
export function auditTestContent(filePath, content) {
  const issues = [];
  const relativePath = path.relative(PROJECT_ROOT, filePath);

  // 1. Arquivo vazio
  if (content.trim().length === 0) {
    issues.push(`${relativePath}: arquivo de teste vazio`);
    return issues;
  }

  // 2. Ausência de blocos de teste (it/test)
  const hasTestBlocks = /\b(?:test|it)(?:\.(?:skip|todo|only))?\s*\(/.test(content);
  if (!hasTestBlocks) {
    issues.push(`${relativePath}: nenhum bloco de teste ('test' ou 'it') declarado`);
    return issues;
  }

  // 3. Ausência de asserções detectáveis
  if (!ASSERTION_REGEX.test(content)) {
    issues.push(`${relativePath}: nenhuma asserção explícita ('assert.*' ou 'expect(') detectada`);
  }

  // 4. Testes marcados com .skip ou .todo sem comentário de justificativa
  if (SKIPPED_TEST_REGEX.test(content)) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (SKIPPED_TEST_REGEX.test(lines[i])) {
        // Verifica se há justificativa na linha ou na linha imediatamente anterior
        const prevLine = i > 0 ? lines[i - 1] : '';
        const hasJustification = lines[i].includes('//') || prevLine.includes('//');
        if (!hasJustification) {
          issues.push(`${relativePath}:${i + 1}: teste desabilitado (.skip ou .todo) sem justificativa`);
        }
      }
    }
  }

  // 5. Blocos catch vazios que podem mascarar erros
  if (EMPTY_CATCH_REGEX.test(content)) {
    issues.push(`${relativePath}: bloco 'catch {}' vazio detectado — risco de mascaramento de falhas`);
  }

  return issues;
}

/**
 * Executa a auditoria de integridade e qualidade em todos os testes do workspace.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Raiz do projeto.
 * @returns {{ issues: string[], status: STATUS, totalFiles: number }} Resultado da auditoria.
 */
export function runTestQualityAudit(workspaceRoot = PROJECT_ROOT) {
  const targetDirectories = [
    path.join(workspaceRoot, 'packages/domain/test'),
    path.join(workspaceRoot, 'scripts/tests'),
    path.join(workspaceRoot, 'apps/api/test')
  ];

  const testFiles = [];
  for (const dir of targetDirectories) {
    testFiles.push(...findTestFiles(dir));
  }

  const allIssues = [];

  for (const file of testFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileIssues = auditTestContent(file, content);
      allIssues.push(...fileIssues);
    } catch (error) {
      allIssues.push(`${path.relative(workspaceRoot, file)}: falha ao ler arquivo: ${error.message}`);
    }
  }

  const auditStatus = allIssues.length === 0 ? STATUS.PASS : STATUS.FAIL;
  return {
    issues: allIssues,
    status: auditStatus,
    totalFiles: testFiles.length
  };
}

if (isMain(import.meta.url)) {
  const result = runTestQualityAudit(PROJECT_ROOT);
  report('Integridade e qualidade das suítes de testes', result.issues);
  if (result.status === STATUS.PASS) {
    console.log(`OK: ${result.totalFiles} arquivo(s) de teste auditados com sucesso.`);
  }
}
