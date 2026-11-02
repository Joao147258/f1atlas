/**
 * @fileoverview Ponto de Entrada da API NestJS — F1Atlas
 *
 * @module apps/api/src/main
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';

export async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log']
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`F1Atlas API iniciada com sucesso na porta ${port}`);
  return app;
}

if (process.env.NODE_ENV !== 'test' && !process.env.CI_BUILD_ONLY) {
  bootstrap().catch((error) => {
    console.error('Falha ao inicializar F1Atlas API:', error);
    process.exit(1);
  });
}
