/**
 * @fileoverview Testes de Unidade dos Adaptadores de Repositório Prisma — F1Atlas
 *
 * Valida a conformidade de ISeasonRepository, IParticipantRepository,
 * IGrandPrixRepository e IStandingsRepository, garantindo isolamento através de mocks
 * do PrismaService, delegação correta aos Mappers, tratamento defensivo de erros
 * e prevenção incondicional contra fabricação de dados esportivos.
 *
 * @module apps/api/src/infrastructure/database/prisma/tests/prisma-repositories.spec
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EntityId,
  Season,
  Driver,
  Team,
  Constructor,
  SeasonEntry,
  EntryRole,
  Circuit,
  GrandPrix,
  Session,
  SessionResult,
  DriverStandings,
  ConstructorStandings
} from '@f1atlas/domain';
import { PrismaSeasonRepository } from '../repositories/prisma-season.repository.js';
import { PrismaParticipantRepository } from '../repositories/prisma-participant.repository.js';
import { PrismaGrandPrixRepository } from '../repositories/prisma-grand-prix.repository.js';
import { PrismaStandingsRepository } from '../repositories/prisma-standings.repository.js';
import {
  UniqueConstraintViolationError,
  DatabaseConnectionError,
  EntityNotFoundError,
  PersistenceError
} from '../errors/persistence-errors.js';
import { PrismaClientKnownRequestError } from '../../../../generated/prisma/internal/prismaNamespace.js';

describe('Prisma Repositories — Unit & Adapter Tests', () => {
  // ==========================================
  // 1. PrismaSeasonRepository
  // ==========================================
  describe('PrismaSeasonRepository', () => {
    it('deve retornar null se temporada não for encontrada por id', async () => {
      const mockPrisma: any = {
        season: {
          findUnique: async () => null
        }
      };

      const repo = new PrismaSeasonRepository(mockPrisma);
      const result = await repo.findById(EntityId.from<'season'>('non-existent'));
      assert.equal(result, null);
    });

    it('deve retornar a entidade Season reconstituída quando encontrada por ano', async () => {
      const mockPrisma: any = {
        season: {
          findUnique: async () => ({
            id: 'season-2025',
            year: 2025,
            officialName: '2025 FIA Formula One World Championship',
            status: 'IN_PROGRESS',
            startDate: new Date('2025-03-01'),
            endDate: new Date('2025-11-30'),
            grandsPrix: []
          })
        }
      };

      const repo = new PrismaSeasonRepository(mockPrisma);
      const result = await repo.findByYear(2025);

      assert.ok(result);
      assert.equal(result.year, 2025);
      assert.equal(result.id.value, 'season-2025');
    });

    it('deve salvar a temporada e sincronizar etapas do calendário em transação atômica', async () => {
      let transactionCalled = false;
      let gpUpdated = false;

      const mockPrisma: any = {
        $transaction: async (cb: any) => {
          transactionCalled = true;
          const tx: any = {
            season: {
              upsert: async () => ({})
            },
            grandPrix: {
              findUnique: async () => ({
                id: 'gp-1',
                startDate: new Date('2025-03-14'),
                endDate: new Date('2025-03-16')
              }),
              update: async () => {
                gpUpdated = true;
              }
            }
          };
          return cb(tx);
        },
        season: {
          findUnique: async () => ({
            id: 'season-2025',
            year: 2025,
            officialName: '2025 Championship',
            status: 'PLANNED',
            grandsPrix: [
              {
                id: 'gp-1',
                roundNumber: 1,
                officialName: 'Bahrain Grand Prix',
                status: 'SCHEDULED',
                startDate: new Date('2025-03-14'),
                endDate: new Date('2025-03-16')
              }
            ]
          })
        }
      };

      const repo = new PrismaSeasonRepository(mockPrisma);
      let season = Season.create({
        id: EntityId.from<'season'>('season-2025'),
        year: 2025
      }).getValue();

      season = season
        .scheduleGrandPrix({
          grandPrixId: EntityId.from<'grand-prix'>('gp-1'),
          roundNumber: 1,
          name: 'Bahrain Grand Prix',
          startDate: new Date('2025-03-14'),
          endDate: new Date('2025-03-16')
        })
        .getValue();

      const saved = await repo.save(season);
      assert.equal(transactionCalled, true);
      assert.equal(gpUpdated, true);
      assert.equal(saved.grandPrixList.length, 1);
    });

    it('deve traduzir erro de unicidade (P2002) ao tentar salvar temporada duplicada', async () => {
      const mockPrisma: any = {
        $transaction: async () => {
          throw new PrismaClientKnownRequestError('Unique failed', {
            code: 'P2002',
            clientVersion: '7.10.1',
            meta: { target: ['year'] }
          });
        }
      };

      const repo = new PrismaSeasonRepository(mockPrisma);
      const season = Season.create({
        id: EntityId.from<'season'>('season-2025'),
        year: 2025
      }).getValue();

      await assert.rejects(
        async () => repo.save(season),
        (err: any) => {
          assert.ok(err instanceof UniqueConstraintViolationError);
          assert.equal(err.code, 'P2002');
          return true;
        }
      );
    });

    it('existsByYear deve retornar true se contagem for maior que 0', async () => {
      const mockPrisma: any = {
        season: {
          count: async () => 1
        }
      };

      const repo = new PrismaSeasonRepository(mockPrisma);
      const exists = await repo.existsByYear(2025);
      assert.equal(exists, true);
    });
  });

  // ==========================================
  // 2. PrismaParticipantRepository
  // ==========================================
  describe('PrismaParticipantRepository', () => {
    it('deve localizar piloto por código oficial FIA', async () => {
      const mockPrisma: any = {
        driver: {
          findFirst: async (args: any) => {
            assert.equal(args.where.code, 'VER');
            return {
              id: 'driver-ver',
              slug: 'max-verstappen',
              firstName: 'Max',
              lastName: 'Verstappen',
              code: 'VER',
              nationality: 'Dutch',
              permanentNumber: 1,
              birthDate: new Date('1997-09-30'),
              isActive: true
            };
          }
        }
      };

      const repo = new PrismaParticipantRepository(mockPrisma);
      const driver = await repo.findDriverByCode('VER');

      assert.ok(driver);
      assert.equal(driver.code, 'VER');
      assert.equal(driver.firstName, 'Max');
    });

    it('deve localizar equipe e mapear atributos para o domínio', async () => {
      const mockPrisma: any = {
        team: {
          findUnique: async () => ({
            id: 'team-ferrari',
            slug: 'ferrari',
            legalName: 'Scuderia Ferrari SpA',
            commonName: 'Ferrari',
            nationality: 'Italian',
            baseLocation: 'Maranello, Italy',
            foundedYear: 1929,
            isActive: true
          })
        }
      };

      const repo = new PrismaParticipantRepository(mockPrisma);
      const team = await repo.findTeamById(EntityId.from<'team'>('team-ferrari'));

      assert.ok(team);
      assert.equal(team.commercialName, 'Ferrari');
      assert.equal(team.nationality, 'Italian');
    });

    it('deve salvar construtor e retornar a entidade persistida', async () => {
      const mockPrisma: any = {
        constructor: {
          upsert: async () => ({}),
          findUnique: async () => ({
            id: 'mclaren',
            slug: 'mclaren',
            name: 'McLaren',
            nationality: 'British',
            chassis: 'MCL38',
            engineManufacturer: 'Mercedes'
          })
        }
      };

      const repo = new PrismaParticipantRepository(mockPrisma);
      const domainConstructor = Constructor.create({
        id: EntityId.from<'constructor'>('mclaren'),
        name: 'McLaren',
        nationality: 'British',
        chassis: 'MCL38',
        engineManufacturer: 'Mercedes'
      }).getValue();

      const saved = await repo.saveConstructor(domainConstructor);
      assert.equal(saved.name, 'McLaren');
      assert.equal(saved.engineManufacturer, 'Mercedes');
    });

    it('deve localizar SeasonEntry reconstituindo contrato e entrant composto', async () => {
      const mockPrisma: any = {
        seasonDriverContract: {
          findUnique: async () => ({
            id: 'entry-ham-2025',
            driverId: 'hamilton',
            assignedNumber: 44,
            role: 'MAIN_DRIVER',
            seasonEntrant: {
              seasonId: 'season-2025',
              teamId: 'ferrari',
              constructorId: 'ferrari'
            }
          })
        }
      };

      const repo = new PrismaParticipantRepository(mockPrisma);
      const entry = await repo.findSeasonEntryById(EntityId.from<'season-entry'>('entry-ham-2025'));

      assert.ok(entry);
      assert.equal(entry.carNumber, 44);
      assert.equal(entry.role, EntryRole.REGULAR);
      assert.equal(entry.teamId.value, 'ferrari');
    });

    it('saveSeasonEntry deve falhar se temporada relacionada não existir', async () => {
      const mockPrisma: any = {
        $transaction: async (cb: any) => {
          const tx: any = {
            season: { count: async () => 0 },
            team: { count: async () => 1 },
            driver: { count: async () => 1 }
          };
          return cb(tx);
        }
      };

      const repo = new PrismaParticipantRepository(mockPrisma);
      const entry = SeasonEntry.create({
        id: EntityId.from<'season-entry'>('entry-1'),
        seasonId: EntityId.from<'season'>('season-inexistente'),
        driverId: EntityId.from<'driver'>('driver-1'),
        teamId: EntityId.from<'team'>('team-1'),
        constructorId: EntityId.from<'constructor'>('constructor-1'),
        carNumber: 10,
        role: EntryRole.REGULAR,
        startRound: 1
      }).getValue();

      await assert.rejects(
        async () => repo.saveSeasonEntry(entry),
        (err: any) => {
          assert.ok(err instanceof EntityNotFoundError);
          assert.match(err.message, /Temporada "season-inexistente" inexistente/);
          return true;
        }
      );
    });
  });

  // ==========================================
  // 3. PrismaGrandPrixRepository
  // ==========================================
  describe('PrismaGrandPrixRepository', () => {
    it('deve localizar circuito e extrair traçado ativo de layouts reais', async () => {
      const mockPrisma: any = {
        circuit: {
          findUnique: async () => ({
            id: 'monza',
            name: 'Autodromo Nazionale Monza',
            location: 'Monza',
            country: 'Italy',
            timezone: 'Europe/Rome',
            layouts: [
              {
                lengthMeters: 5793,
                turnsCount: 11,
                isActive: true
              }
            ]
          })
        }
      };

      const repo = new PrismaGrandPrixRepository(mockPrisma);
      const circuit = await repo.findCircuitById(EntityId.from<'circuit'>('monza'));

      assert.ok(circuit);
      assert.equal(circuit.trackLengthMeters, 5793);
      assert.equal(circuit.cornersCount, 11);
    });

    it('deve falhar ao buscar circuito sem layout ativo em vez de inventar dados fictícios', async () => {
      const mockPrisma: any = {
        circuit: {
          findUnique: async () => ({
            id: 'monza-incomplete',
            name: 'Monza Incomplete',
            location: 'Monza',
            country: 'Italy',
            timezone: 'Europe/Rome',
            layouts: []
          })
        }
      };

      const repo = new PrismaGrandPrixRepository(mockPrisma);
      await assert.rejects(
        async () => repo.findCircuitById(EntityId.from<'circuit'>('monza-incomplete')),
        (err: any) => {
          assert.ok(err instanceof PersistenceError);
          assert.match(err.message, /não possui layout físico ativo registrado/);
          return true;
        }
      );
    });

    it('saveResults deve falhar se o piloto não tiver SessionEntry prévio na sessão', async () => {
      const mockPrisma: any = {
        $transaction: async (cb: any) => {
          const tx: any = {
            sessionEntry: {
              findFirst: async () => null // Piloto não inscrito
            }
          };
          return cb(tx);
        }
      };

      const repo = new PrismaGrandPrixRepository(mockPrisma);
      const res = SessionResult.create({
        id: EntityId.from<'session-result'>('res-1'),
        sessionId: EntityId.from<'session'>('sess-1'),
        driverId: EntityId.from<'driver'>('verstappen'),
        teamId: EntityId.from<'team'>('red-bull'),
        constructorId: EntityId.from<'constructor'>('red-bull-racing'),
        position: 1,
        lapsCompleted: 53,
        status: 'FINISHED',
        totalTimeMillis: 5400000
      }).getValue();

      await assert.rejects(
        async () => repo.saveResults([res]),
        (err: any) => {
          assert.ok(err instanceof EntityNotFoundError);
          assert.match(err.message, /não está inscrito formalmente na sessão/);
          return true;
        }
      );
    });

    it('deve salvar resultados de sessão em transação atômica quando piloto estiver inscrito', async () => {
      let transactionExecuted = false;

      const mockPrisma: any = {
        $transaction: async (cb: any) => {
          transactionExecuted = true;
          const tx: any = {
            sessionEntry: {
              findFirst: async () => ({ id: 'entry-123' })
            },
            sessionResult: {
              upsert: async () => ({})
            }
          };
          return cb(tx);
        }
      };

      const repo = new PrismaGrandPrixRepository(mockPrisma);
      const res = SessionResult.create({
        id: EntityId.from<'session-result'>('res-1'),
        sessionId: EntityId.from<'session'>('sess-1'),
        driverId: EntityId.from<'driver'>('verstappen'),
        teamId: EntityId.from<'team'>('red-bull'),
        constructorId: EntityId.from<'constructor'>('red-bull-racing'),
        position: 1,
        lapsCompleted: 53,
        status: 'FINISHED',
        totalTimeMillis: 5400000
      }).getValue();

      await repo.saveResults([res]);
      assert.equal(transactionExecuted, true);
    });
  });

  // ==========================================
  // 4. PrismaStandingsRepository
  // ==========================================
  describe('PrismaStandingsRepository', () => {
    it('deve localizar classificação WDC e enriquecer constructorId dos contratos reais', async () => {
      const mockPrisma: any = {
        championshipStanding: {
          findFirst: async () => ({
            id: 'standing-rd1-2025',
            roundNumber: 1,
            calculatedAt: new Date('2025-03-16'),
            championship: {
              seasonId: 'season-2025'
            },
            driverEntries: [
              {
                driverId: 'verstappen',
                position: 1,
                points: 25,
                winsCount: 1,
                podiumsCount: 1
              }
            ]
          })
        },
        seasonDriverContract: {
          findMany: async () => [
            {
              driverId: 'verstappen',
              seasonEntrant: {
                constructorId: 'red-bull-racing'
              }
            }
          ]
        }
      };

      const repo = new PrismaStandingsRepository(mockPrisma);
      const standings = await repo.findDriverStandingsBySeasonAndRound(
        EntityId.from<'season'>('season-2025'),
        1
      );

      assert.ok(standings);
      assert.equal(standings.roundNumber, 1);
      assert.equal(standings.entries.length, 1);
      assert.equal(standings.entries[0].driverId.value, 'verstappen');
      assert.equal(standings.entries[0].constructorId.value, 'red-bull-racing');
    });

    it('deve falhar ao enriquecer WDC se o piloto não tiver construtor identificado no ano', async () => {
      const mockPrisma: any = {
        championshipStanding: {
          findFirst: async () => ({
            id: 'standing-rd1-2025',
            roundNumber: 1,
            calculatedAt: new Date('2025-03-16'),
            championship: {
              seasonId: 'season-2025'
            },
            driverEntries: [
              {
                driverId: 'piloto-sem-contrato',
                position: 1,
                points: 25,
                winsCount: 1,
                podiumsCount: 1
              }
            ]
          })
        },
        seasonDriverContract: {
          findMany: async () => []
        }
      };

      const repo = new PrismaStandingsRepository(mockPrisma);
      await assert.rejects(
        async () =>
          repo.findDriverStandingsBySeasonAndRound(EntityId.from<'season'>('season-2025'), 1),
        (err: any) => {
          assert.ok(err instanceof EntityNotFoundError);
          assert.match(err.message, /Construtor não identificado para o piloto/);
          return true;
        }
      );
    });

    it('saveDriverStandings deve falhar se o Grande Prêmio da rodada não existir no calendário', async () => {
      const mockPrisma: any = {
        $transaction: async (cb: any) => {
          const tx: any = {
            season: { findUnique: async () => ({ id: 'season-2025', year: 2025 }) },
            grandPrix: { findFirst: async () => null } // GP não agendado
          };
          return cb(tx);
        }
      };

      const repo = new PrismaStandingsRepository(mockPrisma);
      const standings = DriverStandings.create({
        id: EntityId.from<'driver-standings'>('wdc-1'),
        seasonId: EntityId.from<'season'>('season-2025'),
        roundNumber: 1,
        status: 'OFFICIAL',
        entries: [
          {
            rank: 1,
            driverId: EntityId.from<'driver'>('ver'),
            constructorId: EntityId.from<'constructor'>('rbr'),
            points: 25,
            wins: 1,
            podiums: 1,
            gpFinishes: [1],
            sprintFinishes: [],
            rankChange: 0
          }
        ]
      }).getValue();

      await assert.rejects(
        async () => repo.saveDriverStandings(standings),
        (err: any) => {
          assert.ok(err instanceof EntityNotFoundError);
          assert.match(err.message, /Grande Prêmio da rodada 1 da temporada "season-2025" não encontrado/);
          return true;
        }
      );
    });

    it('deve traduzir falha de conexão com o banco para DatabaseConnectionError', async () => {
      const mockPrisma: any = {
        championshipStanding: {
          findFirst: async () => {
            throw new Error('Connection timeout trying to connect to MySQL database');
          }
        }
      };

      const repo = new PrismaStandingsRepository(mockPrisma);

      await assert.rejects(
        async () => repo.findLatestDriverStandingsBySeason(EntityId.from<'season'>('season-2025')),
        (err: any) => {
          assert.ok(err instanceof DatabaseConnectionError);
          return true;
        }
      );
    });
  });
});
