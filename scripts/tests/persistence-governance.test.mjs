/**
 * @fileoverview Testes Automatizados da Governança de Persistência e Adaptadores — F1Atlas
 *
 * Valida os quality gates e regras determinísticas da camada de infraestrutura Prisma:
 * 1. Detecção de fabricação de dados esportivos nos adaptadores.
 * 2. Validação da presença e integridade dos adaptadores de repositório obrigatórios.
 * 3. Validação do isolamento de ORMs e desacoplamento do Domínio.
 * 4. Verificação de tratamento defensivo de erros Prisma (PrismaClientKnownRequestError).
 *
 * @module scripts/tests/persistence-governance.test
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT } from '../lib/workspace.mjs';

test('Persistence Governance — Adaptadores Prisma & Anti-Fabricação', async (t) => {
  const repoDir = path.join(PROJECT_ROOT, 'apps/api/src/infrastructure/database/prisma/repositories');

  await t.test('todos os 5 adaptadores de repositório devem existir fisicamente', () => {
    const requiredAdapters = [
      'prisma-infrastructure-health.repository.ts',
      'prisma-season.repository.ts',
      'prisma-participant.repository.ts',
      'prisma-grand-prix.repository.ts',
      'prisma-standings.repository.ts'
    ];

    for (const file of requiredAdapters) {
      const fullPath = path.join(repoDir, file);
      assert.equal(fs.existsSync(fullPath), true, `Adaptador ${file} deve existir no repositório`);
    }
  });

  await t.test('nenhum adaptador de repositório deve conter dados fictícios ou sentinelas artificiais', () => {
    const files = fs.readdirSync(repoDir).filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
    const forbiddenPatterns = [
      /default-circuit/,
      /default-season/,
      /unknown-constructor/,
      /trackLengthMeters\s*\?\?\s*5000/,
      /cornersCount\s*\?\?\s*15/
    ];

    for (const file of files) {
      const content = fs.readFileSync(path.join(repoDir, file), 'utf8');
      for (const pattern of forbiddenPatterns) {
        assert.equal(
          pattern.test(content),
          false,
          `Arquivo ${file} não deve conter padrão de dados fictícios: ${pattern}`
        );
      }
    }
  });

  await t.test('adaptadores de persistência não devem vazar para o pacote @f1atlas/domain', () => {
    const domainSrc = path.join(PROJECT_ROOT, 'packages/domain/src');
    const checkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(full);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          const code = fs.readFileSync(full, 'utf8');
          assert.equal(code.includes('@prisma/client'), false, `${entry.name} não deve importar @prisma/client`);
          assert.equal(code.includes('PrismaClient'), false, `${entry.name} não deve referenciar PrismaClient`);
          assert.equal(code.includes('@nestjs/common'), false, `${entry.name} não deve referenciar decorators do NestJS`);
        }
      }
    };
    checkDir(domainSrc);
  });

  await t.test('hierarquia de erros Prisma deve conter tratador canônico sanitizador', () => {
    const errorHandlerFile = path.join(
      PROJECT_ROOT,
      'apps/api/src/infrastructure/database/prisma/errors/prisma-error-handler.ts'
    );
    assert.equal(fs.existsSync(errorHandlerFile), true);
    const content = fs.readFileSync(errorHandlerFile, 'utf8');

    // Valida mapeamento dos principais códigos de erro
    assert.equal(content.includes('P2002'), true, 'Deve tratar P2002 (Unique Constraint)');
    assert.equal(content.includes('P2025'), true, 'Deve tratar P2025 (Entity Not Found)');
    assert.equal(content.includes('P2003'), true, 'Deve tratar P2003 (Foreign Key Violation)');
    assert.equal(content.includes('sanitizeMessage'), true, 'Deve possuir rotina de sanitização de mensagens');
  });
});
