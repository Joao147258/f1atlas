import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseEnvText, validateEnvConfig, checkEnvFiles } from '../security/validate-env.mjs';

function withTempDir(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'f1atlas-env-test-'));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('env: configuração válida com analytics desabilitado passa sem erros', () => {
  const envContent = [
    'NODE_ENV=development',
    'PORT=3000',
    'NEXT_PUBLIC_GA_MEASUREMENT_ID=',
    'NEXT_PUBLIC_ANALYTICS_ENABLED=false'
  ].join('\n');

  const { entries, issues: parseIssues } = parseEnvText(envContent);
  assert.deepEqual(parseIssues, []);

  const validationIssues = validateEnvConfig(entries, { isExample: false });
  assert.deepEqual(validationIssues, []);
});

test('env: configuração válida com analytics habilitado e ID correto passa', () => {
  const envContent = [
    'NODE_ENV=production',
    'PORT=8080',
    'NEXT_PUBLIC_GA_MEASUREMENT_ID=G-ABC1234567',
    'NEXT_PUBLIC_ANALYTICS_ENABLED=true'
  ].join('\n');

  const { entries, issues: parseIssues } = parseEnvText(envContent);
  assert.deepEqual(parseIssues, []);

  const validationIssues = validateEnvConfig(entries, { isExample: false });
  assert.deepEqual(validationIssues, []);
});

test('env: analytics habilitado sem measurement ID provoca falha', () => {
  const envContent = [
    'NEXT_PUBLIC_GA_MEASUREMENT_ID=',
    'NEXT_PUBLIC_ANALYTICS_ENABLED=true'
  ].join('\n');

  const { entries } = parseEnvText(envContent);
  const issues = validateEnvConfig(entries, { isExample: false });
  assert.ok(issues.some(i => i.includes('NEXT_PUBLIC_GA_MEASUREMENT_ID não foi informado')));
});

test('env: measurement ID com formato inválido provoca falha', () => {
  const invalidIds = ['UA-123456-1', 'G-12', '12345678', 'G-INVALID!CHARS'];
  for (const id of invalidIds) {
    const envContent = [
      `NEXT_PUBLIC_GA_MEASUREMENT_ID=${id}`,
      'NEXT_PUBLIC_ANALYTICS_ENABLED=true'
    ].join('\n');

    const { entries } = parseEnvText(envContent);
    const issues = validateEnvConfig(entries, { isExample: false });
    assert.ok(issues.some(i => i.includes('formato inválido')), `Deveria reprovar ID: ${id}`);
  }
});

test('env: chaves duplicadas são detectadas e reprovadas', () => {
  const envContent = [
    'PORT=3000',
    'NODE_ENV=development',
    'PORT=4000'
  ].join('\n');

  const { issues } = parseEnvText(envContent);
  assert.ok(issues.some(i => i.includes('chave duplicada detectada: "PORT"')));
});

test('env: tentativa de expor credencial com prefixo NEXT_PUBLIC_ é bloqueada', () => {
  const forbiddenKeys = [
    'NEXT_PUBLIC_DB_PASSWORD',
    'NEXT_PUBLIC_API_SECRET',
    'NEXT_PUBLIC_AUTH_TOKEN',
    'NEXT_PUBLIC_PRIVATE_KEY'
  ];

  for (const key of forbiddenKeys) {
    const envContent = `${key}=valor_qualquer\n`;
    const { entries } = parseEnvText(envContent);
    const issues = validateEnvConfig(entries, { isExample: false });
    assert.ok(issues.some(i => i.includes('não pode ser exposta com NEXT_PUBLIC_')), `Deveria bloquear chave: ${key}`);
  }
});

test('env: arquivo .env opcional não falha quando ausente em clone limpo', () => withTempDir(root => {
  // Apenas .env.example presente (como em clone limpo)
  const exampleContent = [
    'NODE_ENV=development',
    'PORT=3000',
    'NEXT_PUBLIC_GA_MEASUREMENT_ID=',
    'NEXT_PUBLIC_ANALYTICS_ENABLED=false'
  ].join('\n');

  fs.writeFileSync(path.join(root, '.env.example'), exampleContent);

  const issues = checkEnvFiles(root);
  assert.deepEqual(issues, []);
}));

test('env: arquivo .env.example contendo segredo sintético é reprovado', () => withTempDir(root => {
  // Simula segredo inserido indevidamente em .env.example
  const syntheticKey = ['AKIA', 'A'.repeat(16)].join('');
  const badExample = [
    'NODE_ENV=development',
    `AWS_KEY=${syntheticKey}`
  ].join('\n');

  fs.writeFileSync(path.join(root, '.env.example'), badExample);

  const issues = checkEnvFiles(root);
  assert.ok(issues.some(i => i.includes('arquivo de exemplo contém padrão de segredo')));
}));

test('env: .env.example ausente provoca falha mandatória', () => withTempDir(root => {
  const issues = checkEnvFiles(root);
  assert.ok(issues.some(i => i.includes('Arquivo obrigatório ausente: .env.example')));
}));
