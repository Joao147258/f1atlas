/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes de Integração
 * ============================================================================
 *
 * Suíte de Testes de Integração: Participants <-> Events (M2.1-IT-D)
 * Arquivo: packages/domain/test/integration/participants-events.integration.test.ts
 *
 * Objetivo Arquitetural:
 * Validar a consistência e o fluxo de dados entre inscrições de competidores (SeasonEntry)
 * e a dinâmica de pista (SessionEntry, Session, SessionResult).
 * ============================================================================
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { EntityId } from '../../src/shared/entity-id.ts';
import { SeasonEntry } from '../../src/participants/season-entry.ts';
import { EntryRole } from '../../src/participants/entry-role.ts';
import { Session, SessionType } from '../../src/events/session.ts';
import {
  SessionEntry,
  SessionEntryStatus,
  validateSessionEntries
} from '../../src/events/session-entry.ts';
import {
  SessionResult,
  ResultStatus,
  PublicationState
} from '../../src/events/session-result.ts';

describe('M2.1-IT-D — Integração Participants <-> Events (INT-03)', () => {
  const seasonId = EntityId.from<'season'>('season-2025');
  const gpId = EntityId.from<'grand-prix'>('gp-australia-2025');
  const sessionId = EntityId.from<'session'>('session-race-aus');

  // IDs dos participantes
  const driverNorrisId = EntityId.from<'driver'>('norris');
  const driverVerstappenId = EntityId.from<'driver'>('verstappen');
  const driverPiastriId = EntityId.from<'driver'>('piastri');
  const driverPerezId = EntityId.from<'driver'>('perez');

  const teamMcLarenId = EntityId.from<'team'>('team-mclaren');
  const teamRedBullId = EntityId.from<'team'>('team-redbull');
  const constructorMcLarenId = EntityId.from<'constructor'>('mclaren');
  const constructorRedBullId = EntityId.from<'constructor'>('redbull');

  function buildSeasonEntries() {
    const norrisEntry = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('se-nor-2025'),
      seasonId,
      driverId: driverNorrisId,
      teamId: teamMcLarenId,
      constructorId: constructorMcLarenId,
      carNumber: 4,
      role: EntryRole.REGULAR,
      startRound: 1
    }).getValue();

    const piastriEntry = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('se-pia-2025'),
      seasonId,
      driverId: driverPiastriId,
      teamId: teamMcLarenId,
      constructorId: constructorMcLarenId,
      carNumber: 81,
      role: EntryRole.REGULAR,
      startRound: 1
    }).getValue();

    const verstappenEntry = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('se-ver-2025'),
      seasonId,
      driverId: driverVerstappenId,
      teamId: teamRedBullId,
      constructorId: constructorRedBullId,
      carNumber: 1,
      role: EntryRole.REGULAR,
      startRound: 1
    }).getValue();

    const perezEntry = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('se-per-2025'),
      seasonId,
      driverId: driverPerezId,
      teamId: teamRedBullId,
      constructorId: constructorRedBullId,
      carNumber: 11,
      role: EntryRole.REGULAR,
      startRound: 1
    }).getValue();

    return { norrisEntry, piastriEntry, verstappenEntry, perezEntry };
  }

  test('IT-PA-EV-01 — deve alinhar participantes no grid da sessão utilizando os contratos de SeasonEntry', () => {
    const { norrisEntry, piastriEntry, verstappenEntry, perezEntry } = buildSeasonEntries();

    const session = Session.create({
      id: sessionId,
      grandPrixId: gpId,
      type: SessionType.RACE,
      scheduledStartTime: new Date('2025-03-16T04:00:00.000Z')
    }).getValue();

    // Cria as entradas de grid (SessionEntry) derivadas dos contratos de inscrição
    const seNorris = SessionEntry.create({
      id: EntityId.from<'session-entry'>('grid-norris'),
      sessionId: session.id,
      driverId: norrisEntry.driverId,
      teamId: norrisEntry.teamId,
      constructorId: norrisEntry.constructorId,
      carNumber: norrisEntry.carNumber,
      gridPosition: 1
    }).getValue();

    const seVerstappen = SessionEntry.create({
      id: EntityId.from<'session-entry'>('grid-verstappen'),
      sessionId: session.id,
      driverId: verstappenEntry.driverId,
      teamId: verstappenEntry.teamId,
      constructorId: verstappenEntry.constructorId,
      carNumber: verstappenEntry.carNumber,
      gridPosition: 2
    }).getValue();

    const sePiastri = SessionEntry.create({
      id: EntityId.from<'session-entry'>('grid-piastri'),
      sessionId: session.id,
      driverId: piastriEntry.driverId,
      teamId: piastriEntry.teamId,
      constructorId: piastriEntry.constructorId,
      carNumber: piastriEntry.carNumber,
      gridPosition: 3
    }).getValue();

    const sePerez = SessionEntry.create({
      id: EntityId.from<'session-entry'>('grid-perez'),
      sessionId: session.id,
      driverId: perezEntry.driverId,
      teamId: perezEntry.teamId,
      constructorId: perezEntry.constructorId,
      carNumber: perezEntry.carNumber,
      gridPosition: 4
    }).getValue();

    // Validação de unicidade e integridade do grid de largada
    const gridValidation = validateSessionEntries([seNorris, seVerstappen, sePiastri, sePerez]);
    assert.equal(gridValidation.isSuccess, true);

    // Preservação exata de identificadores entre SeasonEntry e SessionEntry
    assert.equal(seNorris.driverId.equals(norrisEntry.driverId), true);
    assert.equal(seNorris.carNumber, norrisEntry.carNumber);
    assert.equal(seVerstappen.constructorId.equals(verstappenEntry.constructorId), true);
  });

  test('IT-PA-EV-02 — deve validar largada pelo pit lane (EVT-INV-009) sem colisão com o grid de largada', () => {
    const { norrisEntry, perezEntry } = buildSeasonEntries();

    // Norris larga em P1 no grid
    const seNorris = SessionEntry.create({
      id: EntityId.from<'session-entry'>('grid-norris-p1'),
      sessionId,
      driverId: norrisEntry.driverId,
      teamId: norrisEntry.teamId,
      constructorId: norrisEntry.constructorId,
      carNumber: norrisEntry.carNumber,
      gridPosition: 1,
      startedFromPitLane: false
    }).getValue();

    // Perez larga do pit lane devido a troca de asa / componentes
    const sePerezPitLane = SessionEntry.create({
      id: EntityId.from<'session-entry'>('grid-perez-pit'),
      sessionId,
      driverId: perezEntry.driverId,
      teamId: perezEntry.teamId,
      constructorId: perezEntry.constructorId,
      carNumber: perezEntry.carNumber,
      gridPosition: null, // Regra EVT-INV-009: sem posição física no grid
      startedFromPitLane: true
    }).getValue();

    assert.equal(sePerezPitLane.startedFromPitLane, true);
    assert.equal(sePerezPitLane.gridPosition, null);

    // A validação de grid aceita o alinhamento sem colisão
    const validation = validateSessionEntries([seNorris, sePerezPitLane]);
    assert.equal(validation.isSuccess, true);

    // Invariante de violação: largar do pit lane com posição preenchida deve falhar
    const invalidPitLane = SessionEntry.create({
      id: EntityId.from<'session-entry'>('invalid-pit'),
      sessionId,
      driverId: perezEntry.driverId,
      teamId: perezEntry.teamId,
      constructorId: perezEntry.constructorId,
      carNumber: perezEntry.carNumber,
      gridPosition: 5, // Ilegal com startedFromPitLane: true
      startedFromPitLane: true
    });
    assert.equal(invalidPitLane.isSuccess, false);
  });

  test('IT-PA-EV-03 — deve gerar e certificar resultados da sessão com aplicação da regra dos 90% (Art. 62.1 FIA)', () => {
    const { norrisEntry, verstappenEntry, piastriEntry, perezEntry } = buildSeasonEntries();
    const totalRaceLaps = 58;

    // 1. Norris vence (P1)
    const resNorris = SessionResult.create({
      id: EntityId.from<'session-result'>('res-norris'),
      sessionId,
      driverId: norrisEntry.driverId,
      teamId: norrisEntry.teamId,
      constructorId: norrisEntry.constructorId,
      position: 1,
      lapsCompleted: totalRaceLaps,
      status: ResultStatus.FINISHED,
      totalTimeMillis: 5400000,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    // 2. Verstappen em P2
    const resVerstappen = SessionResult.create({
      id: EntityId.from<'session-result'>('res-verstappen'),
      sessionId,
      driverId: verstappenEntry.driverId,
      teamId: verstappenEntry.teamId,
      constructorId: verstappenEntry.constructorId,
      position: 2,
      lapsCompleted: totalRaceLaps,
      status: ResultStatus.FINISHED,
      totalTimeMillis: 5402500,
      gapMillis: 2500,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    // 3. Piastri abandona na volta 54 (54 / 58 = 93.1% das voltas do vencedor)
    // Conforme FIA Artigo 62.1, ele completou >= 90% e é CLASSIFICADO em P3!
    const resPiastri = SessionResult.create({
      id: EntityId.from<'session-result'>('res-piastri'),
      sessionId,
      driverId: piastriEntry.driverId,
      teamId: piastriEntry.teamId,
      constructorId: piastriEntry.constructorId,
      position: 3, // Posição concedida conforme voltas completadas
      lapsCompleted: 54,
      status: ResultStatus.DNF,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    // 4. Perez abandona na volta 20 (20 / 58 = 34.5% das voltas)
    // Menos de 90%: NÃO CLASSIFICADO (NC) e sem posição numérica!
    const resPerez = SessionResult.create({
      id: EntityId.from<'session-result'>('res-perez'),
      sessionId,
      driverId: perezEntry.driverId,
      teamId: perezEntry.teamId,
      constructorId: perezEntry.constructorId,
      position: null,
      lapsCompleted: 20,
      status: ResultStatus.NC,
      publicationState: PublicationState.OFFICIAL
    }).getValue();

    assert.equal(resNorris.position, 1);
    assert.equal(resVerstappen.position, 2);
    assert.equal(resPiastri.position, 3);
    assert.equal(resPiastri.status, ResultStatus.DNF);
    assert.equal(resPerez.position, null);
    assert.equal(resPerez.status, ResultStatus.NC);
  });

  test('IT-PA-EV-04 — deve aplicar revisão dos comissários (applyStewardsRevision) com rastreabilidade auditável', () => {
    const { verstappenEntry } = buildSeasonEntries();

    const originalResult = SessionResult.create({
      id: EntityId.from<'session-result'>('res-ver-provisional'),
      sessionId,
      driverId: verstappenEntry.driverId,
      teamId: verstappenEntry.teamId,
      constructorId: verstappenEntry.constructorId,
      position: 1,
      lapsCompleted: 58,
      status: ResultStatus.FINISHED,
      publicationState: PublicationState.PROVISIONAL
    }).getValue();

    // Comissários aplicam penalidade de tempo (+5s) que faz o piloto cair para P2
    const revisionRes = originalResult.applyStewardsRevision({
      newPosition: 2,
      penaltyTimeMillis: 5000,
      reason: 'Infração de limites de pista na curva 4 (Artigo 33.3 da FIA)'
    });

    assert.equal(revisionRes.isSuccess, true);
    const revisedResult = revisionRes.getValue();

    // Novo estado é REVISED com a nova posição
    assert.equal(revisedResult.position, 2);
    assert.equal(revisedResult.publicationState, PublicationState.REVISED);
    assert.match(revisedResult.revisionReason ?? '', /Infração de limites de pista/);

    // Instância original permanece inalterada (imutabilidade copy-on-write)
    assert.equal(originalResult.position, 1);
    assert.equal(originalResult.publicationState, PublicationState.PROVISIONAL);
  });

  test('IT-PA-EV-05 — lacuna arquitetural: SessionEntry não valida vigência da inscrição de temporada', () => {
    // Comprova que SessionEntry aceita qualquer combinação sintática de IDs válida.
    // Ele não consulta SeasonEntry.isActiveInRound(R) em runtime.
    const unassociatedDriverId = EntityId.from<'driver'>('driver-guest');

    const guestSessionEntryRes = SessionEntry.create({
      id: EntityId.from<'session-entry'>('grid-guest'),
      sessionId,
      driverId: unassociatedDriverId, // Piloto sem SeasonEntry para a equipe!
      teamId: teamMcLarenId,
      constructorId: constructorMcLarenId,
      carNumber: 99,
      gridPosition: 10
    });

    // A criação é bem-sucedida porque a validação é local:
    assert.equal(guestSessionEntryRes.isSuccess, true);

    // O teste comprova documentalmente que o domínio precisa de uma regra transversal
    // ou caso de uso que valide a elegibilidade:
    const { norrisEntry } = buildSeasonEntries();
    const isDriverRegisteredForTeam = norrisEntry.driverId.equals(guestSessionEntryRes.getValue().driverId);
    assert.equal(isDriverRegisteredForTeam, false);
  });
});
