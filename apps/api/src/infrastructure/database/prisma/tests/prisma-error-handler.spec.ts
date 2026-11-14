/**
 * @fileoverview Testes de Unidade do Tratador Canônico de Erros Prisma — F1Atlas
 *
 * @module apps/api/src/infrastructure/database/prisma/tests/prisma-error-handler.spec
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaErrorHandler } from '../errors/prisma-error-handler.js';
import {
  PersistenceError,
  UniqueConstraintViolationError,
  EntityNotFoundError,
  ForeignKeyConstraintViolationError,
  DatabaseConnectionError
} from '../errors/persistence-errors.js';
import { PrismaClientKnownRequestError } from '../../../../generated/prisma/internal/prismaNamespace.js';

describe('PrismaErrorHandler — Unit & Sanitization Tests', () => {
  it('deve traduzir P2002 para UniqueConstraintViolationError', () => {
    const prismaError = new PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`year`)',
      {
        code: 'P2002',
        clientVersion: '7.10.1',
        meta: { target: ['year'] }
      }
    );

    const handled = PrismaErrorHandler.handle(prismaError, 'SeasonRepository.save');

    assert.ok(handled instanceof UniqueConstraintViolationError);
    assert.equal(handled.code, 'P2002');
    assert.match(handled.message, /Violação de restrição de unicidade/);
    assert.match(handled.message, /\[year\]/);
  });

  it('deve traduzir P2025 para EntityNotFoundError', () => {
    const prismaError = new PrismaClientKnownRequestError(
      'An operation failed because it depends on one or more records that were required but not found.',
      {
        code: 'P2025',
        clientVersion: '7.10.1',
        meta: { cause: 'Record to update not found.' }
      }
    );

    const handled = PrismaErrorHandler.handle(prismaError, 'GrandPrixRepository.findById');

    assert.ok(handled instanceof EntityNotFoundError);
    assert.equal(handled.code, 'P2025');
    assert.match(handled.message, /Registro não encontrado/);
    assert.match(handled.message, /Record to update not found/);
  });

  it('deve traduzir P2003 para ForeignKeyConstraintViolationError', () => {
    const prismaError = new PrismaClientKnownRequestError(
      'Foreign key constraint failed on the field: `seasonId`',
      {
        code: 'P2003',
        clientVersion: '7.10.1',
        meta: { field_name: 'seasonId' }
      }
    );

    const handled = PrismaErrorHandler.handle(prismaError, 'ParticipantRepository.saveSeasonEntry');

    assert.ok(handled instanceof ForeignKeyConstraintViolationError);
    assert.equal(handled.code, 'P2003');
    assert.match(handled.message, /integridade referencial/);
    assert.match(handled.message, /seasonId/);
  });

  it('deve traduzir erros de conexão para DatabaseConnectionError', () => {
    const connError = new Error("Can't reach database server at `db.hostinger.com:3306`");

    const handled = PrismaErrorHandler.handle(connError, 'StandingsRepository.findAll');

    assert.ok(handled instanceof DatabaseConnectionError);
    assert.equal(handled.code, 'CONNECTION_ERROR');
    assert.match(handled.message, /Falha de conexão com o banco/);
  });

  it('deve sanitizar credenciais em URLs em erros inesperados', () => {
    const rawError = new Error('Syntax error near mysql://super_user:secret_pwd_123@hostinger.com:3306/f1db');

    const handled = PrismaErrorHandler.handle(rawError, 'SeasonRepository.findAll');

    assert.ok(handled instanceof PersistenceError);
    assert.doesNotMatch(handled.message, /secret_pwd_123/);
    assert.match(handled.message, /super_user:\*\*\*@hostinger.com/);
  });

  it('deve repassar instâncias de PersistenceError sem modificação', () => {
    const existing = new PersistenceError('Erro customizado', 'CUSTOM_01');
    const handled = PrismaErrorHandler.handle(existing, 'Context');

    assert.equal(handled, existing);
  });
});
