/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes Estáticos de Tipos: SessionEntry
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { SessionEntry, SessionEntryStatus } from '../../src/events/session-entry.ts';

type SessionEntryId = EntityId<'session-entry'>;
type DriverId = EntityId<'driver'>;
type SessionId = EntityId<'session'>;

describe('SessionEntry — Segurança de Tipos em Tempo de Compilação', () => {
  it('TT-01: identificadores são nominalmente incompatíveis', () => {
    const entryId: SessionEntryId = EntityId.from<'session-entry'>('entry-001');
    const driverId: DriverId = EntityId.from<'driver'>('driver-001');
    const sessionId: SessionId = EntityId.from<'session'>('ses-001');

    const result = SessionEntry.create({
      id: entryId,
      sessionId,
      driverId,
      teamId: EntityId.from<'team'>('team-001'),
      constructorId: EntityId.from<'constructor'>('ctor-001'),
      carNumber: 1
    });

    assert.equal(result.isSuccess, true);

    // As linhas documentam erros de compilação estáticos:
    // @ts-expect-error DriverId não pode ser passado como SessionEntryId
    SessionEntry.create({ id: driverId, sessionId, driverId, teamId: EntityId.from<'team'>('t'), constructorId: EntityId.from<'constructor'>('c'), carNumber: 1 });
  });

  it('TT-02: propriedades públicas do SessionEntry são estritamente readonly', () => {
    const entry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('entry-001'),
      sessionId: EntityId.from<'session'>('ses-001'),
      driverId: EntityId.from<'driver'>('driver-001'),
      teamId: EntityId.from<'team'>('team-001'),
      constructorId: EntityId.from<'constructor'>('ctor-001'),
      carNumber: 1
    }).getValue();

    assert.equal(entry.carNumber, 1);

    assert.throws(() => {
      // @ts-expect-error carNumber é readonly
      entry.carNumber = 2;
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error startedFromPitLane é readonly
      entry.startedFromPitLane = true;
    }, TypeError);
  });
});
