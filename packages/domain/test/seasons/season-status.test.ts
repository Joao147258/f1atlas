/**
 * ============================================================================
 * F1Atlas — Suíte de Testes Unitários: SeasonStatus
 * ============================================================================
 *
 * Módulo: packages/domain/test/seasons/season-status.test.ts
 * Componente testado: packages/domain/src/seasons/season-status.ts
 * Padrão: Test runner nativo do Node.js (node:test + node:assert/strict)
 *
 * Propósito:
 * Verificar rigorosamente a máquina de estados do ciclo de vida de uma temporada,
 * as transições regulamentares permitidas/proibidas e a política de bloqueio histórico.
 * ============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SeasonStatus,
  isValidTransition,
  isLockedForModifications
} from '../../src/seasons/season-status.ts';

describe('SeasonStatus — Máquina de Estados e Transições Regulamentares', () => {
  it('deve aprovar transições válidas do ciclo de vida regulamentar', () => {
    // PLANNED -> IN_PROGRESS (início da primeira etapa)
    assert.equal(isValidTransition(SeasonStatus.PLANNED, SeasonStatus.IN_PROGRESS), true);

    // PLANNED -> CANCELLED (cancelamento antes do início)
    assert.equal(isValidTransition(SeasonStatus.PLANNED, SeasonStatus.CANCELLED), true);

    // IN_PROGRESS -> CONCLUDED (encerramento e homologação final da temporada)
    assert.equal(isValidTransition(SeasonStatus.IN_PROGRESS, SeasonStatus.CONCLUDED), true);

    // CONCLUDED -> HISTORICAL_REVISED (revisão histórica supervisionada pós-conclusão)
    assert.equal(isValidTransition(SeasonStatus.CONCLUDED, SeasonStatus.HISTORICAL_REVISED), true);
  });

  it('deve reprovar transições ilegítimas e retrocessos de estado', () => {
    // Proibido retorno para PLANNED a partir de qualquer estado ativo/encerrado
    assert.equal(isValidTransition(SeasonStatus.IN_PROGRESS, SeasonStatus.PLANNED), false);
    assert.equal(isValidTransition(SeasonStatus.CONCLUDED, SeasonStatus.PLANNED), false);
    assert.equal(isValidTransition(SeasonStatus.CANCELLED, SeasonStatus.PLANNED), false);
    assert.equal(isValidTransition(SeasonStatus.HISTORICAL_REVISED, SeasonStatus.PLANNED), false);

    // Proibido pular direto de PLANNED para CONCLUDED sem passar por IN_PROGRESS
    assert.equal(isValidTransition(SeasonStatus.PLANNED, SeasonStatus.CONCLUDED), false);

    // Proibido transicionar a partir de CANCELLED (estado terminal)
    assert.equal(isValidTransition(SeasonStatus.CANCELLED, SeasonStatus.IN_PROGRESS), false);
    assert.equal(isValidTransition(SeasonStatus.CANCELLED, SeasonStatus.CONCLUDED), false);

    // Proibido reabrir temporada CONCLUDED para IN_PROGRESS sem auditoria histórica
    assert.equal(isValidTransition(SeasonStatus.CONCLUDED, SeasonStatus.IN_PROGRESS), false);

    // Transição para o mesmo estado deve ser false
    assert.equal(isValidTransition(SeasonStatus.PLANNED, SeasonStatus.PLANNED), false);
    assert.equal(isValidTransition(SeasonStatus.IN_PROGRESS, SeasonStatus.IN_PROGRESS), false);
    assert.equal(isValidTransition(SeasonStatus.CONCLUDED, SeasonStatus.CONCLUDED), false);
  });

  it('deve avaliar corretamente o bloqueio de modificações históricas (isLockedForModifications)', () => {
    // Temporadas em planejamento ou em andamento estão abertas para operações ordinárias
    assert.equal(isLockedForModifications(SeasonStatus.PLANNED), false);
    assert.equal(isLockedForModifications(SeasonStatus.IN_PROGRESS), false);

    // Temporadas concluídas ou revisadas historicamente são blindadas contra mutações
    assert.equal(isLockedForModifications(SeasonStatus.CONCLUDED), true);
    assert.equal(isLockedForModifications(SeasonStatus.HISTORICAL_REVISED), true);

    // Temporadas canceladas também são blindadas
    assert.equal(isLockedForModifications(SeasonStatus.CANCELLED), true);
  });
});
