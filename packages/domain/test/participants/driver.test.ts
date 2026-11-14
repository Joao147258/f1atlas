/**
 * ============================================================================
 * F1Atlas — Suíte de Testes Unitários: Driver
 * ============================================================================
 *
 * Módulo: packages/domain/test/participants/driver.test.ts
 * Componente testado: packages/domain/src/participants/driver.ts
 * Padrão: Test runner nativo do Node.js (node:test + node:assert/strict)
 *
 * Propósito:
 * Verificar rigorosamente a entidade de domínio Driver, suas invariantes locais
 * (código FIA de 3 letras maiúsculas, nomes obrigatórios, nacionalidade),
 * regras de número permanente da FIA (número 17 aposentado, privilégio do campeão
 * para o número 1, intervalo 1-99), métodos de formatação e imutabilidade estrita.
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Driver, createDriver, type CreateDriverProps } from '../../src/participants/driver.ts';
import { EntityId } from '../../src/shared/entity-id.ts';

const createValidDriverProps = (overrides?: Partial<CreateDriverProps>): CreateDriverProps => ({
  id: EntityId.from<'driver'>('driver-max-verstappen'),
  firstName: 'Max',
  lastName: 'Verstappen',
  code: 'VER',
  nationality: 'NLD',
  permanentNumber: 33,
  isWorldChampion: true,
  birthDate: '1997-09-30',
  ...overrides
});

describe('Driver — Criação e Invariantes Estruturais', () => {
  it('deve instanciar um piloto válido com todas as propriedades', () => {
    const props = createValidDriverProps();
    const result = Driver.create(props);

    assert.equal(result.isSuccess, true);
    const driver = result.getValue();
    assert.equal(driver.id.value, 'driver-max-verstappen');
    assert.equal(driver.firstName, 'Max');
    assert.equal(driver.lastName, 'Verstappen');
    assert.equal(driver.fullName, 'Max Verstappen');
    assert.equal(driver.code, 'VER');
    assert.equal(driver.nationality, 'NLD');
    assert.equal(driver.permanentNumber, 33);
    assert.equal(driver.isWorldChampion, true);
    assert.equal(driver.birthDate, '1997-09-30');
  });

  it('deve permitir criação com campos opcionais omitidos (permanentNumber e birthDate nulos)', () => {
    const props: CreateDriverProps = {
      id: EntityId.from<'driver'>('driver-ayrton-senna'),
      firstName: 'Ayrton',
      lastName: 'Senna',
      code: 'SEN',
      nationality: 'BRA'
    };
    const result = createDriver(props);

    assert.equal(result.isSuccess, true);
    const driver = result.getValue();
    assert.equal(driver.permanentNumber, null);
    assert.equal(driver.birthDate, null);
    assert.equal(driver.isWorldChampion, false);
  });

  it('deve rejeitar props nulas ou indefinidas', () => {
    // @ts-expect-error teste proposital de runtime
    const result = Driver.create(null);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });

  it('deve rejeitar identificador ausente ou inválido', () => {
    // @ts-expect-error teste proposital de runtime
    const result = Driver.create(createValidDriverProps({ id: null }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
    assert.match(result.getError().message, /id.*EntityId/i);
  });

  it('deve rejeitar primeiro nome vazio ou composto apenas por espaços', () => {
    const resultEmpty = Driver.create(createValidDriverProps({ firstName: '' }));
    assert.equal(resultEmpty.isFailure, true);
    assert.equal(resultEmpty.getError().code, 'DOMAIN.INVALID_ARGUMENT');

    const resultWhitespace = Driver.create(createValidDriverProps({ firstName: '   ' }));
    assert.equal(resultWhitespace.isFailure, true);
  });

  it('deve rejeitar sobrenome vazio ou composto apenas por espaços', () => {
    const result = Driver.create(createValidDriverProps({ lastName: '  ' }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });

  it('deve sanitizar whitespace nas extremidades dos nomes e nacionalidade', () => {
    const result = Driver.create(
      createValidDriverProps({
        firstName: '  Charles  ',
        lastName: '  Leclerc  ',
        nationality: '  MCO  '
      })
    );
    assert.equal(result.isSuccess, true);
    const driver = result.getValue();
    assert.equal(driver.firstName, 'Charles');
    assert.equal(driver.lastName, 'Leclerc');
    assert.equal(driver.nationality, 'MCO');
  });

  it('deve rejeitar nacionalidade vazia', () => {
    const result = Driver.create(createValidDriverProps({ nationality: '' }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });
});

describe('Driver — Regras de Código FIA (code)', () => {
  it('deve aceitar códigos válidos de 3 letras maiúsculas', () => {
    const codes = ['HAM', 'NOR', 'PIA', 'ALO', 'SAI', 'LEC'];
    for (const code of codes) {
      const result = Driver.create(createValidDriverProps({ code }));
      assert.equal(result.isSuccess, true, `Deveria aceitar código ${code}`);
      assert.equal(result.getValue().code, code);
    }
  });

  it('deve rejeitar código com menos de 3 letras', () => {
    const result = Driver.create(createValidDriverProps({ code: 'AL' }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'INVALID_DRIVER_CODE');
  });

  it('deve rejeitar código com mais de 3 letras', () => {
    const result = Driver.create(createValidDriverProps({ code: 'HAMI' }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'INVALID_DRIVER_CODE');
  });

  it('deve rejeitar código com letras minúsculas ou caracteres não alfabéticos', () => {
    const invalidCodes = ['ver', 'V3R', 'VE-', 'V R', 'V@R'];
    for (const code of invalidCodes) {
      const result = Driver.create(createValidDriverProps({ code }));
      assert.equal(result.isFailure, true, `Deveria rejeitar código ${code}`);
      assert.equal(result.getError().code, 'INVALID_DRIVER_CODE');
    }
  });
});

describe('Driver — Regras Oficiais de Número Permanente (permanentNumber)', () => {
  it('deve aceitar números permanentes válidos entre 2 e 99 (exceto 17)', () => {
    const validNumbers = [2, 4, 11, 16, 44, 55, 63, 81, 99];
    for (const num of validNumbers) {
      const result = Driver.create(createValidDriverProps({ permanentNumber: num }));
      assert.equal(result.isSuccess, true, `Deveria aceitar número ${num}`);
      assert.equal(result.getValue().permanentNumber, num);
    }
  });

  it('deve rejeitar estritamente o número 17 (aposentado em homenagem a Jules Bianchi)', () => {
    const result = Driver.create(createValidDriverProps({ permanentNumber: 17 }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'RETIRED_PERMANENT_NUMBER');
    assert.match(result.getError().message, /17.*aposentado.*Bianchi/i);
  });

  it('deve permitir número 1 para piloto campeão mundial vigente (isWorldChampion: true)', () => {
    const result = Driver.create(createValidDriverProps({ permanentNumber: 1, isWorldChampion: true }));
    assert.equal(result.isSuccess, true);
    assert.equal(result.getValue().permanentNumber, 1);
  });

  it('deve rejeitar número 1 para piloto que não seja campeão mundial', () => {
    const result = Driver.create(createValidDriverProps({ permanentNumber: 1, isWorldChampion: false }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'UNAUTHORIZED_CHAMPION_NUMBER');
    assert.match(result.getError().message, /número 1.*campe/i);
  });

  it('deve rejeitar números permanentes fora do intervalo 1-99', () => {
    const outOfBounds = [0, -1, 100, 999];
    for (const num of outOfBounds) {
      const result = Driver.create(createValidDriverProps({ permanentNumber: num }));
      assert.equal(result.isFailure, true, `Deveria rejeitar ${num}`);
      assert.equal(result.getError().code, 'INVALID_PERMANENT_NUMBER');
    }
  });

  it('deve rejeitar número não inteiro (ex.: ponto flutuante)', () => {
    const result = Driver.create(createValidDriverProps({ permanentNumber: 44.5 }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'INVALID_PERMANENT_NUMBER');
  });
});

describe('Driver — Métodos Utilitários e Formatação', () => {
  it('deve formatar displayName nos três formatos suportados', () => {
    const driver = Driver.create(createValidDriverProps({ firstName: 'Lewis', lastName: 'Hamilton', code: 'HAM' })).getValue();

    assert.equal(driver.displayName('FULL'), 'Lewis Hamilton');
    assert.equal(driver.displayName('ABBREVIATED'), 'L. Hamilton');
    assert.equal(driver.displayName('TELEMETRY'), 'HAM');
    assert.equal(driver.displayName(), 'Lewis Hamilton');
  });

  it('deve comparar igualdade por identidade (equals)', () => {
    const idA = EntityId.from<'driver'>('driver-1');
    const idB = EntityId.from<'driver'>('driver-2');

    const driverA1 = Driver.create(createValidDriverProps({ id: idA })).getValue();
    const driverA2 = Driver.create(createValidDriverProps({ id: idA, firstName: 'Outro' })).getValue();
    const driverB = Driver.create(createValidDriverProps({ id: idB })).getValue();

    assert.equal(driverA1.equals(driverA2), true);
    assert.equal(driverA1.equals(driverB), false);
    assert.equal(driverA1.equals(null), false);
    assert.equal(driverA1.equals({ id: idA }), false);
  });

  it('deve garantir imutabilidade estrita da instância congelada (Object.freeze)', () => {
    const driver = Driver.create(createValidDriverProps()).getValue();

    assert.equal(Object.isFrozen(driver), true);
    assert.throws(() => {
      // @ts-expect-error mutação intencional
      driver.firstName = 'NovoNome';
    }, TypeError);
  });
});
