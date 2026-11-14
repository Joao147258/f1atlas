/**
 * ============================================================================
 * F1Atlas — Camada Infrastructure | Database: PrismaStandingsRepository
 * ============================================================================
 *
 * @component PrismaStandingsRepository
 * @module apps/api/src/infrastructure/database/prisma/repositories/prisma-standings.repository
 * @layer Infrastructure (Persistência Relacional)
 * @implements {IStandingsRepository} (apps/api/src/application/ports/standings-repository.port.ts)
 *
 * Responsabilidade Arquitetural:
 * Fornecer operações de persistência e consulta para as projeções imutáveis
 * de pontuação de campeonato:
 * 1. Classificação do Mundial de Pilotos (DriverStandings / WDC).
 * 2. Classificação do Mundial de Construtores (ConstructorStandings / WCC).
 *
 * Princípios e Garantias Assegurados:
 * - Anti-fabricação de Campeonatos e GPs: Não cria etapas fictícias para viabilizar
 *   chaves estrangeiras. A temporada e a etapa correspondente (GrandPrix) devem
 *   existir previamente no calendário oficial para permitir o registro do snapshot.
 * - Enriquecimento Relacional Real: No WDC, os pilotos pontuam vinculados aos seus
 *   construtores vigentes na temporada. O repositório recupera os contratos reais
 *   (`SeasonDriverContract` -> `SeasonEntrant`) e falha explicitamente se um piloto
 *   pontuado não possuir construtor rastreável no ano.
 * - Idempotência e Limpeza de Entradas Antigas: O salvamento do snapshot executa em
 *   `$transaction`, realizando upsert do cabeçalho `ChampionshipStanding`, deleção
 *   de entradas antigas do snapshot e recriação das novas linhas, impedindo
 *   linhas órfãs decorrentes de recalculações de regulamento.
 *
 * Riscos de Manutenção:
 * - Executar a gravação de tabelas de pontos fora de `$transaction` pode gerar snapshots
 *   com contagem inconsistente de participantes ou duplicidade de posições.
 * - Cálculos de pontuação e critérios de desempate pertencem ao Domínio puro
 *   (`StandingsCalculator`), nunca devendo ser recalculados ou modificados dentro deste repositório.
 * ============================================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  DriverStandings,
  ConstructorStandings,
  EntityId
} from '@f1atlas/domain';
import type { IStandingsRepository } from '../../../../application/ports/standings-repository.port.js';
import { PrismaService } from '../prisma.service.js';
import {
  StandingMapper,
  type PrismaDriverStandingsRecord,
  type PrismaConstructorStandingsRecord
} from '../../../mappers/standing.mapper.js';
import { PrismaErrorHandler } from '../errors/prisma-error-handler.js';
import { EntityNotFoundError } from '../errors/persistence-errors.js';

@Injectable()
export class PrismaStandingsRepository implements IStandingsRepository {
  private readonly logger = new Logger(PrismaStandingsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. Classificação do Mundial de Pilotos (WDC)
  // ==========================================

  /**
   * Localiza o snapshot da classificação de pilotos após determinada rodada da temporada.
   *
   * @param seasonId - Identificador EntityId<'season'>.
   * @param roundNumber - Número da etapa oficial (ex.: 5 após o GP de Mônaco).
   * @returns Projeção DriverStandings reconstituída ou null se não calculada para a etapa.
   * @throws {EntityNotFoundError} Se um competidor classificado não possuir construtor rastreável.
   */
  async findDriverStandingsBySeasonAndRound(
    seasonId: EntityId<'season'>,
    roundNumber: number
  ): Promise<DriverStandings | null> {
    try {
      const standing = await this.prisma.championshipStanding.findFirst({
        where: {
          championship: {
            seasonId: seasonId.value,
            type: 'DRIVERS'
          },
          roundNumber
        },
        include: {
          championship: true,
          driverEntries: true
        }
      });

      if (!standing) return null;

      const driverEntriesWithConstructor = await this.enrichDriverEntriesWithConstructors(
        seasonId.value,
        standing.driverEntries
      );

      const record: PrismaDriverStandingsRecord = {
        id: standing.id,
        seasonId: standing.championship.seasonId,
        roundNumber: standing.roundNumber,
        calculatedAt: standing.calculatedAt,
        driverEntries: driverEntriesWithConstructor
      };

      return StandingMapper.driverStandingsToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(
        error,
        `PrismaStandingsRepository.findDriverStandingsBySeasonAndRound(season=${seasonId.value}, round=${roundNumber})`
      );
    }
  }

  /**
   * Localiza o snapshot mais recente da tabela do Mundial de Pilotos em uma temporada.
   *
   * @param seasonId - Identificador EntityId<'season'>.
   * @returns Projeção DriverStandings mais recente ou null se o campeonato não tiver iniciado.
   */
  async findLatestDriverStandingsBySeason(
    seasonId: EntityId<'season'>
  ): Promise<DriverStandings | null> {
    try {
      const standing = await this.prisma.championshipStanding.findFirst({
        where: {
          championship: {
            seasonId: seasonId.value,
            type: 'DRIVERS'
          }
        },
        orderBy: { roundNumber: 'desc' },
        include: {
          championship: true,
          driverEntries: true
        }
      });

      if (!standing) return null;

      const driverEntriesWithConstructor = await this.enrichDriverEntriesWithConstructors(
        seasonId.value,
        standing.driverEntries
      );

      const record: PrismaDriverStandingsRecord = {
        id: standing.id,
        seasonId: standing.championship.seasonId,
        roundNumber: standing.roundNumber,
        calculatedAt: standing.calculatedAt,
        driverEntries: driverEntriesWithConstructor
      };

      return StandingMapper.driverStandingsToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(
        error,
        `PrismaStandingsRepository.findLatestDriverStandingsBySeason(${seasonId.value})`
      );
    }
  }

  /**
   * Salva o snapshot imutável do Mundial de Pilotos garantindo atomicidade estrita em transação.
   *
   * @param standings - Projeção DriverStandings do Domínio.
   * @returns Projeção persistida e recarregada.
   * @throws {EntityNotFoundError} Se a temporada ou a etapa oficial correspondente não existirem.
   *
   * @remarks
   * Transacionalidade ($transaction):
   * 1. Valida existência de Season e GrandPrix.
   * 2. Localiza ou cria Championship (DRIVERS).
   * 3. Executa upsert de ChampionshipStanding.
   * 4. Remove entradas prévias de DriverStandingEntry para o snapshot e recria as linhas atuais.
   */
  async saveDriverStandings(standings: DriverStandings): Promise<DriverStandings> {
    try {
      const dto = StandingMapper.driverStandingsToPersistence(standings);

      await this.prisma.$transaction(async tx => {
        // 1. Validação de pré-requisitos relacionais: Season e GrandPrix
        const season = await tx.season.findUnique({
          where: { id: dto.seasonId }
        });
        if (!season) {
          throw new EntityNotFoundError(
            `[PrismaStandingsRepository.saveDriverStandings] Temporada "${dto.seasonId}" inexistente.`
          );
        }

        const gp = await tx.grandPrix.findFirst({
          where: {
            seasonId: dto.seasonId,
            roundNumber: dto.roundNumber
          }
        });
        if (!gp) {
          throw new EntityNotFoundError(
            `[PrismaStandingsRepository.saveDriverStandings] Grande Prêmio da rodada ${dto.roundNumber} da temporada "${dto.seasonId}" não encontrado no calendário oficial.`
          );
        }

        // 2. Localiza ou cria o registro de Championship para DRIVERS
        let championship = await tx.championship.findUnique({
          where: {
            seasonId_type: {
              seasonId: dto.seasonId,
              type: 'DRIVERS'
            }
          }
        });

        if (!championship) {
          championship = await tx.championship.create({
            data: {
              seasonId: dto.seasonId,
              type: 'DRIVERS',
              officialName: `FIA Formula One World Drivers' Championship ${season.year}`
            }
          });
        }

        // 3. Upsert do ChampionshipStanding
        await tx.championshipStanding.upsert({
          where: { id: dto.id },
          create: {
            id: dto.id,
            championshipId: championship.id,
            grandPrixId: gp.id,
            roundNumber: dto.roundNumber,
            calculatedAt: dto.calculatedAt
          },
          update: {
            calculatedAt: dto.calculatedAt
          }
        });

        // 4. Limpeza de entradas prévias do snapshot para prevenir registros órfãos
        await tx.driverStandingEntry.deleteMany({
          where: { standingId: dto.id }
        });

        // 5. Inserção das novas entradas individuais de classificação de pilotos
        for (const entry of dto.entries) {
          await tx.driverStandingEntry.create({
            data: {
              standingId: dto.id,
              driverId: entry.driverId,
              position: entry.position,
              points: entry.points,
              winsCount: entry.winsCount,
              podiumsCount: entry.podiumsCount,
              tiebreakerRank: entry.tiebreakerRank
            }
          });
        }
      });

      const persisted = await this.findDriverStandingsBySeasonAndRound(standings.seasonId, standings.roundNumber);
      if (!persisted) {
        throw new Error(`Falha ao recuperar a classificação WDC ${standings.id.value} após salvar.`);
      }

      return persisted;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaStandingsRepository.saveDriverStandings(${standings.id.value})`);
    }
  }

  // ==========================================
  // 2. Classificação do Mundial de Construtores (WCC)
  // ==========================================

  /**
   * Localiza o snapshot do Mundial de Construtores após determinada rodada da temporada.
   *
   * @param seasonId - Identificador EntityId<'season'>.
   * @param roundNumber - Número da etapa no calendário oficial.
   * @returns Projeção ConstructorStandings ou null se não encontrada.
   */
  async findConstructorStandingsBySeasonAndRound(
    seasonId: EntityId<'season'>,
    roundNumber: number
  ): Promise<ConstructorStandings | null> {
    try {
      const standing = await this.prisma.championshipStanding.findFirst({
        where: {
          championship: {
            seasonId: seasonId.value,
            type: 'CONSTRUCTORS'
          },
          roundNumber
        },
        include: {
          championship: true,
          constructorEntries: true
        }
      });

      if (!standing) return null;

      const record: PrismaConstructorStandingsRecord = {
        id: standing.id,
        seasonId: standing.championship.seasonId,
        roundNumber: standing.roundNumber,
        calculatedAt: standing.calculatedAt,
        constructorEntries: standing.constructorEntries.map(e => ({
          teamId: e.teamId,
          constructorId: e.constructorId,
          position: e.position,
          points: Number(e.points),
          winsCount: e.winsCount,
          podiumsCount: e.podiumsCount,
          tiebreakerRank: e.tiebreakerRank
        }))
      };

      return StandingMapper.constructorStandingsToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(
        error,
        `PrismaStandingsRepository.findConstructorStandingsBySeasonAndRound(season=${seasonId.value}, round=${roundNumber})`
      );
    }
  }

  /**
   * Localiza o snapshot mais recente da tabela do Mundial de Construtores.
   *
   * @param seasonId - Identificador EntityId<'season'>.
   * @returns Projeção ConstructorStandings mais recente ou null se inexistente.
   */
  async findLatestConstructorStandingsBySeason(
    seasonId: EntityId<'season'>
  ): Promise<ConstructorStandings | null> {
    try {
      const standing = await this.prisma.championshipStanding.findFirst({
        where: {
          championship: {
            seasonId: seasonId.value,
            type: 'CONSTRUCTORS'
          }
        },
        orderBy: { roundNumber: 'desc' },
        include: {
          championship: true,
          constructorEntries: true
        }
      });

      if (!standing) return null;

      const record: PrismaConstructorStandingsRecord = {
        id: standing.id,
        seasonId: standing.championship.seasonId,
        roundNumber: standing.roundNumber,
        calculatedAt: standing.calculatedAt,
        constructorEntries: standing.constructorEntries.map(e => ({
          teamId: e.teamId,
          constructorId: e.constructorId,
          position: e.position,
          points: Number(e.points),
          winsCount: e.winsCount,
          podiumsCount: e.podiumsCount,
          tiebreakerRank: e.tiebreakerRank
        }))
      };

      return StandingMapper.constructorStandingsToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(
        error,
        `PrismaStandingsRepository.findLatestConstructorStandingsBySeason(${seasonId.value})`
      );
    }
  }

  /**
   * Salva o snapshot imutável do Mundial de Construtores em transação atômica.
   *
   * @param standings - Projeção ConstructorStandings do Domínio.
   * @returns Projeção persistida e recarregada.
   * @throws {EntityNotFoundError} Se a temporada ou a etapa correspondente não existirem.
   */
  async saveConstructorStandings(standings: ConstructorStandings): Promise<ConstructorStandings> {
    try {
      const dto = StandingMapper.constructorStandingsToPersistence(standings);

      await this.prisma.$transaction(async tx => {
        const season = await tx.season.findUnique({
          where: { id: dto.seasonId }
        });
        if (!season) {
          throw new EntityNotFoundError(
            `[PrismaStandingsRepository.saveConstructorStandings] Temporada "${dto.seasonId}" inexistente.`
          );
        }

        const gp = await tx.grandPrix.findFirst({
          where: {
            seasonId: dto.seasonId,
            roundNumber: dto.roundNumber
          }
        });
        if (!gp) {
          throw new EntityNotFoundError(
            `[PrismaStandingsRepository.saveConstructorStandings] Grande Prêmio da rodada ${dto.roundNumber} da temporada "${dto.seasonId}" não encontrado no calendário oficial.`
          );
        }

        let championship = await tx.championship.findUnique({
          where: {
            seasonId_type: {
              seasonId: dto.seasonId,
              type: 'CONSTRUCTORS'
            }
          }
        });

        if (!championship) {
          championship = await tx.championship.create({
            data: {
              seasonId: dto.seasonId,
              type: 'CONSTRUCTORS',
              officialName: `FIA Formula One World Constructors' Championship ${season.year}`
            }
          });
        }

        await tx.championshipStanding.upsert({
          where: { id: dto.id },
          create: {
            id: dto.id,
            championshipId: championship.id,
            grandPrixId: gp.id,
            roundNumber: dto.roundNumber,
            calculatedAt: dto.calculatedAt
          },
          update: {
            calculatedAt: dto.calculatedAt
          }
        });

        await tx.constructorStandingEntry.deleteMany({
          where: { standingId: dto.id }
        });

        for (const entry of dto.entries) {
          await tx.constructorStandingEntry.create({
            data: {
              standingId: dto.id,
              teamId: entry.teamId,
              constructorId: entry.constructorId,
              position: entry.position,
              points: entry.points,
              winsCount: entry.winsCount,
              podiumsCount: entry.podiumsCount,
              tiebreakerRank: entry.tiebreakerRank
            }
          });
        }
      });

      const persisted = await this.findConstructorStandingsBySeasonAndRound(
        standings.seasonId,
        standings.roundNumber
      );
      if (!persisted) {
        throw new Error(`Falha ao recuperar a classificação WCC ${standings.id.value} após salvar.`);
      }

      return persisted;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(
        error,
        `PrismaStandingsRepository.saveConstructorStandings(${standings.id.value})`
      );
    }
  }

  /**
   * Enriquece as entradas de classificação do WDC associando cada piloto ao seu
   * respectivo construtor através dos contratos vigentes da temporada.
   *
   * @param seasonId - Identificador da temporada.
   * @param entries - Linhas brutas de pontuação do piloto no banco.
   * @returns Entradas com constructorId resolvido.
   * @throws {EntityNotFoundError} Se algum piloto pontuado não possuir construtor rastreável.
   */
  private async enrichDriverEntriesWithConstructors(
    seasonId: string,
    entries: any[]
  ): Promise<any[]> {
    if (entries.length === 0) return [];

    const contracts = await this.prisma.seasonDriverContract.findMany({
      where: {
        seasonEntrant: {
          seasonId
        }
      },
      include: {
        seasonEntrant: true
      }
    });

    const driverToConstructorMap = new Map<string, string>();
    for (const c of contracts) {
      const cId = c.seasonEntrant.constructorId || c.seasonEntrant.teamId;
      if (cId) {
        driverToConstructorMap.set(c.driverId, cId);
      }
    }

    return entries.map(e => {
      const constructorId = driverToConstructorMap.get(e.driverId);
      if (!constructorId) {
        throw new EntityNotFoundError(
          `[PrismaStandingsRepository] Construtor não identificado para o piloto "${e.driverId}" na temporada "${seasonId}". Rejeitando classificação inconsistente.`
        );
      }

      return {
        driverId: e.driverId,
        constructorId,
        position: e.position,
        points: Number(e.points),
        winsCount: e.winsCount,
        podiumsCount: e.podiumsCount,
        tiebreakerRank: e.tiebreakerRank
      };
    });
  }
}
