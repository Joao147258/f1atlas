/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes Unitários: GrandPrix
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityId } from '../../src/shared/entity-id.ts';
import { DomainErrorCode } from '../../src/shared/domain-error.ts';
import {
  GrandPrix,
  createGrandPrix,
  GrandPrixFormat,
  GrandPrixStatus,
  type CreateGrandPrixProps
} from '../../src/events/grand-prix.ts';
import { Session, SessionType } from '../../src/events/session.ts';

function createValidGrandPrixProps(overrides?: Partial<CreateGrandPrixProps>): CreateGrandPrixProps {
  const gpId = EntityId.from<'grand-prix'>('gp-brazil-2025');
  const seasonId = EntityId.from<'season'>('season-2025');
  const circuitId = EntityId.from<'circuit'>('circuit-interlagos');

  return {
    id: gpId,
    seasonId,
    circuitId,
    name: 'Grande Prêmio de São Paulo 2025',
    roundNumber: 21,
    format: GrandPrixFormat.SPRINT,
    startDate: new Date('2025-11-07T00:00:00.000Z'),
    endDate: new Date('2025-11-09T23:59:59.999Z'),
    ...overrides
  };
}

function createSessionForGP(gpId: EntityId<'grand-prix'>, type: keyof typeof SessionType, startTime: Date, idStr?: string): Session {
  const id = EntityId.from<'session'>(idStr ?? `ses-${type.toLowerCase()}`);
  return Session.create({
    id,
    grandPrixId: gpId,
    type: SessionType[type],
    scheduledStartTime: startTime
  }).getValue();
}

describe('GrandPrix — Criação e Invariantes Estruturais', () => {
  it('deve instanciar um Grande Prêmio válido com todas as propriedades', () => {
    const props = createValidGrandPrixProps();
    const result = GrandPrix.create(props);

    assert.ok(result.isSuccess);
    const gp = result.getValue();

    assert.equal(gp.id.toValue(), 'gp-brazil-2025');
    assert.equal(gp.seasonId.toValue(), 'season-2025');
    assert.equal(gp.circuitId.toValue(), 'circuit-interlagos');
    assert.equal(gp.name, 'Grande Prêmio de São Paulo 2025');
    assert.equal(gp.roundNumber, 21);
    assert.equal(gp.format, GrandPrixFormat.SPRINT);
    assert.equal(gp.status, GrandPrixStatus.SCHEDULED);
    assert.equal(gp.sessions.length, 0);
  });

  it('deve permitir criação via função utilitária createGrandPrix', () => {
    const props = createValidGrandPrixProps();
    const result = createGrandPrix(props);

    assert.ok(result.isSuccess);
    assert.equal(result.getValue().name, 'Grande Prêmio de São Paulo 2025');
  });

  it('deve assumir formato STANDARD por padrão se omitido', () => {
    const props = createValidGrandPrixProps({ format: undefined });
    const gp = GrandPrix.create(props).getValue();
    assert.equal(gp.format, GrandPrixFormat.STANDARD);
  });

  it('deve rejeitar formato de evento inválido', () => {
    // @ts-expect-error teste de formato inválido
    const res = GrandPrix.create(createValidGrandPrixProps({ format: 'INVALID_FORMAT' }));
    assert.ok(res.isFailure);
    assert.equal(res.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar status de evento inválido', () => {
    // @ts-expect-error teste de status inválido
    const res = GrandPrix.create(createValidGrandPrixProps({ status: 'INVALID_STATUS' }));
    assert.ok(res.isFailure);
    assert.equal(res.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar props nulas ou indefinidas', () => {
    // @ts-expect-error teste de robustez em runtime
    assert.ok(GrandPrix.create(null).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(GrandPrix.create(undefined).isFailure);
  });

  it('deve rejeitar identidades tipadas ausentes ou inválidas', () => {
    // @ts-expect-error teste de robustez em runtime
    assert.ok(GrandPrix.create(createValidGrandPrixProps({ id: null })).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(GrandPrix.create(createValidGrandPrixProps({ seasonId: null })).isFailure);
    // @ts-expect-error teste de robustez em runtime
    assert.ok(GrandPrix.create(createValidGrandPrixProps({ circuitId: null })).isFailure);
  });

  it('deve rejeitar nome vazio ou apenas com espaços', () => {
    assert.ok(GrandPrix.create(createValidGrandPrixProps({ name: '' })).isFailure);
    assert.ok(GrandPrix.create(createValidGrandPrixProps({ name: '   ' })).isFailure);
  });

  it('deve rejeitar roundNumber < 1 ou não inteiro (EVT-INV-001)', () => {
    const res0 = GrandPrix.create(createValidGrandPrixProps({ roundNumber: 0 }));
    assert.ok(res0.isFailure);
    assert.equal(res0.getError().code, DomainErrorCode.INVARIANT_VIOLATION);

    const resNeg = GrandPrix.create(createValidGrandPrixProps({ roundNumber: -1 }));
    assert.ok(resNeg.isFailure);

    const resFloat = GrandPrix.create(createValidGrandPrixProps({ roundNumber: 1.5 }));
    assert.ok(resFloat.isFailure);
  });

  it('deve rejeitar startDate posterior a endDate (EVT-INV-002)', () => {
    const props = createValidGrandPrixProps({
      startDate: new Date('2025-11-10T00:00:00.000Z'),
      endDate: new Date('2025-11-09T00:00:00.000Z')
    });
    const result = GrandPrix.create(props);

    assert.ok(result.isFailure);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
  });

  it('deve rejeitar datas inválidas', () => {
    assert.ok(GrandPrix.create(createValidGrandPrixProps({ startDate: new Date('data-invalida') })).isFailure);
    assert.ok(GrandPrix.create(createValidGrandPrixProps({ endDate: new Date('data-invalida') })).isFailure);
  });

  it('deve garantir imutabilidade da instância e cópia defensiva das datas', () => {
    const startDate = new Date('2025-11-07T00:00:00.000Z');
    const endDate = new Date('2025-11-09T23:59:59.999Z');
    const gp = GrandPrix.create(createValidGrandPrixProps({ startDate, endDate })).getValue();

    assert.ok(Object.isFrozen(gp));

    // Mutações externas no objeto Date original não afetam a entidade
    startDate.setFullYear(2099);
    assert.equal(gp.startDate.getFullYear(), 2025);

    // Mutações na data obtida por getter não afetam a entidade
    const retrievedStart = gp.startDate;
    retrievedStart.setFullYear(2099);
    assert.equal(gp.startDate.getFullYear(), 2025);
  });

  it('deve comparar igualdade por identidade (equals)', () => {
    const gp1 = GrandPrix.create(createValidGrandPrixProps()).getValue();
    const gp2 = GrandPrix.create(createValidGrandPrixProps({ name: 'Outro Nome' })).getValue();

    const otherId = EntityId.from<'grand-prix'>('gp-monaco-2025');
    const gp3 = GrandPrix.create(createValidGrandPrixProps({ id: otherId })).getValue();

    assert.ok(gp1.equals(gp2));
    assert.equal(gp1.equals(gp3), false);
    assert.equal(gp1.equals(null), false);
  });
});

describe('GrandPrix — Coordenação de Cronograma e Sessões (addSession)', () => {
  it('deve adicionar sessões cronologicamente ordenadas ao GP', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps()).getValue();

    const fp1 = createSessionForGP(gp.id, 'FP1', new Date('2025-11-07T14:30:00.000Z'), 'ses-fp1');
    const qualy = createSessionForGP(gp.id, 'QUALIFYING', new Date('2025-11-08T18:00:00.000Z'), 'ses-qualy');
    const race = createSessionForGP(gp.id, 'RACE', new Date('2025-11-09T17:00:00.000Z'), 'ses-race');

    // Adiciona fora de ordem propositalmente
    const gpWithRace = gp.addSession(race).getValue();
    const gpWithQualy = gpWithRace.addSession(qualy).getValue();
    const gpFinal = gpWithQualy.addSession(fp1).getValue();

    assert.equal(gpFinal.sessions.length, 3);
    // Deve ter ordenado cronologicamente: FP1 -> QUALY -> RACE
    assert.equal(gpFinal.sessions[0].type, SessionType.FP1);
    assert.equal(gpFinal.sessions[1].type, SessionType.QUALIFYING);
    assert.equal(gpFinal.sessions[2].type, SessionType.RACE);
    assert.equal(gpFinal.status, GrandPrixStatus.ACTIVE);
  });

  it('deve rejeitar sessão pertencente a outro Grande Prêmio', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps()).getValue();
    const otherGpId = EntityId.from<'grand-prix'>('gp-other');
    const foreignSession = createSessionForGP(otherGpId, 'FP1', new Date('2025-11-07T14:00:00.000Z'));

    const result = gp.addSession(foreignSession);
    assert.ok(result.isFailure);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
  });

  it('deve rejeitar sessão agendada fora do período [startDate, endDate] do fim de semana (EVT-INV-002)', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps({
      startDate: new Date('2025-11-07T00:00:00.000Z'),
      endDate: new Date('2025-11-09T23:59:59.999Z')
    })).getValue();

    // Sessão na quinta-feira anterior
    const earlySession = createSessionForGP(gp.id, 'FP1', new Date('2025-11-06T15:00:00.000Z'));
    assert.ok(gp.addSession(earlySession).isFailure);

    // Sessão na segunda-feira posterior
    const lateSession = createSessionForGP(gp.id, 'RACE', new Date('2025-11-10T15:00:00.000Z'));
    assert.ok(gp.addSession(lateSession).isFailure);
  });

  it('deve rejeitar duplicidade de sessão de corrida (RACE)', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps()).getValue();
    const race1 = createSessionForGP(gp.id, 'RACE', new Date('2025-11-09T17:00:00.000Z'), 'ses-race-1');
    const race2 = createSessionForGP(gp.id, 'RACE', new Date('2025-11-09T19:00:00.000Z'), 'ses-race-2');

    const gpWithRace1 = gp.addSession(race1).getValue();
    const resultRace2 = gpWithRace1.addSession(race2);

    assert.ok(resultRace2.isFailure);
    assert.equal(resultRace2.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(resultRace2.getError().message, /Corrida Principal/);
  });

  it('deve rejeitar adição de sessão duplicada com o mesmo id', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps()).getValue();
    const fp1 = createSessionForGP(gp.id, 'FP1', new Date('2025-11-07T14:30:00.000Z'), 'ses-fp1');

    const gpWithFp1 = gp.addSession(fp1).getValue();
    const resDuplicate = gpWithFp1.addSession(fp1);

    assert.ok(resDuplicate.isFailure);
    assert.equal(resDuplicate.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
  });

  it('deve verificar conformidade de sessões obrigatórias da FIA (hasRequiredSessions — EVT-INV-001)', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps()).getValue();
    assert.equal(gp.hasRequiredSessions(), false);

    const fp1 = createSessionForGP(gp.id, 'FP1', new Date('2025-11-07T14:00:00.000Z'), 's1');
    const gp1 = gp.addSession(fp1).getValue();
    assert.equal(gp1.hasRequiredSessions(), false);

    const qualy = createSessionForGP(gp.id, 'QUALIFYING', new Date('2025-11-08T18:00:00.000Z'), 's2');
    const gp2 = gp1.addSession(qualy).getValue();
    assert.equal(gp2.hasRequiredSessions(), false);

    const race = createSessionForGP(gp.id, 'RACE', new Date('2025-11-09T17:00:00.000Z'), 's3');
    const gpComplete = gp2.addSession(race).getValue();
    assert.equal(gpComplete.hasRequiredSessions(), true);
  });
});

describe('GrandPrix — Ciclo de Vida e Transições de Estado', () => {
  it('deve cancelar um GP agendado ou ativo com sucesso', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps()).getValue();
    const cancelResult = gp.cancelGrandPrix('Mau tempo severo');

    assert.ok(cancelResult.isSuccess);
    const cancelledGp = cancelResult.getValue();
    assert.equal(cancelledGp.status, GrandPrixStatus.CANCELLED);

    // Rejeita cancelamento repetido
    assert.ok(cancelledGp.cancelGrandPrix().isFailure);
  });

  it('deve reagendar um GP com novas datas válidas (reschedule)', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps({
      startDate: new Date('2025-11-07T00:00:00.000Z'),
      endDate: new Date('2025-11-09T23:59:59.999Z')
    })).getValue();

    const fp1 = createSessionForGP(gp.id, 'FP1', new Date('2025-11-21T14:00:00.000Z'), 's-fp1');

    const newStart = new Date('2025-11-21T00:00:00.000Z');
    const newEnd = new Date('2025-11-23T23:59:59.999Z');

    const rescheduled = gp.reschedule(newStart, newEnd).getValue();
    assert.equal(rescheduled.status, GrandPrixStatus.POSTPONED);
    assert.equal(rescheduled.startDate.getTime(), newStart.getTime());
    assert.equal(rescheduled.endDate.getTime(), newEnd.getTime());
  });

  it('deve concluir o Grande Prêmio (completeGrandPrix)', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps()).getValue();
    const completed = gp.completeGrandPrix().getValue();

    assert.equal(completed.status, GrandPrixStatus.COMPLETED);
    assert.equal(completed.isComplete(), true);

    // Idempotência: re-concluir GP já concluído retorna sucesso com a mesma instância
    const reCompleted = completed.completeGrandPrix();
    assert.ok(reCompleted.isSuccess);

    // Não permite cancelar GP concluído
    assert.ok(completed.cancelGrandPrix().isFailure);
    // Não permite reagendar GP concluído
    assert.ok(completed.reschedule(new Date(), new Date()).isFailure);
  });

  it('deve rejeitar conclusão de GP previamente cancelado', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps()).getValue();
    const cancelled = gp.cancelGrandPrix().getValue();

    const completeResult = cancelled.completeGrandPrix();
    assert.ok(completeResult.isFailure);
    assert.equal(completeResult.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);

    const rescheduleResult = cancelled.reschedule(new Date(), new Date());
    assert.ok(rescheduleResult.isFailure);
  });

  it('deve validar datas inválidas ou invertidas em reschedule', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps()).getValue();

    // @ts-expect-error teste com data inválida
    assert.ok(gp.reschedule('invalida', new Date()).isFailure);
    // @ts-expect-error teste com data inválida
    assert.ok(gp.reschedule(new Date(), 'invalida').isFailure);
    assert.ok(gp.reschedule(new Date('invalida'), new Date()).isFailure);
    assert.ok(gp.reschedule(new Date(), new Date('invalida')).isFailure);

    // Datas invertidas
    assert.ok(
      gp.reschedule(new Date('2025-11-25T00:00:00Z'), new Date('2025-11-24T00:00:00Z')).isFailure
    );
  });

  it('deve rejeitar reschedule quando houver sessões prévias conflitantes com o novo intervalo', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps({
      startDate: new Date('2025-11-07T00:00:00.000Z'),
      endDate: new Date('2025-11-09T23:59:59.999Z')
    })).getValue();

    const fp1 = createSessionForGP(gp.id, 'FP1', new Date('2025-11-07T14:00:00.000Z'), 's-conflicting');
    const gpWithSession = gp.addSession(fp1).getValue();

    // Novo intervalo que NÃO contém a sessão fp1 (2025-11-07)
    const newStart = new Date('2025-11-21T00:00:00.000Z');
    const newEnd = new Date('2025-11-23T23:59:59.999Z');

    const res = gpWithSession.reschedule(newStart, newEnd);
    assert.ok(res.isFailure);
    assert.equal(res.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
  });

  it('deve rejeitar addSession quando o argumento for nulo ou inválido', () => {
    const gp = GrandPrix.create(createValidGrandPrixProps()).getValue();
    // @ts-expect-error teste com objeto não Session
    assert.ok(gp.addSession(null).isFailure);
    // @ts-expect-error teste com objeto não Session
    assert.ok(gp.addSession({}).isFailure);
  });
});

describe('GrandPrix — Reconstituição a partir de Persistência', () => {
  it('deve reconstituir um GP com sua lista histórica de sessões', () => {
    const props = createValidGrandPrixProps();
    const gpId = props.id;
    const session1 = createSessionForGP(gpId, 'QUALIFYING', new Date('2025-11-08T18:00:00.000Z'), 's-q');
    const session2 = createSessionForGP(gpId, 'RACE', new Date('2025-11-09T17:00:00.000Z'), 's-r');

    const reconstituteResult = GrandPrix.reconstitute({
      ...props,
      status: GrandPrixStatus.COMPLETED,
      sessions: [session2, session1] // fora de ordem
    });

    assert.ok(reconstituteResult.isSuccess);
    const gp = reconstituteResult.getValue();
    assert.equal(gp.status, GrandPrixStatus.COMPLETED);
    assert.equal(gp.sessions.length, 2);
    // Garante que a reconstituição preserva ordenação cronológica
    assert.equal(gp.sessions[0].type, SessionType.QUALIFYING);
    assert.equal(gp.sessions[1].type, SessionType.RACE);
  });

  it('deve falhar a reconstituição se as props fundamentais forem inválidas', () => {
    const invalidProps = createValidGrandPrixProps({ roundNumber: -1 });
    const result = GrandPrix.reconstitute(invalidProps);
    assert.ok(result.isFailure);
  });
});
