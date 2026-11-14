/**
 * ============================================================================
 * F1Atlas — Testes Unitários: season-event-validator
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { EntityId } from '../../src/shared/entity-id.ts';
import { DomainErrorCode } from '../../src/shared/domain-error.ts';
import { Season } from '../../src/seasons/season.ts';
import { GrandPrix, GrandPrixFormat } from '../../src/events/grand-prix.ts';
import { validateSeasonGrandPrixConsistency } from '../../src/seasons/season-event-validator.ts';

describe('Validador de Consistência Temporada-Evento (INV-TR-SE-EV-01 e 02)', () => {
  const seasonId = EntityId.from<'season'>('season-2025');
  const otherSeasonId = EntityId.from<'season'>('season-2024');
  const gpId = EntityId.from<'grand-prix'>('gp-aus-2025');
  const circuitId = EntityId.from<'circuit'>('circuit-melbourne');

  const baseSeason = Season.create({
    id: seasonId,
    year: 2025,
    description: '2025 FIA Formula One World Championship'
  }).getValue();

  const seasonWithGp = baseSeason.scheduleGrandPrix({
    grandPrixId: gpId,
    roundNumber: 1,
    name: 'Australian Grand Prix',
    startDate: new Date('2025-03-14T00:00:00Z'),
    endDate: new Date('2025-03-16T23:59:59Z')
  }).getValue();

  const validGp = GrandPrix.create({
    id: gpId,
    seasonId,
    circuitId,
    name: 'Australian Grand Prix',
    roundNumber: 1,
    format: GrandPrixFormat.STANDARD,
    startDate: new Date('2025-03-14T00:00:00Z'),
    endDate: new Date('2025-03-16T23:59:59Z')
  }).getValue();

  it('deve aprovar GrandPrix consistente com o agendamento da Temporada', () => {
    const result = validateSeasonGrandPrixConsistency({
      season: seasonWithGp,
      grandPrix: validGp
    });

    assert.equal(result.isSuccess, true);
  });

  it('deve rejeitar quando o seasonId do GrandPrix diverge da Temporada', () => {
    const gpWrongSeason = GrandPrix.create({
      id: gpId,
      seasonId: otherSeasonId, // Diverge de season-2025
      circuitId,
      name: 'Australian Grand Prix',
      roundNumber: 1,
      format: GrandPrixFormat.STANDARD,
      startDate: new Date('2025-03-14T00:00:00Z'),
      endDate: new Date('2025-03-16T23:59:59Z')
    }).getValue();

    const result = validateSeasonGrandPrixConsistency({
      season: seasonWithGp,
      grandPrix: gpWrongSeason
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /foi vinculado à temporada/);
  });

  it('deve rejeitar quando a rodada do GrandPrix não consta no calendário da Temporada', () => {
    const gpWrongRound = GrandPrix.create({
      id: gpId,
      seasonId,
      circuitId,
      name: 'Australian Grand Prix',
      roundNumber: 99, // Não agendado
      format: GrandPrixFormat.STANDARD,
      startDate: new Date('2025-03-14T00:00:00Z'),
      endDate: new Date('2025-03-16T23:59:59Z')
    }).getValue();

    const result = validateSeasonGrandPrixConsistency({
      season: seasonWithGp,
      grandPrix: gpWrongRound
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.ENTITY_NOT_FOUND);
    assert.match(result.getError().message, /não consta no calendário oficial/);
  });

  it('deve rejeitar quando o identificador do GP diverge do agendado para aquela rodada', () => {
    const differentGpId = EntityId.from<'grand-prix'>('gp-different-id');
    const gpWrongId = GrandPrix.create({
      id: differentGpId,
      seasonId,
      circuitId,
      name: 'Australian Grand Prix',
      roundNumber: 1,
      format: GrandPrixFormat.STANDARD,
      startDate: new Date('2025-03-14T00:00:00Z'),
      endDate: new Date('2025-03-16T23:59:59Z')
    }).getValue();

    const result = validateSeasonGrandPrixConsistency({
      season: seasonWithGp,
      grandPrix: gpWrongId
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /diverge do agendado para a rodada 1/);
  });

  it('deve rejeitar quando a temporada estiver cancelada', () => {
    const cancelledSeason = seasonWithGp.cancelSeason('Cancelamento administrativo por força maior').getValue();

    const result = validateSeasonGrandPrixConsistency({
      season: cancelledSeason,
      grandPrix: validGp
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_STATE);
    assert.match(result.getError().message, /temporada cancelada/);
  });

  it('deve validar parâmetros ausentes ou nulos', () => {
    // @ts-expect-error teste de chamada inválida
    const res = validateSeasonGrandPrixConsistency({});
    assert.equal(res.isFailure, true);
    assert.equal(res.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });
});
