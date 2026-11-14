/**
 * ============================================================================
 * F1Atlas — Camada Domain | Participants: EntryRole
 * ============================================================================
 *
 * Identificação:
 * - Componente: EntryRole
 * - Módulo: Participants
 * - Papel Arquitetural: Enumeração de Domínio / Tipo Semântico
 *
 * Responsabilidade:
 * - Representar formalmente o papel desportivo e contratual de uma inscrição
 *   de piloto em uma temporada oficial da Fórmula 1.
 * - Diferenciar titulares primários com assento contratado de pilotos substitutos
 *   convocados para cobrir ausências temporárias ou definitivas.
 *
 * Invariantes:
 * - O papel é restrito aos valores canônicos `REGULAR` e `SUBSTITUTE`.
 * - Pilotos que atuam exclusivamente em Treinos Livres 1 (FP1) não possuem
 *   inscrição na temporada (`SeasonEntry`), sendo registrados diretamente em `SessionEntry`.
 * ============================================================================
 */

export const EntryRole = {
  /** Piloto titular com assento primário contratado para a disputa do campeonato */
  REGULAR: 'REGULAR',
  /** Piloto substituto convocado para cobrir ausência temporária ou definitiva de um titular */
  SUBSTITUTE: 'SUBSTITUTE'
} as const;

export type EntryRole = (typeof EntryRole)[keyof typeof EntryRole];

/**
 * Type guard para validação em runtime de papéis de inscrição desportiva.
 *
 * @param role Valor a ser avaliado como papel de inscrição.
 * @returns Verdadeiro se o valor for um EntryRole válido.
 */
export function isValidEntryRole(role: unknown): role is EntryRole {
  return role === EntryRole.REGULAR || role === EntryRole.SUBSTITUTE;
}
