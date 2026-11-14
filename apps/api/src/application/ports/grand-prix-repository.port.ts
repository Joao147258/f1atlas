/**
 * @fileoverview Porta de Repositório de Eventos, Sessões e Resultados — F1Atlas
 *
 * Define o contrato puro da aplicação para operações de persistência e consulta
 * da raiz de agregado GrandPrix, Circuitos (Circuit), Sessões de pista (Session)
 * e Resultados oficiais homologados (SessionResult).
 *
 * @module apps/api/src/application/ports/grand-prix-repository.port
 */

import type {
  GrandPrix,
  Circuit,
  Session,
  SessionResult,
  EntityId
} from '@f1atlas/domain';

/**
 * Contrato abstrato (Port) para operações de persistência de Fins de Semana e Resultados.
 */
export interface IGrandPrixRepository {
  // ==========================================
  // 1. Circuitos / Autódromos (Circuit)
  // ==========================================

  /**
   * Localiza um autódromo pelo seu identificador durável.
   */
  findCircuitById(id: EntityId<'circuit'>): Promise<Circuit | null>;

  /**
   * Lista todos os circuitos cadastrados no sistema.
   */
  findAllCircuits(): Promise<Circuit[]>;

  /**
   * Salva a entidade Circuit.
   */
  saveCircuit(circuit: Circuit): Promise<Circuit>;

  // ==========================================
  // 2. Grandes Prêmios (GrandPrix - Raiz de Agregado)
  // ==========================================

  /**
   * Localiza um Grande Prêmio pelo seu identificador durável.
   */
  findById(id: EntityId<'grand-prix'>): Promise<GrandPrix | null>;

  /**
   * Localiza um Grande Prêmio pela temporada e número de rodada oficial.
   */
  findBySeasonAndRound(seasonId: EntityId<'season'>, roundNumber: number): Promise<GrandPrix | null>;

  /**
   * Lista todos os Grandes Prêmios de uma temporada completa.
   */
  findBySeason(seasonId: EntityId<'season'>): Promise<GrandPrix[]>;

  /**
   * Salva a raiz de agregado GrandPrix.
   */
  save(grandPrix: GrandPrix): Promise<GrandPrix>;

  // ==========================================
  // 3. Sessões e Resultados (Session & SessionResult)
  // ==========================================

  /**
   * Localiza uma sessão específica pelo seu identificador.
   */
  findSessionById(id: EntityId<'session'>): Promise<Session | null>;

  /**
   * Recupera todas as sessões pertencentes a um Grande Prêmio.
   */
  findSessionsByGrandPrix(grandPrixId: EntityId<'grand-prix'>): Promise<Session[]>;

  /**
   * Salva uma sessão cronometrada de pista.
   */
  saveSession(session: Session): Promise<Session>;

  /**
   * Recupera os resultados apurados e homologados de uma sessão específica.
   */
  findResultsBySession(sessionId: EntityId<'session'>): Promise<SessionResult[]>;

  /**
   * Salva em lote os resultados de uma sessão de pista garantindo atomicidade.
   *
   * Requisito Não Funcional de Persistência / Transacionalidade:
   * O adaptador de persistência concreto deve executar a gravação de todos os resultados
   * dentro de uma transação atômica (ex.: Prisma `$transaction`). Caso qualquer inserção
   * ou atualização individual falhe, todas as alterações devem sofrer rollback automático,
   * impedindo que a sessão permaneça em estado parcialmente gravado ou inconsistente.
   *
   * @param results Coleção imutável de resultados apurados da sessão.
   */
  saveResults(results: readonly SessionResult[]): Promise<void>;
}
