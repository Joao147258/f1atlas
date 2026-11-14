/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes Unitários: SessionResult
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { DomainErrorCode } from '../../src/shared/domain-error.ts';
import {
  SessionResult,
  createSessionResult,
  validateSessionClassification,
  ResultStatus,
  PublicationState,
  type CreateSessionResultProps
} from '../../src/events/session-result.ts';

function createValidResultProps(overrides?: Partial<CreateSessionResultProps>): CreateSessionResultProps {
  return {
    id: EntityId.from<'session-result'>('res-verstappen-race'),
    sessionId: EntityId.from<'session'>('ses-race-2025'),
    driverId: EntityId.from<'driver'>('driver-max-verstappen'),
    teamId: EntityId.from<'team'>('team-red-bull'),
    constructorId: EntityId.from<'constructor'>('constructor-red-bull'),
    position: 1,
    lapsCompleted: 71,
    status: ResultStatus.FINISHED,
    totalTimeMillis: 5400000,
    gapMillis: 0,
    fastestLapTimeMillis: 70500,
    fastestLapRank: 1,
    publicationState: PublicationState.PROVISIONAL,
    ...overrides
  };
}

describe('SessionResult — Criação e Invariantes Estruturais', () => {
  it('deve instanciar um resultado válido para o vencedor da prova', () => {
    const props = createValidResultProps();
    const result = SessionResult.create(props);

    assert.ok(result.isSuccess);
    const res = result.getValue();

    assert.equal(res.id.toValue(), 'res-verstappen-race');
    assert.equal(res.position, 1);
    assert.equal(res.lapsCompleted, 71);
    assert.equal(res.status, ResultStatus.FINISHED);
    assert.equal(res.isFastestLap, true);
    assert.equal(res.publicationState, PublicationState.PROVISIONAL);
  });

  it('deve permitir criação via função utilitária createSessionResult e reconstituição', () => {
    const props = createValidResultProps();
    const result = createSessionResult(props);

    assert.ok(result.isSuccess);
    assert.equal(result.getValue().position, 1);

    const recResult = SessionResult.reconstitute(props);
    assert.ok(recResult.isSuccess);
    assert.equal(recResult.getValue().position, 1);
  });

  it('deve rejeitar status de resultado ou publicação inválidos', () => {
    // @ts-expect-error teste com status inválido
    assert.ok(SessionResult.create(createValidResultProps({ status: 'INVALID_STATUS' })).isFailure);
    // @ts-expect-error teste com publicação inválida
    assert.ok(SessionResult.create(createValidResultProps({ publicationState: 'INVALID_PUB' })).isFailure);
  });

  it('deve rejeitar props nulas ou indefinidas', () => {
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionResult.create(null).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionResult.create(undefined).isFailure);
  });

  it('deve rejeitar identidades tipadas ausentes ou inválidas', () => {
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionResult.create(createValidResultProps({ id: null })).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionResult.create(createValidResultProps({ sessionId: null })).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionResult.create(createValidResultProps({ driverId: null })).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionResult.create(createValidResultProps({ teamId: null })).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(SessionResult.create(createValidResultProps({ constructorId: null })).isFailure);
  });

  it('deve rejeitar lapsCompleted negativo ou não inteiro', () => {
    assert.ok(SessionResult.create(createValidResultProps({ lapsCompleted: -1 })).isFailure);
    assert.ok(SessionResult.create(createValidResultProps({ lapsCompleted: 10.5 })).isFailure);
  });

  it('deve garantir imutabilidade estrita da instância congelada (Object.freeze)', () => {
    const res = SessionResult.create(createValidResultProps()).getValue();
    assert.ok(Object.isFrozen(res));
  });

  it('deve comparar igualdade por identidade (equals)', () => {
    const res1 = SessionResult.create(createValidResultProps()).getValue();
    const res2 = SessionResult.create(createValidResultProps({ gapMillis: 5000 })).getValue();

    const otherId = EntityId.from<'session-result'>('res-norris-race');
    const res3 = SessionResult.create(createValidResultProps({ id: otherId })).getValue();

    assert.ok(res1.equals(res2));
    assert.equal(res1.equals(res3), false);
    assert.equal(res1.equals(null), false);
  });
});

describe('SessionResult — Regras de Status Desportivo (EVT-INV-010, 011, 013)', () => {
  it('deve rejeitar status FINISHED com position nula ou menor que 1 (EVT-INV-010)', () => {
    assert.ok(SessionResult.create(createValidResultProps({ status: ResultStatus.FINISHED, position: null })).isFailure);
    assert.ok(SessionResult.create(createValidResultProps({ status: ResultStatus.FINISHED, position: 0 })).isFailure);
    assert.ok(SessionResult.create(createValidResultProps({ status: ResultStatus.FINISHED, position: -2 })).isFailure);
  });

  it('deve rejeitar status FINISHED com lapsCompleted < 1 (EVT-INV-010)', () => {
    const result = SessionResult.create(createValidResultProps({
      status: ResultStatus.FINISHED,
      lapsCompleted: 0
    }));
    assert.ok(result.isFailure);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
  });

  it('deve aceitar status DNS com lapsCompleted === 0 e position === null (EVT-INV-011)', () => {
    const result = SessionResult.create(createValidResultProps({
      status: ResultStatus.DNS,
      lapsCompleted: 0,
      position: null,
      totalTimeMillis: null,
      gapMillis: null
    }));
    assert.ok(result.isSuccess);
    assert.equal(result.getValue().isClassified(), false);
  });

  it('deve rejeitar status DNS com lapsCompleted > 0 ou position preenchida (EVT-INV-011)', () => {
    const resLaps = SessionResult.create(createValidResultProps({
      status: ResultStatus.DNS,
      lapsCompleted: 1,
      position: null,
      totalTimeMillis: null,
      gapMillis: null
    }));
    assert.ok(resLaps.isFailure);
    assert.equal(resLaps.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(resLaps.getError().message, /0 voltas completadas/);

    const resPos = SessionResult.create(createValidResultProps({
      status: ResultStatus.DNS,
      lapsCompleted: 0,
      position: 18,
      totalTimeMillis: null,
      gapMillis: null
    }));
    assert.ok(resPos.isFailure);
    assert.equal(resPos.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
  });

  it('deve rejeitar status DSQ ou NC com posição numérica atribuída (EVT-INV-013)', () => {
    assert.ok(SessionResult.create(createValidResultProps({
      status: ResultStatus.DSQ,
      position: 2
    })).isFailure);

    assert.ok(SessionResult.create(createValidResultProps({
      status: ResultStatus.NC,
      position: 17
    })).isFailure);
  });
});

describe('SessionResult — Regra dos 90% para Classificação de DNF (EVT-INV-012)', () => {
  it('deve classificar piloto DNF que completou pelo menos 90% das voltas do vencedor (Art. 62.1 FIA)', () => {
    // Vencedor: 70 voltas -> Teto de 90%: Math.floor(0.90 * 70) = 63 voltas
    const dnfClassified = SessionResult.create(createValidResultProps({
      status: ResultStatus.DNF,
      lapsCompleted: 64, // >= 63 voltas
      position: 16
    })).getValue();

    assert.equal(dnfClassified.isClassified(70), true);
  });

  it('deve desconsiderar classificação de DNF que completou menos de 90% das voltas do vencedor', () => {
    // Vencedor: 70 voltas -> Teto de 90%: 63 voltas
    const dnfNotClassified = SessionResult.create(createValidResultProps({
      status: ResultStatus.DNF,
      lapsCompleted: 62, // < 63 voltas
      position: 17
    })).getValue();

    assert.equal(dnfNotClassified.isClassified(70), false);

    // Quando winnerLaps não for informado, usa a presença de position
    assert.equal(dnfNotClassified.isClassified(), true);

    const dnfNoPos = SessionResult.create(createValidResultProps({
      status: ResultStatus.DNF,
      lapsCompleted: 30,
      position: null
    })).getValue();
    assert.equal(dnfNoPos.isClassified(), false);
  });

  it('deve retornar false em isClassified para status DNS, DSQ e NC', () => {
    const dns = SessionResult.create(createValidResultProps({
      status: ResultStatus.DNS,
      lapsCompleted: 0,
      position: null,
      totalTimeMillis: null,
      gapMillis: null
    })).getValue();
    const dsq = SessionResult.create(createValidResultProps({ status: ResultStatus.DSQ, position: null })).getValue();
    const nc = SessionResult.create(createValidResultProps({ status: ResultStatus.NC, position: null })).getValue();

    assert.equal(dns.isClassified(), false);
    assert.equal(dsq.isClassified(), false);
    assert.equal(nc.isClassified(), false);
  });
});

describe('SessionResult — Homologação e Ciclo de Publicação (EVT-INV-014, 015, 016)', () => {
  it('deve homologar resultado de PROVISIONAL para OFFICIAL com sucesso e ser idempotente', () => {
    const provisional = SessionResult.create(createValidResultProps({
      publicationState: PublicationState.PROVISIONAL
    })).getValue();

    const homologated = provisional.homologateResult().getValue();
    assert.equal(homologated.publicationState, PublicationState.OFFICIAL);
    assert.notEqual(homologated, provisional); // copy-on-write

    // Idempotência em homologateResult
    const reHomologated = homologated.homologateResult().getValue();
    assert.equal(reHomologated.publicationState, PublicationState.OFFICIAL);
  });

  it('deve rejeitar applyStewardsRevision com parâmetros nulos', () => {
    const official = SessionResult.create(createValidResultProps()).getValue();
    // @ts-expect-error teste com revision nula
    const res = official.applyStewardsRevision(null);
    assert.ok(res.isFailure);
    assert.equal(res.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar estritamente a homologação oficial de resultados SIMULATED (EVT-INV-015)', () => {
    const simulated = SessionResult.create(createValidResultProps({
      publicationState: PublicationState.SIMULATED
    })).getValue();

    const homologationResult = simulated.homologateResult();
    assert.ok(homologationResult.isFailure);
    assert.equal(homologationResult.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);
    assert.match(homologationResult.getError().message, /EVT-INV-015/);
  });

  it('deve aplicar revisão dos comissários exigindo justificativa textual (EVT-INV-016)', () => {
    const official = SessionResult.create(createValidResultProps({
      position: 2,
      publicationState: PublicationState.OFFICIAL
    })).getValue();

    // Cenário: desclassificação técnica por desgaste excessivo da prancha (ex.: Austin 2023)
    const revisionResult = official.applyStewardsRevision({
      newPosition: null,
      newStatus: ResultStatus.DSQ,
      reason: 'Infração técnica ao Artigo 3.5.9 do Regulamento Técnico (desgaste de prancha).'
    });

    assert.ok(revisionResult.isSuccess);
    const revised = revisionResult.getValue();
    assert.equal(revised.status, ResultStatus.DSQ);
    assert.equal(revised.position, null);
    assert.equal(revised.publicationState, PublicationState.REVISED);
    assert.equal(revised.revisionReason, 'Infração técnica ao Artigo 3.5.9 do Regulamento Técnico (desgaste de prancha).');
  });

  it('deve rejeitar revisão dos comissários sem justificativa textual válida (EVT-INV-016)', () => {
    const result = SessionResult.create(createValidResultProps()).getValue();

    const failEmpty = result.applyStewardsRevision({
      newPosition: 5,
      reason: ''
    });
    assert.ok(failEmpty.isFailure);
    assert.equal(failEmpty.getError().code, DomainErrorCode.INVARIANT_VIOLATION);

    const failSpaces = result.applyStewardsRevision({
      newPosition: 5,
      reason: '    '
    });
    assert.ok(failSpaces.isFailure);
  });

  it('deve permitir criação de cenário simulado hipotético (createSimulatedScenario)', () => {
    const official = SessionResult.create(createValidResultProps()).getValue();
    const simulated = official.createSimulatedScenario({ position: 2 }).getValue();

    assert.equal(simulated.publicationState, PublicationState.SIMULATED);
    assert.equal(simulated.position, 2);
  });
});

describe('SessionResult — Validação Consolidada de Classificação (validateSessionClassification)', () => {
  it('deve aprovar classificação consolidada íntegra e sem conflitos', () => {
    const winner = SessionResult.create(createValidResultProps({
      id: EntityId.from<'session-result'>('r1'),
      driverId: EntityId.from<'driver'>('d1'),
      position: 1,
      lapsCompleted: 71,
      fastestLapRank: 1
    })).getValue();

    const second = SessionResult.create(createValidResultProps({
      id: EntityId.from<'session-result'>('r2'),
      driverId: EntityId.from<'driver'>('d2'),
      position: 2,
      lapsCompleted: 71,
      fastestLapRank: 2
    })).getValue();

    const dnf = SessionResult.create(createValidResultProps({
      id: EntityId.from<'session-result'>('r3'),
      driverId: EntityId.from<'driver'>('d3'),
      position: 18,
      status: ResultStatus.DNF,
      lapsCompleted: 65,
      fastestLapRank: null
    })).getValue();

    const validation = validateSessionClassification([winner, second, dnf]);
    assert.ok(validation.isSuccess);
  });

  it('deve rejeitar posições de chegada duplicadas na mesma sessão (EVT-INV-010)', () => {
    const r1 = SessionResult.create(createValidResultProps({
      id: EntityId.from<'session-result'>('r1'),
      driverId: EntityId.from<'driver'>('d1'),
      position: 1,
      lapsCompleted: 70
    })).getValue();

    const r2 = SessionResult.create(createValidResultProps({
      id: EntityId.from<'session-result'>('r2'),
      driverId: EntityId.from<'driver'>('d2'),
      position: 1, // Posição 1 duplicada!
      lapsCompleted: 70
    })).getValue();

    const validation = validateSessionClassification([r1, r2]);
    assert.ok(validation.isFailure);
    assert.equal(validation.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(validation.getError().message, /Posição de chegada duplicada/);
  });

  it('deve rejeitar concorrente com mais voltas completadas que o vencedor (EVT-INV-011)', () => {
    const winner = SessionResult.create(createValidResultProps({
      id: EntityId.from<'session-result'>('r1'),
      position: 1,
      lapsCompleted: 50
    })).getValue();

    const invalidSecond = SessionResult.create(createValidResultProps({
      id: EntityId.from<'session-result'>('r2'),
      position: 2,
      lapsCompleted: 51, // Mais voltas que o vencedor!
      fastestLapRank: 2
    })).getValue();

    const validation = validateSessionClassification([winner, invalidSecond]);
    assert.ok(validation.isFailure);
    assert.equal(validation.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(validation.getError().message, /mais voltas que o vencedor/);
  });

  it('deve rejeitar múltiplos pilotos marcados como melhor volta da prova (fastestLapRank === 1 — EVT-INV-013)', () => {
    const r1 = SessionResult.create(createValidResultProps({
      id: EntityId.from<'session-result'>('r1'),
      driverId: EntityId.from<'driver'>('d1'),
      position: 1,
      fastestLapRank: 1
    })).getValue();

    const r2 = SessionResult.create(createValidResultProps({
      id: EntityId.from<'session-result'>('r2'),
      driverId: EntityId.from<'driver'>('d2'),
      position: 2,
      fastestLapRank: 1 // Segunda melhor volta!
    })).getValue();

    const validation = validateSessionClassification([r1, r2]);
    assert.ok(validation.isFailure);
    assert.equal(validation.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(validation.getError().message, /volta mais rápida/);
  });

  it('deve aprovar lista vazia ou nula em validateSessionClassification', () => {
    // @ts-expect-error teste com entrada não array
    assert.ok(validateSessionClassification(null).isSuccess);
    assert.ok(validateSessionClassification([]).isSuccess);
  });

  it('deve rejeitar validação com resultados pertencentes a sessões distintas', () => {
    const r1 = SessionResult.create(createValidResultProps({
      sessionId: EntityId.from<'session'>('ses-01')
    })).getValue();

    const r2 = SessionResult.create(createValidResultProps({
      sessionId: EntityId.from<'session'>('ses-02')
    })).getValue();

    const validation = validateSessionClassification([r1, r2]);
    assert.ok(validation.isFailure);
    assert.equal(validation.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(validation.getError().message, /sessões distintas/);
  });
});
