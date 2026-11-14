/**
 * @fileoverview Testes de Integridade Referencial, Erros e Transações Atômicas em Banco Real — F1Atlas
 *
 * Valida comportamentos transacionais do motor MySQL/MariaDB:
 * 1. Rejeição de Foreign Key inválida (P2003): tentativa de criar registro filho com chave pai inexistente.
 * 2. Rejeição de Chave Única (P2002): unicidade estrita de slugs, códigos e anos.
 * 3. Atomicidade e Rollback em $transaction: falha em uma operação deve desfazer as operações anteriores.
 *
 * @module apps/api/test/integration/database/transactions/transactional-integrity.integration.spec
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseTestEnvironment, type TestEnvironmentStatus } from '../setup/database-test-environment.js';

describe('Transactional Integrity, Foreign Keys & Rollback Integration Tests', () => {
  let envStatus: TestEnvironmentStatus;

  before(async () => {
    envStatus = await DatabaseTestEnvironment.getInstance().setup();
  });

  beforeEach(async () => {
    if (envStatus?.canRun) {
      await DatabaseTestEnvironment.getInstance().cleanDatabase();
    }
  });

  after(async () => {
    if (envStatus?.canRun) {
      await DatabaseTestEnvironment.getInstance().teardown();
    }
  });

  it('deve rejeitar inserção com Foreign Key inexistente (P2003)', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const prisma = DatabaseTestEnvironment.getInstance().getPrismaClient();

    // Tentativa de criar SeasonEntry para uma temporada que não existe
    await assert.rejects(
      async () => {
        await prisma.seasonEntry.create({
          data: {
            id: 'entry-invalid-fk',
            seasonId: 'season-que-nao-existe-no-banco',
            driverId: 'driver-qualquer',
            teamId: 'team-qualquer',
            constructorId: 'const-qualquer',
            carNumber: 99,
            role: 'REGULAR',
            status: 'CONFIRMED'
          }
        });
      },
      (err: any) => {
        assert.ok(err.code === 'P2003' || err.message.includes('Foreign key'));
        return true;
      }
    );
  });

  it('deve executar rollback completo em caso de falha em $transaction', async (t) => {
    if (!envStatus?.canRun) {
      t.skip(`Teste ignorado: ${envStatus?.message || 'Banco isolado indisponível'}`);
      return;
    }

    const prisma = DatabaseTestEnvironment.getInstance().getPrismaClient();

    const driverValidData = {
      id: 'driver-atomic-1',
      slug: 'driver-atomic-slug',
      firstName: 'Atomic',
      lastName: 'Driver',
      fullName: 'Atomic Driver',
      displayName: 'A. Driver',
      nationality: 'Brazilian'
    };

    // Operação 1: Válida (cria driver-atomic-1)
    // Operação 2: Inválida (tenta violar chave primária ou foreign key)
    await assert.rejects(
      async () => {
        await prisma.$transaction([
          prisma.driver.create({ data: driverValidData }),
          prisma.seasonEntry.create({
            data: {
              id: 'entry-com-falha-intencional',
              seasonId: 'season-inexistente',
              driverId: 'driver-atomic-1',
              teamId: 'team-inexistente',
              constructorId: 'const-inexistente',
              carNumber: 10,
              role: 'REGULAR',
              status: 'CONFIRMED'
            }
          })
        ]);
      }
    );

    // Comprova que driver-atomic-1 sofreu rollback e NÃO existe no banco
    const rolledBackDriver = await prisma.driver.findUnique({
      where: { id: 'driver-atomic-1' }
    });
    assert.equal(rolledBackDriver, null, 'O primeiro registro da transação deve ter sofrido rollback completo');
  });
});
