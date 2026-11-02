/**
 * ============================================================================
 * F1Atlas — Camada Domain: Documentação Arquitetural e Plano Conceitual
 * ============================================================================
 *
 * Identificação:
 * - Nome do componente: SessionEntry (Participação na Sessão)
 * - Módulo: events
 * - Papel arquitetural previsto: Entidade de Domínio / Objeto de Associação
 *
 * Responsabilidade:
 * - Representa a inscrição pontual de um piloto com um determinado carro/equipe
 *   para disputar uma sessão específica de pista.
 * - Registra as condições iniciais de participação:
 *   - Posição no grid de largada (gridPosition) para sessões de corrida/sprint.
 *   - Indicador de largada do pit lane (startedFromPitLane).
 *   - Status de participação: CONFIRMED, WITHDRAWN, REPLACED.
 * - Modela a diferenciação crucial entre a inscrição formal na temporada (SeasonEntry)
 *   e a participação efetiva no carro durante aquela sessão (ex.: piloto substituto
 *   que assume o carro no FP1 para cumprir a regra de jovens pilotos da FIA).
 *
 * Relacionamentos:
 * - Vincula uma Session (`sessionId`) a um Driver (`driverId`), Team (`teamId`) e Constructor (`constructorId`).
 * - Aponta opcionalmente para a SeasonEntry correspondente.
 * - É a entrada de referência para o resultado final da sessão (SessionResult).
 * - Responsabilidades que NÃO pertencem a este componente:
 *   - Não armazena o resultado final alcançado (escopo de SessionResult).
 *   - Não armazena o tempo da volta mais rápida nem telemetria.
 *   - Não calcula penalidades de posições de grid (escopo de regras esportivas de stewards).
 *
 * Comportamento esperado:
 * - Atribuição de posição de largada no grid (1 a 20+).
 * - Marcação de início do pit lane caso ocorra quebra de parque fechado ou troca de motor.
 * - Marcação de desistência ou não largada (DNS).
 *
 * Restrições e Invariantes:
 * - Em sessões de corrida, a posição de largada deve ser um número inteiro positivo
 *   ou explicitada como largada do pit lane.
 * - Dois carros não podem largar na mesma posição do grid físico.
 * - Dependências proibidas: banco de dados, DTOs de API web.
 *
 * Decisões pendentes:
 * - Avaliar se penalidades de perda de posições no grid (Grid Penalties) devem ser
 *   armazenadas como histórico de alterações no SessionEntry antes da largada.
 * ============================================================================
 */

/**
 * Cria uma nova entrada de participante para uma sessão cronometrada.
 *
 * @name createSessionEntry
 * @conceptualSignature `(props: { id: EntityId; sessionId: EntityId; driverId: EntityId; teamId: EntityId; constructorId: EntityId; carNumber: number; gridPosition?: number; startedFromPitLane?: boolean }): Result<SessionEntry, DomainError>`
 * @purpose Formalizar a presença e posição inicial de um piloto no início da sessão.
 * @preconditions
 *   - Identificadores válidos de sessão, piloto, equipe e construtor.
 *   - `carNumber` deve ser um inteiro positivo.
 *   - Se `gridPosition` for fornecido, deve ser maior ou igual a 1.
 * @postconditions
 *   - Retorna instância encapsulada de SessionEntry com status CONFIRMED.
 * @invariants
 *   - Se `startedFromPitLane` for verdadeiro, o carro não alinha na caixa do grid.
 * @exceptionHandling
 *   - Retorna DomainError se o número do carro ou posição do grid forem inválidos.
 * @justification
 *   - Necessário para isolar as condições de largada dos resultados consolidados da prova.
 */

/**
 * Atualiza a posição de largada ou define largada a partir do pit lane decorrente de punição técnica.
 *
 * @name updateGridPosition
 * @conceptualSignature `(entry: SessionEntry, newPosition: number | null, startFromPitLane: boolean): Result<SessionEntry, DomainError>`
 * @purpose Refletir penalidades de grid aplicadas pelos comissários antes da volta de apresentação.
 * @preconditions
 *   - Se `startFromPitLane` for falso, `newPosition` deve ser um inteiro válido >= 1.
 * @postconditions
 *   - Retorna uma nova instância imutável de SessionEntry com a nova condição de largada.
 * @invariants
 *   - A identidade do piloto e da sessão permanecem inalteradas.
 * @exceptionHandling
 *   - Retorna DomainError caso ocorra inconsistência nos parâmetros de posicionamento.
 * @justification
 *   - Permite modelar com precisão as movimentações de grid pré-corrida tão frequentes na F1.
 */
