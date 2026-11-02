/**
 * @fileoverview Módulo NestJS de Persistência com Prisma ORM 7 — F1Atlas
 *
 * Exporta o PrismaService para os adaptadores de repositório da camada de infraestrutura.
 * Pode ser configurado como @Global() para permitir injeção direta nos módulos de repositório.
 *
 * @module apps/api/src/infrastructure/database/prisma/prisma.module
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService]
})
export class PrismaModule {}
