/**
 * ============================================================================
 * F1Atlas — Camada Domain | Testes de Integração
 * ============================================================================
 *
 * Suíte de Testes de Integração: Contratos Compartilhados (M2.1-IT-A)
 * Arquivo: packages/domain/test/integration/shared-contracts.integration.test.ts
 *
 * Objetivo Arquitetural:
 * Validar que as primitivas fundamentais de identidade tipada (EntityId<TKind>),
 * container monádico (Result<T, E>) e erros semânticos (DomainError) são compartilhadas,
 * transmitidas e interpretadas de forma consistente e segura por todos os 6 módulos
 * da camada de domínio puro.
 * ============================================================================
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { EntityId, createEntityId } from '../../src/shared/entity-id.ts';
import { DomainError, DomainErrorCode, isDomainError } from '../../src/shared/domain-error.ts';
import { Result } from '../../src/shared/result.ts';

import { Season, createSeason } from '../../src/seasons/season.ts';
import { SeasonStatus } from '../../src/seasons/season-status.ts';
import { Driver } from '../../src/participants/driver.ts';
import { Team } from '../../src/participants/team.ts';
import { Constructor } from '../../src/participants/constructor.ts';
import { SeasonEntry } from '../../src/participants/season-entry.ts';
import { EntryRole } from '../../src/participants/entry-role.ts';
import { Circuit } from '../../src/events/circuit.ts';
import { GrandPrix } from '../../src/events/grand-prix.ts';
import { Session, SessionType } from '../../src/events/session.ts';
import { SessionEntry } from '../../src/events/session-entry.ts';
import { SessionResult, ResultStatus, PublicationState } from '../../src/events/session-result.ts';
import { ScoringRuleset } from '../../src/scoring/scoring-ruleset.ts';
import { DriverStandings, StandingStatus } from '../../src/championships/driver-standings.ts';
import { ConstructorStandings } from '../../src/championships/constructor-standings.ts';

describe('M2.1-IT-A — Integração de Contratos Compartilhados (shared)', () => {

  test('IT-SH-01 — deve instanciar e compartilhar identidades EntityId através de todas as entidades do domínio', () => {
    // 1. Instanciação controlada de identidades nominais
    const seasonId = EntityId.from<'season'>('season-2025');
    const driverId = EntityId.from<'driver'>('verstappen');
    const teamId = EntityId.from<'team'>('red-bull-racing');
    const constructorId = EntityId.from<'constructor'>('redbull');
    const entryId = EntityId.from<'season-entry'>('entry-rb-ver-2025');
    const circuitId = EntityId.from<'circuit'>('interlagos');
    const gpId = EntityId.from<'grand-prix'>('gp-brazil-2025');
    const sessionId = EntityId.from<'session'>('ses-brazil-race-2025');
    const sessionEntryId = EntityId.from<'session-entry'>('se-ver-brazil-2025');
    const resultId = EntityId.from<'session-result'>('res-ver-brazil-race-2025');
    const rulesetId = EntityId.from<'scoring-ruleset'>('ruleset-fia-2025');
    const wdcId = EntityId.from<'driver-standings'>('wdc-2025-r1');
    const wccId = EntityId.from<'constructor-standings'>('wcc-2025-r1');

    // 2. Composição com entidades reais de cada módulo
    const seasonRes = createSeason({ id: seasonId, year: 2025, rulesetId });
    const driverRes = Driver.create({
      id: driverId,
      firstName: 'Max',
      lastName: 'Verstappen',
      code: 'VER',
      nationality: 'Dutch',
      permanentNumber: 1,
      isWorldChampion: true
    });
    const teamRes = Team.create({
      id: teamId,
      legalName: 'Red Bull Racing Ltd',
      commercialName: 'Oracle Red Bull Racing',
      nationality: 'Austrian'
    });
    const constructorRes = Constructor.create({
      id: constructorId,
      name: 'Red Bull Racing',
      nationality: 'Austrian'
    });
    const circuitRes = Circuit.create({
      id: circuitId,
      name: 'Autódromo de Interlagos',
      city: 'São Paulo',
      country: 'Brazil',
      trackLengthMeters: 4309,
      cornersCount: 15,
      timezone: 'America/Sao_Paulo'
    });

    assert.equal(seasonRes.isSuccess, true);
    assert.equal(driverRes.isSuccess, true);
    assert.equal(teamRes.isSuccess, true);
    assert.equal(constructorRes.isSuccess, true);
    assert.equal(circuitRes.isSuccess, true);

    const season = seasonRes.getValue();
    const driver = driverRes.getValue();
    const team = teamRes.getValue();
    const constructorEntity = constructorRes.getValue();
    const circuit = circuitRes.getValue();

    // 3. Verificação de integridade e equivalência de identidade
    assert.equal(season.id.value, 'season-2025');
    assert.equal(season.id.equals(seasonId), true);
    assert.equal(season.rulesetId?.equals(rulesetId), true);

    assert.equal(driver.id.equals(driverId), true);
    assert.equal(team.id.equals(teamId), true);
    assert.equal(constructorEntity.id.equals(constructorId), true);
    assert.equal(circuit.id.equals(circuitId), true);

    // 4. Criação de SeasonEntry vinculando os IDs de múltiplos módulos
    const seasonEntryRes = SeasonEntry.create({
      id: entryId,
      seasonId: season.id,
      driverId: driver.id,
      teamId: team.id,
      constructorId: constructorEntity.id,
      carNumber: 1,
      role: EntryRole.REGULAR,
      startRound: 1
    });
    assert.equal(seasonEntryRes.isSuccess, true);
    const seasonEntry = seasonEntryRes.getValue();

    assert.equal(seasonEntry.seasonId.equals(season.id), true);
    assert.equal(seasonEntry.driverId.equals(driver.id), true);
    assert.equal(seasonEntry.teamId.equals(team.id), true);
    assert.equal(seasonEntry.constructorId.equals(constructorEntity.id), true);
  });

  test('IT-SH-02 — deve garantir diferenciação e equivalência semântica de igualdade por valor (Value Equality)', () => {
    const idA1 = EntityId.from<'driver'>('driver-norris');
    const idA2 = EntityId.from<'driver'>('driver-norris');
    const idB = EntityId.from<'driver'>('driver-piastri');
    const idTeam = EntityId.from<'team'>('driver-norris'); // Mesmo valor bruto, outro kind

    // Reflexividade, simetria e transitividade
    assert.equal(idA1.equals(idA1), true);
    assert.equal(idA1.equals(idA2), true);
    assert.equal(idA2.equals(idA1), true);
    assert.equal(idA1.equals(idB), false);

    // Comparação defensiva contra nulos ou objetos que não são EntityId
    assert.equal(idA1.equals(null), false);
    assert.equal(idA1.equals(undefined), false);
    assert.equal(idA1.equals({ value: 'driver-norris' } as any), false);

    // toValue e toString devem retornar o valor primitivo canônico
    assert.equal(idA1.toValue(), 'driver-norris');
    assert.equal(idA1.toString(), 'driver-norris');
  });

  test('IT-SH-03 — deve compor operações entre múltiplos módulos utilizando Result.combine', () => {
    // Pipeline funcional de criação de 4 entidades de 3 módulos distintos
    const driverRes = Driver.create({
      id: EntityId.from<'driver'>('norris'),
      firstName: 'Lando',
      lastName: 'Norris',
      code: 'NOR',
      nationality: 'British',
      permanentNumber: 4
    });

    const teamRes = Team.create({
      id: EntityId.from<'team'>('mclaren-f1'),
      legalName: 'McLaren Racing Limited',
      commercialName: 'McLaren Formula 1 Team',
      nationality: 'British'
    });

    const constructorRes = Constructor.create({
      id: EntityId.from<'constructor'>('mclaren'),
      name: 'McLaren',
      nationality: 'British'
    });

    const circuitRes = Circuit.create({
      id: EntityId.from<'circuit'>('silverstone'),
      name: 'Silverstone Circuit',
      city: 'Silverstone',
      country: 'United Kingdom',
      trackLengthMeters: 5891,
      cornersCount: 18,
      timezone: 'Europe/London'
    });

    // Agregação de resultados heterogêneos
    const combinedRes = Result.combine<unknown, DomainError>([driverRes, teamRes, constructorRes, circuitRes]);
    assert.equal(combinedRes.isSuccess, true);
    assert.equal(combinedRes.isFailure, false);

    const values = combinedRes.getValue();
    assert.equal(values.length, 4);
    assert.equal((values[0] as Driver).code, 'NOR');
    assert.equal((values[1] as Team).commercialName, 'McLaren Formula 1 Team');
    assert.equal((values[2] as Constructor).name, 'McLaren');
    assert.equal((values[3] as Circuit).cornersCount, 18);
  });

  test('IT-SH-04 — deve interromper a composição na primeira falha detectada com DomainError', () => {
    const validDriverRes = Driver.create({
      id: EntityId.from<'driver'>('leclerc'),
      firstName: 'Charles',
      lastName: 'Leclerc',
      code: 'LEC',
      nationality: 'Monegasque',
      permanentNumber: 16
    });

    // Falha: código FIA inválido (apenas 2 letras)
    const invalidDriverRes = Driver.create({
      id: EntityId.from<'driver'>('sainz'),
      firstName: 'Carlos',
      lastName: 'Sainz',
      code: 'SA',
      nationality: 'Spanish'
    });

    const validTeamRes = Team.create({
      id: EntityId.from<'team'>('ferrari-team'),
      legalName: 'Ferrari S.p.A.',
      commercialName: 'Scuderia Ferrari HP',
      nationality: 'Italian'
    });

    const combinedRes = Result.combine<unknown, DomainError>([validDriverRes, invalidDriverRes, validTeamRes]);
    assert.equal(combinedRes.isSuccess, false);
    assert.equal(combinedRes.isFailure, true);

    const error = combinedRes.getError();
    assert.equal(isDomainError(error), true);
    assert.equal(error.code, 'INVALID_DRIVER_CODE');
    assert.match(error.message, /deve conter exatamente 3 letras maiúsculas/);

    // Tentar acessar valor em estado de falha deve lançar exceção explícita
    assert.throws(() => combinedRes.getValue(), /Não é possível obter o valor de um Result em estado de falha/);
  });

  test('IT-SH-05 — deve garantir imutabilidade estrita das instâncias compartilhadas (Object.freeze)', () => {
    const id = EntityId.from<'driver'>('hamilton');
    const error = new DomainError(DomainErrorCode.INVALID_ARGUMENT, 'Argumento inválido', { round: 1 });
    const successResult = Result.ok('sucesso');
    const failureResult = Result.fail(error);

    assert.equal(Object.isFrozen(id), true);
    assert.equal(Object.isFrozen(error), true);
    assert.equal(Object.isFrozen(error.context), true);
    assert.equal(Object.isFrozen(successResult), true);
    assert.equal(Object.isFrozen(failureResult), true);

    // Tentativas de mutação em tempo de execução são impedidas
    assert.throws(() => {
      (id as any)._value = 'mutado';
    }, TypeError);

    assert.throws(() => {
      (error as any).code = 'DOMAIN.ALTERADO';
    }, TypeError);

    assert.throws(() => {
      (successResult as any).isSuccess = false;
    }, TypeError);
  });
});
