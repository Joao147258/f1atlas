/**
 * ============================================================================
 * F1Atlas — Pacote de Contratos Públicos (@f1atlas/contracts)
 * ============================================================================
 *
 * Ponto de entrada canônico de exportações públicas do pacote de contratos.
 * Fornece schemas executáveis em runtime (Zod) e seus respectivos tipos estáticos
 * inferidos para intercâmbio tipado entre Backend, Frontend e integrações externas.
 *
 * Princípios Arquiteturais:
 * - Independência total da camada de domínio (zero import de packages/domain).
 * - Agnóstico à infraestrutura (zero dependência de ORMs, bancos ou frameworks web).
 * - Imutabilidade e validação estrita na fronteira do sistema.
 * ============================================================================
 */

// Shared
export * from './shared/api-error.contract.ts';
export * from './shared/pagination.contract.ts';

// Drivers
export * from './drivers/driver-response.contract.ts';
export * from './drivers/list-drivers-query.contract.ts';

// Teams & Constructors
export * from './teams/team-response.contract.ts';
export * from './teams/constructor-response.contract.ts';

// Seasons
export * from './seasons/season-response.contract.ts';

// Grand Prix
export * from './grand-prix/grand-prix-response.contract.ts';

// Standings
export * from './standings/driver-standing.contract.ts';
export * from './standings/constructor-standing.contract.ts';

// Telemetria e Analytics (preservação do contrato existente)
export * from '../analytics.mjs';
