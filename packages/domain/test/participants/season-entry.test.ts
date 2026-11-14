/**
 * ============================================================================
 * F1Atlas — Suíte de Testes Unitários: SeasonEntry
 * ============================================================================
 *
 * Módulo: packages/domain/test/participants/season-entry.test.ts
 * Componente testado: packages/domain/src/participants/season-entry.ts
 * Padrão: Test runner nativo do Node.js (node:test + node:assert/strict)
 *
 * Propósito:
 * Verificar rigorosamente a entidade de ligação SeasonEntry e a operação
 * copy-on-write deactivateEntry, suas invariantes locais (número de carro 1-99,
 * número 17 aposentado, papel de inscrição, intervalos de rodadas), métodos
 * de consulta temporal e imutabilidade estrita.
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SeasonEntry,
  createSeasonEntry,
  deactivateEntry,
  type CreateSeasonEntryProps
} from '../../src/participants/season-entry.ts';
import { EntryRole } from '../../src/participants/entry-role.ts';
import { EntityId } from '../../src/shared/entity-id.ts';

const createValidSeasonEntryProps = (
  overrides?: Partial<CreateSeasonEntryProps>
): CreateSeasonEntryProps => ({
  id: EntityId.from<'season-entry'>('entry-lewis-hamilton-ferrari-2025'),
  seasonId: EntityId.from<'season'>('season-2025'),
  driverId: EntityId.from<'driver'>('driver-lewis-hamilton'),
  teamId: EntityId.from<'team'>('team-ferrari'),
  constructorId: EntityId.from<'constructor'>('constructor-ferrari'),
  carNumber: 44,
  role: EntryRole.REGULAR,
  ...overrides
});

describe('SeasonEntry — Criação e Invariantes Estruturais', () => {
  it('deve instanciar uma inscrição válida com startRound padrão (1) e sem endRound', () => {
    const props = createValidSeasonEntryProps();
    const result = SeasonEntry.create(props);

    assert.equal(result.isSuccess, true);
    const entry = result.getValue();
    assert.equal(entry.id.value, 'entry-lewis-hamilton-ferrari-2025');
    assert.equal(entry.seasonId.value, 'season-2025');
    assert.equal(entry.driverId.value, 'driver-lewis-hamilton');
    assert.equal(entry.teamId.value, 'team-ferrari');
    assert.equal(entry.constructorId.value, 'constructor-ferrari');
    assert.equal(entry.carNumber, 44);
    assert.equal(entry.role, EntryRole.REGULAR);
    assert.equal(entry.startRound, 1);
    assert.equal(entry.endRound, undefined);
    assert.equal(entry.isActive, true);
  });

  it('deve permitir criação com startRound e endRound explícitos', () => {
    const props = createValidSeasonEntryProps({
      startRound: 5,
      endRound: 21,
      role: EntryRole.SUBSTITUTE
    });
    const result = createSeasonEntry(props);

    assert.equal(result.isSuccess, true);
    const entry = result.getValue();
    assert.equal(entry.startRound, 5);
    assert.equal(entry.endRound, 21);
    assert.equal(entry.role, EntryRole.SUBSTITUTE);
    assert.equal(entry.isActive, false);
  });

  it('deve permitir inscrição para uma única etapa (startRound === endRound)', () => {
    const props = createValidSeasonEntryProps({
      startRound: 2,
      endRound: 2,
      role: EntryRole.SUBSTITUTE,
      carNumber: 38
    });
    const result = SeasonEntry.create(props);

    assert.equal(result.isSuccess, true);
    const entry = result.getValue();
    assert.equal(entry.startRound, 2);
    assert.equal(entry.endRound, 2);
    assert.equal(entry.isActiveInRound(2), true);
    assert.equal(entry.isActiveInRound(1), false);
    assert.equal(entry.isActiveInRound(3), false);
  });

  it('deve rejeitar props nulas ou indefinidas', () => {
    // @ts-expect-error teste de runtime
    const result = SeasonEntry.create(null);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });

  it('deve rejeitar identificadores tipados ausentes ou inválidos', () => {
    const invalidIdKeys: Array<keyof CreateSeasonEntryProps> = [
      'id',
      'seasonId',
      'driverId',
      'teamId',
      'constructorId'
    ];

    for (const key of invalidIdKeys) {
      const result = SeasonEntry.create(createValidSeasonEntryProps({ [key]: null } as unknown as Partial<CreateSeasonEntryProps>));
      assert.equal(result.isFailure, true, `Deveria falhar quando ${key} for nulo`);
      assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
    }
  });
});

describe('SeasonEntry — Validação de Número do Carro (carNumber)', () => {
  it('deve aceitar números válidos de carro entre 1 e 99 (exceto 17)', () => {
    const validCarNumbers = [1, 2, 4, 16, 33, 44, 55, 63, 81, 99];
    for (const num of validCarNumbers) {
      const result = SeasonEntry.create(createValidSeasonEntryProps({ carNumber: num }));
      assert.equal(result.isSuccess, true, `Deveria aceitar carro #${num}`);
      assert.equal(result.getValue().carNumber, num);
    }
  });

  it('deve rejeitar estritamente o número 17 (aposentado)', () => {
    const result = SeasonEntry.create(createValidSeasonEntryProps({ carNumber: 17 }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'RETIRED_PERMANENT_NUMBER');
  });

  it('deve rejeitar números fora do intervalo 1-99', () => {
    const outOfBounds = [0, -1, 100, 200];
    for (const num of outOfBounds) {
      const result = SeasonEntry.create(createValidSeasonEntryProps({ carNumber: num }));
      assert.equal(result.isFailure, true, `Deveria rejeitar carro #${num}`);
      assert.equal(result.getError().code, 'INVALID_CAR_NUMBER');
    }
  });

  it('deve rejeitar número de carro não inteiro', () => {
    const result = SeasonEntry.create(createValidSeasonEntryProps({ carNumber: 44.1 }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'INVALID_CAR_NUMBER');
  });
});

describe('SeasonEntry — Validação de Papel de Inscrição (role)', () => {
  it('deve aceitar papéis REGULAR e SUBSTITUTE', () => {
    const regularResult = SeasonEntry.create(createValidSeasonEntryProps({ role: EntryRole.REGULAR }));
    assert.equal(regularResult.isSuccess, true);
    assert.equal(regularResult.getValue().role, EntryRole.REGULAR);

    const subResult = SeasonEntry.create(createValidSeasonEntryProps({ role: EntryRole.SUBSTITUTE }));
    assert.equal(subResult.isSuccess, true);
    assert.equal(subResult.getValue().role, EntryRole.SUBSTITUTE);
  });

  it('deve rejeitar papel desconhecido ou inválido', () => {
    // @ts-expect-error teste de runtime
    const result = SeasonEntry.create(createValidSeasonEntryProps({ role: 'INVALID_ROLE' }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });
});

describe('SeasonEntry — Validação de Intervalos de Rodada (startRound e endRound)', () => {
  it('deve rejeitar startRound menor que 1 ou não inteiro', () => {
    const invalidRounds = [0, -1, 1.5];
    for (const r of invalidRounds) {
      const result = SeasonEntry.create(createValidSeasonEntryProps({ startRound: r }));
      assert.equal(result.isFailure, true, `Deveria rejeitar startRound ${r}`);
      assert.equal(result.getError().code, 'INVALID_ROUND_RANGE');
    }
  });

  it('deve rejeitar endRound menor que startRound', () => {
    const result = SeasonEntry.create(createValidSeasonEntryProps({ startRound: 10, endRound: 9 }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'INVALID_ROUND_RANGE');
    assert.match(result.getError().message, /anterior à etapa inicial/i);
  });

  it('deve rejeitar endRound menor que 1 ou não inteiro', () => {
    const resultZero = SeasonEntry.create(createValidSeasonEntryProps({ endRound: 0 }));
    assert.equal(resultZero.isFailure, true);
    assert.equal(resultZero.getError().code, 'INVALID_ROUND_RANGE');

    const resultFloat = SeasonEntry.create(createValidSeasonEntryProps({ endRound: 5.5 }));
    assert.equal(resultFloat.isFailure, true);
    assert.equal(resultFloat.getError().code, 'INVALID_ROUND_RANGE');
  });

  it('deve verificar vigência na rodada via isActiveInRound', () => {
    const entry = SeasonEntry.create(
      createValidSeasonEntryProps({ startRound: 3, endRound: 8 })
    ).getValue();

    assert.equal(entry.isActiveInRound(2), false);
    assert.equal(entry.isActiveInRound(3), true);
    assert.equal(entry.isActiveInRound(5), true);
    assert.equal(entry.isActiveInRound(8), true);
    assert.equal(entry.isActiveInRound(9), false);
    assert.equal(entry.isActiveInRound(0), false);
    assert.equal(entry.isActiveInRound(3.5), false);
  });
});

describe('SeasonEntry — Operação de Ciclo de Vida: deactivateEntry', () => {
  it('deve encerrar vigência via copy-on-write mantendo a instância original intacta', () => {
    const originalEntry = SeasonEntry.create(
      createValidSeasonEntryProps({ startRound: 1 })
    ).getValue();

    assert.equal(originalEntry.endRound, undefined);
    assert.equal(originalEntry.isActive, true);

    const deactivationResult = deactivateEntry(originalEntry, 15);
    assert.equal(deactivationResult.isSuccess, true);

    const closedEntry = deactivationResult.getValue();

    // Nova instância reflete o encerramento
    assert.equal(closedEntry.id.value, originalEntry.id.value);
    assert.equal(closedEntry.endRound, 15);
    assert.equal(closedEntry.isActive, false);
    assert.equal(closedEntry.isActiveInRound(15), true);
    assert.equal(closedEntry.isActiveInRound(16), false);

    // Instância original permanece inalterada (copy-on-write auditável)
    assert.equal(originalEntry.endRound, undefined);
    assert.equal(originalEntry.isActive, true);
    assert.notEqual(closedEntry, originalEntry);
  });

  it('deve rejeitar encerramento com rodada anterior ao startRound', () => {
    const entry = SeasonEntry.create(createValidSeasonEntryProps({ startRound: 5 })).getValue();
    const result = deactivateEntry(entry, 4);

    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'INVALID_ROUND_RANGE');
    assert.match(result.getError().message, /anterior à etapa inicial/i);
  });

  it('deve rejeitar encerramento se a inscrição já se encontra desativada', () => {
    const entry = SeasonEntry.create(
      createValidSeasonEntryProps({ startRound: 1, endRound: 10 })
    ).getValue();

    const result = deactivateEntry(entry, 12);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'ENTRY_ALREADY_DEACTIVATED');
    assert.match(result.getError().message, /já se encontra desativada/i);
  });

  it('deve rejeitar finalRound inválido (< 1 ou não inteiro)', () => {
    const entry = SeasonEntry.create(createValidSeasonEntryProps()).getValue();

    const resultZero = deactivateEntry(entry, 0);
    assert.equal(resultZero.isFailure, true);
    assert.equal(resultZero.getError().code, 'INVALID_ROUND_RANGE');

    const resultFloat = deactivateEntry(entry, 10.5);
    assert.equal(resultFloat.isFailure, true);
    assert.equal(resultFloat.getError().code, 'INVALID_ROUND_RANGE');
  });

  it('deve rejeitar entrada não instanciada a partir de SeasonEntry', () => {
    // @ts-expect-error teste proposital de runtime
    const result = deactivateEntry({ startRound: 1 }, 10);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });

  it('deve comparar igualdade por identidade (equals)', () => {
    const idA = EntityId.from<'season-entry'>('entry-1');
    const idB = EntityId.from<'season-entry'>('entry-2');

    const entryA1 = SeasonEntry.create(createValidSeasonEntryProps({ id: idA })).getValue();
    const entryA2 = SeasonEntry.create(createValidSeasonEntryProps({ id: idA, carNumber: 99 })).getValue();
    const entryB = SeasonEntry.create(createValidSeasonEntryProps({ id: idB })).getValue();

    assert.equal(entryA1.equals(entryA2), true);
    assert.equal(entryA1.equals(entryB), false);
    assert.equal(entryA1.equals(null), false);
  });

  it('deve garantir imutabilidade estrita da instância congelada (Object.freeze)', () => {
    const entry = SeasonEntry.create(createValidSeasonEntryProps()).getValue();

    assert.equal(Object.isFrozen(entry), true);
    assert.throws(() => {
      // @ts-expect-error mutação intencional
      entry.carNumber = 10;
    }, TypeError);
  });
});
