/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes Unitários: SessionEntry
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { DomainErrorCode } from '../../src/shared/domain-error.ts';
import {
  SessionEntry,
  createSessionEntry,
  validateSessionEntries,
  SessionEntryStatus,
  RETIRED_CAR_NUMBER,
  type CreateSessionEntryProps
} from '../../src/events/session-entry.ts';

function createValidEntryProps(overrides?: Partial<CreateSessionEntryProps>): CreateSessionEntryProps {
  return {
    id: EntityId.from<'session-entry'>('entry-verstappen-fp1'),
    sessionId: EntityId.from<'session'>('ses-fp1'),
    driverId: EntityId.from<'driver'>('driver-max-verstappen'),
    teamId: EntityId.from<'team'>('team-red-bull'),
    constructorId: EntityId.from<'constructor'>('constructor-red-bull'),
    carNumber: 1,
    gridPosition: 1,
    startedFromPitLane: false,
    status: SessionEntryStatus.CONFIRMED,
    ...overrides
  };
}

describe('SessionEntry — Criação e Invariantes Estruturais', () => {
  it('deve instanciar um alinhamento válido com largada no grid convencional', () => {
    const props = createValidEntryProps();
    const result = SessionEntry.create(props);

    assert.ok(result.isSuccess);
    const entry = result.getValue();

    assert.equal(entry.id.toValue(), 'entry-verstappen-fp1');
    assert.equal(entry.sessionId.toValue(), 'ses-fp1');
    assert.equal(entry.driverId.toValue(), 'driver-max-verstappen');
    assert.equal(entry.teamId.toValue(), 'team-red-bull');
    assert.equal(entry.constructorId.toValue(), 'constructor-red-bull');
    assert.equal(entry.carNumber, 1);
    assert.equal(entry.gridPosition, 1);
    assert.equal(entry.startedFromPitLane, false);
    assert.equal(entry.status, SessionEntryStatus.CONFIRMED);
  });

  it('deve permitir criação via função utilitária createSessionEntry e reconstituição', () => {
    const props = createValidEntryProps();
    const result = createSessionEntry(props);

    assert.ok(result.isSuccess);
    assert.equal(result.getValue().carNumber, 1);

    const reconstituteResult = SessionEntry.reconstitute(props);
    assert.ok(reconstituteResult.isSuccess);
    assert.equal(reconstituteResult.getValue().carNumber, 1);
  });

  it('deve rejeitar status de alinhamento inválido', () => {
    // @ts-expect-error status inválido
    const res = SessionEntry.create(createValidEntryProps({ status: 'INVALID_STATUS' }));
    assert.ok(res.isFailure);
    assert.equal(res.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve instanciar um alinhamento com largada do pit lane (gridPosition === null)', () => {
    const props = createValidEntryProps({
      startedFromPitLane: true,
      gridPosition: null
    });
    const result = SessionEntry.create(props);

    assert.ok(result.isSuccess);
    const entry = result.getValue();
    assert.equal(entry.startedFromPitLane, true);
    assert.equal(entry.gridPosition, null);
  });

  it('deve permitir alinhamento sem gridPosition em sessões de treino livre', () => {
    const props = createValidEntryProps({
      gridPosition: undefined,
      startedFromPitLane: false
    });
    const result = SessionEntry.create(props);

    assert.ok(result.isSuccess);
    assert.equal(result.getValue().gridPosition, null);
  });

  it('deve rejeitar props nulas ou indefinidas', () => {
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionEntry.create(null).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionEntry.create(undefined).isFailure);
  });

  it('deve rejeitar identidades tipadas ausentes ou inválidas', () => {
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionEntry.create(createValidEntryProps({ id: null })).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionEntry.create(createValidEntryProps({ sessionId: null })).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionEntry.create(createValidEntryProps({ driverId: null })).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionEntry.create(createValidEntryProps({ teamId: null })).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionEntry.create(createValidEntryProps({ constructorId: null })).isFailure);
  });

  it('deve garantir imutabilidade estrita (Object.freeze)', () => {
    const entry = SessionEntry.create(createValidEntryProps()).getValue();
    assert.ok(Object.isFrozen(entry));
  });

  it('deve comparar igualdade por identidade (equals)', () => {
    const entry1 = SessionEntry.create(createValidEntryProps()).getValue();
    const entry2 = SessionEntry.create(createValidEntryProps({ gridPosition: 2 })).getValue();

    const otherId = EntityId.from<'session-entry'>('entry-norris-fp1');
    const entry3 = SessionEntry.create(createValidEntryProps({ id: otherId })).getValue();

    assert.ok(entry1.equals(entry2));
    assert.equal(entry1.equals(entry3), false);
    assert.equal(entry1.equals(null), false);
  });
});

describe('SessionEntry — Regras de Número de Carro e Aposentadoria do #17', () => {
  it('deve aceitar números válidos de carro entre 1 e 99', () => {
    assert.ok(SessionEntry.create(createValidEntryProps({ carNumber: 1 })).isSuccess);
    assert.ok(SessionEntry.create(createValidEntryProps({ carNumber: 44 })).isSuccess);
    assert.ok(SessionEntry.create(createValidEntryProps({ carNumber: 63 })).isSuccess);
    assert.ok(SessionEntry.create(createValidEntryProps({ carNumber: 99 })).isSuccess);
  });

  it('deve rejeitar números de carro menores que 1 ou maiores que 99', () => {
    assert.ok(SessionEntry.create(createValidEntryProps({ carNumber: 0 })).isFailure);
    assert.ok(SessionEntry.create(createValidEntryProps({ carNumber: -1 })).isFailure);
    assert.ok(SessionEntry.create(createValidEntryProps({ carNumber: 100 })).isFailure);
    assert.ok(SessionEntry.create(createValidEntryProps({ carNumber: 44.5 })).isFailure);
  });

  it('deve rejeitar obrigatoriamente o número #17 (retirado em memória de Jules Bianchi)', () => {
    const result = SessionEntry.create(createValidEntryProps({ carNumber: RETIRED_CAR_NUMBER }));
    assert.ok(result.isFailure);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /Jules Bianchi/);
  });
});

describe('SessionEntry — Regras de Alinhamento e Pit Lane (EVT-INV-009)', () => {
  it('deve rejeitar largada do pit lane acompanhada de posição de grid preenchida (EVT-INV-009)', () => {
    const result = SessionEntry.create(createValidEntryProps({
      startedFromPitLane: true,
      gridPosition: 10
    }));

    assert.ok(result.isFailure);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /pit lane/);
  });

  it('deve rejeitar gridPosition menor que 1 ou não inteiro quando não largar do pit lane', () => {
    assert.ok(SessionEntry.create(createValidEntryProps({ gridPosition: 0 })).isFailure);
    assert.ok(SessionEntry.create(createValidEntryProps({ gridPosition: -3 })).isFailure);
    assert.ok(SessionEntry.create(createValidEntryProps({ gridPosition: 2.5 })).isFailure);
  });

  it('deve atualizar posição de grid via updateGridPosition (copy-on-write)', () => {
    const original = SessionEntry.create(createValidEntryProps({ gridPosition: 5 })).getValue();

    // Aplicação de penalidade: vai para posição 10
    const penalized = original.updateGridPosition(10, false).getValue();
    assert.equal(penalized.gridPosition, 10);
    assert.equal(penalized.startedFromPitLane, false);
    assert.equal(original.gridPosition, 5); // original preservado

    // Penalidade severa: largada do pit lane
    const pitLaneStart = penalized.updateGridPosition(null, true).getValue();
    assert.equal(pitLaneStart.startedFromPitLane, true);
    assert.equal(pitLaneStart.gridPosition, null);
  });

  it('deve alterar status para WITHDRAWN e DNS através de métodos dedicados', () => {
    const original = SessionEntry.create(createValidEntryProps()).getValue();

    const withdrawn = original.markWithdrawn().getValue();
    assert.equal(withdrawn.status, SessionEntryStatus.WITHDRAWN);
    assert.equal(withdrawn.gridPosition, null);

    const dns = original.markDNS().getValue();
    assert.equal(dns.status, SessionEntryStatus.DNS);
    assert.equal(dns.gridPosition, 1);
  });
});

describe('SessionEntry — Validação de Conjunto (validateSessionEntries)', () => {
  it('deve aprovar coleção válida e consistente de alinhamentos', () => {
    const entry1 = SessionEntry.create(createValidEntryProps({
      id: EntityId.from<'session-entry'>('e1'),
      driverId: EntityId.from<'driver'>('d1'),
      carNumber: 1,
      gridPosition: 1
    })).getValue();

    const entry2 = SessionEntry.create(createValidEntryProps({
      id: EntityId.from<'session-entry'>('e2'),
      driverId: EntityId.from<'driver'>('d2'),
      carNumber: 4,
      gridPosition: 2
    })).getValue();

    const entry3 = SessionEntry.create(createValidEntryProps({
      id: EntityId.from<'session-entry'>('e3'),
      driverId: EntityId.from<'driver'>('d3'),
      carNumber: 55,
      startedFromPitLane: true,
      gridPosition: null
    })).getValue();

    const validation = validateSessionEntries([entry1, entry2, entry3]);
    assert.ok(validation.isSuccess);
  });

  it('deve rejeitar piloto alinhado mais de uma vez na mesma sessão', () => {
    const driverId = EntityId.from<'driver'>('driver-max');
    const entry1 = SessionEntry.create(createValidEntryProps({
      id: EntityId.from<'session-entry'>('e1'),
      driverId,
      carNumber: 1
    })).getValue();

    const entry2 = SessionEntry.create(createValidEntryProps({
      id: EntityId.from<'session-entry'>('e2'),
      driverId, // mesmo piloto
      carNumber: 2
    })).getValue();

    const validation = validateSessionEntries([entry1, entry2]);
    assert.ok(validation.isFailure);
    assert.equal(validation.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(validation.getError().message, /mais de uma vez/);
  });

  it('deve rejeitar número de carro duplicado na mesma sessão', () => {
    const entry1 = SessionEntry.create(createValidEntryProps({
      id: EntityId.from<'session-entry'>('e1'),
      driverId: EntityId.from<'driver'>('d1'),
      carNumber: 44
    })).getValue();

    const entry2 = SessionEntry.create(createValidEntryProps({
      id: EntityId.from<'session-entry'>('e2'),
      driverId: EntityId.from<'driver'>('d2'),
      carNumber: 44 // mesmo número
    })).getValue();

    const validation = validateSessionEntries([entry1, entry2]);
    assert.ok(validation.isFailure);
    assert.equal(validation.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(validation.getError().message, /#44 está duplicado/);
  });

  it('deve rejeitar dois pilotos na mesma posição de grid (EVT-INV-009)', () => {
    const entry1 = SessionEntry.create(createValidEntryProps({
      id: EntityId.from<'session-entry'>('e1'),
      driverId: EntityId.from<'driver'>('d1'),
      carNumber: 1,
      gridPosition: 1
    })).getValue();

    const entry2 = SessionEntry.create(createValidEntryProps({
      id: EntityId.from<'session-entry'>('e2'),
      driverId: EntityId.from<'driver'>('d2'),
      carNumber: 4,
      gridPosition: 1 // mesma posição de grid
    })).getValue();

    const validation = validateSessionEntries([entry1, entry2]);
    assert.ok(validation.isFailure);
    assert.equal(validation.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(validation.getError().message, /posição de grid 1/);
  });

  it('deve rejeitar validação de lista se entrada não for array', () => {
    // @ts-expect-error teste com entrada não array
    const res = validateSessionEntries(null);
    assert.ok(res.isFailure);
    assert.equal(res.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });
});
