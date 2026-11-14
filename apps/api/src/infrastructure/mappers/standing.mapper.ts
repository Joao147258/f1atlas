/**
 * @fileoverview Data Mapper para Classificações de Campeonato (WDC / WCC) — F1Atlas
 *
 * Responsável pela tradução bidirecional determinística entre os modelos relacionais
 * do Prisma (`ChampionshipStanding`, `DriverStandingEntry`, `ConstructorStandingEntry`) e as
 * projeções imutáveis de domínio (`DriverStandings`, `ConstructorStandings`).
 *
 * @module apps/api/src/infrastructure/mappers/standing.mapper
 */

import {
  DriverStandings,
  ConstructorStandings,
  StandingStatus as DomainStandingStatus,
  EntityId,
  type DriverStandingEntry as DomainDriverStandingEntry,
  type ConstructorStandingEntry as DomainConstructorStandingEntry
} from '@f1atlas/domain';

// ==========================================
// Tipos de Persistência Prisma
// ==========================================

export interface PrismaDriverStandingEntryRecord {
  driverId: string;
  constructorId?: string | null;
  position: number;
  points: number | string | { toNumber(): number };
  winsCount: number;
  podiumsCount: number;
  tiebreakerRank?: number | null;
}

export interface PrismaDriverStandingsRecord {
  id: string;
  seasonId: string;
  roundNumber: number;
  calculatedAt: Date;
  driverEntries: PrismaDriverStandingEntryRecord[];
}

export interface PrismaConstructorStandingEntryRecord {
  teamId: string;
  constructorId?: string | null;
  position: number;
  points: number | string | { toNumber(): number };
  winsCount: number;
  podiumsCount: number;
  tiebreakerRank?: number | null;
}

export interface PrismaConstructorStandingsRecord {
  id: string;
  seasonId: string;
  roundNumber: number;
  calculatedAt: Date;
  constructorEntries: PrismaConstructorStandingEntryRecord[];
}

export class StandingMapper {
  private static parsePoints(pointsValue: number | string | { toNumber(): number }): number {
    if (typeof pointsValue === 'number') return pointsValue;
    if (typeof pointsValue === 'object' && pointsValue !== null && 'toNumber' in pointsValue) {
      return pointsValue.toNumber();
    }
    const parsed = Number(pointsValue);
    return isNaN(parsed) ? 0 : parsed;
  }

  // ==========================================
  // 1. Classificação de Pilotos (DriverStandings)
  // ==========================================

  public static driverStandingsToPersistence(domain: DriverStandings) {
    return {
      id: domain.id.value,
      seasonId: domain.seasonId.value,
      roundNumber: domain.roundNumber,
      calculatedAt: domain.updatedAt,
      entries: domain.entries.map(e => ({
        driverId: e.driverId.value,
        constructorId: e.constructorId.value,
        position: e.rank,
        points: e.points,
        winsCount: e.wins,
        podiumsCount: e.podiums,
        tiebreakerRank: e.rank
      }))
    };
  }

  public static driverStandingsToDomain(record: PrismaDriverStandingsRecord): DriverStandings {
    if (!record.id) {
      throw new Error('[StandingMapper] ID do snapshot de classificação ausente.');
    }

    const domainEntries: DomainDriverStandingEntry[] = (record.driverEntries ?? []).map(e => {
      const constructorIdStr = e.constructorId?.trim();
      if (!constructorIdStr) {
        throw new Error(
          `[StandingMapper] constructorId ausente para o piloto "${e.driverId}" na posição ${e.position} do WDC.`
        );
      }

      return {
        rank: e.position,
        driverId: EntityId.from<'driver'>(e.driverId),
        constructorId: EntityId.from<'constructor'>(constructorIdStr),
        points: StandingMapper.parsePoints(e.points),
        wins: e.winsCount ?? 0,
        podiums: e.podiumsCount ?? 0,
        gpFinishes: [],
        sprintFinishes: [],
        rankChange: 0
      };
    });

    domainEntries.sort((a, b) => a.rank - b.rank);

    const createResult = DriverStandings.create({
      id: EntityId.from<'driver-standings'>(record.id),
      seasonId: EntityId.from<'season'>(record.seasonId),
      roundNumber: record.roundNumber,
      status: DomainStandingStatus.OFFICIAL,
      entries: domainEntries,
      updatedAt: record.calculatedAt ? new Date(record.calculatedAt) : undefined
    });

    if (createResult.isFailure) {
      throw new Error(`[StandingMapper] Falha ao reconstruir DriverStandings: ${createResult.getError().message}`);
    }

    return createResult.getValue();
  }

  // ==========================================
  // 2. Classificação de Construtores (ConstructorStandings)
  // ==========================================

  public static constructorStandingsToPersistence(
    domain: ConstructorStandings,
    teamIdResolver?: (constructorId: string) => string | null
  ) {
    return {
      id: domain.id.value,
      seasonId: domain.seasonId.value,
      roundNumber: domain.roundNumber,
      calculatedAt: domain.updatedAt,
      entries: domain.entries.map(e => {
        const resolvedTeamId = teamIdResolver ? teamIdResolver(e.constructorId.value) : null;
        return {
          constructorId: e.constructorId.value,
          teamId: resolvedTeamId ?? e.constructorId.value,
          position: e.rank,
          points: e.points,
          winsCount: e.wins,
          podiumsCount: e.podiums,
          tiebreakerRank: e.rank
        };
      })
    };
  }

  public static constructorStandingsToDomain(record: PrismaConstructorStandingsRecord): ConstructorStandings {
    if (!record.id) {
      throw new Error('[StandingMapper] ID do snapshot de construtores ausente.');
    }

    const domainEntries: DomainConstructorStandingEntry[] = (record.constructorEntries ?? []).map(e => {
      const constructorIdStr = e.constructorId?.trim() || e.teamId?.trim();
      if (!constructorIdStr) {
        throw new Error(
          `[StandingMapper] constructorId/teamId ausente para entrada na posição ${e.position} do WCC.`
        );
      }

      return {
        rank: e.position,
        constructorId: EntityId.from<'constructor'>(constructorIdStr),
        points: StandingMapper.parsePoints(e.points),
        wins: e.winsCount ?? 0,
        podiums: e.podiumsCount ?? 0,
        gpFinishes: [],
        sprintFinishes: [],
        rankChange: 0
      };
    });

    domainEntries.sort((a, b) => a.rank - b.rank);

    const createResult = ConstructorStandings.create({
      id: EntityId.from<'constructor-standings'>(record.id),
      seasonId: EntityId.from<'season'>(record.seasonId),
      roundNumber: record.roundNumber,
      status: DomainStandingStatus.OFFICIAL,
      entries: domainEntries,
      updatedAt: record.calculatedAt ? new Date(record.calculatedAt) : undefined
    });

    if (createResult.isFailure) {
      throw new Error(`[StandingMapper] Falha ao reconstruir ConstructorStandings: ${createResult.getError().message}`);
    }

    return createResult.getValue();
  }
}
