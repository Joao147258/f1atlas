import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { DriverStandings, StandingStatus } from '../../src/championships/driver-standings.ts';
import type { DriverStandingEntry } from '../../src/championships/driver-standings.ts';

function createMockEntry(rank: number, driverId: string, points: number): DriverStandingEntry {
  return {
    rank,
    driverId: EntityId.from<'driver'>(driverId),
    constructorId: EntityId.from<'constructor'>('team-1'),
    points,
    wins: rank === 1 ? 1 : 0,
    podiums: rank <= 3 ? 1 : 0,
    gpFinishes: [rank],
    sprintFinishes: [],
    rankChange: 0
  };
}

describe('DriverStandings — Projeção Imutável WDC (Invariantes)', () => {
  test('deve instanciar DriverStandings válida com sequencialidade estrita (1..N)', () => {
    const entries = [
      createMockEntry(1, 'verstappen', 25),
      createMockEntry(2, 'norris', 18),
      createMockEntry(3, 'leclerc', 15)
    ];

    const res = DriverStandings.create({
      id: EntityId.from<'driver-standings'>('wdc-2025-r1'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 1,
      status: StandingStatus.OFFICIAL,
      entries
    });

    assert.equal(res.isSuccess, true);
    const standings = res.getValue();
    assert.equal(standings.entries.length, 3);
    assert.equal(standings.getLeader()?.driverId.value, 'verstappen');
    assert.equal(standings.getPointsGapToLeader(EntityId.from<'driver'>('norris')), 7);
    assert.equal(standings.getPointsGapToLeader(EntityId.from<'driver'>('verstappen')), 0);
    assert.equal(Object.isFrozen(standings), true);
    assert.equal(Object.isFrozen(standings.entries), true);
  });

  test('INV-CH-01: deve rejeitar quebra de sequencialidade de posições (buracos no rank)', () => {
    const brokenEntries = [
      createMockEntry(1, 'verstappen', 25),
      createMockEntry(3, 'norris', 18) // pulou rank 2!
    ];

    const res = DriverStandings.create({
      id: EntityId.from<'driver-standings'>('wdc-2025-r1'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 1,
      status: StandingStatus.OFFICIAL,
      entries: brokenEntries
    });

    assert.equal(res.isFailure, true);
    assert.match(res.getError().message, /INV-CH-01/);
  });

  test('INV-CH-02: deve rejeitar piloto duplicado na mesma tabela de classificação', () => {
    const duplicateEntries = [
      createMockEntry(1, 'norris', 25),
      createMockEntry(2, 'norris', 18) // mesmo piloto!
    ];

    const res = DriverStandings.create({
      id: EntityId.from<'driver-standings'>('wdc-2025-r1'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 1,
      status: StandingStatus.OFFICIAL,
      entries: duplicateEntries
    });

    assert.equal(res.isFailure, true);
    assert.match(res.getError().message, /INV-CH-02/);
  });

  test('INV-CH-03: deve rejeitar quebra da ordem não-crescente de pontos', () => {
    const disorderedEntries = [
      createMockEntry(1, 'verstappen', 20),
      createMockEntry(2, 'norris', 25) // P2 com mais pontos que P1!
    ];

    const res = DriverStandings.create({
      id: EntityId.from<'driver-standings'>('wdc-2025-r1'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 1,
      status: StandingStatus.OFFICIAL,
      entries: disorderedEntries
    });

    assert.equal(res.isFailure, true);
    assert.match(res.getError().message, /INV-CH-03/);
  });

  test('getEntry deve retornar null com segurança para piloto não classificado', () => {
    const entries = [createMockEntry(1, 'verstappen', 25)];
    const standings = DriverStandings.create({
      id: EntityId.from<'driver-standings'>('wdc-2025-r1'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 1,
      status: StandingStatus.OFFICIAL,
      entries
    }).getValue();

    assert.equal(standings.getEntry(EntityId.from<'driver'>('unknown-driver')), null);
    assert.equal(standings.getPointsGapToLeader(EntityId.from<'driver'>('unknown-driver')), null);
    // @ts-expect-error teste defensivo com null
    assert.equal(standings.getEntry(null), null);
  });

  test('deve validar argumentos nulos ou inválidos na criação de DriverStandings', () => {
    // @ts-expect-error teste de runtime
    assert.equal(DriverStandings.create(null).isFailure, true);

    const baseValid = {
      id: EntityId.from<'driver-standings'>('wdc-1'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 1,
      status: StandingStatus.OFFICIAL,
      entries: [createMockEntry(1, 'verstappen', 25)]
    };

    // id ausente
    // @ts-expect-error teste de runtime
    assert.equal(DriverStandings.create({ ...baseValid, id: null }).isFailure, true);

    // seasonId ausente
    // @ts-expect-error teste de runtime
    assert.equal(DriverStandings.create({ ...baseValid, seasonId: null }).isFailure, true);

    // roundNumber negativo
    assert.equal(DriverStandings.create({ ...baseValid, roundNumber: -1 }).isFailure, true);

    // status inválido
    // @ts-expect-error teste de runtime
    assert.equal(DriverStandings.create({ ...baseValid, status: 'INVALID' }).isFailure, true);

    // entries não array
    // @ts-expect-error teste de runtime
    assert.equal(DriverStandings.create({ ...baseValid, entries: 'not-array' }).isFailure, true);

    // driverId de entrada inválido
    const invalidEntry = { ...createMockEntry(1, 'drv-1', 25), driverId: null };
    // @ts-expect-error teste de runtime
    assert.equal(DriverStandings.create({ ...baseValid, entries: [invalidEntry] }).isFailure, true);

    // pontos de entrada negativos ou NaN
    const nanPointsEntry = { ...createMockEntry(1, 'drv-1', NaN) };
    assert.equal(DriverStandings.create({ ...baseValid, entries: [nanPointsEntry] }).isFailure, true);
  });

  test('deve aceitar updatedAt explicitamente e suportar getLeader em tabela vazia', () => {
    const fixedDate = new Date('2025-05-01T12:00:00Z');
    const emptyStandings = DriverStandings.create({
      id: EntityId.from<'driver-standings'>('wdc-empty'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 0,
      status: StandingStatus.OFFICIAL,
      entries: [],
      updatedAt: fixedDate
    }).getValue();

    assert.equal(emptyStandings.getLeader(), null);
    assert.equal(emptyStandings.entries.length, 0);
    assert.equal(emptyStandings.updatedAt.toISOString(), fixedDate.toISOString());
  });
});
