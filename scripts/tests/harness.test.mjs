import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkStructure } from '../quality/check-structure.mjs';
import { checkMarkdownLinks } from '../quality/check-docs.mjs';
import { checkSensitiveFiles } from '../security/check-sensitive-files.mjs';
import { checkSecrets, scanText } from '../security/check-secrets.mjs';

function withTemp(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'f1atlas-check-'));
  try { return fn(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('QG-01: aponta documento obrigatório ausente', () => withTemp(root => {
  assert.ok(checkStructure(root).some(issue => issue.includes('README.md')));
}));

test('QG-02: aceita link local existente e bloqueia link quebrado', () => withTemp(root => {
  fs.writeFileSync(path.join(root, 'README.md'), '[ok](./there.md)\n[bad](./missing.md)');
  fs.writeFileSync(path.join(root, 'there.md'), '# There');
  const issues = checkMarkdownLinks(root, ['README.md', 'there.md']);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /missing\.md/);
}));

test('QG-02: bloqueia saída da raiz por link', () => withTemp(root => {
  fs.writeFileSync(path.join(root, 'README.md'), '[escape](../outside.md)');
  assert.equal(checkMarkdownLinks(root, ['README.md']).length, 1);
}));

test('QG-03: detecta .env e chaves privadas e permite exemplo', () => {
  const issues = checkSensitiveFiles(['.env.production', 'certificates/server.pem', '.env.example']);
  assert.equal(issues.length, 2);
});

test('QG-04: detecta token de alta confiança e não retorna seu conteúdo', () => {
  const synthetic = 'AKIA' + 'A'.repeat(16); // Falso; usado exclusivamente para testar o scanner.
  assert.deepEqual(scanText(synthetic), ['AWS access key ID']);
  assert.deepEqual(scanText('sem credenciais'), []);
  assert.ok(!scanText(synthetic).join(' ').includes(synthetic));
});

test('QG-04: relata o arquivo sem imprimir a credencial', () => withTemp(root => {
  const file = 'synthetic.txt';
  const synthetic = 'AKIA' + 'A'.repeat(16);
  fs.writeFileSync(path.join(root, file), synthetic);
  const issues = checkSecrets(root, [file]);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /synthetic\.txt/);
  assert.ok(!issues[0].includes(synthetic));
}));
