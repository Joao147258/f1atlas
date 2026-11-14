import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { ConstructorStandings } from '../../src/championships/constructor-standings.ts';
import type { ConstructorStandingEntry } from '../../src/championships/constructor-standings.ts';
import { StandingStatus } from '../../src/championships/driver-standings.ts';

function createMockConstructorEntry(rank: number, constructorId: string, points: number): ConstructorStandingEntry {
  return {
    rank,
    constructorId: EntityId.from<'constructor'>(constructorId),
    points,
    wins: rank === 1 ? 1 : 0,
    podiums: rank <= 2 ? 1 : 0,
    gpFinishes: [rank],
    sprintFinishes: [],
    rankChange: 0
  };
}

describe('ConstructorStandings — Projeção Imutável WCC (Invariantes)', () => {
  test('deve instanciar ConstructorStandings válida com ordenação sequencial', () => {
    const entries = [
      createMockConstructorEntry(1, 'mclaren', 43),
      createMockConstructorEntry(2, 'ferrari', 30),
      createMockConstructorEntry(3, 'redbull', 25)
    ];

    const res = ConstructorStandings.create({
      id: EntityId.from<'constructor-standings'>('wcc-2025-r1'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 1,
      status: StandingStatus.OFFICIAL,
      entries
    });

    assert.equal(res.isSuccess, true);
    const standings = res.getValue();
    assert.equal(standings.entries.length, 3);
    assert.equal(standings.getLeader()?.constructorId.value, 'mclaren');
    assert.equal(standings.getPointsGapToLeader(EntityId.from<'constructor'>('ferrari')), 13);
    assert.equal(standings.getPointsGapToLeader(EntityId.from<'constructor'>('mclaren')), 0);
    assert.equal(Object.isFrozen(standings), true);
    assert.equal(Object.isFrozen(standings.entries), true);
  });

  test('INV-CH-02: deve rejeitar construtor duplicado na mesma tabela', () => {
    const duplicateEntries = [
      createMockConstructorEntry(1, 'ferrari', 40),
      createMockConstructorEntry(2, 'ferrari', 20) // duplicado!
    ];

    const res = ConstructorStandings.create({
      id: EntityId.from<'constructor-standings'>('wcc-2025-r1'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 1,
      status: StandingStatus.OFFICIAL,
      entries: duplicateEntries
    });

    assert.equal(res.isFailure, true);
    assert.match(res.getError().message, /INV-CH-02/);
  });

  test('INV-CH-01: deve rejeitar quebra de sequencialidade no ranking', () => {
    const brokenEntries = [
      createMockConstructorEntry(1, 'mclaren', 40),
      createMockConstructorEntry(3, 'ferrari', 20) // pulou rank 2!
    ];

    const res = ConstructorStandings.create({
      id: EntityId.from<'constructor-standings'>('wcc-2025-r1'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 1,
      status: StandingStatus.OFFICIAL,
      entries: brokenEntries
    });

    assert.equal(res.isFailure, true);
    assert.match(res.getError().message, /INV-CH-01/);
  });

  test('getEntry deve retornar null com segurança para construtor inexistente', () => {
    const entries = [createMockConstructorEntry(1, 'ferrari', 40)];
    const standings = ConstructorStandings.create({
      id: EntityId.from<'constructor-standings'>('wcc-2025-r1'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 1,
      status: StandingStatus.OFFICIAL,
      entries
    }).getValue();

    assert.equal(standings.getEntry(EntityId.from<'constructor'>('unknown-team')), null);
    assert.equal(standings.getPointsGapToLeader(EntityId.from<'constructor'>('unknown-team')), null);
    // @ts-expect-error teste defensivo com null
    assert.equal(standings.getEntry(null), null);
  });

  test('deve validar argumentos nulos ou inválidos na criação de ConstructorStandings', () => {
    // @ts-expect-error teste de runtime
    assert.equal(ConstructorStandings.create(null).isFailure, true);

    const baseValid = {
      id: EntityId.from<'constructor-standings'>('wcc-1'),
      seasonId: EntityId.from<'season'>('s2025'),
      roundNumber: 1,
      status: StandingStatus.OFFICIAL,
      entries: [createMockConstructorEntry(1, 'ferrari', 40)]
    };

    // id ausente
    // @ts-expect-error teste de runtime
    assert.equal(ConstructorStandings.create({ ...baseValid, id: null }).isFailure, true);

    // seasonId ausente
    // @ts-expect-error teste de runtime
    assert.equal(ConstructorStandings.create({ ...baseValid, seasonId: null }).isFailure, true);

    // roundNumber negativo
    assert.equal(ConstructorStandings.create({ ...baseValid, roundNumber: -1 }).isFailure, true);

    // status inválido
    // @ts-expect-error teste de runtime
    assert.equal(ConstructorStandings.create({ ...baseValid, status: 'INVALID' }).isFailure, true);

    // entries não array
    // @ts-expect-error teste de runtime
    assert.equal(ConstructorStandings.create({ ...baseValid, entries: 'not-array' }).isFailure, true);

    // constructorId de entrada inválido
    const invalidEntry = { ...createMockConstructorEntry(1, 'con-1', 40), constructorId: null };
    // @ts-expect-error teste de runtime
    assert.equal(ConstructorStandings.create({ ...baseValid, entries: [invalidEntry] }).isFailure, true);

    // pontos de entrada negativos ou NaN
    const nanPointsEntry = { ...createMockConstructorEntry(1, 'con-1', NaN) };
    assert.equal(ConstructorStandings.create({ ...baseValid, entries: [nanPointsEntry] }).isFailure, true);
  });

  test('deve aceitar updatedAt explicitamente e suportar getLeader em tabela vazia', () => {
    const fixedDate = new Date('2025-05-01T12:00:00Z');
    const emptyStandings = ConstructorStandings.create({
      id: EntityId.from<'constructor-standings'>('wcc-empty'),
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
