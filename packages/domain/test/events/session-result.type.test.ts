/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes Estáticos de Tipos: SessionResult
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import {
  SessionResult,
  ResultStatus,
  PublicationState
} from '../../src/events/session-result.ts';

type SessionResultId = EntityId<'session-result'>;
type SessionId = EntityId<'session'>;
type DriverId = EntityId<'driver'>;

describe('SessionResult — Segurança de Tipos em Tempo de Compilação', () => {
  it('TT-01: identificadores são nominalmente incompatíveis', () => {
    const resId: SessionResultId = EntityId.from<'session-result'>('res-001');
    const sessionId: SessionId = EntityId.from<'session'>('ses-001');
    const driverId: DriverId = EntityId.from<'driver'>('driver-001');

    const result = SessionResult.create({
      id: resId,
      sessionId,
      driverId,
      teamId: EntityId.from<'team'>('team-001'),
      constructorId: EntityId.from<'constructor'>('ctor-001'),
      position: 1,
      lapsCompleted: 50,
      status: ResultStatus.FINISHED
    });

    assert.equal(result.isSuccess, true);

    // As linhas documentam incompatibilidades de tipo:
    // @ts-expect-error SessionId não pode ser passado como SessionResultId
    SessionResult.create({ id: sessionId, sessionId, driverId, teamId: EntityId.from<'team'>('t'), constructorId: EntityId.from<'constructor'>('c'), position: 1, lapsCompleted: 50, status: ResultStatus.FINISHED });
  });

  it('TT-02: propriedades públicas do SessionResult são estritamente readonly', () => {
    const res = SessionResult.create({
      id: EntityId.from<'session-result'>('res-001'),
      sessionId: EntityId.from<'session'>('ses-001'),
      driverId: EntityId.from<'driver'>('driver-001'),
      teamId: EntityId.from<'team'>('team-001'),
      constructorId: EntityId.from<'constructor'>('ctor-001'),
      position: 1,
      lapsCompleted: 50,
      status: ResultStatus.FINISHED
    }).getValue();

    assert.equal(res.status, ResultStatus.FINISHED);

    assert.throws(() => {
      // @ts-expect-error position é readonly
      res.position = 2;
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error publicationState é readonly
      res.publicationState = PublicationState.OFFICIAL;
    }, TypeError);
  });
});
