/**
 * @fileoverview Data Mapper para Participantes e Inscrições — F1Atlas
 *
 * Responsável pela tradução bidirecional determinística entre os modelos relacionais
 * do Prisma (`Driver`, `Team`, `Constructor`, `SeasonDriverContract`) e as entidades de domínio
 * (`Driver`, `Team`, `Constructor`, `SeasonEntry`).
 *
 * @module apps/api/src/infrastructure/mappers/participant.mapper
 */

import {
  Driver,
  Team,
  Constructor,
  SeasonEntry,
  EntryRole,
  EntityId
} from '@f1atlas/domain';

// ==========================================
// Tipos de Persistência Prisma e Projeções Relacionais
// ==========================================

/**
 * Projeção relacional composta para reconstituição da entidade de domínio SeasonEntry.
 *
 * Mapeamento Arquitetural:
 * No schema relacional (`schema.prisma`), o vínculo do piloto com a temporada é normalizado em duas entidades:
 * - `SeasonEntrant`: Inscrição corporativa da equipe e construtor na temporada (`seasonId`, `teamId`, `constructorId`).
 * - `SeasonDriverContract`: Vínculo contratual do piloto (`driverId`, `assignedNumber`, `role`, vigência).
 *
 * O adaptador concreto da Fase 2 deve consultar via `prisma.seasonDriverContract.findMany({ include: { seasonEntrant: true } })`
 * ou fornecer a projeção achatada `PrismaSeasonEntryRecord`.
 */
export interface PrismaDriverRecord {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  code?: string | null;
  nationality: string;
  permanentNumber?: number | null;
  birthDate?: Date | null;
  isActive?: boolean;
  isWorldChampion?: boolean;
}

export interface PrismaDriverPersistenceDTO {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
  code: string | null;
  nationality: string;
  permanentNumber: number | null;
  birthDate: Date | null;
  isActive: boolean;
}

export interface PrismaTeamRecord {
  id: string;
  slug: string;
  legalName: string;
  commonName: string;
  nationality: string;
  baseLocation?: string | null;
  foundedYear?: number | null;
  isActive?: boolean;
}

export interface PrismaTeamPersistenceDTO {
  id: string;
  slug: string;
  legalName: string;
  commonName: string;
  nationality: string;
  baseLocation: string | null;
  foundedYear: number | null;
  isActive: boolean;
}

export interface PrismaConstructorRecord {
  id: string;
  slug: string;
  name: string;
  nationality: string;
  chassis?: string | null;
  engineManufacturer?: string | null;
}

export interface PrismaConstructorPersistenceDTO {
  id: string;
  slug: string;
  name: string;
  nationality: string;
  chassis: string | null;
  engineManufacturer: string | null;
}

export interface PrismaSeasonEntryRecord {
  id: string;
  seasonId: string;
  driverId: string;
  teamId: string;
  constructorId: string;
  carNumber: number;
  role: string;
  startRound?: number;
  endRound?: number | null;
}

export interface PrismaSeasonEntryPersistenceDTO {
  id: string;
  seasonId: string;
  driverId: string;
  teamId: string;
  constructorId: string;
  carNumber: number;
  role: 'REGULAR' | 'SUBSTITUTE';
  startRound: number;
  endRound: number | null;
}

export class ParticipantMapper {
  // ==========================================
  // 1. Pilotos (Driver)
  // ==========================================

  public static driverToPersistence(domain: Driver): PrismaDriverPersistenceDTO {
    const fullName = `${domain.firstName} ${domain.lastName}`.trim();
    const slug = `${domain.firstName.toLowerCase()}-${domain.lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '-');

    return {
      id: domain.id.value,
      slug,
      firstName: domain.firstName,
      lastName: domain.lastName,
      fullName,
      displayName: fullName,
      code: domain.code ?? null,
      nationality: domain.nationality,
      permanentNumber: domain.permanentNumber ?? null,
      birthDate: domain.birthDate ? new Date(domain.birthDate) : null,
      isActive: true
    };
  }

  public static driverToDomain(record: PrismaDriverRecord): Driver {
    if (!record.id) {
      throw new Error('[ParticipantMapper] ID do piloto ausente no registro relacional.');
    }

    const driverId = EntityId.from<'driver'>(record.id);
    const birthDateStr = record.birthDate instanceof Date
      ? record.birthDate.toISOString().slice(0, 10)
      : null;

    const isWorldChampion = record.isWorldChampion !== undefined
      ? Boolean(record.isWorldChampion)
      : record.permanentNumber === 1;

    const createResult = Driver.create({
      id: driverId,
      firstName: record.firstName,
      lastName: record.lastName,
      code: record.code ?? 'XXX',
      nationality: record.nationality,
      permanentNumber: record.permanentNumber,
      isWorldChampion,
      birthDate: birthDateStr
    });

    if (createResult.isFailure) {
      throw new Error(`[ParticipantMapper] Falha ao reconstruir piloto: ${createResult.getError().message}`);
    }

    return createResult.getValue();
  }

  // ==========================================
  // 2. Equipes Corporativas (Team)
  // ==========================================

  public static teamToPersistence(domain: Team): PrismaTeamPersistenceDTO {
    const slug = domain.commercialName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return {
      id: domain.id.value,
      slug,
      legalName: domain.legalName,
      commonName: domain.commercialName,
      nationality: domain.nationality,
      baseLocation: domain.baseLocation ?? null,
      foundedYear: domain.foundedYear ?? null,
      isActive: true
    };
  }

  public static teamToDomain(record: PrismaTeamRecord): Team {
    if (!record.id) {
      throw new Error('[ParticipantMapper] ID da equipe ausente no registro relacional.');
    }

    const teamId = EntityId.from<'team'>(record.id);

    const createResult = Team.create({
      id: teamId,
      legalName: record.legalName,
      commercialName: record.commonName,
      nationality: record.nationality,
      baseLocation: record.baseLocation,
      foundedYear: record.foundedYear
    });

    if (createResult.isFailure) {
      throw new Error(`[ParticipantMapper] Falha ao reconstruir equipe: ${createResult.getError().message}`);
    }

    return createResult.getValue();
  }

  // ==========================================
  // 3. Construtores Oficiais (Constructor)
  // ==========================================

  public static constructorToPersistence(domain: Constructor): PrismaConstructorPersistenceDTO {
    const slug = domain.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return {
      id: domain.id.value,
      slug,
      name: domain.name,
      nationality: domain.nationality,
      chassis: domain.chassis ?? null,
      engineManufacturer: domain.engineManufacturer ?? null
    };
  }

  public static constructorToDomain(record: PrismaConstructorRecord): Constructor {
    if (!record.id) {
      throw new Error('[ParticipantMapper] ID do construtor ausente no registro relacional.');
    }

    const constructorId = EntityId.from<'constructor'>(record.id);

    const createResult = Constructor.create({
      id: constructorId,
      name: record.name,
      nationality: record.nationality,
      chassis: record.chassis,
      engineManufacturer: record.engineManufacturer
    });

    if (createResult.isFailure) {
      throw new Error(`[ParticipantMapper] Falha ao reconstruir construtor: ${createResult.getError().message}`);
    }

    return createResult.getValue();
  }

  // ==========================================
  // 4. Inscrições Anuais (SeasonEntry)
  // ==========================================

  public static seasonEntryToPersistence(domain: SeasonEntry): PrismaSeasonEntryPersistenceDTO {
    return {
      id: domain.id.value,
      seasonId: domain.seasonId.value,
      driverId: domain.driverId.value,
      teamId: domain.teamId.value,
      constructorId: domain.constructorId.value,
      carNumber: domain.carNumber,
      role: domain.role === EntryRole.REGULAR ? 'REGULAR' : 'SUBSTITUTE',
      startRound: domain.startRound,
      endRound: domain.endRound ?? null
    };
  }

  public static seasonEntryToDomain(record: PrismaSeasonEntryRecord): SeasonEntry {
    if (!record.id) {
      throw new Error('[ParticipantMapper] ID da inscrição ausente no registro relacional.');
    }

    const role = record.role === 'REGULAR' ? EntryRole.REGULAR : EntryRole.SUBSTITUTE;

    const createResult = SeasonEntry.create({
      id: EntityId.from<'season-entry'>(record.id),
      seasonId: EntityId.from<'season'>(record.seasonId),
      driverId: EntityId.from<'driver'>(record.driverId),
      teamId: EntityId.from<'team'>(record.teamId),
      constructorId: EntityId.from<'constructor'>(record.constructorId),
      carNumber: record.carNumber,
      role,
      startRound: record.startRound ?? 1,
      endRound: record.endRound ?? undefined
    });

    if (createResult.isFailure) {
      throw new Error(`[ParticipantMapper] Falha ao reconstruir SeasonEntry: ${createResult.getError().message}`);
    }

    return createResult.getValue();
  }
}
