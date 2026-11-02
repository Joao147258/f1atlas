/**
 * ============================================================================
 * F1Atlas — Camada Domain | Seasons: SeasonStatus
 * ============================================================================
 *
 * Identificação:
 * - Componente: SeasonStatus
 * - Módulo: Seasons
 * - Papel Arquitetural: Enum de Domínio / Objeto de Valor de Estado
 *
 * Responsabilidade:
 * - Definir o ciclo de vida formal e os estados válidos de uma temporada esportiva.
 * - Diferenciar claramente as fases de planejamento, competição ativa, encerramento
 *   homologado e revisões históricas post-mortem.
 *
 * Estados do Ciclo de Vida:
 * 1. `PLANNED` (Planejada):
 *    - O calendário preliminar e o regulamento foram definidos, mas nenhuma sessão
 *      oficial de pista foi realizada ainda.
 * 2. `IN_PROGRESS` (Em Andamento):
 *    - O campeonato está ativo; etapas estão sendo disputadas e as tabelas de
 *      pontuação acumulam resultados progressivamente.
 * 3. `CONCLUDED` (Concluída):
 *    - A última etapa foi disputada, todos os recursos desportivos foram julgados
 *      e os campeões mundiais foram oficialmente coroados pela FIA.
 * 4. `HISTORICAL_REVISED` (Revisada Historicamente):
 *    - Estado especial para temporadas passadas onde revisões documentais, correções
 *      de registros históricos ou julgamentos retroativos foram integrados com log de auditoria.
 *
 * Relacionamentos:
 * - Propriedade de estado da raiz de agregação `Season`.
 * - Controla a permissão de operações na temporada (ex.: bloquear novas etapas em CONCLUDED).
 * - Não deve ser confundido com status de etapas individuais (`GrandPrixStatus`) nem de sessões.
 *
 * Restrições e Invariantes:
 * - A máquina de estados proíbe transições ilógicas (ex.: transicionar de CONCLUDED para PLANNED).
 * - Temporadas concluídas aceitam apenas transição supervisionada para HISTORICAL_REVISED.
 *
 * Decisões Pendentes:
 * - Avaliar se o estado `SUSPENDED` é necessário para cobrir cenários de interrupção
 *   global de campeonato (ex.: temporada 2020 durante a pandemia).
 *
 * ============================================================================
 */

/**
 * Operação prevista: isValidTransition
 *
 * Objetivo:
 * Validar se a transição entre o status atual e o status pretendido é permitida
 * pela máquina de estados do domínio esportivo.
 *
 * Motivação:
 * Prevenir corrupção de ciclo de vida e garantir integridade histórica das temporadas.
 *
 * Entradas previstas:
 * - currentStatus: SeasonStatus atual.
 * - nextStatus: SeasonStatus alvo da transição.
 *
 * Saída esperada:
 * - boolean indicando se a transição é válida.
 *
 * Regras:
 * - PLANNED -> IN_PROGRESS: Válido.
 * - IN_PROGRESS -> CONCLUDED: Válido.
 * - CONCLUDED -> HISTORICAL_REVISED: Válido.
 * - Qualquer retorno para PLANNED: Inválido.
 *
 * Invariantes:
 * - A máquina de estados é estritamente determinística e unidirecional.
 *
 * Validação futura:
 * - Transição PLANNED para IN_PROGRESS retorna true.
 * - Transição CONCLUDED para IN_PROGRESS retorna false sem revisão explícita.
 *
 * Implementação:
 * A operação deverá ser escrita imediatamente abaixo deste comentário
 * durante a etapa de desenvolvimento.
 */

/**
 * Operação prevista: isLockedForModifications
 *
 * Objetivo:
 * Informar se uma temporada está com seu calendário e inscrições bloqueados para
 * alterações ordinárias de operação.
 *
 * Motivação:
 * Proteger registros históricos consolidados contra mutações acidentais via API.
 *
 * Entradas previstas:
 * - status: SeasonStatus a verificar.
 *
 * Saída esperada:
 * - boolean (true se status for CONCLUDED ou HISTORICAL_REVISED).
 *
 * Validação futura:
 * - Retorna true para CONCLUDED e HISTORICAL_REVISED.
 * - Retorna false para PLANNED e IN_PROGRESS.
 *
 * Implementação:
 * A operação deverá ser escrita imediatamente abaixo deste comentário
 * durante a etapa de desenvolvimento.
 */
