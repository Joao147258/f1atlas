/**
 * @fileoverview Script de Seed de Infraestrutura — F1Atlas
 *
 * Popula registros sintéticos de verificação no banco de desenvolvimento/teste.
 * NOTA DE SEGURANÇA: NUNCA execute este script em ambiente de produção.
 * Proibido inserir dados esportivos sem homologação formal de SPEC.
 *
 * Arquitetura Prisma ORM 7:
 * Utiliza o PrismaClient gerado com o driver adapter @prisma/adapter-mariadb.
 */

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionUrl = process.env.DATABASE_URL || 'mysql://localhost:3306/f1atlas_dev';
const adapter = new PrismaMariaDb(connectionUrl);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('[seed] Inicializando baseline de persistência (Prisma ORM 7)...');

  const healthCheck = await prisma.infrastructureHealthCheck.create({
    data: {
      component: 'DatabasePersistenceFoundation',
      status: 'INITIALIZED',
      details: 'Seed inicial sintético executado com sucesso no ambiente de testes.'
    }
  });

  console.log(`[seed] Registro de baseline criado com id: ${healthCheck.id}`);
}

main()
  .catch((error) => {
    console.error('[seed] Erro durante execução do seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
