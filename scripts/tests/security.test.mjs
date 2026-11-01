import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scanText, checkSecrets } from '../security/check-secrets.mjs';
import { isSensitiveFile, checkSensitiveFiles } from '../security/check-sensitive-files.mjs';
import { checkWorkspaceSymlinks } from '../security/check-symlinks.mjs';
import { checkPublicationScope, checkIgnorePolicy } from '../security/verify-publication-scope.mjs';
import { parseEnvText, validateEnvConfig } from '../security/validate-env.mjs';
import { verifyDependencies } from '../security/verify-dependencies.mjs';
import { isWithinRoot, STATUS } from '../lib/workspace.mjs';

function withTempDir(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'f1atlas-sec-test-'));
  try {
    return fn(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('segurança: detecção de tokens de alta precisão e não exposição', () => {
  const fakeSlack = ['xoxb', '123456789012', 'abcdefghijklmnopqrstuvwxyz'].join('-');
  const fakeStripe = ['sk', 'live', '123456789012345678901234'].join('_');
  const fakeRsa = ['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' ') + '\nMIIEowIBAAKCAQEA0\n' + ['-----END RSA', 'PRIVATE KEY-----'].join(' ');

  assert.deepEqual(scanText(fakeSlack), ['Slack token']);
  assert.deepEqual(scanText(fakeStripe), ['Stripe secret key']);
  assert.deepEqual(scanText(fakeRsa), ['Private key block']);

  // Assegura que o relatório de findings não inclui a credencial em texto puro
  const findings = scanText(fakeSlack);
  assert.ok(!findings.some(f => f.includes(fakeSlack)));
});

test('segurança: checkSecrets bloqueia arquivo com segredo e omite o valor', () => withTempDir(root => {
  const secretFile = 'credentials.txt';
  const secretPayload = ['sk', 'test', '123456789012345678901234'].join('_');
  fs.writeFileSync(path.join(root, secretFile), `API_KEY=${secretPayload}\n`);

  const issues = checkSecrets(root, [secretFile]);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /credentials\.txt/);
  assert.match(issues[0], /Stripe secret key/);
  assert.ok(!issues[0].includes(secretPayload), 'O valor do segredo não deve aparecer na mensagem de erro');
}));

test('segurança: arquivos sensíveis bloqueados vs permitidos', () => {
  const blocked = [
    '.env',
    '.env.production',
    '.env.local',
    '.env.test.local',
    'id_rsa',
    'id_ed25519',
    'service-account-key.json',
    'credentials.json',
    'certs/server.pfx',
    'certs/ca.key',
    'safe.kdbx'
  ];
  for (const f of blocked) {
    assert.equal(isSensitiveFile(f), true, `Deveria bloquear: ${f}`);
  }

  const allowed = [
    '.env.example',
    '.env.sample',
    '.env.template',
    'package.json',
    'src/index.ts',
    'docs/architecture/adr/0001-modular-monolith.md'
  ];
  for (const f of allowed) {
    assert.equal(isSensitiveFile(f), false, `Deveria permitir: ${f}`);
  }
});

test('segurança: resolução segura de caminhos e prevenção de path traversal', () => withTempDir(root => {
  assert.equal(isWithinRoot(root, 'subdir/file.txt'), true);
  assert.equal(isWithinRoot(root, './file.txt'), true);
  assert.equal(isWithinRoot(root, '../outside.txt'), false);
  assert.equal(isWithinRoot(root, '../../etc/passwd'), false);
}));

test('segurança: checkWorkspaceSymlinks detecta symlink malicioso que escapa da raiz', () => withTempDir(root => {
  const safeTarget = path.join(root, 'safe-target.txt');
  fs.writeFileSync(safeTarget, 'safe content');

  const safeLink = path.join(root, 'safe-link.txt');
  fs.symlinkSync('safe-target.txt', safeLink);

  // Link legítimo dentro da raiz
  assert.deepEqual(checkWorkspaceSymlinks(root, ['safe-link.txt']), []);

  // Link malicioso apontando para fora da raiz
  const escapeLink = path.join(root, 'escape-link.txt');
  fs.symlinkSync('../outside.txt', escapeLink);

  const issues = checkWorkspaceSymlinks(root, ['escape-link.txt']);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /escapa da raiz do workspace/);
}));

test('segurança: repositório Git temporário detecta staged indevido e valida policy', () => withTempDir(root => {
  // Inicializa repo Git temporário isolado
  const init = spawnSync('git', ['init', '-q'], { cwd: root });
  assert.equal(init.status, 0);

  fs.writeFileSync(path.join(root, '.gitignore'), '/GEMINI.md\n/.local/\n/.gemini/settings.json\n/.env\n');
  assert.deepEqual(checkIgnorePolicy(root), []);

  // Arquivo público staged
  fs.writeFileSync(path.join(root, 'README.md'), '# Teste');
  spawnSync('git', ['add', 'README.md'], { cwd: root });
  assert.deepEqual(checkPublicationScope(['README.md']), []);

  // Arquivo privado staged forçadamente (GEMINI.md)
  fs.writeFileSync(path.join(root, 'GEMINI.md'), 'private context');
  spawnSync('git', ['add', '-f', 'GEMINI.md'], { cwd: root });

  const stagingIssues = checkPublicationScope(['GEMINI.md']);
  assert.equal(stagingIssues.length, 1);
  assert.match(stagingIssues[0], /Arquivo privado entrou no conjunto publicável/);

  // Arquivo .env staged forçadamente
  fs.writeFileSync(path.join(root, '.env'), 'SECRET_TOKEN=12345');
  spawnSync('git', ['add', '-f', '.env'], { cwd: root });

  const envStagingIssues = checkPublicationScope(['.env']);
  assert.equal(envStagingIssues.length, 1);
  assert.match(envStagingIssues[0], /Arquivo privado entrou no conjunto publicável: \.env/);
}));

test('segurança: diferenciação entre GA4 Measurement ID público e segredos de analytics', () => {
  // 1. Measurement ID público é aceito normalmente
  const validPublicEnv = [
    { key: 'NEXT_PUBLIC_ANALYTICS_ENABLED', value: 'true', line: 1 },
    { key: 'NEXT_PUBLIC_GA_MEASUREMENT_ID', value: 'G-ABC1234567', line: 2 }
  ];
  const issuesValid = validateEnvConfig(validPublicEnv, { isExample: true });
  assert.deepEqual(issuesValid, []);

  // 2. Scanner de segredos não bloqueia Measurement ID
  assert.deepEqual(scanText('NEXT_PUBLIC_GA_MEASUREMENT_ID=G-ABC1234567'), []);

  // 3. Proibição de api_secret ou token com prefixo público NEXT_PUBLIC_
  const forbiddenPublicSecret = [
    { key: 'NEXT_PUBLIC_GA_API_SECRET', value: 'some_secret_key', line: 1 }
  ];
  const issuesSecret = validateEnvConfig(forbiddenPublicSecret);
  assert.equal(issuesSecret.length, 1);
  assert.match(issuesSecret[0], /não pode ser exposta com NEXT_PUBLIC_/);

  // 4. Arquivo de exemplo contendo credencial real em valor deve ser bloqueado
  const fakeSecretVal = ['AIzaSy', 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6'].join('_');
  const exampleWithSecret = [
    { key: 'GOOGLE_API_KEY', value: fakeSecretVal, line: 1 }
  ];
  const issuesExample = validateEnvConfig(exampleWithSecret, { isExample: true });
  assert.equal(issuesExample.length, 1);
  assert.match(issuesExample[0], /arquivo de exemplo contém padrão de segredo/);

  // 5. Validação de formato incorreto de Measurement ID
  const invalidGaId = [
    { key: 'NEXT_PUBLIC_ANALYTICS_ENABLED', value: 'true', line: 1 },
    { key: 'NEXT_PUBLIC_GA_MEASUREMENT_ID', value: 'UA-1234567-1', line: 2 }
  ];
  const issuesBadId = validateEnvConfig(invalidGaId);
  assert.equal(issuesBadId.length, 1);
  assert.match(issuesBadId[0], /NEXT_PUBLIC_GA_MEASUREMENT_ID possui formato inválido/);
});

test('segurança: verifyDependencies emite SKIP para scaffold sem pacotes externos', () => withTempDir(root => {
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'test-app', version: '0.1.0' }));
  const result = verifyDependencies(root);
  assert.equal(result.status, STATUS.SKIP);
  assert.match(result.message, /nenhum pacote de terceiros declarado/);
}));

test('segurança: verifyDependencies falha se package.json estiver ausente ou inválido', () => withTempDir(root => {
  const missingResult = verifyDependencies(root);
  assert.equal(missingResult.status, STATUS.FAIL);
  assert.match(missingResult.issues[0], /não encontrado/);

  fs.writeFileSync(path.join(root, 'package.json'), '{ invalid json');
  const malformedResult = verifyDependencies(root);
  assert.equal(malformedResult.status, STATUS.FAIL);
  assert.match(malformedResult.issues[0], /Erro ao processar JSON/);
}));

test('segurança: verifyDependencies simula execução do npm audit diante de dependências', () => withTempDir(root => {
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    name: 'test-app',
    dependencies: { express: '^4.19.0' }
  }));

  // Simula npm audit aprovado sem vulnerabilidades
  const mockCleanSpawn = () => ({ status: 0, stdout: 'found 0 vulnerabilities\n' });
  const passResult = verifyDependencies(root, { spawn: mockCleanSpawn });
  assert.equal(passResult.status, STATUS.PASS);

  // Simula npm audit que encontra vulnerabilidades críticas (exit code 1)
  const mockVulnSpawn = () => ({ status: 1, stdout: '1 high severity vulnerability found\n' });
  const failResult = verifyDependencies(root, { spawn: mockVulnSpawn });
  assert.equal(failResult.status, STATUS.FAIL);
  assert.match(failResult.issues[0], /Vulnerabilidades detectadas pelo npm audit/);

  // Simula falha ao invocar npm (ex: npm não encontrado no PATH)
  const mockErrorSpawn = () => ({ error: new Error('spawn npm ENOENT') });
  const errorResult = verifyDependencies(root, { spawn: mockErrorSpawn });
  assert.equal(errorResult.status, STATUS.ERROR);
  assert.match(errorResult.issues[0], /npm audit não pôde ser executado/);
}));
