/**
 * @fileoverview Suíte de Testes Determinísticos de Governança de Persistência — F1Atlas
 *
 * Valida a conformidade com a SPEC-PERSIST-001, SPEC-GOV-003 e SPEC-ARCH-001:
 * - Cenários positivos com schema canônico do Prisma ORM 7
 * - Cenários negativos e adversariais (modelos esportivos não aprovados, providers errados,
 *   chaves desbalanceadas, SQL destrutivo, vazamento de client no domínio).
 * - Proteção contra regressão para Prisma 6 e Prisma 8.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  validatePrismaSchema,
  parseAndValidateSchemaContent,
  FORBIDDEN_UNAPPROVED_MODELS
} from '../database/validate-schema.mjs';
import { checkGeneratedClient } from '../database/check-generated-client.mjs';
import { checkMigrations } from '../database/check-migrations.mjs';
import { checkPrismaGovernance } from '../database/check-prisma-version.mjs';
import { runDatabaseVerify } from '../database/run-database-verify.mjs';
import { STATUS, PROJECT_ROOT } from '../lib/workspace.mjs';

function withTempWorkspace(testFn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'f1atlas-db-test-'));
  try {
    return testFn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function writeFixture(root, relPath, content) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

// ---------------------------------------------------------
// Testes de Validação do Schema Prisma 7
// ---------------------------------------------------------

test('db-governance: schema canônico do projeto passa na validação estática', () => {
  const result = validatePrismaSchema(PROJECT_ROOT);
  assert.equal(result.status, STATUS.PASS);
  assert.equal(result.issues.length, 0);
});

test('db-governance: parseAndValidateSchemaContent aprova schema válido MySQL no Prisma 7', () => {
  const validSchema = `
    datasource db {
      provider = "mysql"
    }
    generator client {
      provider = "prisma-client"
      output   = "../src/generated/prisma"
    }
    model Baseline {
      id String @id
    }
  `;
  const { valid, issues } = parseAndValidateSchemaContent(validSchema);
  assert.equal(valid, true, `Erros inesperados: ${issues.join(', ')}`);
  assert.equal(issues.length, 0);
});

test('db-governance: rejeita schema vazio', () => {
  const { valid, issues } = parseAndValidateSchemaContent('');
  assert.equal(valid, false);
  assert.ok(issues.some(i => i.includes('Schema Prisma está vazio')));
});

test('db-governance: rejeita provider que não seja MySQL (ex: postgresql ou sqlite)', () => {
  const invalidProviderSchema = `
    datasource db {
      provider = "postgresql"
    }
    generator client {
      provider = "prisma-client"
      output   = "../src/generated/prisma"
    }
  `;
  const { valid, issues } = parseAndValidateSchemaContent(invalidProviderSchema);
  assert.equal(valid, false);
  assert.ok(issues.some(i => i.includes('esperado: "mysql"')));
});

test('db-governance: rejeita generator legado prisma-client-js do Prisma 6', () => {
  const legacyGeneratorSchema = `
    datasource db {
      provider = "mysql"
    }
    generator client {
      provider = "prisma-client-js"
      output   = "../src/generated/prisma"
    }
  `;
  const { valid, issues } = parseAndValidateSchemaContent(legacyGeneratorSchema);
  assert.equal(valid, false);
  assert.ok(issues.some(i => i.includes('prisma-client-js')));
});

test('db-governance: rejeita schema sem output explícito no generator', () => {
  const noOutputSchema = `
    datasource db {
      provider = "mysql"
    }
    generator client {
      provider = "prisma-client"
    }
  `;
  const { valid, issues } = parseAndValidateSchemaContent(noOutputSchema);
  assert.equal(valid, false);
  assert.ok(issues.some(i => i.includes('output explícito ausente')));
});

test('db-governance: rejeita url no datasource do schema (deve residir em prisma.config.ts)', () => {
  const legacyUrlSchema = `
    datasource db {
      provider = "mysql"
      url      = env("DATABASE_URL")
    }
    generator client {
      provider = "prisma-client"
      output   = "../src/generated/prisma"
    }
  `;
  const { valid, issues } = parseAndValidateSchemaContent(legacyUrlSchema);
  assert.equal(valid, false);
  assert.ok(issues.some(i => i.includes('prisma.config.ts')));
});

test('db-governance: bloqueia modelos especulativos não autorizados (ex: Telemetry, CarSensor)', () => {
  for (const forbiddenModel of FORBIDDEN_UNAPPROVED_MODELS) {
    const unapprovedSchema = `
      datasource db {
        provider = "mysql"
      }
      generator client {
        provider = "prisma-client"
        output   = "../src/generated/prisma"
      }
      model ${forbiddenModel} {
        id String @id
        name String
      }
    `;
    const { valid, issues } = parseAndValidateSchemaContent(unapprovedSchema);
    assert.equal(valid, false, `Deveria ter bloqueado o modelo esportivo ${forbiddenModel}`);
    assert.ok(issues.some(i => i.includes(forbiddenModel)));
  }
});

test('db-governance: detecta chaves desbalanceadas no schema', () => {
  const unbalancedSchema = `
    datasource db {
      provider = "mysql"
    
    generator client {
      provider = "prisma-client"
      output   = "../src/generated/prisma"
    }
  `;
  const { valid, issues } = parseAndValidateSchemaContent(unbalancedSchema);
  assert.equal(valid, false);
  assert.ok(issues.some(i => i.includes('chaves desbalanceadas') || i.includes('Bloco não fechado')));
});

test('db-governance: validatePrismaSchema falha se arquivo schema.prisma não existir', () => withTempWorkspace((root) => {
  const result = validatePrismaSchema(root);
  assert.equal(result.status, STATUS.FAIL);
  assert.ok(result.issues[0].includes('não encontrado'));
}));

// ---------------------------------------------------------
// Testes do Verificador do Prisma Client
// ---------------------------------------------------------

test('db-governance: checkGeneratedClient detecta artefato gerado vazando em packages/domain', () => withTempWorkspace((root) => {
  writeFixture(root, 'apps/api/prisma/schema.prisma', 'datasource db { provider = "mysql" } generator client { provider = "prisma-client" output = "../src/generated/prisma" }');
  writeFixture(root, 'packages/domain/prisma-client.ts', '// vazamento ilegal');

  const result = checkGeneratedClient(root);
  assert.equal(result.status, STATUS.FAIL);
  assert.ok(result.issues.some(i => i.includes('packages/domain')));
}));

test('db-governance: checkGeneratedClient emite SKIP quando client não gerado localmente', () => withTempWorkspace((root) => {
  writeFixture(root, 'apps/api/prisma/schema.prisma', 'datasource db { provider = "mysql" } generator client { provider = "prisma-client" output = "../src/generated/prisma" }');

  const result = checkGeneratedClient(root);
  assert.equal(result.status, STATUS.SKIP);
  assert.ok(result.message.includes('npm run db:generate'));
}));

test('db-governance: checkGeneratedClient valida versão compatível do @prisma/client (linha 7.x)', () => withTempWorkspace((root) => {
  writeFixture(root, 'apps/api/prisma/schema.prisma', 'datasource db { provider = "mysql" } generator client { provider = "prisma-client" output = "../src/generated/prisma" }');
  writeFixture(root, 'apps/api/src/generated/prisma/client.ts', '// generated client');
  writeFixture(root, 'node_modules/@prisma/client/package.json', JSON.stringify({ version: '7.10.1' }));

  const result = checkGeneratedClient(root);
  assert.equal(result.status, STATUS.PASS);
}));

test('db-governance: checkGeneratedClient reprova versão 8.x do @prisma/client', () => withTempWorkspace((root) => {
  writeFixture(root, 'apps/api/prisma/schema.prisma', 'datasource db { provider = "mysql" } generator client { provider = "prisma-client" output = "../src/generated/prisma" }');
  writeFixture(root, 'node_modules/@prisma/client/package.json', JSON.stringify({ version: '8.0.0-beta' }));

  const result = checkGeneratedClient(root);
  assert.equal(result.status, STATUS.FAIL);
  assert.ok(result.issues.some(i => i.includes('incompatível com a linha Prisma 7')));
}));

// ---------------------------------------------------------
// Testes do Verificador de Proteção Anti-Regressão Prisma 6
// ---------------------------------------------------------

test('db-governance: checkPrismaGovernance aprova workspace canônico do F1Atlas', () => {
  const result = checkPrismaGovernance(PROJECT_ROOT);
  assert.equal(result.status, STATUS.PASS, `Issues: ${result.issues.join('; ')}`);
  assert.equal(result.issues.length, 0);
});

test('db-governance: checkPrismaGovernance reprova dependência do Prisma 6 no package.json', () => withTempWorkspace((root) => {
  writeFixture(root, 'package.json', JSON.stringify({ dependencies: { prisma: '^6.4.0' } }));
  writeFixture(root, 'prisma.config.ts', 'export default {}');
  writeFixture(root, 'apps/api/prisma/schema.prisma', 'datasource db { provider = "mysql" } generator client { provider = "prisma-client" output = "../src/generated/prisma" }');

  const result = checkPrismaGovernance(root);
  assert.equal(result.status, STATUS.FAIL);
  assert.ok(result.issues.some(i => i.includes('exigido major 7')));
}));

test('db-governance: checkPrismaGovernance reprova import direto de @prisma/client no código ativo', () => withTempWorkspace((root) => {
  writeFixture(root, 'prisma.config.ts', 'export default {}');
  writeFixture(root, 'apps/api/prisma/schema.prisma', 'datasource db { provider = "mysql" } generator client { provider = "prisma-client" output = "../src/generated/prisma" }');
  writeFixture(root, 'apps/api/src/service.ts', "import { PrismaClient } from '@prisma/client';");

  const result = checkPrismaGovernance(root);
  assert.equal(result.status, STATUS.FAIL);
  assert.ok(result.issues.some(i => i.includes("importa PrismaClient diretamente de '@prisma/client'")));
}));

test('db-governance: checkPrismaGovernance reprova new PrismaClient() sem adapter', () => withTempWorkspace((root) => {
  writeFixture(root, 'prisma.config.ts', 'export default {}');
  writeFixture(root, 'apps/api/prisma/schema.prisma', 'datasource db { provider = "mysql" } generator client { provider = "prisma-client" output = "../src/generated/prisma" }');
  writeFixture(root, 'apps/api/src/service.ts', "const client = new PrismaClient();");

  const result = checkPrismaGovernance(root);
  assert.equal(result.status, STATUS.FAIL);
  assert.ok(result.issues.some(i => i.includes('sem driver adapter')));
}));

test('db-governance: checkPrismaGovernance reprova skill ativa recomendando prisma-client-js', () => withTempWorkspace((root) => {
  writeFixture(root, 'prisma.config.ts', 'export default {}');
  writeFixture(root, 'apps/api/prisma/schema.prisma', 'datasource db { provider = "mysql" } generator client { provider = "prisma-client" output = "../src/generated/prisma" }');
  writeFixture(root, '.agents/skills/prisma-schema-modeling/SKILL.md', '# Skill\nUse provider = "prisma-client-js"');

  const result = checkPrismaGovernance(root);
  assert.equal(result.status, STATUS.FAIL);
  assert.ok(result.issues.some(i => i.includes('recomendação legada "prisma-client-js"')));
}));

test('db-governance: checkPrismaGovernance reprova workspace sem prisma.config.ts', () => withTempWorkspace((root) => {
  writeFixture(root, 'apps/api/prisma/schema.prisma', 'datasource db { provider = "mysql" } generator client { provider = "prisma-client" output = "../src/generated/prisma" }');

  const result = checkPrismaGovernance(root);
  assert.equal(result.status, STATUS.FAIL);
  assert.ok(result.issues.some(i => i.includes('prisma.config.ts ausente')));
}));

// ---------------------------------------------------------
// Testes do Verificador de Migrations
// ---------------------------------------------------------

test('db-governance: checkMigrations emite SKIP quando diretório de migrations não existe', () => withTempWorkspace((root) => {
  const result = checkMigrations(root);
  assert.equal(result.status, STATUS.SKIP);
}));

test('db-governance: checkMigrations reprova pasta de migration fora da convenção YYYYMMDDHHMMSS_nome', () => withTempWorkspace((root) => {
  writeFixture(root, 'apps/api/prisma/migrations/nome_sem_timestamp/migration.sql', 'CREATE TABLE t (id INT);');

  const result = checkMigrations(root);
  assert.equal(result.status, STATUS.FAIL);
  assert.ok(result.issues.some(i => i.includes('nomenclatura fora do padrão')));
}));

test('db-governance: checkMigrations reprova pasta de migration sem migration.sql', () => withTempWorkspace((root) => {
  const dirPath = path.join(root, 'apps/api/prisma/migrations/20261101120000_baseline');
  fs.mkdirSync(dirPath, { recursive: true });

  const result = checkMigrations(root);
  assert.equal(result.status, STATUS.FAIL);
  assert.ok(result.issues.some(i => i.includes('migration.sql ausente')));
}));

test('db-governance: checkMigrations bloqueia SQL destrutivo proibido (DROP DATABASE)', () => withTempWorkspace((root) => {
  writeFixture(
    root,
    'apps/api/prisma/migrations/20261101120000_destructive/migration.sql',
    'DROP DATABASE f1atlas_production;'
  );

  const result = checkMigrations(root);
  assert.equal(result.status, STATUS.FAIL);
  assert.ok(result.issues.some(i => i.includes('DROP DATABASE proibido')));
}));

test('db-governance: checkMigrations aprova migrations válidas', () => withTempWorkspace((root) => {
  writeFixture(
    root,
    'apps/api/prisma/migrations/20261101120000_init/migration.sql',
    'CREATE TABLE baseline (id VARCHAR(191) PRIMARY KEY);'
  );

  const result = checkMigrations(root);
  assert.equal(result.status, STATUS.PASS);
  assert.equal(result.issues.length, 0);
}));

// ---------------------------------------------------------
// Testes do Orquestrador Integrado
// ---------------------------------------------------------

test('db-governance: runDatabaseVerify orquestra todas as validações com sucesso', () => {
  const { status, results } = runDatabaseVerify(PROJECT_ROOT);
  assert.ok(status === STATUS.PASS || status === STATUS.SKIP);
  assert.equal(results.length, 4);
  assert.equal(results[0].name, 'Schema Prisma');
  assert.equal(results[0].status, STATUS.PASS);
  assert.equal(results[3].name, 'Proteção Anti-Regressão Prisma 6');
  assert.equal(results[3].status, STATUS.PASS);
});

test('db-governance: PrismaService compila e instancia com adapter MariaDB no runtime', async () => {
  const { PrismaService, createMariaDbAdapter } = await import('../../apps/api/dist/src/infrastructure/database/prisma/prisma.service.js');
  const adapter = createMariaDbAdapter('mysql://test:test@localhost:3306/f1atlas_test');
  assert.equal(adapter.provider, 'mysql');
  const service = new PrismaService();
  assert.ok(service.infrastructureHealthCheck, 'modelo infrastructureHealthCheck deve estar disponível');
  await service.onModuleDestroy();
});
