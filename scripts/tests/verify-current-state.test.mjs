/**
 * @fileoverview Testes Automatizados para o Verificador da Documentação Arquitetural Viva
 *
 * Valida o comportamento e a capacidade de detecção de defeitos do verificador:
 * `scripts/architecture/verify-current-state.mjs`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { STATUS } from '../lib/workspace.mjs';
import {
  verifyCurrentStateDocumentation,
  CURRENT_STATE_DOC_PATH,
  REQUIRED_DOCUMENT_SECTIONS
} from '../architecture/verify-current-state.mjs';

test('verify-current-state — Validação no Workspace Canônico', () => {
  const result = verifyCurrentStateDocumentation();
  assert.equal(result.issues.length, 0);
  assert.equal(result.status, STATUS.PASS);
});

test('verify-current-state — Detecção de Defeitos e Inconsistências', async (t) => {
  await t.test('deve reprovar quando o arquivo current-state.md estiver ausente', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'f1atlas-arch-test-'));
    try {
      const result = verifyCurrentStateDocumentation(tempDir);
      assert.ok(result.issues.length > 0);
      assert.match(result.issues[0], /Documento obrigatório não encontrado/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test('deve reprovar quando seções obrigatórias estiverem ausentes', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'f1atlas-arch-test-'));
    try {
      const docPath = path.join(tempDir, CURRENT_STATE_DOC_PATH);
      fs.mkdirSync(path.dirname(docPath), { recursive: true });
      // Conteúdo incompleto, sem seções obrigatórias
      fs.writeFileSync(docPath, '# Título qualquer sem seções normativas', 'utf8');

      const result = verifyCurrentStateDocumentation(tempDir);
      assert.ok(result.issues.length >= REQUIRED_DOCUMENT_SECTIONS.length);
      assert.match(result.issues[0], /seção obrigatória ausente/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test('deve reprovar quando uma aplicação em apps/ não estiver citada no documento', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'f1atlas-arch-test-'));
    try {
      const docPath = path.join(tempDir, CURRENT_STATE_DOC_PATH);
      fs.mkdirSync(path.dirname(docPath), { recursive: true });

      // Cria conteúdo com as seções obrigatórias, mas omitindo apps/nova-app
      const baseContent = REQUIRED_DOCUMENT_SECTIONS.join('\n\n') + '\n\napps/api\npackages/domain\n';
      fs.writeFileSync(docPath, baseContent, 'utf8');

      // Cria a aplicação no disco
      fs.mkdirSync(path.join(tempDir, 'apps/nova-app'), { recursive: true });

      const result = verifyCurrentStateDocumentation(tempDir);
      assert.ok(result.issues.some(issue => issue.includes('aplicação existente "apps/nova-app" não está citada')));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test('deve reprovar quando um módulo conceitual do domínio for omitido', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'f1atlas-arch-test-'));
    try {
      const docPath = path.join(tempDir, CURRENT_STATE_DOC_PATH);
      fs.mkdirSync(path.dirname(docPath), { recursive: true });

      // Omitindo deliberadamente o módulo 'simulations'
      const baseContent = REQUIRED_DOCUMENT_SECTIONS.join('\n\n') + '\n\napps/api\npackages/domain\n`shared` `seasons` `participants` `events` `scoring` `championships`\n';
      fs.writeFileSync(docPath, baseContent, 'utf8');

      const result = verifyCurrentStateDocumentation(tempDir);
      assert.ok(result.issues.some(issue => issue.includes('módulo de domínio "simulations" não está mapeado')));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
