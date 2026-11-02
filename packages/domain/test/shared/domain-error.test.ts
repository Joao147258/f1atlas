/**
 * ============================================================================
 * F1Atlas — Suite de Testes Unitários: DomainError
 * ============================================================================
 *
 * Módulo: packages/domain/test/shared/domain-error.test.ts
 * Componente testado: packages/domain/src/shared/domain-error.ts
 * Padrão: Test runner nativo do Node.js (node:test + node:assert/strict)
 *
 * Propósito:
 * Verificar rigorosamente contratos, invariantes, imutabilidade, herança,
 * factories, type guards e comportamento em cenários positivos, negativos
 * e de fronteira do tipo base de erros de domínio.
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DomainError,
  DomainErrorCode,
  createDomainError,
  isDomainError,
  type DomainErrorContext
} from '../../src/shared/domain-error.ts';

describe('DomainError — Instanciação e Contratos Básicos', () => {
  it('deve instanciar DomainError com código semântico e mensagem legível', () => {
    const code = DomainErrorCode.INVALID_STATE;
    const message = 'A temporada já se encontra concluída.';
    const error = new DomainError(code, message);

    assert.equal(error.code, code);
    assert.equal(error.message, message);
    assert.equal(error.name, 'DomainError');
    assert.equal(error.context, undefined);
  });

  it('deve herdar nativamente da classe Error do JavaScript', () => {
    const error = new DomainError('DOMAIN.TEST', 'Falha genérica');

    assert.ok(error instanceof Error, 'DomainError deve ser instância de Error');
    assert.ok(error instanceof DomainError, 'DomainError deve ser instância de DomainError');
  });

  it('deve capturar stack trace válido iniciando com o nome e a mensagem', () => {
    const error = new DomainError('DOMAIN.TEST', 'Rastreamento de pilha');

    assert.ok(typeof error.stack === 'string', 'Stack trace deve ser uma string');
    assert.ok(error.stack.includes('DomainError: Rastreamento de pilha'), 'Stack deve conter nome e mensagem');
  });

  it('deve anexar metadados de contexto esportivo quando fornecidos', () => {
    const context: DomainErrorContext = {
      seasonId: 'season-2025',
      roundNumber: 12,
      sessionStatus: 'CANCELLED'
    };

    const error = new DomainError(DomainErrorCode.OPERATION_NOT_ALLOWED, 'Sessão cancelada', context);

    assert.deepEqual(error.context, context);
    assert.equal(error.context?.seasonId, 'season-2025');
    assert.equal(error.context?.roundNumber, 12);
  });
});

describe('DomainError — Imutabilidade e Proteção de Estado', () => {
  it('deve congelar a instância impedindo mutações em suas propriedades', () => {
    const error = new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Argumento inválido');

    assert.ok(Object.isFrozen(error), 'Instância de DomainError deve estar congelada');

    assert.throws(
      () => {
        // @ts-expect-error mutação em propriedade somente-leitura
        error.code = 'DOMAIN.MUTATED';
      },
      TypeError,
      'Mutação de código deve lançar TypeError em strict mode'
    );

    assert.throws(
      () => {
        // @ts-expect-error mutação em propriedade somente-leitura
        error.message = 'Mensagem alterada';
      },
      TypeError,
      'Mutação de mensagem deve lançar TypeError em strict mode'
    );
  });

  it('deve congelar o objeto de contexto impedindo mutações internas', () => {
    const context = { driverId: 'driver-44', penaltySeconds: 5 };
    const error = new DomainError(DomainErrorCode.INVARIANT_VIOLATION, 'Penalidade aplicada', context);

    assert.ok(error.context !== undefined);
    assert.ok(Object.isFrozen(error.context), 'Objeto de contexto deve estar congelado');

    assert.throws(
      () => {
        // @ts-expect-error mutação de propriedade de contexto congelado
        error.context.penaltySeconds = 10;
      },
      TypeError,
      'Mutação de propriedade de contexto deve lançar TypeError'
    );
  });

  it('deve isolar o contexto contra mutações retroativas no objeto original fornecido', () => {
    const mutableOriginal = { lapNumber: 15 };
    const error = new DomainError(DomainErrorCode.INVALID_STATE, 'Volta inválida', mutableOriginal);

    // Modifica o objeto externo original após passar para o construtor
    mutableOriginal.lapNumber = 99;

    assert.equal(
      error.context?.lapNumber,
      15,
      'O contexto interno não deve refletir mutações no objeto externo original'
    );
  });
});

describe('DomainError — Subclassing e Especialização', () => {
  class InvariantViolationError extends DomainError {
    constructor(message: string, context?: DomainErrorContext) {
      super(DomainErrorCode.INVARIANT_VIOLATION, message, context);
    }
  }

  it('deve preservar o nome específico da subclasse e a cadeia de protótipos', () => {
    const error = new InvariantViolationError('Invariante do GP violada', { gpRound: 1 });

    assert.equal(error.name, 'InvariantViolationError');
    assert.equal(error.code, DomainErrorCode.INVARIANT_VIOLATION);
    assert.ok(error instanceof InvariantViolationError);
    assert.ok(error instanceof DomainError);
    assert.ok(error instanceof Error);
    assert.ok(Object.isFrozen(error));
  });
});

describe('createDomainError — Factory Declarativa', () => {
  it('deve construir instâncias de DomainError idênticas ao construtor direto', () => {
    const error = createDomainError(DomainErrorCode.ENTITY_NOT_FOUND, 'Circuito não encontrado', {
      circuitId: 'spa-francorchamps'
    });

    assert.ok(error instanceof DomainError);
    assert.equal(error.code, DomainErrorCode.ENTITY_NOT_FOUND);
    assert.equal(error.message, 'Circuito não encontrado');
    assert.equal(error.context?.circuitId, 'spa-francorchamps');
    assert.ok(Object.isFrozen(error));
  });

  it('deve aceitar código personalizado estruturado de subdomínio', () => {
    const customCode = 'DOMAIN.SCORING_RULESET_MISMATCH';
    const error = createDomainError(customCode, 'Regulamento de pontuação incompatível');

    assert.equal(error.code, customCode);
  });
});

describe('isDomainError — Predicado de Tipo (Type Guard)', () => {
  it('deve retornar true para instâncias diretas de DomainError', () => {
    const error = new DomainError('DOMAIN.TEST', 'Teste');
    assert.equal(isDomainError(error), true);
  });

  it('deve retornar true para instâncias criadas pela factory createDomainError', () => {
    const error = createDomainError('DOMAIN.TEST', 'Teste factory');
    assert.equal(isDomainError(error), true);
  });

  it('deve retornar true para subclasses especializadas de DomainError', () => {
    class CustomSportError extends DomainError {
      constructor() {
        super('DOMAIN.SPORT', 'Erro esportivo');
      }
    }
    const error = new CustomSportError();
    assert.equal(isDomainError(error), true);
  });

  it('deve retornar true para objetos estruturalmente compatíveis (Duck Typing defensivo)', () => {
    const duckError = {
      name: 'CustomDomainError',
      code: 'DOMAIN.DUCK',
      message: 'Erro com estrutura válida de DomainError'
    };

    assert.equal(isDomainError(duckError), true);
  });

  it('deve retornar false para instâncias de Error genérico do JavaScript', () => {
    assert.equal(isDomainError(new Error('Erro comum sem código')), false);
    assert.equal(isDomainError(new TypeError('Tipo inválido')), false);
    assert.equal(isDomainError(new RangeError('Fora do intervalo')), false);
  });

  it('deve retornar false para valores primitivos', () => {
    assert.equal(isDomainError('uma string qualquer'), false);
    assert.equal(isDomainError(42), false);
    assert.equal(isDomainError(true), false);
    assert.equal(isDomainError(Symbol('sym')), false);
  });

  it('deve retornar false para valores nulos ou indefinidos sem lançar exceção', () => {
    assert.equal(isDomainError(null), false);
    assert.equal(isDomainError(undefined), false);
  });

  it('deve retornar false para objetos que não possuam todas as propriedades exigidas', () => {
    assert.equal(isDomainError({}), false);
    assert.equal(isDomainError({ code: 'DOMAIN.TEST' }), false);
    assert.equal(isDomainError({ code: 'DOMAIN.TEST', message: 'Falta nome' }), false);
    assert.equal(isDomainError({ code: 123, message: 'Código não é string', name: 'DomainError' }), false);
    assert.equal(isDomainError({ code: 'DOMAIN.TEST', message: 123, name: 'DomainError' }), false);
  });

  it('deve retornar false se a propriedade name não terminar com "Error"', () => {
    const invalidNameObject = {
      code: 'DOMAIN.TEST',
      message: 'Nome inválido',
      name: 'NotAnException'
    };

    assert.equal(isDomainError(invalidNameObject), false);
  });
});
