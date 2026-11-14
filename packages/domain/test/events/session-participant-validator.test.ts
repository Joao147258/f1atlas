/**
 * ============================================================================
 * F1Atlas — Testes Unitários: session-participant-validator
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { EntityId } from '../../src/shared/entity-id.ts';
import { DomainErrorCode } from '../../src/shared/domain-error.ts';
import { SessionEntry } from '../../src/events/session-entry.ts';
import { SessionType } from '../../src/events/session.ts';
import { SeasonEntry } from '../../src/participants/season-entry.ts';
import { EntryRole } from '../../src/participants/entry-role.ts';
import { validateSessionParticipantEligibility } from '../../src/events/session-participant-validator.ts';

describe('Validador de Elegibilidade de Participante (INV-TR-PA-EV-01 e 02)', () => {
  const driverId = EntityId.from<'driver'>('driver-norris');
  const otherDriverId = EntityId.from<'driver'>('driver-antonelli');
  const teamId = EntityId.from<'team'>('team-mclaren');
  const otherTeamId = EntityId.from<'team'>('team-ferrari');
  const constructorId = EntityId.from<'constructor'>('constructor-mclaren');
  const seasonId = EntityId.from<'season'>('season-2025');
  const sessionId = EntityId.from<'session'>('session-aus-race');

  const regularEntry = SeasonEntry.create({
    id: EntityId.from<'season-entry'>('entry-norris-2025'),
    seasonId,
    driverId,
    teamId,
    constructorId,
    carNumber: 4,
    role: EntryRole.REGULAR,
    startRound: 1,
    endRound: 24
  }).getValue();

  const substituteEntry = SeasonEntry.create({
    id: EntityId.from<'season-entry'>('entry-bearman-2025'),
    seasonId,
    driverId: EntityId.from<'driver'>('driver-bearman'),
    teamId: otherTeamId,
    constructorId: EntityId.from<'constructor'>('constructor-ferrari'),
    carNumber: 38,
    role: EntryRole.SUBSTITUTE,
    startRound: 2,
    endRound: 2
  }).getValue();

  it('deve aprovar piloto com SeasonEntry regular ativa em sessão de corrida (RACE)', () => {
    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-01'),
      sessionId,
      driverId,
      teamId,
      constructorId,
      carNumber: 4,
      gridPosition: 1
    }).getValue();

    const result = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.RACE,
      seasonEntries: [regularEntry],
      roundNumber: 1
    });

    assert.equal(result.isSuccess, true);
  });

  it('deve aprovar piloto substituto com SeasonEntry ativa na rodada específica', () => {
    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-02'),
      sessionId,
      driverId: EntityId.from<'driver'>('driver-bearman'),
      teamId: otherTeamId,
      constructorId: EntityId.from<'constructor'>('constructor-ferrari'),
      carNumber: 38,
      gridPosition: 11
    }).getValue();

    const result = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.QUALIFYING,
      seasonEntries: [substituteEntry],
      roundNumber: 2
    });

    assert.equal(result.isSuccess, true);
  });

  it('deve rejeitar piloto sem SeasonEntry em sessão competitiva (RACE)', () => {
    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-03'),
      sessionId,
      driverId: otherDriverId,
      teamId,
      constructorId,
      carNumber: 12,
      gridPosition: 10
    }).getValue();

    const result = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.RACE,
      seasonEntries: [regularEntry],
      roundNumber: 1
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /não possui inscrição formal/);
  });

  it('deve rejeitar piloto quando inscrição não está ativa na rodada (fora do startRound/endRound)', () => {
    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-04'),
      sessionId,
      driverId: EntityId.from<'driver'>('driver-bearman'),
      teamId: otherTeamId,
      constructorId: EntityId.from<'constructor'>('constructor-ferrari'),
      carNumber: 38,
      gridPosition: 11
    }).getValue();

    // Round 3 não está coberto por substituteEntry (que foi apenas no round 2)
    const result = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.RACE,
      seasonEntries: [substituteEntry],
      roundNumber: 3
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /não possui inscrição ativa na rodada 3/);
  });

  it('deve rejeitar quando o número do carro diverge do homologado na SeasonEntry', () => {
    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-05'),
      sessionId,
      driverId,
      teamId,
      constructorId,
      carNumber: 99, // Diverge do #4 oficial
      gridPosition: 1
    }).getValue();

    const result = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.RACE,
      seasonEntries: [regularEntry],
      roundNumber: 1
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /Número do carro alinhado .* diverge/);
  });

  it('deve rejeitar quando a equipe alinhada diverge da SeasonEntry ativa', () => {
    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-06'),
      sessionId,
      driverId,
      teamId: otherTeamId, // Ferrari em vez de McLaren
      constructorId,
      carNumber: 4,
      gridPosition: 1
    }).getValue();

    const result = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.RACE,
      seasonEntries: [regularEntry],
      roundNumber: 1
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /pertence a equipe\/construtor diferente/);
  });

  it('deve permitir piloto sem SeasonEntry em sessão de Treino Livre (FP1 - caso Antonelli)', () => {
    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-07'),
      sessionId,
      driverId: otherDriverId,
      teamId,
      constructorId,
      carNumber: 12
    }).getValue();

    const result = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.FP1,
      seasonEntries: [regularEntry],
      roundNumber: 1
    });

    assert.equal(result.isSuccess, true);
  });

  it('deve aprovar piloto com SeasonEntry regular ativa em FP2 e FP3', () => {
    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-07b'),
      sessionId,
      driverId,
      teamId,
      constructorId,
      carNumber: 4
    }).getValue();

    const resFp2 = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.FP2,
      seasonEntries: [regularEntry],
      roundNumber: 1
    });
    assert.equal(resFp2.isSuccess, true);

    const resFp3 = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.FP3,
      seasonEntries: [regularEntry],
      roundNumber: 1
    });
    assert.equal(resFp3.isSuccess, true);
  });

  it('deve rejeitar piloto em treino livre quando equipe diverge da SeasonEntry ativa', () => {
    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-fp-diff-team'),
      sessionId,
      driverId,
      teamId: otherTeamId,
      constructorId,
      carNumber: 4
    }).getValue();

    const result = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.FP1,
      seasonEntries: [regularEntry],
      roundNumber: 1
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /equipe divergente da informada no treino livre/);
  });

  it('deve rejeitar piloto em treino livre quando número do carro diverge da SeasonEntry ativa', () => {
    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-fp-diff-num'),
      sessionId,
      driverId,
      teamId,
      constructorId,
      carNumber: 99
    }).getValue();

    const result = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.FP1,
      seasonEntries: [regularEntry],
      roundNumber: 1
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /Número do carro \(99\) diverge da inscrição oficial/);
  });

  it('deve permitir piloto em treino livre quando possui inscrição mas não está ativo na rodada', () => {
    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-fp-inactive-round'),
      sessionId,
      driverId: EntityId.from<'driver'>('driver-bearman'),
      teamId: otherTeamId,
      constructorId: EntityId.from<'constructor'>('constructor-ferrari'),
      carNumber: 38
    }).getValue();

    // substituteEntry é válida apenas no round 2; no round 1 não há activeEntry
    const result = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.FP1,
      seasonEntries: [substituteEntry],
      roundNumber: 1
    });

    assert.equal(result.isSuccess, true);
  });

  it('deve validar parâmetros ausentes ou inválidos', () => {
    // @ts-expect-error teste com argumentos nulos
    const res1 = validateSessionParticipantEligibility({});
    assert.equal(res1.isFailure, true);
    assert.equal(res1.getError().code, DomainErrorCode.INVALID_ARGUMENT);

    const sessionEntry = SessionEntry.create({
      id: EntityId.from<'session-entry'>('se-08'),
      sessionId,
      driverId,
      teamId,
      constructorId,
      carNumber: 4
    }).getValue();

    const res2 = validateSessionParticipantEligibility({
      sessionEntry,
      sessionType: SessionType.RACE,
      seasonEntries: [regularEntry],
      roundNumber: 0 // Invalido
    });
    assert.equal(res2.isFailure, true);
    assert.equal(res2.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });
});
