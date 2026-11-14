/**
 * @fileoverview Porta de Repositório de Temporadas — F1Atlas
 *
 * Define o contrato puro da aplicação para operações de persistência e consulta
 * da raiz de agregado Season.
 *
 * Conformidade Arquitetural:
 * - Clean Architecture / Hexagonal Ports: interface abstrata sem conhecimento de ORMs (Prisma) ou HTTP (NestJS).
 * - Tipagem Estrita: utiliza EntityId<'season'> para identidades nominais.
 * - Retornos Explícitos: métodos retornam entidades de domínio puras ou null caso ausente.
 *
 * @module apps/api/src/application/ports/season-repository.port
 */

import type { Season, EntityId } from '@f1atlas/domain';

/**
 * Contrato abstrato (Port) para operações de persistência de Temporadas.
 */
export interface ISeasonRepository {
  /**
   * Localiza uma temporada por seu identificador durável único.
   *
   * @param id - Identificador tipado EntityId<'season'>.
   * @returns Raiz de agregado Season ou null se não encontrada.
   */
  findById(id: EntityId<'season'>): Promise<Season | null>;

  /**
   * Localiza uma temporada por seu ano de disputa (ano único >= 1950).
   *
   * @param year - Ano do campeonato mundial.
   * @returns Raiz de agregado Season ou null se não encontrada.
   */
  findByYear(year: number): Promise<Season | null>;

  /**
   * Lista todas as temporadas registradas no sistema, ordenadas por ano.
   *
   * @param order - Direção de ordenação temporal ('asc' ou 'desc', padrão 'desc').
   * @returns Lista de raízes de agregado Season.
   */
  findAll(order?: 'asc' | 'desc'): Promise<Season[]>;

  /**
   * Salva (cria ou atualiza) a raiz de agregado Season e seu calendário de etapas.
   *
   * @param season - Raiz de agregado Season do domínio.
   * @returns A entidade persistida e reconstituída.
   */
  save(season: Season): Promise<Season>;

  /**
   * Verifica se uma temporada já existe para o ano informado.
   *
   * @param year - Ano a ser verificado.
   * @returns True se existir, False caso contrário.
   */
  existsByYear(year: number): Promise<boolean>;
}
