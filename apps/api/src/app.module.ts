/**
 * @fileoverview Módulo Raiz da Aplicação F1Atlas API — NestJS + Prisma ORM 7
 *
 * Configura os módulos de persistência e registra as implementações concretas dos
 * adaptadores Prisma vinculados aos tokens de injeção das portas da aplicação.
 *
 * @module apps/api/src/app.module
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module.js';
import {
  PrismaInfrastructureHealthRepository,
  PrismaSeasonRepository,
  PrismaParticipantRepository,
  PrismaGrandPrixRepository,
  PrismaStandingsRepository
} from './infrastructure/database/prisma/repositories/index.js';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'IInfrastructureHealthRepository',
      useClass: PrismaInfrastructureHealthRepository
    },
    {
      provide: 'ISeasonRepository',
      useClass: PrismaSeasonRepository
    },
    {
      provide: 'IParticipantRepository',
      useClass: PrismaParticipantRepository
    },
    {
      provide: 'IGrandPrixRepository',
      useClass: PrismaGrandPrixRepository
    },
    {
      provide: 'IStandingsRepository',
      useClass: PrismaStandingsRepository
    }
  ],
  exports: [
    PrismaModule,
    'IInfrastructureHealthRepository',
    'ISeasonRepository',
    'IParticipantRepository',
    'IGrandPrixRepository',
    'IStandingsRepository'
  ]
})
export class AppModule {}
