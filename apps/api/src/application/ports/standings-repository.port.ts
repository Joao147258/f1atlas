/**
 * @fileoverview Porta de Repositório de Classificações e Campeonatos — F1Atlas
 *
 * Define o contrato puro da aplicação para operações de persistência e consulta
 * das projeções imutáveis do Campeonato Mundial de Pilotos (DriverStandings / WDC)
 * e do Campeonato Mundial de Construtores (ConstructorStandings / WCC).
 *
 * @module apps/api/src/application/ports/standings-repository.port
 */

import type {
  DriverStandings,
  ConstructorStandings,
  EntityId
} from '@f1atlas/domain';

/**
 * Contrato abstrato (Port) para operações de persistência de Classificações de Campeonato.
 */
export interface IStandingsRepository {
  // ==========================================
  // 1. Classificação do Mundial de Pilotos (WDC)
  // ==========================================

  /**
   * Localiza o snapshot da classificação de pilotos de uma temporada e rodada específica.
   */
  findDriverStandingsBySeasonAndRound(
    seasonId: EntityId<'season'>,
    roundNumber: number
  ): Promise<DriverStandings | null>;

  /**
   * Localiza o snapshot mais recente da classificação de pilotos para uma temporada.
   */
  findLatestDriverStandingsBySeason(
    seasonId: EntityId<'season'>
  ): Promise<DriverStandings | null>;

  /**
   * Salva o snapshot imutável da classificação de pilotos.
   */
  saveDriverStandings(standings: DriverStandings): Promise<DriverStandings>;

  // ==========================================
  // 2. Classificação do Mundial de Construtores (WCC)
  // ==========================================

  /**
   * Localiza o snapshot da classificação de construtores de uma temporada e rodada específica.
   */
  findConstructorStandingsBySeasonAndRound(
    seasonId: EntityId<'season'>,
    roundNumber: number
  ): Promise<ConstructorStandings | null>;

  /**
   * Localiza o snapshot mais recente da classificação de construtores para uma temporada.
   */
  findLatestConstructorStandingsBySeason(
    seasonId: EntityId<'season'>
  ): Promise<ConstructorStandings | null>;

  /**
   * Salva o snapshot imutável da classificação de construtores.
   */
  saveConstructorStandings(standings: ConstructorStandings): Promise<ConstructorStandings>;
}
