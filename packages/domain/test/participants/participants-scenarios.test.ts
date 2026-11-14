/**
 * ============================================================================
 * F1Atlas — Suíte de Testes de Comportamento Histórico: Participants
 * ============================================================================
 *
 * Módulo: packages/domain/test/participants/participants-scenarios.test.ts
 * Padrão: Test runner nativo do Node.js (node:test + node:assert/strict)
 *
 * Propósito:
 * Validar o comportamento do modelo em relação aos 4 cenários históricos reais
 * obrigatórios da Fórmula 1 (especificação canônica docs/domain/participants.md):
 * - Cenário A: Substituição de emergência no mesmo GP (Sainz & Bearman, Arábia Saudita 2024).
 * - Cenário B: Substituição definitiva no meio da temporada (Sargeant & Colapinto, Williams 2024).
 * - Cenário C: Transferência entre equipes no mesmo ano (Max Verstappen, 2016).
 * - Cenário D: Participação limitada em Treino Livre 1 (Kimi Antonelli, Monza 2024).
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Driver } from '../../src/participants/driver.ts';
import { Team } from '../../src/participants/team.ts';
import { Constructor } from '../../src/participants/constructor.ts';
import { SeasonEntry, deactivateEntry } from '../../src/participants/season-entry.ts';
import { EntryRole } from '../../src/participants/entry-role.ts';
import { EntityId } from '../../src/shared/entity-id.ts';

describe('Cenários Históricos da F1 — Validação de Temporalidade e Participação', () => {
  it('Cenário A: Substituição no mesmo GP — Carlos Sainz e Oliver Bearman (Arábia Saudita 2024)', () => {
    // 1. Identidades perenes dos pilotos
    const sainz = Driver.create({
      id: EntityId.from<'driver'>('driver-carlos-sainz'),
      firstName: 'Carlos',
      lastName: 'Sainz',
      code: 'SAI',
      nationality: 'ESP',
      permanentNumber: 55
    }).getValue();

    const bearman = Driver.create({
      id: EntityId.from<'driver'>('driver-oliver-bearman'),
      firstName: 'Oliver',
      lastName: 'Bearman',
      code: 'BEA',
      nationality: 'GBR',
      permanentNumber: 87
    }).getValue();

    const season2024 = EntityId.from<'season'>('season-2024');
    const ferrariTeam = EntityId.from<'team'>('team-ferrari');
    const ferrariConstructor = EntityId.from<'constructor'>('constructor-ferrari');

    // 2. Inscrição regular de Carlos Sainz para a temporada toda (rounds 1 a 24)
    const sainzEntry = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-sainz-ferrari-2024'),
      seasonId: season2024,
      driverId: sainz.id,
      teamId: ferrariTeam,
      constructorId: ferrariConstructor,
      carNumber: 55,
      role: EntryRole.REGULAR,
      startRound: 1,
      endRound: 24
    }).getValue();

    // 3. Inscrição extraordinária de Oliver Bearman como substituto para o Round 2 (carro #38 da Ferrari)
    const bearmanEntry = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-bearman-ferrari-2024-rd2'),
      seasonId: season2024,
      driverId: bearman.id,
      teamId: ferrariTeam,
      constructorId: ferrariConstructor,
      carNumber: 38,
      role: EntryRole.SUBSTITUTE,
      startRound: 2,
      endRound: 2
    }).getValue();

    // Verificações de integridade temporal:
    // Ambos existem de forma independente
    assert.notEqual(sainz.id.value, bearman.id.value);
    assert.equal(sainzEntry.carNumber, 55);
    assert.equal(bearmanEntry.carNumber, 38);

    // Sainz continua formalmente ativo em todo o campeonato (inclusive no round 2 e round 3)
    assert.equal(sainzEntry.isActiveInRound(1), true);
    assert.equal(sainzEntry.isActiveInRound(2), true);
    assert.equal(sainzEntry.isActiveInRound(3), true);

    // Bearman é ativo ESTRITAMENTE na rodada 2
    assert.equal(bearmanEntry.isActiveInRound(1), false);
    assert.equal(bearmanEntry.isActiveInRound(2), true);
    assert.equal(bearmanEntry.isActiveInRound(3), false);

    // A inscrição de Sainz não foi alterada nem desativada
    assert.equal(sainzEntry.endRound, 24);
  });

  it('Cenário B: Substituição definitiva intra-temporada — Logan Sargeant e Franco Colapinto (Williams 2024)', () => {
    const sargeant = Driver.create({
      id: EntityId.from<'driver'>('driver-logan-sargeant'),
      firstName: 'Logan',
      lastName: 'Sargeant',
      code: 'SAR',
      nationality: 'USA',
      permanentNumber: 2
    }).getValue();

    const colapinto = Driver.create({
      id: EntityId.from<'driver'>('driver-franco-colapinto'),
      firstName: 'Franco',
      lastName: 'Colapinto',
      code: 'COL',
      nationality: 'ARG',
      permanentNumber: 43
    }).getValue();

    const season2024 = EntityId.from<'season'>('season-2024');
    const williamsTeam = EntityId.from<'team'>('team-williams');
    const williamsConstructor = EntityId.from<'constructor'>('constructor-williams');

    // 1. Inscrição inicial de Sargeant (ativa desde o início)
    const initialSargeantEntry = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-sargeant-williams-2024'),
      seasonId: season2024,
      driverId: sargeant.id,
      teamId: williamsTeam,
      constructorId: williamsConstructor,
      carNumber: 2,
      role: EntryRole.REGULAR,
      startRound: 1
    }).getValue();

    assert.equal(initialSargeantEntry.isActive, true);

    // 2. Encerramento na etapa 15 (Zandvoort) via deactivateEntry (copy-on-write)
    const closedSargeantEntry = deactivateEntry(initialSargeantEntry, 15).getValue();

    // 3. Nova inscrição para Franco Colapinto a partir da etapa 16 (Monza até a 24)
    const colapintoEntry = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-colapinto-williams-2024'),
      seasonId: season2024,
      driverId: colapinto.id,
      teamId: williamsTeam,
      constructorId: williamsConstructor,
      carNumber: 43,
      role: EntryRole.SUBSTITUTE,
      startRound: 16,
      endRound: 24
    }).getValue();

    // Verificações:
    // Sargeant foi ativo nas etapas 1 a 15, e inativo a partir da 16
    assert.equal(closedSargeantEntry.isActiveInRound(1), true);
    assert.equal(closedSargeantEntry.isActiveInRound(15), true);
    assert.equal(closedSargeantEntry.isActiveInRound(16), false);

    // Colapinto foi inativo até a etapa 15, e ativo da 16 à 24
    assert.equal(colapintoEntry.isActiveInRound(15), false);
    assert.equal(colapintoEntry.isActiveInRound(16), true);
    assert.equal(colapintoEntry.isActiveInRound(24), true);

    // Os intervalos de vigência são estritamente disjuntos
    assert.equal(closedSargeantEntry.endRound, 15);
    assert.equal(colapintoEntry.startRound, 16);
  });

  it('Cenário C: Transferência de equipe na mesma temporada — Max Verstappen (2016)', () => {
    const verstappen = Driver.create({
      id: EntityId.from<'driver'>('driver-max-verstappen'),
      firstName: 'Max',
      lastName: 'Verstappen',
      code: 'VER',
      nationality: 'NLD',
      permanentNumber: 33
    }).getValue();

    const season2016 = EntityId.from<'season'>('season-2016');
    const toroRosso = EntityId.from<'team'>('team-toro-rosso');
    const toroRossoConst = EntityId.from<'constructor'>('constructor-toro-rosso');
    const redBull = EntityId.from<'team'>('team-red-bull');
    const redBullConst = EntityId.from<'constructor'>('constructor-red-bull');

    // 1. Participação na Toro Rosso nas rodadas 1 a 4
    const entryToroRosso = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-verstappen-tr-2016'),
      seasonId: season2016,
      driverId: verstappen.id,
      teamId: toroRosso,
      constructorId: toroRossoConst,
      carNumber: 33,
      role: EntryRole.REGULAR,
      startRound: 1,
      endRound: 4
    }).getValue();

    // 2. Promoção para a Red Bull Racing nas rodadas 5 a 21
    const entryRedBull = SeasonEntry.create({
      id: EntityId.from<'season-entry'>('entry-verstappen-rbr-2016'),
      seasonId: season2016,
      driverId: verstappen.id,
      teamId: redBull,
      constructorId: redBullConst,
      carNumber: 33,
      role: EntryRole.REGULAR,
      startRound: 5,
      endRound: 21
    }).getValue();

    // Verificações:
    // A identidade do piloto é rigorosamente a mesma em ambas as inscrições
    assert.equal(entryToroRosso.driverId.value, verstappen.id.value);
    assert.equal(entryRedBull.driverId.value, verstappen.id.value);

    // Equipes e construtores distintos
    assert.equal(entryToroRosso.teamId.value, 'team-toro-rosso');
    assert.equal(entryRedBull.teamId.value, 'team-red-bull');

    // Intervalos de rodadas são disjuntos
    assert.equal(entryToroRosso.isActiveInRound(4), true);
    assert.equal(entryToroRosso.isActiveInRound(5), false);
    assert.equal(entryRedBull.isActiveInRound(4), false);
    assert.equal(entryRedBull.isActiveInRound(5), true);
  });

  it('Cenário D: Participação limitada em Treino Livre 1 — Kimi Antonelli (Monza 2024)', () => {
    // 1. Piloto existe perante a FIA e possui cadastro duradouro
    const antonelliResult = Driver.create({
      id: EntityId.from<'driver'>('driver-kimi-antonelli'),
      firstName: 'Andrea Kimi',
      lastName: 'Antonelli',
      code: 'ANT',
      nationality: 'ITA',
      permanentNumber: 12
    });

    assert.equal(antonelliResult.isSuccess, true);
    const antonelli = antonelliResult.getValue();

    // 2. Não existe SeasonEntry criada para Antonelli em 2024
    // O modelo do domínio preserva a regra: pilotos que participam apenas de TL1
    // para cumprimento de cota jovem da FIA não necessitam de SeasonEntry.
    assert.equal(antonelli.code, 'ANT');
    assert.equal(antonelli.fullName, 'Andrea Kimi Antonelli');
  });
});
