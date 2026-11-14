/**
 * @fileoverview Porta de Repositório de Participantes e Inscrições — F1Atlas
 *
 * Define o contrato puro da aplicação para operações de persistência e consulta
 * dos participantes da Fórmula 1: Pilotos (Driver), Equipes (Team), Construtores (Constructor)
 * e Inscrições Anuais (SeasonEntry).
 *
 * Conformidade Arquitetural:
 * - Clean Architecture / Ports: interface pura sem imports de infraestrutura ou banco relacional.
 * - Granularidade: agrupa o módulo de participantes em torno do ciclo de vida esportivo.
 *
 * @module apps/api/src/application/ports/participant-repository.port
 */

import type {
  Driver,
  Team,
  Constructor,
  SeasonEntry,
  EntityId
} from '@f1atlas/domain';

/**
 * Filtros opcionais para consulta de pilotos.
 */
export interface DriverFilterCriteria {
  readonly isActive?: boolean;
  readonly nationality?: string;
  readonly search?: string;
}

/**
 * Contrato abstrato (Port) para operações de persistência do ecossistema de Participantes.
 */
export interface IParticipantRepository {
  // ==========================================
  // 1. Pilotos (Driver)
  // ==========================================

  /**
   * Localiza um piloto por seu identificador tipado.
   */
  findDriverById(id: EntityId<'driver'>): Promise<Driver | null>;

  /**
   * Localiza um piloto por seu código FIA permanente de 3 letras (ex.: "VER", "HAM").
   */
  findDriverByCode(code: string): Promise<Driver | null>;

  /**
   * Localiza um piloto pelo número permanente de carreira (ex.: 44, 16).
   */
  findDriverByPermanentNumber(number: number): Promise<Driver | null>;

  /**
   * Lista pilotos com filtros opcionais de busca.
   */
  findDrivers(criteria?: DriverFilterCriteria): Promise<Driver[]>;

  /**
   * Salva (cria ou atualiza) a entidade durável Driver.
   */
  saveDriver(driver: Driver): Promise<Driver>;

  // ==========================================
  // 2. Equipes Corporativas (Team)
  // ==========================================

  /**
   * Localiza uma equipe por seu identificador durável.
   */
  findTeamById(id: EntityId<'team'>): Promise<Team | null>;

  /**
   * Lista todas as equipes cadastradas.
   */
  findAllTeams(): Promise<Team[]>;

  /**
   * Salva uma equipe comercial/corporativa.
   */
  saveTeam(team: Team): Promise<Team>;

  // ==========================================
  // 3. Construtores Oficiais FIA (Constructor)
  // ==========================================

  /**
   * Localiza um construtor técnico pelo identificador durável.
   */
  findConstructorById(id: EntityId<'constructor'>): Promise<Constructor | null>;

  /**
   * Lista todos os construtores homologados.
   */
  findAllConstructors(): Promise<Constructor[]>;

  /**
   * Salva um construtor técnico.
   */
  saveConstructor(constructor: Constructor): Promise<Constructor>;

  // ==========================================
  // 4. Inscrições de Temporada (SeasonEntry)
  // ==========================================

  /**
   * Localiza uma inscrição anual por seu identificador.
   */
  findSeasonEntryById(id: EntityId<'season-entry'>): Promise<SeasonEntry | null>;

  /**
   * Recupera todas as inscrições oficiais de uma determinada temporada.
   */
  findEntriesBySeason(seasonId: EntityId<'season'>): Promise<SeasonEntry[]>;

  /**
   * Localiza a inscrição de um piloto específico em uma temporada.
   */
  findEntryByDriverAndSeason(
    driverId: EntityId<'driver'>,
    seasonId: EntityId<'season'>
  ): Promise<SeasonEntry | null>;

  /**
   * Salva uma inscrição anual de piloto/equipe/construtor.
   */
  saveSeasonEntry(entry: SeasonEntry): Promise<SeasonEntry>;
}
