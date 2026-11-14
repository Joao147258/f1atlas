import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { SessionResult, ResultStatus, PublicationState } from '../../src/events/session-result.ts';
import { ScoringRuleset } from '../../src/scoring/scoring-ruleset.ts';
import { StandingsCalculator } from '../../src/championships/standings-calculator.ts';
import type { ScoredSessionData } from '../../src/championships/standings-calculator.ts';
import { StandingStatus } from '../../src/championships/driver-standings.ts';

function createResult(props: {
  id: string;
  driverId: string;
  constructorId: string;
  position: number;
  status?: ResultStatus;
  fastestLapRank?: number | null;
  publicationState?: PublicationState;
}): SessionResult {
  return SessionResult.create({
    id: EntityId.from<'session-result'>(props.id),
    sessionId: EntityId.from<'session'>('ses-gen'),
    driverId: EntityId.from<'driver'>(props.driverId),
    teamId: EntityId.from<'team'>(`team-${props.constructorId}`),
    constructorId: EntityId.from<'constructor'>(props.constructorId),
    position: props.position,
    lapsCompleted: 70,
    status: props.status ?? ResultStatus.FINISHED,
    fastestLapRank: props.fastestLapRank ?? null,
    publicationState: props.publicationState ?? PublicationState.OFFICIAL
  }).getValue();
}

describe('StandingsCalculator — Evolução Progressiva em Duas Etapas (WDC e WCC)', () => {
  const seasonId = EntityId.from<'season'>('season-2025');
  const ruleset = ScoringRuleset.create2025Ruleset().getValue();

  test('deve calcular corretamente Round 1 e Round 2 com inversão de liderança e rankChange exato', () => {
    // --- ROUND 1 (Austrália GP) ---
    const round1Sessions: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createResult({ id: 'r1-norris', driverId: 'norris', constructorId: 'mclaren', position: 1 }), // 25 pts
          createResult({ id: 'r1-verstappen', driverId: 'verstappen', constructorId: 'redbull', position: 2 }), // 18 pts
          createResult({ id: 'r1-leclerc', driverId: 'leclerc', constructorId: 'ferrari', position: 3 }) // 15 pts
        ]
      }
    ];

    const wdcR1Res = StandingsCalculator.calculateDriverStandings({
      seasonId,
      roundNumber: 1,
      sessions: round1Sessions,
      ruleset
    });

    assert.equal(wdcR1Res.isSuccess, true);
    const wdcR1 = wdcR1Res.getValue();

    assert.equal(wdcR1.getLeader()?.driverId.value, 'norris');
    assert.equal(wdcR1.getEntry(EntityId.from<'driver'>('norris'))?.points, 25);
    assert.equal(wdcR1.getEntry(EntityId.from<'driver'>('norris'))?.rankChange, 0);
    assert.equal(wdcR1.getEntry(EntityId.from<'driver'>('verstappen'))?.points, 18);

    // --- ROUND 2 (China — Sprint + Grand Prix) ---
    const round2Sessions: ScoredSessionData[] = [
      ...round1Sessions,
      {
        roundNumber: 2,
        sessionType: 'SPRINT',
        results: [
          createResult({ id: 'r2s-verstappen', driverId: 'verstappen', constructorId: 'redbull', position: 1 }), // 8 pts
          createResult({ id: 'r2s-norris', driverId: 'norris', constructorId: 'mclaren', position: 2 }) // 7 pts
        ]
      },
      {
        roundNumber: 2,
        sessionType: 'RACE',
        results: [
          createResult({ id: 'r2r-verstappen', driverId: 'verstappen', constructorId: 'redbull', position: 1 }), // 25 pts
          createResult({ id: 'r2r-norris', driverId: 'norris', constructorId: 'mclaren', position: 2 }) // 18 pts
        ]
      }
    ];

    const wdcR2Res = StandingsCalculator.calculateDriverStandings({
      seasonId,
      roundNumber: 2,
      sessions: round2Sessions,
      ruleset,
      previousStandings: wdcR1
    });

    assert.equal(wdcR2Res.isSuccess, true);
    const wdcR2 = wdcR2Res.getValue();

    // Verstappen: 18 + 8 + 25 = 51 pts (Líder! Subiu de P2 para P1 -> rankChange = +1)
    const verstappenEntry = wdcR2.getEntry(EntityId.from<'driver'>('verstappen'));
    assert.equal(verstappenEntry?.points, 51);
    assert.equal(verstappenEntry?.rank, 1);
    assert.equal(verstappenEntry?.rankChange, 1);
    assert.equal(verstappenEntry?.wins, 1);

    // Norris: 25 + 7 + 18 = 50 pts (Vice-líder! Caiu de P1 para P2 -> rankChange = -1)
    const norrisEntry = wdcR2.getEntry(EntityId.from<'driver'>('norris'));
    assert.equal(norrisEntry?.points, 50);
    assert.equal(norrisEntry?.rank, 2);
    assert.equal(norrisEntry?.rankChange, -1);
    assert.equal(norrisEntry?.wins, 1);

    // WCC Round 2
    const wccR2Res = StandingsCalculator.calculateConstructorStandings({
      seasonId,
      roundNumber: 2,
      sessions: round2Sessions,
      ruleset
    });

    assert.equal(wccR2Res.isSuccess, true);
    const wccR2 = wccR2Res.getValue();
    assert.equal(wccR2.getLeader()?.constructorId.value, 'redbull');
    assert.equal(wccR2.getLeader()?.points, 51);
    assert.equal(wccR2.getEntry(EntityId.from<'constructor'>('mclaren'))?.points, 50);
  });
});

describe('StandingsCalculator — Trocas de Equipe Intra-Temporada', () => {
  const seasonId = EntityId.from<'season'>('season-2025');
  const ruleset = ScoringRuleset.create2025Ruleset().getValue();

  test('pontos do WDC acompanham o piloto; pontos do WCC permanecem na equipe do veículo', () => {
    // Cenário: Sainz corre pela Ferrari no Round 1 e marca 15 pts (P3).
    // No Round 2, Sainz corre pela Williams e marca 10 pts (P5).
    const sessions: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createResult({ id: 'r1-sainz', driverId: 'sainz', constructorId: 'ferrari', position: 3 }) // 15 pts
        ]
      },
      {
        roundNumber: 2,
        sessionType: 'RACE',
        results: [
          createResult({ id: 'r2-sainz', driverId: 'sainz', constructorId: 'williams', position: 5 }) // 10 pts
        ]
      }
    ];

    // WDC: Sainz deve ter 15 + 10 = 25 pontos e equipe Williams (mais recente)
    const wdcRes = StandingsCalculator.calculateDriverStandings({
      seasonId,
      roundNumber: 2,
      sessions,
      ruleset
    });

    assert.equal(wdcRes.isSuccess, true);
    const sainzEntry = wdcRes.getValue().getEntry(EntityId.from<'driver'>('sainz'));
    assert.equal(sainzEntry?.points, 25);
    assert.equal(sainzEntry?.constructorId.value, 'williams');

    // WCC: Ferrari deve reter 15 pontos; Williams deve ter 10 pontos
    const wccRes = StandingsCalculator.calculateConstructorStandings({
      seasonId,
      roundNumber: 2,
      sessions,
      ruleset
    });

    assert.equal(wccRes.isSuccess, true);
    const wcc = wccRes.getValue();
    assert.equal(wcc.getEntry(EntityId.from<'constructor'>('ferrari'))?.points, 15);
    assert.equal(wcc.getEntry(EntityId.from<'constructor'>('williams'))?.points, 10);
  });
});

describe('StandingsCalculator — Desempate por Countback da FIA e Isolamento de Simulações', () => {
  const seasonId = EntityId.from<'season'>('season-2025');
  const ruleset = ScoringRuleset.create2025Ruleset().getValue();

  test('deve aplicar TieBreakPolicy para desempatar competidores com mesma pontuação', () => {
    // Piloto A: 1 vitória (P1: 25 pts) + 1x P10 (1 pt) = 26 pts
    // Piloto B: 0 vitórias, 2x P4 (12 + 12 = 24 pts) + 1x P9 (2 pts) = 26 pts
    const sessions: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createResult({ id: 'r1-a', driverId: 'driverA', constructorId: 'teamA', position: 1 }), // 25
          createResult({ id: 'r1-b', driverId: 'driverB', constructorId: 'teamB', position: 4 }) // 12
        ]
      },
      {
        roundNumber: 2,
        sessionType: 'RACE',
        results: [
          createResult({ id: 'r2-a', driverId: 'driverA', constructorId: 'teamA', position: 10 }), // 1
          createResult({ id: 'r2-b', driverId: 'driverB', constructorId: 'teamB', position: 4 }) // 12
        ]
      },
      {
        roundNumber: 3,
        sessionType: 'RACE',
        results: [
          createResult({ id: 'r3-b', driverId: 'driverB', constructorId: 'teamB', position: 9 }) // 2 -> Total B = 26 pts
        ]
      }
    ];

    const wdcRes = StandingsCalculator.calculateDriverStandings({
      seasonId,
      roundNumber: 3,
      sessions,
      ruleset
    });

    assert.equal(wdcRes.isSuccess, true);
    const wdc = wdcRes.getValue();

    // Ambos com 26 pontos, mas driverA tem 1 vitória em GP vs 0 de driverB
    assert.equal(wdc.entries[0].driverId.value, 'driverA');
    assert.equal(wdc.entries[0].rank, 1);
    assert.equal(wdc.entries[0].points, 26);
    assert.equal(wdc.entries[1].driverId.value, 'driverB');
    assert.equal(wdc.entries[1].rank, 2);
    assert.equal(wdc.entries[1].points, 26);
  });

  test('INV-CH-05: deve rejeitar resultados SIMULATED em apuração oficial', () => {
    const sessionsWithSimulated: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createResult({
            id: 'r1-sim',
            driverId: 'norris',
            constructorId: 'mclaren',
            position: 1,
            publicationState: PublicationState.SIMULATED
          })
        ]
      }
    ];

    const res = StandingsCalculator.calculateDriverStandings({
      seasonId,
      roundNumber: 1,
      sessions: sessionsWithSimulated,
      ruleset,
      isSimulation: false // apuração oficial
    });

    assert.equal(res.isFailure, true);
    assert.match(res.getError().message, /INV-CH-05/);
  });

  test('deve permitir cálculo em modo simulação emitindo status SIMULATED', () => {
    const sessionsWithSimulated: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createResult({
            id: 'r1-sim',
            driverId: 'norris',
            constructorId: 'mclaren',
            position: 1,
            publicationState: PublicationState.SIMULATED
          })
        ]
      }
    ];

    const res = StandingsCalculator.calculateDriverStandings({
      seasonId,
      roundNumber: 1,
      sessions: sessionsWithSimulated,
      ruleset,
      isSimulation: true // modo simulação
    });

    assert.equal(res.isSuccess, true);
    assert.equal(res.getValue().status, StandingStatus.SIMULATED);

    const resConstructor = StandingsCalculator.calculateConstructorStandings({
      seasonId,
      roundNumber: 1,
      sessions: sessionsWithSimulated,
      ruleset,
      isSimulation: true
    });
    assert.equal(resConstructor.isSuccess, true);
    assert.equal(resConstructor.getValue().status, StandingStatus.SIMULATED);
  });

  test('deve validar argumentos inválidos na chamada de calculateDriverStandings', () => {
    // @ts-expect-error teste de runtime
    assert.equal(StandingsCalculator.calculateDriverStandings(null).isFailure, true);

    const validBase = {
      seasonId,
      roundNumber: 1,
      sessions: [],
      ruleset
    };

    // seasonId nulo
    // @ts-expect-error teste de runtime
    assert.equal(StandingsCalculator.calculateDriverStandings({ ...validBase, seasonId: null }).isFailure, true);

    // roundNumber negativo
    assert.equal(StandingsCalculator.calculateDriverStandings({ ...validBase, roundNumber: -1 }).isFailure, true);

    // ruleset ausente
    // @ts-expect-error teste de runtime
    assert.equal(StandingsCalculator.calculateDriverStandings({ ...validBase, ruleset: null }).isFailure, true);
  });

  test('deve validar argumentos inválidos na chamada de calculateConstructorStandings', () => {
    // @ts-expect-error teste de runtime
    assert.equal(StandingsCalculator.calculateConstructorStandings(null).isFailure, true);

    const validBase = {
      seasonId,
      roundNumber: 1,
      sessions: [],
      ruleset
    };

    // @ts-expect-error teste de runtime
    assert.equal(StandingsCalculator.calculateConstructorStandings({ ...validBase, seasonId: null }).isFailure, true);
    assert.equal(StandingsCalculator.calculateConstructorStandings({ ...validBase, roundNumber: -1 }).isFailure, true);
    // @ts-expect-error teste de runtime
    assert.equal(StandingsCalculator.calculateConstructorStandings({ ...validBase, ruleset: null }).isFailure, true);
  });

  test('INV-CH-05: deve rejeitar resultados SIMULATED em apuração oficial de construtores', () => {
    const sessionsWithSim: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createResult({
            id: 'r1-sim',
            driverId: 'norris',
            constructorId: 'mclaren',
            position: 1,
            publicationState: PublicationState.SIMULATED
          })
        ]
      }
    ];

    const res = StandingsCalculator.calculateConstructorStandings({
      seasonId,
      roundNumber: 1,
      sessions: sessionsWithSim,
      ruleset,
      isSimulation: false
    });

    assert.equal(res.isFailure, true);
    assert.match(res.getError().message, /INV-CH-05/);
  });

  test('deve calcular rankChange para construtores quando previousStandings for fornecido', () => {
    const round1Sessions: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createResult({ id: 'r1-mcl', driverId: 'norris', constructorId: 'mclaren', position: 1 }), // 25
          createResult({ id: 'r1-fer', driverId: 'leclerc', constructorId: 'ferrari', position: 2 }) // 18
        ]
      }
    ];

    const wccR1 = StandingsCalculator.calculateConstructorStandings({
      seasonId,
      roundNumber: 1,
      sessions: round1Sessions,
      ruleset
    }).getValue();

    const round2Sessions: ScoredSessionData[] = [
      ...round1Sessions,
      {
        roundNumber: 2,
        sessionType: 'RACE',
        results: [
          createResult({ id: 'r2-fer', driverId: 'leclerc', constructorId: 'ferrari', position: 1 }), // 25 -> Total 43
          createResult({ id: 'r2-mcl', driverId: 'norris', constructorId: 'mclaren', position: 10 }) // 1 -> Total 26
        ]
      },
      {
        // Sessão com round 3 (deve ser ignorada no round 2)
        roundNumber: 3,
        sessionType: 'RACE',
        results: [
          createResult({ id: 'r3-mcl', driverId: 'norris', constructorId: 'mclaren', position: 1 })
        ]
      }
    ];

    const wccR2 = StandingsCalculator.calculateConstructorStandings({
      seasonId,
      roundNumber: 2,
      sessions: round2Sessions,
      ruleset,
      previousStandings: wccR1
    }).getValue();

    // Ferrari subiu de P2 para P1 -> rankChange = +1
    const ferrariEntry = wccR2.getEntry(EntityId.from<'constructor'>('ferrari'));
    assert.equal(ferrariEntry?.rank, 1);
    assert.equal(ferrariEntry?.rankChange, 1);

    // McLaren caiu de P1 para P2 -> rankChange = -1
    const mclarenEntry = wccR2.getEntry(EntityId.from<'constructor'>('mclaren'));
    assert.equal(mclarenEntry?.rank, 2);
    assert.equal(mclarenEntry?.rankChange, -1);
  });
});
