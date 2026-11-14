/**
 * ============================================================================
 * F1Atlas — Camada Domain | Ponto de Entrada Canônico
 * ============================================================================
 *
 * Módulo: @f1atlas/domain
 * Papel Arquitetural: Camada de Domínio Puro (Clean Architecture / DDD)
 *
 * Exporta todos os componentes fundamentais do automobilismo do M1:
 * - Shared: DomainError, EntityId, Result
 * - Seasons: Season, SeasonStatus
 * - Participants: Driver, Team, Constructor, SeasonEntry, EntryRole
 * - Events: Circuit, GrandPrix, Session, SessionEntry, SessionResult
 *
 * Princípio Arquitetural:
 * Zero dependências de frameworks (NestJS, Next.js, React), ORMs (Prisma),
 * banco de dados ou transporte HTTP.
 * ============================================================================
 */

export * from './shared/index.ts';
export * from './seasons/index.ts';
export * from './participants/index.ts';
export * from './events/index.ts';
export * from './scoring/index.ts';
export * from './championships/index.ts';
