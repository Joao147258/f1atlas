/**
 * @fileoverview Data Mapper para a Raiz de Agregado Season — F1Atlas
 *
 * Responsável pela tradução bidirecional determinística entre o modelo relacional
 * do Prisma (`Season` com relações de `GrandPrix`) e a raiz de agregado do domínio (`Season`).
 *
 * Princípios Arquiteturais:
 * - Data Mapper puro: isola o domínio de detalhes relacionais, datas SQL e enums do Prisma.
 * - Preservação de Identidade: converte strings UUID em EntityId<'season'> e EntityId<'grand-prix'>.
 * - Reconstrução Determinística: reconstrói a temporada através da fábrica estática e reidratação do calendário.
 *
 * @module apps/api/src/infrastructure/mappers/season.mapper
 */

import {
  Season,
  SeasonStatus as DomainSeasonStatus,
  ScheduledGrandPrixStatus,
  EntityId,
  type ScheduledGrandPrix
} from '@f1atlas/domain';

/**
 * Interface representativa do registro de GrandPrix retornado pelo Prisma com campos mínimos de calendário.
 */
export interface PrismaGrandPrixCalendarRecord {
  id: string;
  roundNumber: number;
  officialName: string;
  status: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

/**
 * Interface representativa do registro de Season retornado pela camada Prisma.
 */
export interface PrismaSeasonRecord {
  id: string;
  year: number;
  officialName: string;
  status: string;
  startDate?: Date | null;
  endDate?: Date | null;
  grandsPrix?: PrismaGrandPrixCalendarRecord[];
}

/**
 * Estrutura de dados para persistência no Prisma (Insert / Update).
 */
export interface PrismaSeasonPersistenceDTO {
  id: string;
  year: number;
  officialName: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startDate?: Date | null;
  endDate?: Date | null;
}

export class SeasonMapper {
  /**
   * Converte o enum de status da temporada do Prisma para o enum canônico do Domínio.
   */
  public static toDomainStatus(prismaStatus: string): DomainSeasonStatus {
    switch (prismaStatus) {
      case 'PLANNED':
        return DomainSeasonStatus.PLANNED;
      case 'IN_PROGRESS':
        return DomainSeasonStatus.IN_PROGRESS;
      case 'COMPLETED':
        return DomainSeasonStatus.CONCLUDED;
      case 'CANCELLED':
        return DomainSeasonStatus.CANCELLED;
      case 'HISTORICAL_REVISED':
        return DomainSeasonStatus.HISTORICAL_REVISED;
      default:
        throw new Error(`[SeasonMapper] Status de temporada Prisma desconhecido: "${prismaStatus}"`);
    }
  }

  /**
   * Converte o enum de status da temporada do Domínio para o enum aceito pelo Prisma.
   */
  public static toPrismaStatus(domainStatus: DomainSeasonStatus): 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' {
    switch (domainStatus) {
      case DomainSeasonStatus.PLANNED:
        return 'PLANNED';
      case DomainSeasonStatus.IN_PROGRESS:
        return 'IN_PROGRESS';
      case DomainSeasonStatus.CONCLUDED:
      case DomainSeasonStatus.HISTORICAL_REVISED:
        return 'COMPLETED';
      case DomainSeasonStatus.CANCELLED:
        return 'CANCELLED';
      default:
        throw new Error(`[SeasonMapper] Status de temporada do domínio inválido para persistência: "${domainStatus}"`);
    }
  }

  /**
   * Converte o status de uma etapa agendada do Prisma para o Value Object do Domínio.
   */
  public static toDomainGrandPrixStatus(statusStr: string): ScheduledGrandPrixStatus {
    switch (statusStr) {
      case 'SCHEDULED':
        return ScheduledGrandPrixStatus.SCHEDULED;
      case 'IN_PROGRESS':
      case 'LIVE':
        return ScheduledGrandPrixStatus.SCHEDULED;
      case 'COMPLETED':
        return ScheduledGrandPrixStatus.COMPLETED;
      case 'CANCELLED':
        return ScheduledGrandPrixStatus.CANCELLED;
      case 'POSTPONED':
        return ScheduledGrandPrixStatus.POSTPONED;
      default:
        return ScheduledGrandPrixStatus.SCHEDULED;
    }
  }

  /**
   * Converte uma entidade de domínio Season para o formato de persistência Prisma.
   */
  public static toPersistence(domain: Season): PrismaSeasonPersistenceDTO {
    const sortedGps = [...domain.grandPrixList].sort((a, b) => a.roundNumber - b.roundNumber);
    const startDate = sortedGps.length > 0 ? sortedGps[0].startDate ?? null : null;
    const endDate = sortedGps.length > 0 ? sortedGps[sortedGps.length - 1].endDate ?? null : null;

    return {
      id: domain.id.value,
      year: domain.year,
      officialName: domain.description?.trim() || `FIA Formula One World Championship ${domain.year}`,
      status: SeasonMapper.toPrismaStatus(domain.status),
      startDate,
      endDate
    };
  }

  /**
   * Reconstitui uma raiz de agregado Season a partir de registros do Prisma.
   */
  public static toDomain(record: PrismaSeasonRecord): Season {
    if (!record.id || typeof record.id !== 'string') {
      throw new Error('[SeasonMapper] ID da temporada ausente ou inválido no registro relacional.');
    }

    if (!record.year || typeof record.year !== 'number') {
      throw new Error('[SeasonMapper] Ano da temporada ausente ou inválido no registro relacional.');
    }

    const seasonId = EntityId.from<'season'>(record.id);
    const domainStatus = SeasonMapper.toDomainStatus(record.status);

    const createResult = Season.create({
      id: seasonId,
      year: record.year,
      status: domainStatus,
      description: record.officialName
    });

    if (createResult.isFailure) {
      throw new Error(`[SeasonMapper] Falha ao reconstruir entidade Season: ${createResult.getError().message}`);
    }

    let season = createResult.getValue();

    // Reidratação das etapas de calendário, se presentes
    if (record.grandsPrix && Array.isArray(record.grandsPrix)) {
      const sortedGps = [...record.grandsPrix].sort((a, b) => a.roundNumber - b.roundNumber);

      for (const gpRecord of sortedGps) {
        const scheduledGp: ScheduledGrandPrix = {
          grandPrixId: EntityId.from<'grand-prix'>(gpRecord.id),
          roundNumber: gpRecord.roundNumber,
          name: gpRecord.officialName,
          status: SeasonMapper.toDomainGrandPrixStatus(gpRecord.status),
          startDate: gpRecord.startDate ? new Date(gpRecord.startDate) : undefined,
          endDate: gpRecord.endDate ? new Date(gpRecord.endDate) : undefined
        };

        const scheduleResult = season.scheduleGrandPrix(scheduledGp);
        if (scheduleResult.isFailure) {
          throw new Error(
            `[SeasonMapper] Falha ao reidratar etapa de calendário (rodada ${gpRecord.roundNumber}): ${scheduleResult.getError().message}`
          );
        }
        season = scheduleResult.getValue();
      }
    }

    return season;
  }
}
