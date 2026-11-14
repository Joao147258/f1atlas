/**
 * ============================================================================
 * F1Atlas — Camada Infrastructure | Database: PrismaParticipantRepository
 * ============================================================================
 *
 * @component PrismaParticipantRepository
 * @module apps/api/src/infrastructure/database/prisma/repositories/prisma-participant.repository
 * @layer Infrastructure (Persistência Relacional)
 * @implements {IParticipantRepository} (apps/api/src/application/ports/participant-repository.port.ts)
 *
 * Responsabilidade Arquitetural:
 * Prover operações de persistência e consulta dos participantes do automobilismo:
 * 1. Pilotos (`Driver`): Entidades duráveis de identidade humana do competidor.
 * 2. Equipes (`Team`): Entidades corporativas e operacionais permanentes.
 * 3. Construtores (`Constructor`): Entidades técnicas homologadas perante a FIA.
 * 4. Inscrições de Temporada (`SeasonEntry`): Associação contextual anual entre piloto,
 *    equipe, construtor e número permanente.
 *
 * Princípios e Decisões de Modelagem:
 * - Resolução do JOIN Relacional Normalizado: No banco relacional, a participação é normalizada
 *   em `SeasonEntrant` (vínculo corporativo da equipe/construtor com a temporada) e
 *   `SeasonDriverContract` (vínculo desportivo do piloto com o entrant). O repositório encapsula
 *   essa complexidade através de `include: { seasonEntrant: true }`, projetando a entidade
 *   única `SeasonEntry` para o Domínio.
 * - Anti-fabricação de Dados: Não cria equipes ou temporadas fictícias. A gravação de
 *   uma inscrição exige que a temporada, a equipe e o piloto existam previamente.
 *
 * Riscos de Manutenção:
 * - Alterar a geração de slugs sem normalização pode quebrar rotas públicas e URLs canônicas.
 * - Desconsiderar a separação conceitual entre Team e Constructor viola o regulamento da FIA
 *   onde construtores fornecem chassis e motores para equipes clientes distintas.
 * ============================================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  Driver,
  Team,
  Constructor,
  SeasonEntry,
  EntityId
} from '@f1atlas/domain';
import type {
  IParticipantRepository,
  DriverFilterCriteria
} from '../../../../application/ports/participant-repository.port.js';
import { PrismaService } from '../prisma.service.js';
import {
  ParticipantMapper,
  type PrismaSeasonEntryRecord
} from '../../../mappers/participant.mapper.js';
import { PrismaErrorHandler } from '../errors/prisma-error-handler.js';
import { EntityNotFoundError } from '../errors/persistence-errors.js';
import type { DriverRole } from '../../../../generated/prisma/enums.js';
import type { Prisma } from '../../../../generated/prisma/client.js';

@Injectable()
export class PrismaParticipantRepository implements IParticipantRepository {
  private readonly logger = new Logger(PrismaParticipantRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. Pilotos (Driver)
  // ==========================================

  /**
   * Localiza um piloto por seu identificador tipado nominal.
   *
   * @param id - Identificador EntityId<'driver'>.
   * @returns Entidade Driver ou null se não encontrada.
   */
  async findDriverById(id: EntityId<'driver'>): Promise<Driver | null> {
    try {
      const record = await this.prisma.driver.findUnique({
        where: { id: id.value }
      });

      if (!record) return null;
      return ParticipantMapper.driverToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaParticipantRepository.findDriverById(${id.value})`);
    }
  }

  /**
   * Localiza um piloto pelo código oficial FIA permanente de 3 letras (ex.: "VER", "HAM").
   *
   * @param code - Código de 3 letras do piloto.
   * @returns Entidade Driver ou null se não encontrada.
   */
  async findDriverByCode(code: string): Promise<Driver | null> {
    try {
      const record = await this.prisma.driver.findFirst({
        where: { code: code.toUpperCase() }
      });

      if (!record) return null;
      return ParticipantMapper.driverToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaParticipantRepository.findDriverByCode(${code})`);
    }
  }

  /**
   * Localiza um piloto pelo número fixo de carreira (ex.: 44, 16, 1).
   *
   * @param number - Número de corrida permanente do piloto.
   * @returns Entidade Driver ou null se não encontrada.
   */
  async findDriverByPermanentNumber(number: number): Promise<Driver | null> {
    try {
      const record = await this.prisma.driver.findFirst({
        where: { permanentNumber: number }
      });

      if (!record) return null;
      return ParticipantMapper.driverToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaParticipantRepository.findDriverByPermanentNumber(${number})`);
    }
  }

  /**
   * Consulta a lista de pilotos com base em critérios combináveis de busca.
   *
   * @param criteria - Filtros opcionais de atividade, nacionalidade ou termo de busca textual.
   * @returns Coleção de pilotos ordenada alfabeticamente por sobrenome e nome.
   */
  async findDrivers(criteria?: DriverFilterCriteria): Promise<Driver[]> {
    try {
      const where: Prisma.DriverWhereInput = {};

      if (criteria?.isActive !== undefined) {
        where.isActive = criteria.isActive;
      }

      if (criteria?.nationality) {
        where.nationality = criteria.nationality;
      }

      if (criteria?.search) {
        const search = criteria.search.trim();
        where.OR = [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { code: { contains: search } }
        ];
      }

      const records = await this.prisma.driver.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
      });

      return records.map(record => ParticipantMapper.driverToDomain(record));
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, 'PrismaParticipantRepository.findDrivers');
    }
  }

  /**
   * Persiste (cria ou atualiza) a entidade durável de Piloto.
   *
   * @param driver - Entidade Driver do Domínio.
   * @returns Entidade persistida e recarregada.
   * @throws {UniqueConstraintViolationError} Em caso de duplicidade de código ou slug único.
   */
  async saveDriver(driver: Driver): Promise<Driver> {
    try {
      const dto = ParticipantMapper.driverToPersistence(driver);

      await this.prisma.driver.upsert({
        where: { id: dto.id },
        create: {
          id: dto.id,
          slug: dto.slug,
          firstName: dto.firstName,
          lastName: dto.lastName,
          fullName: dto.fullName,
          displayName: dto.displayName,
          code: dto.code,
          nationality: dto.nationality,
          permanentNumber: dto.permanentNumber,
          birthDate: dto.birthDate,
          isActive: dto.isActive
        },
        update: {
          slug: dto.slug,
          firstName: dto.firstName,
          lastName: dto.lastName,
          fullName: dto.fullName,
          displayName: dto.displayName,
          code: dto.code,
          nationality: dto.nationality,
          permanentNumber: dto.permanentNumber,
          birthDate: dto.birthDate,
          isActive: dto.isActive
        }
      });

      const persisted = await this.findDriverById(driver.id);
      if (!persisted) {
        throw new Error(`Falha ao recuperar o piloto ${driver.id.value} após salvar.`);
      }

      return persisted;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaParticipantRepository.saveDriver(${driver.id.value})`);
    }
  }

  // ==========================================
  // 2. Equipes Corporativas (Team)
  // ==========================================

  /**
   * Localiza uma equipe por seu identificador único.
   *
   * @param id - Identificador EntityId<'team'>.
   * @returns Entidade Team ou null se não encontrada.
   */
  async findTeamById(id: EntityId<'team'>): Promise<Team | null> {
    try {
      const record = await this.prisma.team.findUnique({
        where: { id: id.value }
      });

      if (!record) return null;
      return ParticipantMapper.teamToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaParticipantRepository.findTeamById(${id.value})`);
    }
  }

  /**
   * Lista todas as equipes corporativas cadastradas.
   *
   * @returns Lista de equipes ordenada pelo nome comercial comum.
   */
  async findAllTeams(): Promise<Team[]> {
    try {
      const records = await this.prisma.team.findMany({
        orderBy: { commonName: 'asc' }
      });

      return records.map(record => ParticipantMapper.teamToDomain(record));
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, 'PrismaParticipantRepository.findAllTeams');
    }
  }

  /**
   * Salva uma equipe comercial e organizacional.
   *
   * @param team - Entidade Team do Domínio.
   * @returns Entidade Team persistida.
   */
  async saveTeam(team: Team): Promise<Team> {
    try {
      const dto = ParticipantMapper.teamToPersistence(team);

      await this.prisma.team.upsert({
        where: { id: dto.id },
        create: {
          id: dto.id,
          slug: dto.slug,
          legalName: dto.legalName,
          commonName: dto.commonName,
          nationality: dto.nationality,
          baseLocation: dto.baseLocation,
          foundedYear: dto.foundedYear,
          isActive: dto.isActive
        },
        update: {
          slug: dto.slug,
          legalName: dto.legalName,
          commonName: dto.commonName,
          nationality: dto.nationality,
          baseLocation: dto.baseLocation,
          foundedYear: dto.foundedYear,
          isActive: dto.isActive
        }
      });

      const persisted = await this.findTeamById(team.id);
      if (!persisted) {
        throw new Error(`Falha ao recuperar a equipe ${team.id.value} após salvar.`);
      }

      return persisted;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaParticipantRepository.saveTeam(${team.id.value})`);
    }
  }

  // ==========================================
  // 3. Construtores Oficiais FIA (Constructor)
  // ==========================================

  /**
   * Localiza um construtor técnico pelo identificador.
   *
   * @param id - Identificador EntityId<'constructor'>.
   * @returns Entidade Constructor ou null se não encontrada.
   */
  async findConstructorById(id: EntityId<'constructor'>): Promise<Constructor | null> {
    try {
      const record = await this.prisma.constructor.findUnique({
        where: { id: id.value }
      });

      if (!record) return null;
      return ParticipantMapper.constructorToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaParticipantRepository.findConstructorById(${id.value})`);
    }
  }

  /**
   * Lista todos os construtores técnicos homologados.
   *
   * @returns Lista de construtores ordenada por nome.
   */
  async findAllConstructors(): Promise<Constructor[]> {
    try {
      const records = await this.prisma.constructor.findMany({
        orderBy: { name: 'asc' }
      });

      return records.map(record => ParticipantMapper.constructorToDomain(record));
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, 'PrismaParticipantRepository.findAllConstructors');
    }
  }

  /**
   * Salva um construtor técnico fabricante de chassi e motor.
   *
   * @param constructor - Entidade Constructor do Domínio.
   * @returns Entidade persistida e recarregada.
   */
  async saveConstructor(constructor: Constructor): Promise<Constructor> {
    try {
      const dto = ParticipantMapper.constructorToPersistence(constructor);

      await this.prisma.constructor.upsert({
        where: { id: dto.id },
        create: {
          id: dto.id,
          slug: dto.slug,
          name: dto.name,
          nationality: dto.nationality,
          chassis: dto.chassis,
          engineManufacturer: dto.engineManufacturer
        },
        update: {
          slug: dto.slug,
          name: dto.name,
          nationality: dto.nationality,
          chassis: dto.chassis,
          engineManufacturer: dto.engineManufacturer
        }
      });

      const persisted = await this.findConstructorById(constructor.id);
      if (!persisted) {
        throw new Error(`Falha ao recuperar o construtor ${constructor.id.value} após salvar.`);
      }

      return persisted;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaParticipantRepository.saveConstructor(${constructor.id.value})`);
    }
  }

  // ==========================================
  // 4. Inscrições de Temporada (SeasonEntry)
  // ==========================================

  /**
   * Localiza uma inscrição de temporada por seu identificador.
   *
   * @param id - Identificador EntityId<'season-entry'>.
   * @returns Entidade SeasonEntry reconstituída ou null se não encontrada.
   *
   * @remarks
   * Executa a busca em `SeasonDriverContract` incluindo a relação com `SeasonEntrant`,
   * permitindo reidratar os relacionamentos de temporada, equipe e construtor.
   */
  async findSeasonEntryById(id: EntityId<'season-entry'>): Promise<SeasonEntry | null> {
    try {
      const contract = await this.prisma.seasonDriverContract.findUnique({
        where: { id: id.value },
        include: { seasonEntrant: true }
      });

      if (!contract) return null;

      const record = this.mapContractToEntryRecord(contract);
      return ParticipantMapper.seasonEntryToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaParticipantRepository.findSeasonEntryById(${id.value})`);
    }
  }

  /**
   * Recupera todas as inscrições oficiais de pilotos de uma temporada.
   *
   * @param seasonId - Identificador EntityId<'season'>.
   * @returns Coleção de SeasonEntry ordenada pelo número atribuído ao carro.
   */
  async findEntriesBySeason(seasonId: EntityId<'season'>): Promise<SeasonEntry[]> {
    try {
      const contracts = await this.prisma.seasonDriverContract.findMany({
        where: {
          seasonEntrant: {
            seasonId: seasonId.value
          }
        },
        include: { seasonEntrant: true },
        orderBy: { assignedNumber: 'asc' }
      });

      return contracts.map(contract => {
        const record = this.mapContractToEntryRecord(contract);
        return ParticipantMapper.seasonEntryToDomain(record);
      });
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaParticipantRepository.findEntriesBySeason(${seasonId.value})`);
    }
  }

  /**
   * Localiza a inscrição formal de um piloto específico em uma temporada.
   *
   * @param driverId - Identificador do piloto.
   * @param seasonId - Identificador da temporada.
   * @returns SeasonEntry correspondente ou null se não inscrito no ano.
   */
  async findEntryByDriverAndSeason(
    driverId: EntityId<'driver'>,
    seasonId: EntityId<'season'>
  ): Promise<SeasonEntry | null> {
    try {
      const contract = await this.prisma.seasonDriverContract.findFirst({
        where: {
          driverId: driverId.value,
          seasonEntrant: {
            seasonId: seasonId.value
          }
        },
        include: { seasonEntrant: true }
      });

      if (!contract) return null;

      const record = this.mapContractToEntryRecord(contract);
      return ParticipantMapper.seasonEntryToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(
        error,
        `PrismaParticipantRepository.findEntryByDriverAndSeason(driver=${driverId.value}, season=${seasonId.value})`
      );
    }
  }

  /**
   * Salva a inscrição de temporada garantindo integridade referencial em transação atômica.
   *
   * @param entry - Entidade SeasonEntry do Domínio.
   * @returns SeasonEntry persistida e recarregada.
   * @throws {EntityNotFoundError} Se a temporada, equipe ou piloto associados não existirem.
   *
   * @remarks
   * Transacionalidade e Consistência:
   * Valida previamente se Season, Team e Driver existem no banco. Se o `SeasonEntrant` da equipe
   * na temporada ainda não existir, cria o registro formal herdando o nome oficial da equipe.
   * Em seguida, realiza o upsert de `SeasonDriverContract`.
   */
  async saveSeasonEntry(entry: SeasonEntry): Promise<SeasonEntry> {
    try {
      const dto = ParticipantMapper.seasonEntryToPersistence(entry);

      await this.prisma.$transaction(async tx => {
        // Validação de integridade referencial: temporada, equipe e piloto devem existir previamente
        const [seasonExists, teamExists, driverExists] = await Promise.all([
          tx.season.count({ where: { id: dto.seasonId } }),
          tx.team.count({ where: { id: dto.teamId } }),
          tx.driver.count({ where: { id: dto.driverId } })
        ]);

        if (seasonExists === 0) {
          throw new EntityNotFoundError(
            `[PrismaParticipantRepository.saveSeasonEntry] Temporada "${dto.seasonId}" inexistente.`
          );
        }
        if (teamExists === 0) {
          throw new EntityNotFoundError(
            `[PrismaParticipantRepository.saveSeasonEntry] Equipe "${dto.teamId}" inexistente.`
          );
        }
        if (driverExists === 0) {
          throw new EntityNotFoundError(
            `[PrismaParticipantRepository.saveSeasonEntry] Piloto "${dto.driverId}" inexistente.`
          );
        }

        // Localiza ou inicializa o SeasonEntrant oficial da equipe na temporada
        let entrant = await tx.seasonEntrant.findFirst({
          where: {
            seasonId: dto.seasonId,
            teamId: dto.teamId
          }
        });

        if (!entrant) {
          const team = await tx.team.findUnique({ where: { id: dto.teamId } });
          entrant = await tx.seasonEntrant.create({
            data: {
              seasonId: dto.seasonId,
              teamId: dto.teamId,
              constructorId: dto.constructorId,
              commercialName: team?.legalName || team?.commonName || `Entrant ${dto.teamId}`
            }
          });
        }

        const roleEnum: DriverRole = dto.role === 'REGULAR' ? 'MAIN_DRIVER' : 'REPLACEMENT';

        await tx.seasonDriverContract.upsert({
          where: { id: dto.id },
          create: {
            id: dto.id,
            seasonEntrantId: entrant.id,
            driverId: dto.driverId,
            assignedNumber: dto.carNumber,
            role: roleEnum
          },
          update: {
            seasonEntrantId: entrant.id,
            driverId: dto.driverId,
            assignedNumber: dto.carNumber,
            role: roleEnum
          }
        });
      });

      const persisted = await this.findSeasonEntryById(entry.id);
      if (!persisted) {
        throw new Error(`Falha ao recuperar a inscrição ${entry.id.value} após salvar.`);
      }

      return persisted;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaParticipantRepository.saveSeasonEntry(${entry.id.value})`);
    }
  }

  /**
   * Converte o registro relacional composto (Contract + Entrant) na projeção achatada
   * esperada pelo `ParticipantMapper.seasonEntryToDomain`.
   *
   * @param contract - Registro de contrato com seasonEntrant incluído via Prisma.
   * @returns Projeção tipada PrismaSeasonEntryRecord.
   */
  private mapContractToEntryRecord(contract: any): PrismaSeasonEntryRecord {
    const entrant = contract.seasonEntrant;
    return {
      id: contract.id,
      seasonId: entrant.seasonId,
      driverId: contract.driverId,
      teamId: entrant.teamId,
      constructorId: entrant.constructorId || entrant.teamId,
      carNumber: contract.assignedNumber,
      role: contract.role === 'MAIN_DRIVER' ? 'REGULAR' : 'SUBSTITUTE',
      startRound: 1,
      endRound: null
    };
  }
}
