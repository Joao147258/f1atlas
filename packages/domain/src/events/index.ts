/**
 * ============================================================================
 * F1Atlas — Camada Domain | Módulo Events (Índice Público)
 * ============================================================================
 *
 * Ponto de entrada canônico do módulo events.
 * Exporta entidades, tipos, factories e validadores para Circuitos, Grandes Prêmios,
 * Sessões de Pista, Alinhamentos (SessionEntry) e Resultados Factuais (SessionResult).
 * ============================================================================
 */

export * from './circuit.ts';
export * from './grand-prix.ts';
export * from './session.ts';
export * from './session-entry.ts';
export * from './session-result.ts';
export * from './session-participant-validator.ts';
