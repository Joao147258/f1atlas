/**
 * ============================================================================
 * F1Atlas — Camada Domain | Módulo Scoring (Índice Público)
 * ============================================================================
 *
 * Ponto de entrada canônico do módulo scoring.
 * Exporta entidades normativas, serviços determinísticos de cálculo de pontos
 * e políticas oficiais de desempate regulamentar (Countback da FIA).
 * ============================================================================
 */

export * from './scoring-ruleset.ts';
export * from './points-calculator.ts';
export * from './tie-break-policy.ts';
