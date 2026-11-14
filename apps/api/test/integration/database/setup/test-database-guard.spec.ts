/**
 * @fileoverview Testes de Validação do TestDatabaseGuard — F1Atlas
 *
 * @module apps/api/test/integration/database/setup/test-database-guard.spec
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectTestConnectionUrl,
  checkDockerAvailability,
  checkTcpSocket
} from './test-database-guard.js';

describe('TestDatabaseGuard — Security and Inspection Tests', () => {
  it('deve bloquear imediatamente URLs contendo padrões de produção ou Hostinger', () => {
    const urls = [
      'mysql://user:pass@prod.f1atlas.com:3306/f1atlas_test',
      'mysql://user:pass@srv123.hostinger.com:3306/f1atlas_test',
      'mysql://user:pass@localhost:3306/production_db'
    ];

    for (const url of urls) {
      const result = inspectTestConnectionUrl(url);
      assert.equal(result.isProduction, true, `URL [${url}] deveria ser identificada como produção`);
      assert.equal(result.isSafeForTesting, false, `URL [${url}] não deve ser autorizada`);
      assert.ok(result.rejectionReason?.includes('segurança'));
    }
  });

  it('deve rejeitar bancos sem sufixo/prefixo explícito de teste', () => {
    const result = inspectTestConnectionUrl('mysql://user:pass@localhost:3306/f1atlas_dev');
    assert.equal(result.isSafeForTesting, false);
    assert.equal(result.isProduction, false);
    assert.ok(result.rejectionReason?.includes('_test'));
  });

  it('deve aprovar banco isolado de teste qualificado', () => {
    const result = inspectTestConnectionUrl('mysql://test_user:test_pass@localhost:3306/f1atlas_test');
    assert.equal(result.valid, true);
    assert.equal(result.isSafeForTesting, true);
    assert.equal(result.isProduction, false);
    assert.equal(result.sanitizedUrl, 'mysql://***:***@localhost:3306/f1atlas_test');
  });

  it('deve relatar diagnóstico claro de disponibilidade do Docker sem lançar exceções não tratadas', () => {
    const check = checkDockerAvailability();
    assert.equal(typeof check.available, 'boolean');
    if (!check.available) {
      assert.ok(check.reason && check.reason.length > 0);
    }
  });

  it('deve retornar false com timeout controlado para socket TCP fechado', async () => {
    const isAvailable = await checkTcpSocket('127.0.0.1', 59999, 100);
    assert.equal(isAvailable, false);
  });
});
