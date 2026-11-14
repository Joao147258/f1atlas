/**
 * ============================================================================
 * F1Atlas — Suíte de Testes Unitários: Session
 * ============================================================================
 *
 * Módulo: packages/domain/test/events/session.test.ts
 * Componente testado: packages/domain/src/events/session.ts
 * Padrão: Test runner nativo do Node.js (node:test + node:assert/strict)
 *
 * Propósito:
 * Verificar rigorosamente contratos, invariantes, ciclo de vida (SCHEDULED ->
 * LIVE -> RED_FLAGGED -> COMPLETED / CANCELLED), imutabilidade, cópia defensiva
 * de datas, elegibilidade de pontos e factories da entidade de domínio Session.
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Session,
  SessionType,
  SessionStatus,
  createSession,
  completeSession
} from '../../src/events/session.ts';
import { EntityId } from '../../src/shared/entity-id.ts';
import { DomainErrorCode } from '../../src/shared/domain-error.ts';

const createValidProps = (overrides?: Partial<Parameters<typeof Session.create>[0]>) => ({
  id: EntityId.from<'session'>('session-001'),
  grandPrixId: EntityId.from<'grand-prix'>('gp-001'),
  type: SessionType.RACE,
  scheduledStartTime: new Date('2025-05-25T13:00:00Z'),
  scheduledEndTime: new Date('2025-05-25T15:00:00Z'),
  ...overrides
});

describe('Session — Criação e Invariantes Estruturais', () => {
  it('deve criar uma sessão válida com status SCHEDULED', () => {
    const props = createValidProps();
    const result = Session.create(props);

    assert.equal(result.isSuccess, true);
    const session = result.getValue();
    assert.equal(session.id.equals(props.id), true);
    assert.equal(session.grandPrixId.equals(props.grandPrixId), true);
    assert.equal(session.type, SessionType.RACE);
    assert.equal(session.status, SessionStatus.SCHEDULED);
    assert.equal(session.scheduledStartTime.toISOString(), '2025-05-25T13:00:00.000Z');
    assert.equal(session.scheduledEndTime?.toISOString(), '2025-05-25T15:00:00.000Z');
    assert.equal(session.actualStartTime, undefined);
    assert.equal(session.actualEndTime, undefined);
  });

  it('deve criar uma sessão válida sem scheduledEndTime (opcional)', () => {
    const props = createValidProps({ scheduledEndTime: undefined });
    const result = Session.create(props);

    assert.equal(result.isSuccess, true);
    const session = result.getValue();
    assert.equal(session.scheduledEndTime, undefined);
  });

  it('deve permitir criação via função utilitária createSession', () => {
    const props = createValidProps();
    const result = createSession(props);

    assert.equal(result.isSuccess, true);
    assert.equal(result.getValue().id.equals(props.id), true);
  });

  it('deve rejeitar scheduledStartTime inválida com DomainError', () => {
    const invalidDate = new Date('data-invalida');
    const result = Session.create(createValidProps({ scheduledStartTime: invalidDate }));

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
    assert.match(result.getError().message, /data.*início.*inválida/i);
  });

  it('deve rejeitar scheduledEndTime anterior ao scheduledStartTime', () => {
    const start = new Date('2025-05-25T15:00:00Z');
    const end = new Date('2025-05-25T14:00:00Z');
    const result = Session.create(createValidProps({ scheduledStartTime: start, scheduledEndTime: end }));

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /término.*anterior.*início/i);
  });

  it('deve rejeitar scheduledEndTime inválido se fornecido', () => {
    const invalidDate = new Date('invalida');
    const result = Session.create(createValidProps({ scheduledEndTime: invalidDate }));

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar tipo de sessão inválido', () => {
    const result = Session.create(
      createValidProps({
        // @ts-expect-error Tipo inválido intencional para teste
        type: 'TIPO_INEXISTENTE'
      })
    );

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
    assert.match(result.getError().message, /tipo de sessão inválido/i);
  });

  it('deve isolar datas contra mutações externas (cópia defensiva)', () => {
    const mutableStart = new Date('2025-05-25T13:00:00Z');
    const result = Session.create(createValidProps({ scheduledStartTime: mutableStart }));
    assert.equal(result.isSuccess, true);
    const session = result.getValue();

    // Mutação externa no objeto original
    mutableStart.setUTCHours(10);
    assert.equal(session.scheduledStartTime.toISOString(), '2025-05-25T13:00:00.000Z');

    // Mutação através do getter
    session.scheduledStartTime.setUTCHours(8);
    assert.equal(session.scheduledStartTime.toISOString(), '2025-05-25T13:00:00.000Z');
  });

  it('deve congelar a instância impedindo mutações diretas em runtime', () => {
    const result = Session.create(createValidProps());
    const session = result.getValue();

    assert.ok(Object.isFrozen(session));
    assert.throws(() => {
      // @ts-expect-error Mutação proposital
      session.status = SessionStatus.LIVE;
    }, /TypeError/);
  });
});

describe('Session — Ciclo de Vida e Transições de Estado', () => {
  it('deve transicionar de SCHEDULED para LIVE através de start()', () => {
    const session = Session.create(createValidProps()).getValue();
    const actualStart = new Date('2025-05-25T13:02:15Z');

    const startResult = session.start(actualStart);
    assert.equal(startResult.isSuccess, true);
    const liveSession = startResult.getValue();

    assert.equal(liveSession.status, SessionStatus.LIVE);
    assert.equal(liveSession.actualStartTime?.toISOString(), actualStart.toISOString());
    // Garante imutabilidade: a instância original continua SCHEDULED
    assert.equal(session.status, SessionStatus.SCHEDULED);
  });

  it('deve usar relógio atual se actualStartTime for omitido em start()', () => {
    const session = Session.create(createValidProps()).getValue();
    const before = Date.now();
    const liveSession = session.start().getValue();
    const after = Date.now();

    assert.equal(liveSession.status, SessionStatus.LIVE);
    assert.ok(liveSession.actualStartTime !== undefined);
    assert.ok(liveSession.actualStartTime.getTime() >= before && liveSession.actualStartTime.getTime() <= after);
  });

  it('deve rejeitar start() se actualStartTime for uma data inválida', () => {
    const session = Session.create(createValidProps()).getValue();
    const res = session.start(new Date('invalida'));

    assert.equal(res.isFailure, true);
    assert.equal(res.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar start() se a sessão já estiver LIVE, RED_FLAGGED, COMPLETED ou CANCELLED', () => {
    const live = Session.create(createValidProps()).getValue().start().getValue();

    const restartRes = live.start();
    assert.equal(restartRes.isFailure, true);
    assert.equal(restartRes.getError().code, DomainErrorCode.INVALID_STATE);

    const redFlagged = live.interrupt().getValue();
    assert.equal(redFlagged.start().isFailure, true);

    const completed = live.complete(new Date()).getValue();
    assert.equal(completed.start().isFailure, true);
  });

  it('deve transicionar de LIVE para RED_FLAGGED através de interrupt()', () => {
    const live = Session.create(createValidProps()).getValue().start().getValue();

    const interruptResult = live.interrupt();
    assert.equal(interruptResult.isSuccess, true);
    const redFlagged = interruptResult.getValue();

    assert.equal(redFlagged.status, SessionStatus.RED_FLAGGED);
  });

  it('deve rejeitar interrupt() se a sessão não estiver LIVE', () => {
    const scheduled = Session.create(createValidProps()).getValue();
    assert.equal(scheduled.interrupt().isFailure, true);
    assert.equal(scheduled.interrupt().getError().code, DomainErrorCode.INVALID_STATE);
  });

  it('deve transicionar de RED_FLAGGED de volta para LIVE através de resume()', () => {
    const live = Session.create(createValidProps()).getValue().start().getValue();
    const redFlagged = live.interrupt().getValue();

    const resumeResult = redFlagged.resume();
    assert.equal(resumeResult.isSuccess, true);
    const resumedSession = resumeResult.getValue();

    assert.equal(resumedSession.status, SessionStatus.LIVE);
  });

  it('deve rejeitar resume() se a sessão não estiver RED_FLAGGED', () => {
    const live = Session.create(createValidProps()).getValue().start().getValue();
    assert.equal(live.resume().isFailure, true);
  });

  it('deve transicionar de LIVE para COMPLETED através de complete()', () => {
    const start = new Date('2025-05-25T13:00:00Z');
    const end = new Date('2025-05-25T14:45:00Z');
    const live = Session.create(createValidProps()).getValue().start(start).getValue();

    const completeResult = live.complete(end);
    assert.equal(completeResult.isSuccess, true);
    const completed = completeResult.getValue();

    assert.equal(completed.status, SessionStatus.COMPLETED);
    assert.equal(completed.actualEndTime?.toISOString(), end.toISOString());
  });

  it('deve permitir transicionar de RED_FLAGGED diretamente para COMPLETED (corrida encerrada sob bandeira vermelha)', () => {
    const start = new Date('2025-05-25T13:00:00Z');
    const end = new Date('2025-05-25T14:10:00Z');
    const redFlagged = Session.create(createValidProps()).getValue().start(start).getValue().interrupt().getValue();

    const completeResult = redFlagged.complete(end);
    assert.equal(completeResult.isSuccess, true);
    assert.equal(completeResult.getValue().status, SessionStatus.COMPLETED);
  });

  it('deve rejeitar complete() com actualEndTime anterior ao actualStartTime', () => {
    const start = new Date('2025-05-25T13:00:00Z');
    const invalidEnd = new Date('2025-05-25T12:30:00Z');
    const live = Session.create(createValidProps()).getValue().start(start).getValue();

    const completeResult = live.complete(invalidEnd);
    assert.equal(completeResult.isFailure, true);
    assert.equal(completeResult.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(completeResult.getError().message, /término.*anterior.*início/i);
  });

  it('deve rejeitar complete() com data inválida', () => {
    const live = Session.create(createValidProps()).getValue().start().getValue();
    const result = live.complete(new Date('invalida'));

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar complete() a partir de SCHEDULED ou COMPLETED', () => {
    const scheduled = Session.create(createValidProps()).getValue();
    assert.equal(scheduled.complete(new Date()).isFailure, true);

    const completed = scheduled.start().getValue().complete(new Date()).getValue();
    assert.equal(completed.complete(new Date()).isFailure, true);
  });

  it('deve permitir conclusão via função utilitária completeSession', () => {
    const live = Session.create(createValidProps()).getValue().start().getValue();
    const result = completeSession(live, new Date());

    assert.equal(result.isSuccess, true);
    assert.equal(result.getValue().status, SessionStatus.COMPLETED);
  });

  it('deve transicionar para CANCELLED com motivo opcional', () => {
    const scheduled = Session.create(createValidProps()).getValue();
    const cancelResult = scheduled.cancel('Chuva torrencial e alagamento da pista');

    assert.equal(cancelResult.isSuccess, true);
    const cancelled = cancelResult.getValue();
    assert.equal(cancelled.status, SessionStatus.CANCELLED);
    assert.equal(cancelled.cancellationReason, 'Chuva torrencial e alagamento da pista');
  });

  it('deve permitir cancelamento a partir de LIVE ou RED_FLAGGED', () => {
    const redFlagged = Session.create(createValidProps()).getValue().start().getValue().interrupt().getValue();
    const cancelled = redFlagged.cancel().getValue();

    assert.equal(cancelled.status, SessionStatus.CANCELLED);
  });

  it('deve rejeitar cancel() para sessão já COMPLETED ou já CANCELLED', () => {
    const completed = Session.create(createValidProps()).getValue().start().getValue().complete(new Date()).getValue();
    assert.equal(completed.cancel().isFailure, true);

    const cancelled = Session.create(createValidProps()).getValue().cancel().getValue();
    assert.equal(cancelled.cancel().isFailure, true);
  });
});

describe('Session — Classificação Esportiva e Elegibilidade de Pontos', () => {
  it('deve identificar corretamente sessões que concedem pontos (RACE e SPRINT)', () => {
    const raceSession = Session.create(createValidProps({ type: SessionType.RACE })).getValue();
    const sprintSession = Session.create(createValidProps({ type: SessionType.SPRINT })).getValue();

    assert.equal(raceSession.isPointsEligible, true);
    assert.equal(sprintSession.isPointsEligible, true);
  });

  it('deve identificar corretamente sessões que NÃO concedem pontos', () => {
    const nonPointTypes = [
      SessionType.FP1,
      SessionType.FP2,
      SessionType.FP3,
      SessionType.QUALIFYING,
      SessionType.SPRINT_QUALIFYING,
      SessionType.SPRINT_SHOOTOUT
    ];

    for (const type of nonPointTypes) {
      const session = Session.create(createValidProps({ type })).getValue();
      assert.equal(session.isPointsEligible, false, `Tipo ${type} não deve pontuar`);
    }
  });

  it('deve categorizar corretamente os subtipos de sessão (practice, qualifying, race)', () => {
    const fp1 = Session.create(createValidProps({ type: SessionType.FP1 })).getValue();
    assert.equal(fp1.isPractice, true);
    assert.equal(fp1.isQualifying, false);
    assert.equal(fp1.isRace, false);

    const quali = Session.create(createValidProps({ type: SessionType.QUALIFYING })).getValue();
    assert.equal(quali.isPractice, false);
    assert.equal(quali.isQualifying, true);
    assert.equal(quali.isRace, false);

    const race = Session.create(createValidProps({ type: SessionType.RACE })).getValue();
    assert.equal(race.isPractice, false);
    assert.equal(race.isQualifying, false);
    assert.equal(race.isRace, true);

    const sprint = Session.create(createValidProps({ type: SessionType.SPRINT })).getValue();
    assert.equal(sprint.isPractice, false);
    assert.equal(sprint.isQualifying, false);
    assert.equal(sprint.isRace, true);
  });
});
