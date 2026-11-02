/**
 * ============================================================================
 * F1Atlas — Camada Domain: Documentação Arquitetural e Plano Conceitual
 * ============================================================================
 *
 * Identificação:
 * - Nome do componente: SessionResult (Resultado da Sessão)
 * - Módulo: events
 * - Papel arquitetural previsto: Entidade de Domínio / Registro de Resultado
 *
 * Responsabilidade:
 * - Representa o desfecho esportivo oficial ou simulado obtido por um participante
 *   em uma sessão de corrida, qualificação ou treino.
 * - Registra métricas de desempenho e classificação:
 *   - Posição final de chegada ou classificação (position: 1 a N).
 *   - Posição classificada numérica vs status de finalização:
 *     FINISHED, DNF (Did Not Finish), DNS (Did Not Start), DSQ (Disqualified), NC (Not Classified).
 *   - Tempo total acumulado da sessão (tempo do vencedor e intervalos/gaps dos demais).
 *   - Número de voltas completadas (lapsCompleted).
 *   - Informações de volta mais rápida (fastestLapTimeMillis, fastestLapRank).
 *   - Estado de homologação: PROVISIONAL, OFFICIAL, REVISED, SIMULATED.
 *
 * Relacionamentos:
 * - Vincula-se a um SessionEntry (`sessionEntryId`) ou Session (`sessionId`) e Driver (`driverId`).
 * - Serve de dado de entrada fundamental para o PointsCalculator e StandingsCalculator.
 * - Conecta-se aos cenários hipotéticos de ChampionshipScenario para testes e simulações.
 * - Responsabilidades que NÃO pertencem a este componente:
 *   - Não define os pontos recebidos por esta posição (escopo de ScoringRuleset).
 *   - Não aplica deduções de pontos por penalidades esportivas da superlicença.
 *   - Não gera conteúdo editorial ou notícias de resumo da corrida.
 *
 * Comportamento esperado:
 * - Homologação de resultado: transição de PROVISIONAL para OFFICIAL após auditoria dos comissários.
 * - Aplicação de revisão/reclassificação: transição para REVISED quando punições pós-corrida
 *   são aplicadas (ex.: acréscimo de 5 segundos por limites de pista ou desclassificação técnica).
 * - Identificação explícita de resultados hipotéticos/simulados para garantir que nunca
 *   sejam mesclados aos dados históricos reais.
 *
 * Restrições e Invariantes:
 * - Se `status` for FINISHED, `position` e `lapsCompleted` devem ser maiores que zero.
 * - Um resultado com status DSQ (desclassificado) perde a posição pontuável no campeonato.
 * - Resultados SIMULATED nunca devem ser marcados como OFFICIAL.
 * - Dependências proibidas: ORMs, drivers de banco, frameworks de UI.
 *
 * Decisões pendentes:
 * - Avaliar se tempos de volta em milissegundos devem ser Value Objects próprios (`LapTime`)
 *   com formatação textual "1:24.123" e aritmética de gaps integrada.
 * ============================================================================
 */

/**
 * Cria um registro oficial ou preliminar de resultado para um participante em uma sessão.
 *
 * @name createSessionResult
 * @conceptualSignature `(props: { id: EntityId; sessionId: EntityId; driverId: EntityId; teamId: EntityId; constructorId: EntityId; position: number | null; lapsCompleted: number; status: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ' | 'NC'; totalTimeMillis?: number; gapMillis?: number; fastestLapTimeMillis?: number; fastestLapRank?: number; publicationState?: 'PROVISIONAL' | 'OFFICIAL' | 'REVISED' | 'SIMULATED' }): Result<SessionResult, DomainError>`
 * @purpose Registrar a chegada, tempo, voltas e classificação de um competidor em uma sessão.
 * @preconditions
 *   - `lapsCompleted` deve ser um inteiro não-negativo (>= 0).
 *   - Se `status` for FINISHED, `position` deve ser um inteiro positivo (>= 1).
 *   - Se `status` for DNS, `lapsCompleted` deve ser 0.
 * @postconditions
 *   - Retorna instância de SessionResult com `publicationState` definido (default: PROVISIONAL).
 * @invariants
 *   - A posição deve ser coerente com o status regulamentar de conclusão da prova.
 * @exceptionHandling
 *   - Retorna DomainError caso haja incoerência entre o status e as voltas completadas ou posição.
 * @justification
 *   - Base factual verificável para apuração de campeonatos, estatísticas e narrativa histórica.
 */

/**
 * Homologa o resultado tornando-o oficial após o encerramento do prazo de recursos dos comissários.
 *
 * @name homologateResult
 * @conceptualSignature `(result: SessionResult): Result<SessionResult, DomainError>`
 * @purpose Tornar o resultado imutável e oficial para efeito de pontuação histórica no campeonato.
 * @preconditions
 *   - O resultado deve estar em estado PROVISIONAL ou REVISED.
 *   - Não pode ser um resultado marcado como SIMULATED.
 * @postconditions
 *   - Retorna nova instância de SessionResult com `publicationState` OFFICIAL.
 * @invariants
 *   - Resultados oficiais não podem retroceder espontaneamente para provisórios sem revisão de comissários.
 * @exceptionHandling
 *   - Retorna DomainError se tentar oficializar um resultado simulado.
 * @justification
 *   - Assegura o respeito à invariante de temporalidade e estado de homologação da FIA.
 */

/**
 * Aplica revisão regulamentar ou desclassificação retroativa decidida pelos comissários esportivos.
 *
 * @name applyStewardsRevision
 * @conceptualSignature `(result: SessionResult, revision: { newPosition: number | null; newStatus?: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ' | 'NC'; penaltyTimeMillis?: number; reason: string }): Result<SessionResult, DomainError>`
 * @purpose Modificar a classificação de um competidor após a checagem técnica ou julgamento de protesto.
 * @preconditions
 *   - O motivo (`reason`) da alteração deve ser especificado para auditoria.
 *   - Se alterado para DSQ, a posição classificada deve ser anulada.
 * @postconditions
 *   - Retorna nova versão de SessionResult com `publicationState` REVISED.
 * @invariants
 *   - O histórico original da prova não é apagado; a alteração é rastreável.
 * @exceptionHandling
 *   - Retorna DomainError se o novo status for inválido ou o motivo não for informado.
 * @justification
 *   - Permite modelar punições históricas reais (ex.: perda de vitórias ou posições pós-corrida).
 */
