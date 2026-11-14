/**
 * ============================================================================
 * F1Atlas — Testes Estáticos de Tipos: Session
 * ============================================================================
 *
 * Módulo: packages/domain/test/events/session.type.test.ts
 * Componente testado: packages/domain/src/events/session.ts
 *
 * Propósito:
 * Comprovar estaticamente que a entidade Session impõe tipagem nominal
 * estrita para identificadores (SessionId vs GrandPrixId), propriedades
 * readonly e valores regulamentares de SessionType e SessionStatus.
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Session,
  SessionType,
  SessionStatus
} from '../../src/events/session.ts';
import { EntityId } from '../../src/shared/entity-id.ts';

type SessionId = EntityId<'session'>;
type GrandPrixId = EntityId<'grand-prix'>;

describe('Session — Segurança de Tipos em Tempo de Compilação', () => {
  it('TT-01: identificadores de Session e GrandPrix são nominalmente distintos', () => {
    const sessionId: SessionId = EntityId.from<'session'>('ses-001');
    const grandPrixId: GrandPrixId = EntityId.from<'grand-prix'>('gp-001');

    const sessionRes = Session.create({
      id: sessionId,
      grandPrixId: grandPrixId,
      type: SessionType.QUALIFYING,
      scheduledStartTime: new Date()
    });

    assert.equal(sessionRes.isSuccess, true);

    // As linhas abaixo documentam atribuições inválidas rejeitadas pelo compilador TypeScript:
    // @ts-expect-error GrandPrixId não pode ser passado como SessionId
    Session.create({ id: grandPrixId, grandPrixId, type: SessionType.RACE, scheduledStartTime: new Date() });

    // @ts-expect-error String comum não substitui EntityId
    Session.create({ id: 'ses-001', grandPrixId: 'gp-001', type: SessionType.RACE, scheduledStartTime: new Date() });
  });

  it('TT-02: propriedades públicas da Session são estritamente readonly', () => {
    const session = Session.create({
      id: EntityId.from<'session'>('ses-001'),
      grandPrixId: EntityId.from<'grand-prix'>('gp-001'),
      type: SessionType.RACE,
      scheduledStartTime: new Date()
    }).getValue();

    assert.equal(session.type, SessionType.RACE);

    assert.throws(() => {
      // @ts-expect-error type é readonly
      session.type = SessionType.SPRINT;
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error status é readonly
      session.status = SessionStatus.LIVE;
    }, TypeError);
  });
});
