/**
 * ============================================================================
 * F1Atlas — Suíte de Testes Unitários: Season
 * ============================================================================
 *
 * Módulo: packages/domain/test/seasons/season.test.ts
 * Componente testado: packages/domain/src/seasons/season.ts
 * Padrão: Test runner nativo do Node.js (node:test + node:assert/strict)
 *
 * Propósito:
 * Verificar rigorosamente a raiz de agregado Season, suas invariantes históricas
 * (ano >= 1950, unicidade de roundNumber, sequencialidade de calendário 1..N),
 * agendamento de GPs, isolamento e imutabilidade de datas (cópia defensiva),
 * cancelamento e reagendamento de etapas (ex.: GP da Emilia-Romagna 2023),
 * ciclo de vida, bloqueio pós-conclusão e retificação histórica supervisionada.
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Season,
  createSeason,
  scheduleGrandPrix,
  cancelGrandPrix,
  rescheduleGrandPrix,
  completeGrandPrix,
  startSeason,
  concludeSeason,
  cancelSeason,
  reviseHistorically,
  ScheduledGrandPrixStatus,
  type ScheduledGrandPrix
} from '../../src/seasons/season.ts';
import { SeasonStatus } from '../../src/seasons/season-status.ts';
import { EntityId } from '../../src/shared/entity-id.ts';
import { DomainErrorCode } from '../../src/shared/domain-error.ts';

const createValidSeasonProps = (overrides?: Partial<Parameters<typeof Season.create>[0]>) => ({
  id: EntityId.from<'season'>('season-2025'),
  year: 2025,
  rulesetId: EntityId.from<'scoring-ruleset'>('ruleset-2025'),
  description: 'Temporada Oficial de Fórmula 1 de 2025',
  ...overrides
});

const createSampleGrandPrix = (roundNumber: number, name: string): ScheduledGrandPrix => ({
  grandPrixId: EntityId.from<'grand-prix'>(`gp-round-${roundNumber}`),
  roundNumber,
  name,
  startDate: new Date(`2025-0${Math.min(roundNumber + 2, 9)}-15T00:00:00Z`),
  endDate: new Date(`2025-0${Math.min(roundNumber + 2, 9)}-17T00:00:00Z`)
});

describe('Season — Criação e Invariantes Estruturais', () => {
  it('deve instanciar uma temporada válida com status PLANNED e calendário vazio', () => {
    const props = createValidSeasonProps();
    const result = Season.create(props);

    assert.equal(result.isSuccess, true);
    const season = result.getValue();
    assert.equal(season.id.equals(props.id), true);
    assert.equal(season.year, 2025);
    assert.equal(season.status, SeasonStatus.PLANNED);
    assert.equal(season.grandPrixList.length, 0);
    assert.equal(season.totalRounds, 0);
    assert.equal(season.completedRounds, 0);
    assert.equal(season.cancelledRounds, 0);
    assert.equal(season.isLocked, false);
    assert.equal(season.description, props.description);
  });

  it('deve permitir criação via função utilitária createSeason', () => {
    const props = createValidSeasonProps();
    const result = createSeason(props);

    assert.equal(result.isSuccess, true);
    assert.equal(result.getValue().id.equals(props.id), true);
  });

  it('deve aceitar ano 1950 (ano inaugural da Fórmula 1)', () => {
    const result = Season.create(createValidSeasonProps({
      id: EntityId.from<'season'>('season-1950'),
      year: 1950
    }));

    assert.equal(result.isSuccess, true);
    assert.equal(result.getValue().year, 1950);
  });

  it('deve rejeitar ano anterior a 1950 com erro de domínio', () => {
    const result = Season.create(createValidSeasonProps({ year: 1949 }));

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
    assert.match(result.getError().message, /ano.*1950/i);
  });

  it('deve rejeitar ano não inteiro ou NaN', () => {
    const resultFloat = Season.create(createValidSeasonProps({ year: 2025.5 }));
    assert.equal(resultFloat.isFailure, true);

    const resultNaN = Season.create(createValidSeasonProps({ year: NaN }));
    assert.equal(resultNaN.isFailure, true);
  });

  it('deve rejeitar id inválido ou não pertencente a EntityId', () => {
    const result = Season.create({
      // @ts-expect-error Teste de entrada inválida
      id: 'season-invalida',
      year: 2025
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve congelar a instância para garantir imutabilidade em runtime', () => {
    const season = Season.create(createValidSeasonProps()).getValue();

    assert.ok(Object.isFrozen(season));
    assert.throws(() => {
      // @ts-expect-error Mutação proibida
      season.year = 2026;
    }, /TypeError/);
  });
});

describe('Season — Agendamento de Grandes Prêmios (scheduleGrandPrix)', () => {
  it('deve agendar uma etapa com sucesso no calendário da temporada', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'Grande Prêmio da Austrália');

    const result = season.scheduleGrandPrix(gp1);
    assert.equal(result.isSuccess, true);

    const updatedSeason = result.getValue();
    assert.equal(updatedSeason.grandPrixList.length, 1);
    assert.equal(updatedSeason.totalRounds, 1);
    assert.equal(updatedSeason.grandPrixList[0].roundNumber, 1);
    assert.equal(updatedSeason.grandPrixList[0].name, 'Grande Prêmio da Austrália');
    assert.equal(updatedSeason.grandPrixList[0].status, ScheduledGrandPrixStatus.SCHEDULED);

    // Imutabilidade: a instância original permanece intacta
    assert.equal(season.grandPrixList.length, 0);
  });

  it('deve permitir agendamento via função utilitária scheduleGrandPrix', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP da Austrália');

    const result = scheduleGrandPrix(season, gp1);
    assert.equal(result.isSuccess, true);
    assert.equal(result.getValue().grandPrixList.length, 1);
  });

  it('deve manter as etapas ordenadas pelo roundNumber', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp2 = createSampleGrandPrix(2, 'GP da China');
    const gp1 = createSampleGrandPrix(1, 'GP da Austrália');
    const gp3 = createSampleGrandPrix(3, 'GP do Japão');

    // Adiciona fora de ordem
    const withGp2 = season.scheduleGrandPrix(gp2).getValue();
    const withGp1And2 = withGp2.scheduleGrandPrix(gp1).getValue();
    const finalSeason = withGp1And2.scheduleGrandPrix(gp3).getValue();

    assert.equal(finalSeason.grandPrixList.length, 3);
    assert.equal(finalSeason.grandPrixList[0].roundNumber, 1);
    assert.equal(finalSeason.grandPrixList[1].roundNumber, 2);
    assert.equal(finalSeason.grandPrixList[2].roundNumber, 3);
  });

  it('deve rejeitar etapa com roundNumber duplicado', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1a = createSampleGrandPrix(1, 'GP da Austrália');
    const gp1b = createSampleGrandPrix(1, 'GP Conflitante');

    const seasonWithGp1 = season.scheduleGrandPrix(gp1a).getValue();
    const conflictResult = seasonWithGp1.scheduleGrandPrix(gp1b);

    assert.equal(conflictResult.isFailure, true);
    assert.equal(conflictResult.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(conflictResult.getError().message, /rodada.*1.*já existe/i);
  });

  it('deve rejeitar etapa com id de GP já agendado', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP da Austrália');
    const gpDuplicateId: ScheduledGrandPrix = {
      grandPrixId: gp1.grandPrixId,
      roundNumber: 2,
      name: 'Outro Nome',
      startDate: new Date('2025-04-01T00:00:00Z'),
      endDate: new Date('2025-04-03T00:00:00Z')
    };

    const seasonWithGp1 = season.scheduleGrandPrix(gp1).getValue();
    const duplicateResult = seasonWithGp1.scheduleGrandPrix(gpDuplicateId);

    assert.equal(duplicateResult.isFailure, true);
    assert.equal(duplicateResult.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(duplicateResult.getError().message, /já.*agendado/i);
  });

  it('deve rejeitar roundNumber menor ou igual a zero', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const invalidGp = createSampleGrandPrix(0, 'GP Inválido');

    const result = season.scheduleGrandPrix(invalidGp);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar agendamento de etapas com datas inconsistentes (endDate < startDate)', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const invalidDatesGp: ScheduledGrandPrix = {
      grandPrixId: EntityId.from<'grand-prix'>('gp-datas-invalidas'),
      roundNumber: 1,
      name: 'GP Inconsistente',
      startDate: new Date('2025-05-10T00:00:00Z'),
      endDate: new Date('2025-05-08T00:00:00Z') // Anterior ao início!
    };

    const result = season.scheduleGrandPrix(invalidDatesGp);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(result.getError().message, /encerramento.*anterior.*início/i);
  });

  it('deve rejeitar agendamento com data inválida (NaN)', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const invalidDateGp: ScheduledGrandPrix = {
      grandPrixId: EntityId.from<'grand-prix'>('gp-nan-date'),
      roundNumber: 1,
      name: 'GP Data NaN',
      startDate: new Date('data-totalmente-invalida'),
      endDate: new Date('2025-05-10T00:00:00Z')
    };

    const result = season.scheduleGrandPrix(invalidDateGp);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve isolar datas de etapas contra mutações externas (cópia defensiva)', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const mutableStartDate = new Date('2025-03-14T00:00:00Z');
    const mutableEndDate = new Date('2025-03-16T00:00:00Z');

    const gp: ScheduledGrandPrix = {
      grandPrixId: EntityId.from<'grand-prix'>('gp-defensive-copy'),
      roundNumber: 1,
      name: 'GP da Austrália',
      startDate: mutableStartDate,
      endDate: mutableEndDate
    };

    const updatedSeason = season.scheduleGrandPrix(gp).getValue();

    // Muta os objetos Date originais fornecidos externamente
    mutableStartDate.setFullYear(2099);
    mutableEndDate.setFullYear(2099);

    const storedGp = updatedSeason.getGrandPrixByRound(1)!;
    assert.equal(storedGp.startDate?.getFullYear(), 2025);
    assert.equal(storedGp.endDate?.getFullYear(), 2025);

    // Muta a data retornada pelo getter
    storedGp.startDate?.setFullYear(1900);
    const storedGpSecondCheck = updatedSeason.getGrandPrixByRound(1)!;
    assert.equal(storedGpSecondCheck.startDate?.getFullYear(), 2025);
  });

  it('deve rejeitar agendamento de novas etapas em temporada CONCLUDED ou CANCELLED', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const withGp = season.scheduleGrandPrix(gp1).getValue();
    const inProgress = withGp.startSeason().getValue();
    const completedGp = inProgress.completeGrandPrix(1).getValue();
    const concluded = completedGp.concludeSeason().getValue();

    const gp2 = createSampleGrandPrix(2, 'GP 2');
    const scheduleInConcluded = concluded.scheduleGrandPrix(gp2);

    assert.equal(scheduleInConcluded.isFailure, true);
    assert.equal(scheduleInConcluded.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);
    assert.match(scheduleInConcluded.getError().message, /bloqueada para modificações/i);
  });
});

describe('Season — Validação de Sequencialidade do Calendário', () => {
  it('deve permitir iniciar a temporada quando as rodadas formam uma sequência contínua de 1 até N', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP Austrália');
    const gp2 = createSampleGrandPrix(2, 'GP China');
    const gp3 = createSampleGrandPrix(3, 'GP Japão');

    const seasonWithGps = season
      .scheduleGrandPrix(gp1).getValue()
      .scheduleGrandPrix(gp2).getValue()
      .scheduleGrandPrix(gp3).getValue();

    const startResult = seasonWithGps.startSeason();
    assert.equal(startResult.isSuccess, true);
    assert.equal(startResult.getValue().status, SeasonStatus.IN_PROGRESS);
  });

  it('deve rejeitar startSeason se houver buracos ou lacunas nas rodadas (ex.: rodada 1 e 3 sem a 2)', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP Austrália');
    const gp3 = createSampleGrandPrix(3, 'GP Japão'); // Rodada 2 ausente!

    const seasonWithGaps = season
      .scheduleGrandPrix(gp1).getValue()
      .scheduleGrandPrix(gp3).getValue();

    const startResult = seasonWithGaps.startSeason();
    assert.equal(startResult.isFailure, true);
    assert.equal(startResult.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(startResult.getError().message, /rodada 2 está ausente.*sequência sequencial de 1 a 2/i);
  });

  it('deve rejeitar startSeason se a primeira rodada for maior que 1 (ex.: começa no round 2)', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp2 = createSampleGrandPrix(2, 'GP Sem Rodada 1');

    const seasonFromRound2 = season.scheduleGrandPrix(gp2).getValue();
    const startResult = seasonFromRound2.startSeason();

    assert.equal(startResult.isFailure, true);
    assert.equal(startResult.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(startResult.getError().message, /rodada 1 está ausente/i);
  });
});

describe('Season — Cancelamento e Reagendamento de Etapas (Cenário Imola 2023)', () => {
  it('deve cancelar pontualmente uma etapa agendada preservando seu roundNumber no histórico', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP Bahrein');
    const gp2 = createSampleGrandPrix(2, 'GP Arábia Saudita');
    const gp6 = createSampleGrandPrix(3, 'GP Emilia-Romagna'); // Rodada 3 no teste sintético
    const gp7 = createSampleGrandPrix(4, 'GP Mônaco'); // Rodada 4 posterior

    const seasonWithGps = season
      .scheduleGrandPrix(gp1).getValue()
      .scheduleGrandPrix(gp2).getValue()
      .scheduleGrandPrix(gp6).getValue()
      .scheduleGrandPrix(gp7).getValue();

    // Cancela a rodada 3 (Imola) devido a enchentes severas
    const cancelResult = seasonWithGps.cancelGrandPrix(3, 'Enchentes severas na região de Emilia-Romagna');
    assert.equal(cancelResult.isSuccess, true);

    const updatedSeason = cancelResult.getValue();
    const imolaGp = updatedSeason.getGrandPrixByRound(3)!;
    assert.equal(imolaGp.status, ScheduledGrandPrixStatus.CANCELLED);
    assert.equal(imolaGp.cancellationReason, 'Enchentes severas na região de Emilia-Romagna');
    assert.equal(imolaGp.roundNumber, 3); // O roundNumber histórico é preservado!

    // A etapa subsequente (Mônaco) permanece exatamente como rodada 4
    const monacoGp = updatedSeason.getGrandPrixByRound(4)!;
    assert.equal(monacoGp.roundNumber, 4);
    assert.equal(monacoGp.status, ScheduledGrandPrixStatus.SCHEDULED);

    // Contadores analíticos
    assert.equal(updatedSeason.cancelledRounds, 1);
    assert.equal(updatedSeason.totalRounds, 4);
  });

  it('deve permitir cancelamento via função utilitária cancelGrandPrix', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP Bahrein');
    const withGp = season.scheduleGrandPrix(gp1).getValue();

    const result = cancelGrandPrix(withGp, 1, 'Cancelamento via utilitário');
    assert.equal(result.isSuccess, true);
    assert.equal(result.getValue().getGrandPrixByRound(1)?.status, ScheduledGrandPrixStatus.CANCELLED);
  });

  it('deve rejeitar cancelGrandPrix para etapa que não existe no calendário', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const result = season.cancelGrandPrix(99);

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.ENTITY_NOT_FOUND);
  });

  it('deve rejeitar cancelGrandPrix para etapa já cancelada', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const cancelledOnce = season.scheduleGrandPrix(gp1).getValue().cancelGrandPrix(1).getValue();

    const secondCancel = cancelledOnce.cancelGrandPrix(1);
    assert.equal(secondCancel.isFailure, true);
    assert.equal(secondCancel.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);
  });

  it('deve rejeitar cancelGrandPrix para etapa já concluída', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const inProgress = season.scheduleGrandPrix(gp1).getValue().startSeason().getValue();
    const completed = inProgress.completeGrandPrix(1).getValue();

    const cancelResult = completed.cancelGrandPrix(1);
    assert.equal(cancelResult.isFailure, true);
    assert.equal(cancelResult.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);
    assert.match(cancelResult.getError().message, /já foi oficialmente concluída/i);
  });

  it('deve reagendar datas de uma etapa via rescheduleGrandPrix', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP da Austrália');
    const withGp = season.scheduleGrandPrix(gp1).getValue();

    const newStart = new Date('2025-10-10T00:00:00Z');
    const newEnd = new Date('2025-10-12T00:00:00Z');

    const rescheduleResult = withGp.rescheduleGrandPrix(1, { startDate: newStart, endDate: newEnd });
    assert.equal(rescheduleResult.isSuccess, true);

    const rescheduledSeason = rescheduleResult.getValue();
    const updatedGp = rescheduledSeason.getGrandPrixByRound(1)!;
    assert.equal(updatedGp.startDate?.toISOString(), newStart.toISOString());
    assert.equal(updatedGp.endDate?.toISOString(), newEnd.toISOString());
  });

  it('deve permitir reagendamento via função utilitária rescheduleGrandPrix', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const withGp = season.scheduleGrandPrix(gp1).getValue();

    const result = rescheduleGrandPrix(withGp, 1, {
      startDate: new Date('2025-11-01T00:00:00Z'),
      endDate: new Date('2025-11-03T00:00:00Z')
    });
    assert.equal(result.isSuccess, true);
  });

  it('deve rejeitar reagendamento com datas inválidas (endDate < startDate)', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const withGp = season.scheduleGrandPrix(gp1).getValue();

    const result = withGp.rescheduleGrandPrix(1, {
      startDate: new Date('2025-10-20T00:00:00Z'),
      endDate: new Date('2025-10-18T00:00:00Z')
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
  });
});

describe('Season — Ciclo de Vida e Transições de Estado', () => {
  it('deve iniciar a temporada (PLANNED -> IN_PROGRESS) se houver etapas agendadas em sequência válida', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP da Austrália');
    const seasonWithGp = season.scheduleGrandPrix(gp).getValue();

    const startResult = seasonWithGp.startSeason();
    assert.equal(startResult.isSuccess, true);

    const inProgress = startResult.getValue();
    assert.equal(inProgress.status, SeasonStatus.IN_PROGRESS);
  });

  it('deve permitir iniciar via função utilitária startSeason', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP da Austrália');
    const withGp = season.scheduleGrandPrix(gp).getValue();

    const result = startSeason(withGp);
    assert.equal(result.isSuccess, true);
    assert.equal(result.getValue().status, SeasonStatus.IN_PROGRESS);
  });

  it('deve rejeitar startSeason() se a temporada não tiver nenhuma etapa agendada', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    assert.equal(season.grandPrixList.length, 0);

    const startResult = season.startSeason();
    assert.equal(startResult.isFailure, true);
    assert.equal(startResult.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.match(startResult.getError().message, /ao menos 1 etapa agendada/i);
  });

  it('deve rejeitar startSeason() se a temporada não estiver em estado PLANNED', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP 1');
    const inProgress = season.scheduleGrandPrix(gp).getValue().startSeason().getValue();

    const secondStart = inProgress.startSeason();
    assert.equal(secondStart.isFailure, true);
    assert.equal(secondStart.getError().code, DomainErrorCode.INVALID_STATE);
  });

  it('deve rejeitar concludeSeason() se houver etapas ainda em aberto (SCHEDULED ou POSTPONED)', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const gp2 = createSampleGrandPrix(2, 'GP 2');
    const inProgress = season
      .scheduleGrandPrix(gp1).getValue()
      .scheduleGrandPrix(gp2).getValue()
      .startSeason().getValue();

    // Completa apenas a rodada 1, deixando a rodada 2 em aberto
    const completedGp1 = inProgress.completeGrandPrix(1).getValue();

    const concludeResult = completedGp1.concludeSeason();
    assert.equal(concludeResult.isFailure, true);
    assert.equal(concludeResult.getError().code, DomainErrorCode.INVALID_STATE);
    assert.match(concludeResult.getError().message, /etapa\(s\) ainda em aberto/i);
  });

  it('deve concluir a temporada quando todas as etapas forem concluídas ou canceladas', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const gp2 = createSampleGrandPrix(2, 'GP 2 (Cancelado)');
    const inProgress = season
      .scheduleGrandPrix(gp1).getValue()
      .scheduleGrandPrix(gp2).getValue()
      .startSeason().getValue();

    const step1 = inProgress.completeGrandPrix(1).getValue();
    const step2 = step1.cancelGrandPrix(2, 'Cancelamento esportivo').getValue();

    const concludeResult = step2.concludeSeason();
    assert.equal(concludeResult.isSuccess, true);

    const concluded = concludeResult.getValue();
    assert.equal(concluded.status, SeasonStatus.CONCLUDED);
    assert.equal(concluded.isLocked, true);
    assert.equal(concluded.completedRounds, 1);
    assert.equal(concluded.cancelledRounds, 1);
  });

  it('deve permitir concluir via função utilitária concludeSeason', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP 1');
    const inProgress = season.scheduleGrandPrix(gp).getValue().startSeason().getValue();
    const readyToConclude = inProgress.completeGrandPrix(1).getValue();

    const result = concludeSeason(readyToConclude);
    assert.equal(result.isSuccess, true);
    assert.equal(result.getValue().status, SeasonStatus.CONCLUDED);
  });

  it('deve rejeitar concludeSeason() se a temporada não estiver IN_PROGRESS', () => {
    const plannedSeason = Season.create(createValidSeasonProps()).getValue();
    const result = plannedSeason.concludeSeason();

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_STATE);
  });

  it('deve cancelar a temporada inteira (PLANNED -> CANCELLED)', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const cancelResult = season.cancelSeason('Cancelamento excepcional por força maior');

    assert.equal(cancelResult.isSuccess, true);
    const cancelled = cancelResult.getValue();
    assert.equal(cancelled.status, SeasonStatus.CANCELLED);
    assert.equal(cancelled.isLocked, true);
  });

  it('deve permitir cancelar via função utilitária cancelSeason', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const result = cancelSeason(season, 'Motivo de teste');

    assert.equal(result.isSuccess, true);
    assert.equal(result.getValue().status, SeasonStatus.CANCELLED);
  });

  it('deve rejeitar cancelSeason() se a temporada já estiver em andamento ou concluída', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP 1');
    const inProgress = season.scheduleGrandPrix(gp).getValue().startSeason().getValue();

    const cancelInProgress = inProgress.cancelSeason();
    assert.equal(cancelInProgress.isFailure, true);
    assert.equal(cancelInProgress.getError().code, DomainErrorCode.INVALID_STATE);

    const completed = inProgress.completeGrandPrix(1).getValue();
    const concluded = completed.concludeSeason().getValue();
    const cancelConcluded = concluded.cancelSeason();
    assert.equal(cancelConcluded.isFailure, true);
  });
});

describe('Season — Retificação Histórica Supervisionada', () => {
  it('deve permitir transição supervisionada de CONCLUDED para HISTORICAL_REVISED com nota de auditoria', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP 1');
    const concluded = season
      .scheduleGrandPrix(gp).getValue()
      .startSeason().getValue()
      .completeGrandPrix(1).getValue()
      .concludeSeason().getValue();

    const revisionResult = concluded.reviseHistorically('Correção de registro documental pós-auditoria');
    assert.equal(revisionResult.isSuccess, true);
    const revised = revisionResult.getValue();

    assert.equal(revised.status, SeasonStatus.HISTORICAL_REVISED);
    assert.equal(revised.isLocked, true);
    assert.match(revised.description ?? '', /REVISÃO HISTÓRICA: Correção de registro documental pós-auditoria/);
  });

  it('deve permitir chamada via função utilitária reviseHistorically', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP 1');
    const concluded = season
      .scheduleGrandPrix(gp).getValue()
      .startSeason().getValue()
      .completeGrandPrix(1).getValue()
      .concludeSeason().getValue();

    const result = reviseHistorically(concluded, 'Auditoria oficial FIA');
    assert.equal(result.isSuccess, true);
    assert.equal(result.getValue().status, SeasonStatus.HISTORICAL_REVISED);
  });

  it('deve rejeitar reviseHistorically() se a temporada não estiver CONCLUDED', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const result = season.reviseHistorically('Nota de auditoria');

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_STATE);
  });

  it('deve rejeitar reviseHistorically() se a nota de auditoria for vazia', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP 1');
    const concluded = season
      .scheduleGrandPrix(gp).getValue()
      .startSeason().getValue()
      .completeGrandPrix(1).getValue()
      .concludeSeason().getValue();

    const result = concluded.reviseHistorically('   ');
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve retificar dados de uma etapa específica em temporada HISTORICAL_REVISED', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP Nome Antigo');
    const revisedSeason = season
      .scheduleGrandPrix(gp).getValue()
      .startSeason().getValue()
      .completeGrandPrix(1).getValue()
      .concludeSeason().getValue()
      .reviseHistorically('Início de revisão')
      .getValue();

    const rectifyResult = revisedSeason.rectifyGrandPrix(
      1,
      { name: 'GP Nome Oficial Retificado' },
      'Correção de nomenclatura nos anais oficiais'
    );

    assert.equal(rectifyResult.isSuccess, true);
    const rectified = rectifyResult.getValue();
    assert.equal(rectified.getGrandPrixByRound(1)?.name, 'GP Nome Oficial Retificado');
    assert.match(rectified.description ?? '', /RETIFICAÇÃO R1/);
  });

  it('deve rejeitar rectifyGrandPrix se a temporada não estiver em HISTORICAL_REVISED', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP 1');
    const inProgress = season.scheduleGrandPrix(gp).getValue().startSeason().getValue();

    const result = inProgress.rectifyGrandPrix(1, { name: 'Novo Nome' }, 'Nota');
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);
  });
});

describe('Season — Associação Regulamentar (ScoringRuleset)', () => {
  it('deve permitir associar e atualizar ScoringRuleset em temporada PLANNED', () => {
    const season = Season.create(createValidSeasonProps({ rulesetId: undefined })).getValue();
    assert.equal(season.rulesetId, undefined);

    const rulesetId = EntityId.from<'scoring-ruleset'>('ruleset-2025-v2');
    const withRulesetResult = season.withRuleset(rulesetId);

    assert.equal(withRulesetResult.isSuccess, true);
    assert.equal(withRulesetResult.getValue().rulesetId?.equals(rulesetId), true);
  });

  it('deve rejeitar withRuleset com identificador inválido', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    // @ts-expect-error Teste de entrada inválida
    const result = season.withRuleset('ruleset-invalido');

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar withRuleset em temporada bloqueada (CONCLUDED)', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP 1');
    const concluded = season
      .scheduleGrandPrix(gp).getValue()
      .startSeason().getValue()
      .completeGrandPrix(1).getValue()
      .concludeSeason().getValue();

    const result = concluded.withRuleset(EntityId.from<'scoring-ruleset'>('ruleset-invalido'));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);
  });
});

describe('Season — Casos de Borda e Validações Adicionais', () => {
  it('deve verificar existência de rodada via hasRound e consulta inexistente via getGrandPrixByRound', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const withGp = season.scheduleGrandPrix(gp1).getValue();

    assert.equal(withGp.hasRound(1), true);
    assert.equal(withGp.hasRound(2), false);
    assert.equal(withGp.getGrandPrixByRound(999), undefined);
  });

  it('deve rejeitar agendamento com grandPrixId ausente ou inválido', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const result = season.scheduleGrandPrix({
      // @ts-expect-error Entrada inválida
      grandPrixId: 'nao-entity-id',
      roundNumber: 1,
      name: 'GP Teste'
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar agendamento com name vazio ou apenas espaços', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const result = season.scheduleGrandPrix({
      grandPrixId: EntityId.from<'grand-prix'>('gp-01'),
      roundNumber: 1,
      name: '   '
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar agendamento com endDate inválida (NaN)', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const result = season.scheduleGrandPrix({
      grandPrixId: EntityId.from<'grand-prix'>('gp-01'),
      roundNumber: 1,
      name: 'GP Teste',
      startDate: new Date('2025-05-01T00:00:00Z'),
      endDate: new Date('data-invalida')
    });

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar cancelGrandPrix em temporada bloqueada', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP 1');
    const concluded = season
      .scheduleGrandPrix(gp).getValue()
      .startSeason().getValue()
      .completeGrandPrix(1).getValue()
      .concludeSeason().getValue();

    const result = concluded.cancelGrandPrix(1);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);
  });

  it('deve rejeitar rescheduleGrandPrix em temporada bloqueada', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp = createSampleGrandPrix(1, 'GP 1');
    const concluded = season
      .scheduleGrandPrix(gp).getValue()
      .startSeason().getValue()
      .completeGrandPrix(1).getValue()
      .concludeSeason().getValue();

    const result = concluded.rescheduleGrandPrix(1, { startDate: new Date() });
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);
  });

  it('deve rejeitar rescheduleGrandPrix para etapa inexistente ou já concluída', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const inProgress = season.scheduleGrandPrix(gp1).getValue().startSeason().getValue();

    const notFoundResult = inProgress.rescheduleGrandPrix(99, { startDate: new Date() });
    assert.equal(notFoundResult.isFailure, true);
    assert.equal(notFoundResult.getError().code, DomainErrorCode.ENTITY_NOT_FOUND);

    const completed = inProgress.completeGrandPrix(1).getValue();
    const completedReschedule = completed.rescheduleGrandPrix(1, { startDate: new Date() });
    assert.equal(completedReschedule.isFailure, true);
    assert.equal(completedReschedule.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);
  });

  it('deve rejeitar rescheduleGrandPrix com datas NaN', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const withGp = season.scheduleGrandPrix(gp1).getValue();

    const nanStart = withGp.rescheduleGrandPrix(1, { startDate: new Date('data-invalida') });
    assert.equal(nanStart.isFailure, true);
    assert.equal(nanStart.getError().code, DomainErrorCode.INVALID_ARGUMENT);

    const nanEnd = withGp.rescheduleGrandPrix(1, { endDate: new Date('data-invalida') });
    assert.equal(nanEnd.isFailure, true);
    assert.equal(nanEnd.getError().code, DomainErrorCode.INVALID_ARGUMENT);
  });

  it('deve rejeitar completeGrandPrix se temporada não estiver IN_PROGRESS, etapa inexistente ou cancelada', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const withGp = season.scheduleGrandPrix(gp1).getValue();

    // Em PLANNED
    const inPlanned = withGp.completeGrandPrix(1);
    assert.equal(inPlanned.isFailure, true);
    assert.equal(inPlanned.getError().code, DomainErrorCode.INVALID_STATE);

    const inProgress = withGp.startSeason().getValue();

    // Etapa inexistente
    const notFound = inProgress.completeGrandPrix(42);
    assert.equal(notFound.isFailure, true);
    assert.equal(notFound.getError().code, DomainErrorCode.ENTITY_NOT_FOUND);

    // Etapa cancelada
    const withCancelled = inProgress.cancelGrandPrix(1).getValue();
    const cancelComplete = withCancelled.completeGrandPrix(1);
    assert.equal(cancelComplete.isFailure, true);
    assert.equal(cancelComplete.getError().code, DomainErrorCode.OPERATION_NOT_ALLOWED);
  });

  it('deve cobrir casos de borda em rectifyGrandPrix', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const gp1 = createSampleGrandPrix(1, 'GP 1');
    const revisedSeason = season
      .scheduleGrandPrix(gp1).getValue()
      .startSeason().getValue()
      .completeGrandPrix(1).getValue()
      .concludeSeason().getValue()
      .reviseHistorically('Auditoria formal')
      .getValue();

    // Nota de auditoria vazia
    const emptyNote = revisedSeason.rectifyGrandPrix(1, { name: 'Novo' }, '   ');
    assert.equal(emptyNote.isFailure, true);
    assert.equal(emptyNote.getError().code, DomainErrorCode.INVALID_ARGUMENT);

    // Etapa inexistente
    const notFound = revisedSeason.rectifyGrandPrix(99, { name: 'Novo' }, 'Nota');
    assert.equal(notFound.isFailure, true);
    assert.equal(notFound.getError().code, DomainErrorCode.ENTITY_NOT_FOUND);

    // Data de início inválida
    const invalidStart = revisedSeason.rectifyGrandPrix(1, { startDate: new Date('nan') }, 'Nota');
    assert.equal(invalidStart.isFailure, true);
    assert.equal(invalidStart.getError().code, DomainErrorCode.INVALID_ARGUMENT);

    // Data de término inválida
    const invalidEnd = revisedSeason.rectifyGrandPrix(1, { endDate: new Date('nan') }, 'Nota');
    assert.equal(invalidEnd.isFailure, true);
    assert.equal(invalidEnd.getError().code, DomainErrorCode.INVALID_ARGUMENT);

    // Data de término anterior ao início
    const reversedDates = revisedSeason.rectifyGrandPrix(
      1,
      { startDate: new Date('2025-05-10'), endDate: new Date('2025-05-01') },
      'Nota'
    );
    assert.equal(reversedDates.isFailure, true);
    assert.equal(reversedDates.getError().code, DomainErrorCode.INVARIANT_VIOLATION);
  });

  it('deve cancelar temporada sem nota explicativa preservando a descrição existente', () => {
    const season = Season.create(createValidSeasonProps()).getValue();
    const cancelled = season.cancelSeason().getValue();
    assert.equal(cancelled.status, SeasonStatus.CANCELLED);
    assert.equal(cancelled.description, season.description);
  });
});
