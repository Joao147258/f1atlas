/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes de Integração
 * ============================================================================
 *
 * Suíte de Testes de Integração: Scoring <-> Championships
 * Arquivo: packages/domain/test/integration/scoring-championships.integration.test.ts
 *
 * Objetivo Arquitetural:
 * Validar a colaboração funcional entre os módulos reais `scoring` e `championships`
 * consumindo registros factológicos de eventos (`events/session-result.ts`).
 *
 * Princípios da Suíte:
 * 1. Domínio puro em TypeScript (sem mocks, sem ORM, sem frameworks web).
 * 2. Oráculos de teste independentes (cálculos manuais baseados em regulamento FIA).
 * 3. Cobertura estrita dos cenários normativos INT-SC-01 a INT-SC-12.
 * 4. Determinismo e isolamento absoluto entre casos de teste.
 * ============================================================================
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { EntityId } from '../../src/shared/entity-id.ts';
import { DomainErrorCode } from '../../src/shared/domain-error.ts';
import {
  SessionResult,
  ResultStatus,
  PublicationState
} from '../../src/events/session-result.ts';
import {
  ScoringRuleset,
  DistanceBracket
} from '../../src/scoring/scoring-ruleset.ts';
import { PointsCalculator } from '../../src/scoring/points-calculator.ts';
import { TieBreakPolicy, TieBreakCriterion } from '../../src/scoring/tie-break-policy.ts';
import {
  StandingsCalculator,
  type ScoredSessionData
} from '../../src/championships/standings-calculator.ts';
import { StandingStatus } from '../../src/championships/driver-standings.ts';

// ============================================================================
// FIXTURES & BUILDERS TIPADOS
// ============================================================================

interface SessionResultProps {
  id: string;
  driverId: string;
  constructorId: string;
  position?: number | null;
  lapsCompleted?: number;
  status?: ResultStatus;
  fastestLapRank?: number | null;
  publicationState?: PublicationState;
  sessionId?: string;
  teamId?: string;
}

/**
 * Cria instâncias imutáveis e válidas de SessionResult utilizando a factory do domínio.
 */
function createSessionResult(props: SessionResultProps): SessionResult {
  const isFinished = props.status === undefined || props.status === ResultStatus.FINISHED;
  const inferredPosition = props.position !== undefined ? props.position : (isFinished ? 1 : null);

  const res = SessionResult.create({
    id: EntityId.from<'session-result'>(props.id),
    sessionId: EntityId.from<'session'>(props.sessionId ?? 'session-gp'),
    driverId: EntityId.from<'driver'>(props.driverId),
    teamId: EntityId.from<'team'>(props.teamId ?? `team-${props.constructorId}`),
    constructorId: EntityId.from<'constructor'>(props.constructorId),
    position: inferredPosition,
    lapsCompleted: props.lapsCompleted ?? 70,
    status: props.status ?? ResultStatus.FINISHED,
    fastestLapRank: props.fastestLapRank ?? null,
    publicationState: props.publicationState ?? PublicationState.OFFICIAL
  });

  if (!res.isSuccess) {
    throw new Error(`Erro ao instanciar SessionResult [${props.id}]: ${res.getError().message}`);
  }

  return res.getValue();
}

// ============================================================================
// SUÍTE DE TESTES DE INTEGRAÇÃO
// ============================================================================

describe('Integração de Domínio: Scoring <-> Championships', () => {
  const season2025Id = EntityId.from<'season'>('season-2025');
  const ruleset2025 = ScoringRuleset.create2025Ruleset().getValue();

  // --------------------------------------------------------------------------
  // INT-SC-01 — Pontuação de uma corrida
  // --------------------------------------------------------------------------
  test('INT-SC-01 — deve consumir corretamente os pontos produzidos pelo regulamento em uma corrida', () => {
    // 4 pilotos cruzando a linha em P1..P4
    const raceResults = [
      createSessionResult({ id: 'r1-norris', driverId: 'norris', constructorId: 'mclaren', position: 1 }),
      createSessionResult({ id: 'r1-verstappen', driverId: 'verstappen', constructorId: 'redbull', position: 2 }),
      createSessionResult({ id: 'r1-leclerc', driverId: 'leclerc', constructorId: 'ferrari', position: 3 }),
      createSessionResult({ id: 'r1-piastri', driverId: 'piastri', constructorId: 'mclaren', position: 4 })
    ];

    const sessionData: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: raceResults
      }
    ];

    const calcResult = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions: sessionData,
      ruleset: ruleset2025
    });

    assert.equal(calcResult.isSuccess, true);
    const standings = calcResult.getValue();

    // Oráculos Independentes: Tabela FIA 2025 [25, 18, 15, 12]
    const norris = standings.getEntry(EntityId.from<'driver'>('norris'));
    const verstappen = standings.getEntry(EntityId.from<'driver'>('verstappen'));
    const leclerc = standings.getEntry(EntityId.from<'driver'>('leclerc'));
    const piastri = standings.getEntry(EntityId.from<'driver'>('piastri'));

    assert.ok(norris);
    assert.equal(norris.rank, 1);
    assert.equal(norris.points, 25);
    assert.equal(norris.wins, 1);
    assert.equal(norris.podiums, 1);

    assert.ok(verstappen);
    assert.equal(verstappen.rank, 2);
    assert.equal(verstappen.points, 18);
    assert.equal(verstappen.wins, 0);
    assert.equal(verstappen.podiums, 1);

    assert.ok(leclerc);
    assert.equal(leclerc.rank, 3);
    assert.equal(leclerc.points, 15);
    assert.equal(leclerc.podiums, 1);

    assert.ok(piastri);
    assert.equal(piastri.rank, 4);
    assert.equal(piastri.points, 12);
    assert.equal(piastri.podiums, 0);

    // Gaps calculados para o líder
    assert.equal(standings.getPointsGapToLeader(EntityId.from<'driver'>('norris')), 0);
    assert.equal(standings.getPointsGapToLeader(EntityId.from<'driver'>('verstappen')), 7);
    assert.equal(standings.getPointsGapToLeader(EntityId.from<'driver'>('leclerc')), 10);
    assert.equal(standings.getPointsGapToLeader(EntityId.from<'driver'>('piastri')), 13);
  });

  // --------------------------------------------------------------------------
  // INT-SC-02 — Acumulação entre múltiplas corridas
  // --------------------------------------------------------------------------
  test('INT-SC-02 — deve acumular pontuações entre múltiplas etapas com rastreabilidade de rankChange', () => {
    // Três etapas consecutivas com alternância de posições
    // R1: Norris (P1: 25), Verstappen (P2: 18), Hamilton (P3: 15), Russell (P4: 12)
    const r1Sessions: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r1-nor', driverId: 'norris', constructorId: 'mclaren', position: 1 }),
          createSessionResult({ id: 'r1-ver', driverId: 'verstappen', constructorId: 'redbull', position: 2 }),
          createSessionResult({ id: 'r1-ham', driverId: 'hamilton', constructorId: 'ferrari', position: 3 }),
          createSessionResult({ id: 'r1-rus', driverId: 'russell', constructorId: 'mercedes', position: 4 })
        ]
      }
    ];

    const r1StandingsRes = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions: r1Sessions,
      ruleset: ruleset2025
    });
    assert.equal(r1StandingsRes.isSuccess, true);
    const r1Standings = r1StandingsRes.getValue();

    // R2: Verstappen (P1: 25), Hamilton (P2: 18), Russell (P3: 15), Norris (P4: 12)
    // Acumulado R2:
    // Verstappen: 18 + 25 = 43 pts (Líder! rank 1, subiu de rank 2 -> rankChange: +1)
    // Norris: 25 + 12 = 37 pts (rank 2, caiu de rank 1 -> rankChange: -1)
    // Hamilton: 15 + 18 = 33 pts (rank 3, manteve rank 3 -> rankChange: 0)
    // Russell: 12 + 15 = 27 pts (rank 4, manteve rank 4 -> rankChange: 0)
    const r2Sessions: ScoredSessionData[] = [
      ...r1Sessions,
      {
        roundNumber: 2,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r2-ver', driverId: 'verstappen', constructorId: 'redbull', position: 1 }),
          createSessionResult({ id: 'r2-ham', driverId: 'hamilton', constructorId: 'ferrari', position: 2 }),
          createSessionResult({ id: 'r2-rus', driverId: 'russell', constructorId: 'mercedes', position: 3 }),
          createSessionResult({ id: 'r2-nor', driverId: 'norris', constructorId: 'mclaren', position: 4 })
        ]
      }
    ];

    const r2StandingsRes = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 2,
      sessions: r2Sessions,
      ruleset: ruleset2025,
      previousStandings: r1Standings
    });
    assert.equal(r2StandingsRes.isSuccess, true);
    const r2Standings = r2StandingsRes.getValue();

    const verR2 = r2Standings.getEntry(EntityId.from<'driver'>('verstappen'));
    const norR2 = r2Standings.getEntry(EntityId.from<'driver'>('norris'));
    assert.equal(verR2?.rank, 1);
    assert.equal(verR2?.points, 43);
    assert.equal(verR2?.rankChange, 1); // Subiu 1 posição

    assert.equal(norR2?.rank, 2);
    assert.equal(norR2?.points, 37);
    assert.equal(norR2?.rankChange, -1); // Desceu 1 posição

    // R3: Russell (P1: 25), Norris (P2: 18), Verstappen (P3: 15), Hamilton (P4: 12)
    // Acumulado R3:
    // Verstappen: 43 + 15 = 58 pts (rank 1, manteve -> rankChange: 0)
    // Norris: 37 + 18 = 55 pts (rank 2, manteve -> rankChange: 0)
    // Russell: 27 + 25 = 52 pts (rank 3, subiu de rank 4 -> rankChange: +1)
    // Hamilton: 33 + 12 = 45 pts (rank 4, caiu de rank 3 -> rankChange: -1)
    const r3Sessions: ScoredSessionData[] = [
      ...r2Sessions,
      {
        roundNumber: 3,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r3-rus', driverId: 'russell', constructorId: 'mercedes', position: 1 }),
          createSessionResult({ id: 'r3-nor', driverId: 'norris', constructorId: 'mclaren', position: 2 }),
          createSessionResult({ id: 'r3-ver', driverId: 'verstappen', constructorId: 'redbull', position: 3 }),
          createSessionResult({ id: 'r3-ham', driverId: 'hamilton', constructorId: 'ferrari', position: 4 })
        ]
      }
    ];

    const r3StandingsRes = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 3,
      sessions: r3Sessions,
      ruleset: ruleset2025,
      previousStandings: r2Standings
    });
    assert.equal(r3StandingsRes.isSuccess, true);
    const r3Standings = r3StandingsRes.getValue();

    const verR3 = r3Standings.getEntry(EntityId.from<'driver'>('verstappen'));
    const norR3 = r3Standings.getEntry(EntityId.from<'driver'>('norris'));
    const rusR3 = r3Standings.getEntry(EntityId.from<'driver'>('russell'));
    const hamR3 = r3Standings.getEntry(EntityId.from<'driver'>('hamilton'));

    assert.equal(verR3?.rank, 1);
    assert.equal(verR3?.points, 58);
    assert.equal(verR3?.rankChange, 0);

    assert.equal(norR3?.rank, 2);
    assert.equal(norR3?.points, 55);
    assert.equal(norR3?.rankChange, 0);

    assert.equal(rusR3?.rank, 3);
    assert.equal(rusR3?.points, 52);
    assert.equal(rusR3?.rankChange, 1); // Subiu de P4 para P3

    assert.equal(hamR3?.rank, 4);
    assert.equal(hamR3?.points, 45);
    assert.equal(hamR3?.rankChange, -1); // Caiu de P3 para P4
  });

  // --------------------------------------------------------------------------
  // INT-SC-03 — Empate em pontos e desempate (Countback FIA Artigo 7.2)
  // --------------------------------------------------------------------------
  test('INT-SC-03 — deve resolver empates em pontos aplicando determinismo estrito da TieBreakPolicy', () => {
    // Cenário: Norris e Verstappen empatam com 50 pontos.
    // Verstappen: 2 vitórias (R1: P1=25, R2: P1=25) -> 50 pts, finishes: [1, 1]
    // Norris: 0 vitórias, mas pontuou em 4 etapas (R1: P2=18, R2: P2=18, R3: P4=12, R4: P9=2) -> 50 pts, finishes: [2, 2, 4, 9]
    const sessions: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r1-ver', driverId: 'verstappen', constructorId: 'redbull', position: 1 }),
          createSessionResult({ id: 'r1-nor', driverId: 'norris', constructorId: 'mclaren', position: 2 })
        ]
      },
      {
        roundNumber: 2,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r2-ver', driverId: 'verstappen', constructorId: 'redbull', position: 1 }),
          createSessionResult({ id: 'r2-nor', driverId: 'norris', constructorId: 'mclaren', position: 2 })
        ]
      },
      {
        roundNumber: 3,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r3-nor', driverId: 'norris', constructorId: 'mclaren', position: 4 })
        ]
      },
      {
        roundNumber: 4,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r4-nor', driverId: 'norris', constructorId: 'mclaren', position: 9 })
        ]
      }
    ];

    const standingsRes = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 4,
      sessions,
      ruleset: ruleset2025
    });

    assert.equal(standingsRes.isSuccess, true);
    const standings = standingsRes.getValue();

    const verEntry = standings.getEntry(EntityId.from<'driver'>('verstappen'));
    const norEntry = standings.getEntry(EntityId.from<'driver'>('norris'));

    // Pontos rigorosamente iguais
    assert.equal(verEntry?.points, 50);
    assert.equal(norEntry?.points, 50);

    // Verstappen supera Norris no countback por ter 2 vitórias contra 0
    assert.equal(verEntry?.rank, 1);
    assert.equal(norEntry?.rank, 2);

    // Validação complementar direta da TieBreakPolicy comprovando o critério GP_POSITIONS
    const tieResult = TieBreakPolicy.compare(
      { id: 'verstappen', points: 50, gpFinishes: [1, 1] },
      { id: 'norris', points: 50, gpFinishes: [2, 2, 4, 9] },
      false
    );
    assert.equal(tieResult.winnerId, 'verstappen');
    assert.equal(tieResult.decisiveCriterion, TieBreakCriterion.GP_POSITIONS);
    assert.equal(tieResult.decisivePosition, 1);
    assert.equal(tieResult.winnerCount, 2);
    assert.equal(tieResult.loserCount, 0);
  });

  // --------------------------------------------------------------------------
  // INT-SC-04 — Classificação de construtores e substituição de pilotos
  // --------------------------------------------------------------------------
  test('INT-SC-04 — deve somar múltiplos pilotos para a mesma equipe e atribuir pontos a piloto reserva no WCC', () => {
    // Etapa 1: McLaren e Ferrari com suas duplas regulares
    // McLaren: Norris (P1: 25) + Piastri (P3: 15) = 40 pts
    // Ferrari: Leclerc (P2: 18) + Sainz (P4: 12) = 30 pts
    const round1Sessions: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r1-nor', driverId: 'norris', constructorId: 'mclaren', position: 1 }),
          createSessionResult({ id: 'r1-lec', driverId: 'leclerc', constructorId: 'ferrari', position: 2 }),
          createSessionResult({ id: 'r1-pia', driverId: 'piastri', constructorId: 'mclaren', position: 3 }),
          createSessionResult({ id: 'r1-sai', driverId: 'sainz', constructorId: 'ferrari', position: 4 })
        ]
      }
    ];

    const wccR1Res = StandingsCalculator.calculateConstructorStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions: round1Sessions,
      ruleset: ruleset2025
    });
    assert.equal(wccR1Res.isSuccess, true);
    const wccR1 = wccR1Res.getValue();

    assert.equal(wccR1.getEntry(EntityId.from<'constructor'>('mclaren'))?.points, 40);
    assert.equal(wccR1.getEntry(EntityId.from<'constructor'>('ferrari'))?.points, 30);
    assert.equal(wccR1.getLeader()?.constructorId.value, 'mclaren');

    // Etapa 2: Substituição na Ferrari! Sainz não corre, corre Bearman (reserva)
    // Ferrari: Leclerc (P3: 15) + Bearman (P7: 6) = 21 pts na etapa
    // McLaren: Norris (P2: 18) + Piastri (P4: 12) = 30 pts na etapa
    // WCC acumulado:
    // McLaren: 40 + 30 = 70 pts
    // Ferrari: 30 + 21 = 51 pts
    const round2Sessions: ScoredSessionData[] = [
      ...round1Sessions,
      {
        roundNumber: 2,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r2-nor', driverId: 'norris', constructorId: 'mclaren', position: 2 }),
          createSessionResult({ id: 'r2-lec', driverId: 'leclerc', constructorId: 'ferrari', position: 3 }),
          createSessionResult({ id: 'r2-pia', driverId: 'piastri', constructorId: 'mclaren', position: 4 }),
          createSessionResult({ id: 'r2-bea', driverId: 'bearman', constructorId: 'ferrari', position: 7 })
        ]
      }
    ];

    const wccR2Res = StandingsCalculator.calculateConstructorStandings({
      seasonId: season2025Id,
      roundNumber: 2,
      sessions: round2Sessions,
      ruleset: ruleset2025,
      previousStandings: wccR1
    });
    assert.equal(wccR2Res.isSuccess, true);
    const wccR2 = wccR2Res.getValue();

    const mclarenEntry = wccR2.getEntry(EntityId.from<'constructor'>('mclaren'));
    const ferrariEntry = wccR2.getEntry(EntityId.from<'constructor'>('ferrari'));

    assert.equal(mclarenEntry?.rank, 1);
    assert.equal(mclarenEntry?.points, 70);
    assert.equal(ferrariEntry?.rank, 2);
    assert.equal(ferrariEntry?.points, 51);

    // No WDC, os pontos são pessoais: Bearman tem 6, Sainz tem 12, Leclerc tem 33
    const wdcR2Res = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 2,
      sessions: round2Sessions,
      ruleset: ruleset2025
    });
    assert.equal(wdcR2Res.isSuccess, true);
    const wdcR2 = wdcR2Res.getValue();

    assert.equal(wdcR2.getEntry(EntityId.from<'driver'>('bearman'))?.points, 6);
    assert.equal(wdcR2.getEntry(EntityId.from<'driver'>('sainz'))?.points, 12);
    assert.equal(wdcR2.getEntry(EntityId.from<'driver'>('leclerc'))?.points, 33);
  });

  // --------------------------------------------------------------------------
  // INT-SC-05 — Corrida com pontuação reduzida (Artigo 6.5 FIA)
  // --------------------------------------------------------------------------
  test('INT-SC-05 — deve calcular e acumular pontuações reduzidas por interrupção climática (Art. 6.5)', () => {
    // Corrida com distância entre 50% e 75% (PCT_50_TO_75)
    // Tabela regulamentar: P1=19, P2=14, P3=12, P4=10, P5=8, P6=6, P7=4, P8=3, P9=2, P10=1
    const reducedSessionData: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        distanceBracket: DistanceBracket.PCT_50_TO_75,
        results: [
          createSessionResult({ id: 'r1-ver', driverId: 'verstappen', constructorId: 'redbull', position: 1 }), // 19 pts
          createSessionResult({ id: 'r1-nor', driverId: 'norris', constructorId: 'mclaren', position: 2 }), // 14 pts
          createSessionResult({ id: 'r1-lec', driverId: 'leclerc', constructorId: 'ferrari', position: 3 }), // 12 pts
          createSessionResult({ id: 'r1-pia', driverId: 'piastri', constructorId: 'mclaren', position: 4 }), // 10 pts
          createSessionResult({ id: 'r1-hul', driverId: 'hulkenberg', constructorId: 'haas', position: 10 }), // 1 pt
          createSessionResult({ id: 'r1-zho', driverId: 'zhou', constructorId: 'sauber', position: 11 }) // 0 pts
        ]
      }
    ];

    const standingsRes = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions: reducedSessionData,
      ruleset: ruleset2025
    });

    assert.equal(standingsRes.isSuccess, true);
    const standings = standingsRes.getValue();

    assert.equal(standings.getEntry(EntityId.from<'driver'>('verstappen'))?.points, 19);
    assert.equal(standings.getEntry(EntityId.from<'driver'>('norris'))?.points, 14);
    assert.equal(standings.getEntry(EntityId.from<'driver'>('leclerc'))?.points, 12);
    assert.equal(standings.getEntry(EntityId.from<'driver'>('piastri'))?.points, 10);
    assert.equal(standings.getEntry(EntityId.from<'driver'>('hulkenberg'))?.points, 1);
    assert.equal(standings.getEntry(EntityId.from<'driver'>('zhou'))?.points, 0);
  });

  // --------------------------------------------------------------------------
  // INT-SC-06 — Participantes sem pontuação (fora da zona de pontos)
  // --------------------------------------------------------------------------
  test('INT-SC-06 — deve manter participantes classificados fora dos pontos com 0 pts e ordenação coerente', () => {
    const sessionData: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r1-nor', driverId: 'norris', constructorId: 'mclaren', position: 1 }), // 25 pts
          createSessionResult({ id: 'r1-alo', driverId: 'alonso', constructorId: 'astonmartin', position: 11 }), // 0 pts
          createSessionResult({ id: 'r1-str', driverId: 'stroll', constructorId: 'astonmartin', position: 12 }) // 0 pts
        ]
      }
    ];

    const standingsRes = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions: sessionData,
      ruleset: ruleset2025
    });

    assert.equal(standingsRes.isSuccess, true);
    const standings = standingsRes.getValue();

    const alonso = standings.getEntry(EntityId.from<'driver'>('alonso'));
    const stroll = standings.getEntry(EntityId.from<'driver'>('stroll'));

    assert.ok(alonso);
    assert.equal(alonso.points, 0);
    assert.equal(alonso.rank, 2); // Alonso P11 é rank 2 atrás de Norris

    assert.ok(stroll);
    assert.equal(stroll.points, 0);
    assert.equal(stroll.rank, 3); // Stroll P12 é rank 3 atrás de Alonso

    assert.deepEqual(alonso.gpFinishes, [11]);
    assert.deepEqual(stroll.gpFinishes, [12]);
  });

  // --------------------------------------------------------------------------
  // INT-SC-07 — Resultados não elegíveis (DSQ, DNF 90% FIA Art. 62.1, NC, DNS)
  // --------------------------------------------------------------------------
  test('INT-SC-07 — deve aplicar corretamente regras de elegibilidade (DSQ = 0 pts, DNF 90% pontua, NC/DNS = 0 pts)', () => {
    // Vencedor deu 70 voltas (P1 = 25 pts)
    // Piloto 2 (DNF com 65 voltas completadas: 65/70 = 92.8% >= 90% -> Classificado em P10 -> 1 pt)
    // Piloto 3 (DSQ desclassificado -> 0 pts absolutos, position null)
    // Piloto 4 (NC não classificado com 40 voltas -> 0 pts, position null)
    // Piloto 5 (DNS não largou -> 0 pts, lapsCompleted 0, position null)
    const sessionData: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createSessionResult({
            id: 'r1-win',
            driverId: 'winner',
            constructorId: 'team1',
            position: 1,
            lapsCompleted: 70,
            status: ResultStatus.FINISHED
          }),
          createSessionResult({
            id: 'r1-dnf-90',
            driverId: 'dnf-classified',
            constructorId: 'team2',
            position: 10,
            lapsCompleted: 65,
            status: ResultStatus.DNF
          }),
          createSessionResult({
            id: 'r1-dsq',
            driverId: 'dsq-driver',
            constructorId: 'team3',
            position: null,
            lapsCompleted: 70,
            status: ResultStatus.DSQ
          }),
          createSessionResult({
            id: 'r1-nc',
            driverId: 'nc-driver',
            constructorId: 'team4',
            position: null,
            lapsCompleted: 40,
            status: ResultStatus.NC
          }),
          createSessionResult({
            id: 'r1-dns',
            driverId: 'dns-driver',
            constructorId: 'team5',
            position: null,
            lapsCompleted: 0,
            status: ResultStatus.DNS
          })
        ]
      }
    ];

    const standingsRes = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions: sessionData,
      ruleset: ruleset2025
    });

    assert.equal(standingsRes.isSuccess, true);
    const standings = standingsRes.getValue();

    const winner = standings.getEntry(EntityId.from<'driver'>('winner'));
    const dnfClassified = standings.getEntry(EntityId.from<'driver'>('dnf-classified'));
    const dsqDriver = standings.getEntry(EntityId.from<'driver'>('dsq-driver'));
    const ncDriver = standings.getEntry(EntityId.from<'driver'>('nc-driver'));
    const dnsDriver = standings.getEntry(EntityId.from<'driver'>('dns-driver'));

    assert.equal(winner?.points, 25);
    assert.equal(dnfClassified?.points, 1); // Pontua pelo Art. 62.1 da FIA!
    assert.equal(dsqDriver?.points, 0);
    assert.equal(ncDriver?.points, 0);
    assert.equal(dnsDriver?.points, 0);

    // DSQ não deve registrar chegadas válidas em gpFinishes
    assert.deepEqual(dsqDriver?.gpFinishes, []);
  });

  // --------------------------------------------------------------------------
  // INT-SC-08 — Isolamento de simulações (INV-CH-05)
  // --------------------------------------------------------------------------
  test('INT-SC-08 — deve rejeitar resultados SIMULATED em apuração oficial e isolar classificações simuladas', () => {
    const simResult = createSessionResult({
      id: 'sim-result-1',
      driverId: 'verstappen',
      constructorId: 'redbull',
      position: 1,
      publicationState: PublicationState.SIMULATED
    });

    const sessions: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [simResult]
      }
    ];

    // 1. Apuração oficial de Pilotos DEVE rejeitar com DomainError
    const officialWdcRes = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions,
      ruleset: ruleset2025,
      isSimulation: false
    });
    assert.equal(officialWdcRes.isFailure, true);
    assert.equal(officialWdcRes.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);

    // 2. Apuração oficial de Construtores DEVE rejeitar com DomainError
    const officialWccRes = StandingsCalculator.calculateConstructorStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions,
      ruleset: ruleset2025,
      isSimulation: false
    });
    assert.equal(officialWccRes.isFailure, true);
    assert.equal(officialWccRes.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);

    // 3. Em modo simulação explícito (isSimulation: true), o cálculo é permitido e emite status SIMULATED
    const simWdcRes = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions,
      ruleset: ruleset2025,
      isSimulation: true
    });
    assert.equal(simWdcRes.isSuccess, true);
    const simStandings = simWdcRes.getValue();
    assert.equal(simStandings.status, StandingStatus.SIMULATED);
    assert.ok(simStandings.id.value.endsWith('-sim'));
  });

  // --------------------------------------------------------------------------
  // INT-SC-09 — Idempotência e consistência de reprocessamento
  // --------------------------------------------------------------------------
  test('INT-SC-09 — reprocessamento com os mesmos dados de entrada deve ser determinístico e idempotente', () => {
    const sessions: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r1-nor', driverId: 'norris', constructorId: 'mclaren', position: 1 }),
          createSessionResult({ id: 'r1-ver', driverId: 'verstappen', constructorId: 'redbull', position: 2 })
        ]
      }
    ];

    const runA = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions,
      ruleset: ruleset2025
    }).getValue();

    const runB = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions,
      ruleset: ruleset2025
    }).getValue();

    // Idempotência funcional: mesmas identidades, mesmos pontos, mesma ordenação
    assert.equal(runA.id.value, runB.id.value);
    assert.equal(runA.entries.length, runB.entries.length);
    for (let i = 0; i < runA.entries.length; i++) {
      assert.equal(runA.entries[i].driverId.value, runB.entries[i].driverId.value);
      assert.equal(runA.entries[i].points, runB.entries[i].points);
      assert.equal(runA.entries[i].rank, runB.entries[i].rank);
    }
  });

  // --------------------------------------------------------------------------
  // INT-SC-10 — Integridade temporal e filtragem sequencial de rodadas
  // --------------------------------------------------------------------------
  test('INT-SC-10 — deve ordenar cronologicamente sessões desordenadas e ignorar etapas posteriores ao roundNumber', () => {
    // Sessões passadas em ordem invertida: Round 3, Round 1, Round 2
    const disorderedSessions: ScoredSessionData[] = [
      {
        roundNumber: 3,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r3-ver', driverId: 'verstappen', constructorId: 'redbull', position: 1 })
        ]
      },
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r1-nor', driverId: 'norris', constructorId: 'mclaren', position: 1 })
        ]
      },
      {
        roundNumber: 2,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r2-nor', driverId: 'norris', constructorId: 'mclaren', position: 2 })
        ]
      }
    ];

    // Se solicitamos o fechamento da Rodada 2, a Rodada 3 deve ser ignorada
    const standingsR2Res = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 2,
      sessions: disorderedSessions,
      ruleset: ruleset2025
    });

    assert.equal(standingsR2Res.isSuccess, true);
    const standingsR2 = standingsR2Res.getValue();

    // Norris: P1 em R1 (25) + P2 em R2 (18) = 43 pts
    // Verstappen: apenas correu em R3, logo não deve constar na tabela de R2!
    assert.equal(standingsR2.getEntry(EntityId.from<'driver'>('norris'))?.points, 43);
    assert.equal(standingsR2.getEntry(EntityId.from<'driver'>('verstappen')), null);
  });

  // --------------------------------------------------------------------------
  // INT-SC-11 — Compatibilidade entre temporadas (2024 com FL vs 2025 sem FL)
  // --------------------------------------------------------------------------
  test('INT-SC-11 — deve refletir diferenças regulamentares históricas entre temporadas (2024 vs 2025)', () => {
    const ruleset2024 = ScoringRuleset.create2024Ruleset().getValue();
    const season2024Id = EntityId.from<'season'>('season-2024');

    // Piloto vence e crava a volta mais rápida (fastestLapRank: 1)
    const gpResults = [
      createSessionResult({
        id: 'r1-ham',
        driverId: 'hamilton',
        constructorId: 'mercedes',
        position: 1,
        fastestLapRank: 1
      })
    ];

    const sessionData: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: gpResults
      }
    ];

    // Temporada 2024: 25 pontos da vitória + 1 ponto bônus da melhor volta = 26 pts
    const wdc2024 = StandingsCalculator.calculateDriverStandings({
      seasonId: season2024Id,
      roundNumber: 1,
      sessions: sessionData,
      ruleset: ruleset2024
    }).getValue();
    assert.equal(wdc2024.getEntry(EntityId.from<'driver'>('hamilton'))?.points, 26);

    // Temporada 2025: 25 pontos da vitória + 0 bônus (abolição FIA WMSC) = 25 pts
    const wdc2025 = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions: sessionData,
      ruleset: ruleset2025
    }).getValue();
    assert.equal(wdc2025.getEntry(EntityId.from<'driver'>('hamilton'))?.points, 25);
  });

  // --------------------------------------------------------------------------
  // INT-SC-12 — Determinismo e ausência de efeitos colaterais
  // --------------------------------------------------------------------------
  test('INT-SC-12 — deve garantir determinismo em cenário complexo de Sprint e Grand Prix', () => {
    const fullWeekendSessions: ScoredSessionData[] = [
      {
        roundNumber: 1,
        sessionType: 'SPRINT',
        results: [
          createSessionResult({ id: 'r1s-ver', driverId: 'verstappen', constructorId: 'redbull', position: 1 }), // 8 pts
          createSessionResult({ id: 'r1s-nor', driverId: 'norris', constructorId: 'mclaren', position: 2 }), // 7 pts
          createSessionResult({ id: 'r1s-lec', driverId: 'leclerc', constructorId: 'ferrari', position: 3 }), // 6 pts
          createSessionResult({ id: 'r1s-pia', driverId: 'piastri', constructorId: 'mclaren', position: 4 }) // 5 pts
        ]
      },
      {
        roundNumber: 1,
        sessionType: 'RACE',
        results: [
          createSessionResult({ id: 'r1r-nor', driverId: 'norris', constructorId: 'mclaren', position: 1 }), // 25 pts
          createSessionResult({ id: 'r1r-ver', driverId: 'verstappen', constructorId: 'redbull', position: 2 }), // 18 pts
          createSessionResult({ id: 'r1r-lec', driverId: 'leclerc', constructorId: 'ferrari', position: 3 }), // 15 pts
          createSessionResult({ id: 'r1r-pia', driverId: 'piastri', constructorId: 'mclaren', position: 4 }) // 12 pts
        ]
      }
    ];

    // Oráculos Independentes:
    // Norris: Sprint P2 (7) + Race P1 (25) = 32 pts (Líder!)
    // Verstappen: Sprint P1 (8) + Race P2 (18) = 26 pts (P2)
    // Leclerc: Sprint P3 (6) + Race P3 (15) = 21 pts (P3)
    // Piastri: Sprint P4 (5) + Race P4 (12) = 17 pts (P4)
    // WCC: McLaren (32 + 17 = 49 pts), Red Bull (26 pts), Ferrari (21 pts)

    const wdcRes = StandingsCalculator.calculateDriverStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions: fullWeekendSessions,
      ruleset: ruleset2025
    });

    assert.equal(wdcRes.isSuccess, true);
    const wdc = wdcRes.getValue();

    assert.equal(wdc.getEntry(EntityId.from<'driver'>('norris'))?.points, 32);
    assert.equal(wdc.getEntry(EntityId.from<'driver'>('verstappen'))?.points, 26);
    assert.equal(wdc.getEntry(EntityId.from<'driver'>('leclerc'))?.points, 21);
    assert.equal(wdc.getEntry(EntityId.from<'driver'>('piastri'))?.points, 17);
    assert.equal(wdc.getLeader()?.driverId.value, 'norris');

    const wccRes = StandingsCalculator.calculateConstructorStandings({
      seasonId: season2025Id,
      roundNumber: 1,
      sessions: fullWeekendSessions,
      ruleset: ruleset2025
    });

    assert.equal(wccRes.isSuccess, true);
    const wcc = wccRes.getValue();

    assert.equal(wcc.getEntry(EntityId.from<'constructor'>('mclaren'))?.points, 49);
    assert.equal(wcc.getEntry(EntityId.from<'constructor'>('redbull'))?.points, 26);
    assert.equal(wcc.getEntry(EntityId.from<'constructor'>('ferrari'))?.points, 21);
    assert.equal(wcc.getLeader()?.constructorId.value, 'mclaren');
  });
});
