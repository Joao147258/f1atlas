/**
 * @fileoverview Data Mapper para Eventos, Circuitos, Grandes Prêmios e Resultados — F1Atlas
 *
 * Responsável pela tradução bidirecional determinística entre os modelos relacionais
 * do Prisma (`Circuit`, `GrandPrix`, `Session`, `SessionResult`) e as entidades de domínio
 * (`Circuit`, `GrandPrix`, `Session`, `SessionResult`).
 *
 * @module apps/api/src/infrastructure/mappers/event.mapper
 */

import {
  Circuit,
  GrandPrix,
  Session,
  SessionResult,
  GrandPrixFormat,
  SessionType as DomainSessionType,
  SessionStatus as DomainSessionStatus,
  ResultStatus as DomainResultStatus,
  PublicationState as DomainPublicationState,
  EntityId
} from '@f1atlas/domain';

// ==========================================
// Tipos de Persistência Prisma
// ==========================================

export interface PrismaCircuitRecord {
  id: string;
  name: string;
  city: string;
  country: string;
  trackLengthMeters: number;
  cornersCount: number;
  timezone: string;
}

export interface PrismaCircuitPersistenceDTO {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  trackLengthMeters: number;
  cornersCount: number;
  timezone: string;
}

export interface PrismaGrandPrixRecord {
  id: string;
  seasonId: string;
  circuitId: string;
  slug: string;
  roundNumber: number;
  officialName: string;
  format: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

export interface PrismaGrandPrixPersistenceDTO {
  id: string;
  seasonId: string;
  circuitId: string;
  slug: string;
  roundNumber: number;
  officialName: string;
  format: 'STANDARD' | 'SPRINT_WEEKEND' | 'SPRINT_QUALIFYING_FORMAT';
  startDate: Date;
  endDate: Date;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
}

export interface PrismaSessionRecord {
  id: string;
  grandPrixId: string;
  sessionType: string;
  sessionStatus: string;
  scheduledStartTime: Date;
  scheduledEndTime?: Date | null;
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
  cancellationReason?: string | null;
}

export interface PrismaSessionPersistenceDTO {
  id: string;
  grandPrixId: string;
  sessionType: 'PRACTICE_1' | 'PRACTICE_2' | 'PRACTICE_3' | 'QUALIFYING' | 'SPRINT_SHOOTOUT' | 'SPRINT' | 'RACE';
  sessionStatus: 'SCHEDULED' | 'LIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED';
  scheduledStartTime: Date;
  scheduledEndTime: Date | null;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  cancellationReason: string | null;
}

export interface PrismaSessionResultRecord {
  id: string;
  sessionId: string;
  driverId: string;
  teamId: string;
  constructorId: string;
  position?: number | null;
  lapsCompleted: number;
  finishStatus: string;
  totalTimeMillis?: number | null;
  gapToLeaderMillis?: number | null;
  fastestLapTimeMillis?: number | null;
  fastestLapRank?: number | null;
  homologationStatus: string;
  revisionReason?: string | null;
}

export interface PrismaSessionResultPersistenceDTO {
  id: string;
  sessionId: string;
  driverId: string;
  teamId: string;
  constructorId: string;
  position: number | null;
  lapsCompleted: number;
  finishStatus: string;
  totalTimeMillis: number | null;
  gapToLeaderMillis: number | null;
  fastestLapTimeMillis: number | null;
  fastestLapRank: number | null;
  homologationStatus: 'PROVISIONAL' | 'UNDER_INVESTIGATION' | 'OFFICIAL' | 'REVISED';
  revisionReason: string | null;
}

export class EventMapper {
  // ==========================================
  // 1. Circuitos (Circuit)
  // ==========================================

  public static circuitToPersistence(domain: Circuit): PrismaCircuitPersistenceDTO {
    const slug = domain.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return {
      id: domain.id.value,
      slug,
      name: domain.name,
      city: domain.city,
      country: domain.country,
      trackLengthMeters: domain.trackLengthMeters,
      cornersCount: domain.cornersCount,
      timezone: domain.timezone
    };
  }

  public static circuitToDomain(record: PrismaCircuitRecord): Circuit {
    if (!record.id) {
      throw new Error('[EventMapper] ID do circuito ausente no registro relacional.');
    }

    const createResult = Circuit.create({
      id: EntityId.from<'circuit'>(record.id),
      name: record.name,
      city: record.city,
      country: record.country,
      trackLengthMeters: record.trackLengthMeters,
      cornersCount: record.cornersCount,
      timezone: record.timezone
    });

    if (createResult.isFailure) {
      throw new Error(`[EventMapper] Falha ao reconstruir Circuit: ${createResult.getError().message}`);
    }

    return createResult.getValue();
  }

  // ==========================================
  // 2. Grandes Prêmios (GrandPrix)
  // ==========================================

  public static grandPrixToPersistence(domain: GrandPrix): PrismaGrandPrixPersistenceDTO {
    const slug = domain.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return {
      id: domain.id.value,
      seasonId: domain.seasonId.value,
      circuitId: domain.circuitId.value,
      slug,
      roundNumber: domain.roundNumber,
      officialName: domain.name,
      format: domain.format === GrandPrixFormat.SPRINT ? 'SPRINT_WEEKEND' : 'STANDARD',
      startDate: new Date(domain.startDate),
      endDate: new Date(domain.endDate),
      status: domain.status as any
    };
  }

  public static grandPrixToDomain(record: PrismaGrandPrixRecord): GrandPrix {
    if (!record.id) {
      throw new Error('[EventMapper] ID do Grande Prêmio ausente no registro relacional.');
    }

    const createResult = GrandPrix.create({
      id: EntityId.from<'grand-prix'>(record.id),
      seasonId: EntityId.from<'season'>(record.seasonId),
      circuitId: EntityId.from<'circuit'>(record.circuitId),
      roundNumber: record.roundNumber,
      name: record.officialName,
      startDate: new Date(record.startDate),
      endDate: new Date(record.endDate),
      format: record.format === 'SPRINT_WEEKEND' ? GrandPrixFormat.SPRINT : GrandPrixFormat.STANDARD
    });

    if (createResult.isFailure) {
      throw new Error(`[EventMapper] Falha ao reconstruir GrandPrix: ${createResult.getError().message}`);
    }

    return createResult.getValue();
  }

  // ==========================================
  // 3. Sessões de Pista (Session)
  // ==========================================

  public static sessionTypeToDomain(prismaType: string): DomainSessionType {
    switch (prismaType) {
      case 'PRACTICE_1': return DomainSessionType.FP1;
      case 'PRACTICE_2': return DomainSessionType.FP2;
      case 'PRACTICE_3': return DomainSessionType.FP3;
      case 'QUALIFYING': return DomainSessionType.QUALIFYING;
      case 'SPRINT_SHOOTOUT': return DomainSessionType.SPRINT_SHOOTOUT;
      case 'SPRINT': return DomainSessionType.SPRINT;
      case 'RACE': return DomainSessionType.RACE;
      default:
        throw new Error(`[EventMapper] Tipo de sessão Prisma desconhecido ou inválido: "${prismaType}"`);
    }
  }

  public static sessionTypeToPrisma(domainType: DomainSessionType): 'PRACTICE_1' | 'PRACTICE_2' | 'PRACTICE_3' | 'QUALIFYING' | 'SPRINT_SHOOTOUT' | 'SPRINT' | 'RACE' {
    switch (domainType) {
      case DomainSessionType.FP1: return 'PRACTICE_1';
      case DomainSessionType.FP2: return 'PRACTICE_2';
      case DomainSessionType.FP3: return 'PRACTICE_3';
      case DomainSessionType.QUALIFYING: return 'QUALIFYING';
      case DomainSessionType.SPRINT_SHOOTOUT:
      case DomainSessionType.SPRINT_QUALIFYING: return 'SPRINT_SHOOTOUT';
      case DomainSessionType.SPRINT: return 'SPRINT';
      case DomainSessionType.RACE: return 'RACE';
      default:
        throw new Error(`[EventMapper] Tipo de sessão do domínio inválido para persistência: "${domainType}"`);
    }
  }

  public static sessionStatusToDomain(prismaStatus: string): DomainSessionStatus {
    switch (prismaStatus) {
      case 'SCHEDULED': return DomainSessionStatus.SCHEDULED;
      case 'LIVE': return DomainSessionStatus.LIVE;
      case 'SUSPENDED': return DomainSessionStatus.RED_FLAGGED;
      case 'COMPLETED': return DomainSessionStatus.COMPLETED;
      case 'CANCELLED': return DomainSessionStatus.CANCELLED;
      default:
        throw new Error(`[EventMapper] Status de sessão Prisma desconhecido ou inválido: "${prismaStatus}"`);
    }
  }

  public static sessionToPersistence(domain: Session): PrismaSessionPersistenceDTO {
    return {
      id: domain.id.value,
      grandPrixId: domain.grandPrixId.value,
      sessionType: EventMapper.sessionTypeToPrisma(domain.type),
      sessionStatus: domain.status === DomainSessionStatus.RED_FLAGGED ? 'SUSPENDED' : domain.status as any,
      scheduledStartTime: domain.scheduledStartTime,
      scheduledEndTime: domain.scheduledEndTime ?? null,
      actualStartTime: domain.actualStartTime ?? null,
      actualEndTime: domain.actualEndTime ?? null,
      cancellationReason: domain.cancellationReason ?? null
    };
  }

  public static sessionToDomain(record: PrismaSessionRecord): Session {
    if (!record.id) {
      throw new Error('[EventMapper] ID da sessão ausente no registro relacional.');
    }

    const createResult = Session.create({
      id: EntityId.from<'session'>(record.id),
      grandPrixId: EntityId.from<'grand-prix'>(record.grandPrixId),
      type: EventMapper.sessionTypeToDomain(record.sessionType),
      scheduledStartTime: new Date(record.scheduledStartTime),
      scheduledEndTime: record.scheduledEndTime ? new Date(record.scheduledEndTime) : undefined
    });

    if (createResult.isFailure) {
      throw new Error(`[EventMapper] Falha ao reconstruir Session: ${createResult.getError().message}`);
    }

    return createResult.getValue();
  }

  // ==========================================
  // 4. Resultados de Sessão (SessionResult)
  // ==========================================

  public static finishStatusToDomain(finishStatus: string): DomainResultStatus {
    switch (finishStatus) {
      case 'FINISHED':
      case 'LAPPED':
        return DomainResultStatus.FINISHED;
      case 'DISQUALIFIED':
        return DomainResultStatus.DSQ;
      case 'DID_NOT_START':
        return DomainResultStatus.DNS;
      case 'DID_NOT_QUALIFY':
      case 'ACCIDENT':
      case 'COLLISION':
      case 'MECHANICAL':
      case 'RETIRED':
        return DomainResultStatus.DNF;
      default:
        throw new Error(`[EventMapper] finishStatus Prisma desconhecido ou inválido: "${finishStatus}"`);
    }
  }

  public static homologationToDomain(status: string): DomainPublicationState {
    switch (status) {
      case 'PROVISIONAL':
      case 'UNDER_INVESTIGATION':
        return DomainPublicationState.PROVISIONAL;
      case 'OFFICIAL':
        return DomainPublicationState.OFFICIAL;
      case 'REVISED':
        return DomainPublicationState.REVISED;
      default:
        throw new Error(`[EventMapper] homologationStatus Prisma desconhecido ou inválido: "${status}"`);
    }
  }

  public static resultToPersistence(domain: SessionResult): PrismaSessionResultPersistenceDTO {
    let finishStatus = 'FINISHED';
    if (domain.status === DomainResultStatus.DSQ) finishStatus = 'DISQUALIFIED';
    else if (domain.status === DomainResultStatus.DNS) finishStatus = 'DID_NOT_START';
    else if (domain.status === DomainResultStatus.DNF) finishStatus = 'RETIRED';

    let homologation: 'PROVISIONAL' | 'UNDER_INVESTIGATION' | 'OFFICIAL' | 'REVISED' = 'OFFICIAL';
    if (domain.publicationState === DomainPublicationState.PROVISIONAL) homologation = 'PROVISIONAL';
    else if (domain.publicationState === DomainPublicationState.REVISED) homologation = 'REVISED';

    return {
      id: domain.id.value,
      sessionId: domain.sessionId.value,
      driverId: domain.driverId.value,
      teamId: domain.teamId.value,
      constructorId: domain.constructorId.value,
      position: domain.position,
      lapsCompleted: domain.lapsCompleted,
      finishStatus,
      totalTimeMillis: domain.totalTimeMillis,
      gapToLeaderMillis: domain.gapMillis,
      fastestLapTimeMillis: domain.fastestLapTimeMillis,
      fastestLapRank: domain.fastestLapRank,
      homologationStatus: homologation,
      revisionReason: domain.revisionReason
    };
  }

  public static resultToDomain(record: PrismaSessionResultRecord): SessionResult {
    if (!record.id) {
      throw new Error('[EventMapper] ID do resultado ausente no registro relacional.');
    }

    const createResult = SessionResult.create({
      id: EntityId.from<'session-result'>(record.id),
      sessionId: EntityId.from<'session'>(record.sessionId),
      driverId: EntityId.from<'driver'>(record.driverId),
      teamId: EntityId.from<'team'>(record.teamId),
      constructorId: EntityId.from<'constructor'>(record.constructorId),
      position: record.position ?? null,
      lapsCompleted: record.lapsCompleted,
      status: EventMapper.finishStatusToDomain(record.finishStatus),
      totalTimeMillis: record.totalTimeMillis ?? null,
      gapMillis: record.gapToLeaderMillis ?? null,
      fastestLapTimeMillis: record.fastestLapTimeMillis ?? null,
      fastestLapRank: record.fastestLapRank ?? null,
      publicationState: EventMapper.homologationToDomain(record.homologationStatus),
      revisionReason: record.revisionReason ?? null
    });

    if (createResult.isFailure) {
      throw new Error(`[EventMapper] Falha ao reconstruir SessionResult: ${createResult.getError().message}`);
    }

    return createResult.getValue();
  }
}
