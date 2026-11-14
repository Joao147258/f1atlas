/**
 * ============================================================================
 * F1Atlas — Suíte de Testes Unitários: Team
 * ============================================================================
 *
 * Módulo: packages/domain/test/participants/team.test.ts
 * Componente testado: packages/domain/src/participants/team.ts
 * Padrão: Test runner nativo do Node.js (node:test + node:assert/strict)
 *
 * Propósito:
 * Verificar a entidade de domínio Team, suas invariantes locais (razão social,
 * nome comercial, nacionalidade, ano de fundação válido), métodos de identidade
 * e imutabilidade estrita.
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Team, createTeam, type CreateTeamProps } from '../../src/participants/team.ts';
import { EntityId } from '../../src/shared/entity-id.ts';

const createValidTeamProps = (overrides?: Partial<CreateTeamProps>): CreateTeamProps => ({
  id: EntityId.from<'team'>('team-ferrari'),
  legalName: 'Ferrari S.p.A.',
  commercialName: 'Scuderia Ferrari HP',
  nationality: 'ITA',
  baseLocation: 'Maranello, Itália',
  foundedYear: 1950,
  ...overrides
});

describe('Team — Criação e Invariantes Estruturais', () => {
  it('deve instanciar uma equipe válida com todas as propriedades', () => {
    const props = createValidTeamProps();
    const result = Team.create(props);

    assert.equal(result.isSuccess, true);
    const team = result.getValue();
    assert.equal(team.id.value, 'team-ferrari');
    assert.equal(team.legalName, 'Ferrari S.p.A.');
    assert.equal(team.commercialName, 'Scuderia Ferrari HP');
    assert.equal(team.nationality, 'ITA');
    assert.equal(team.baseLocation, 'Maranello, Itália');
    assert.equal(team.foundedYear, 1950);
  });

  it('deve permitir criação com campos opcionais omitidos (baseLocation e foundedYear)', () => {
    const props: CreateTeamProps = {
      id: EntityId.from<'team'>('team-mclaren'),
      legalName: 'McLaren Racing Limited',
      commercialName: 'McLaren Formula 1 Team',
      nationality: 'GBR'
    };
    const result = createTeam(props);

    assert.equal(result.isSuccess, true);
    const team = result.getValue();
    assert.equal(team.baseLocation, null);
    assert.equal(team.foundedYear, null);
  });

  it('deve rejeitar props nulas ou indefinidas', () => {
    // @ts-expect-error teste de runtime
    const result = Team.create(null);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });

  it('deve rejeitar identificador ausente ou inválido', () => {
    // @ts-expect-error teste de runtime
    const result = Team.create(createValidTeamProps({ id: null }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });

  it('deve rejeitar razão social (legalName) vazia', () => {
    const resultEmpty = Team.create(createValidTeamProps({ legalName: '' }));
    assert.equal(resultEmpty.isFailure, true);
    assert.equal(resultEmpty.getError().code, 'DOMAIN.INVALID_ARGUMENT');

    const resultWhitespace = Team.create(createValidTeamProps({ legalName: '   ' }));
    assert.equal(resultWhitespace.isFailure, true);
  });

  it('deve rejeitar nome comercial (commercialName) vazio', () => {
    const result = Team.create(createValidTeamProps({ commercialName: '   ' }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });

  it('deve rejeitar nacionalidade vazia', () => {
    const result = Team.create(createValidTeamProps({ nationality: '' }));
    assert.equal(result.isFailure, true);
    assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
  });

  it('deve rejeitar ano de fundação inválido (< 1900, > 2100 ou não inteiro)', () => {
    const invalidYears = [1899, 2101, 1950.5];
    for (const year of invalidYears) {
      const result = Team.create(createValidTeamProps({ foundedYear: year }));
      assert.equal(result.isFailure, true, `Deveria rejeitar ano ${year}`);
      assert.equal(result.getError().code, 'DOMAIN.INVALID_ARGUMENT');
    }
  });

  it('deve comparar igualdade por identidade (equals)', () => {
    const idA = EntityId.from<'team'>('team-1');
    const idB = EntityId.from<'team'>('team-2');

    const teamA1 = Team.create(createValidTeamProps({ id: idA })).getValue();
    const teamA2 = Team.create(createValidTeamProps({ id: idA, commercialName: 'Outro Nome' })).getValue();
    const teamB = Team.create(createValidTeamProps({ id: idB })).getValue();

    assert.equal(teamA1.equals(teamA2), true);
    assert.equal(teamA1.equals(teamB), false);
    assert.equal(teamA1.equals(null), false);
  });

  it('deve garantir imutabilidade estrita da instância congelada (Object.freeze)', () => {
    const team = Team.create(createValidTeamProps()).getValue();

    assert.equal(Object.isFrozen(team), true);
    assert.throws(() => {
      // @ts-expect-error mutação intencional
      team.commercialName = 'Alterado';
    }, TypeError);
  });
});
