/**
 * @fileoverview Módulo Raiz da Aplicação F1Atlas API — NestJS + Prisma ORM 7
 *
 * @module apps/api/src/app.module
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module.js';
import { PrismaInfrastructureHealthRepository } from './infrastructure/database/prisma/repositories/prisma-infrastructure-health.repository.js';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'IInfrastructureHealthRepository',
      useClass: PrismaInfrastructureHealthRepository
    }
  ],
  exports: ['IInfrastructureHealthRepository', PrismaModule]
})
export class AppModule {}
