/**
 * ============================================================================
 * F1Atlas — Camada Domain: Documentação Arquitetural e Plano Conceitual
 * ============================================================================
 *
 * Identificação:
 * - Nome do componente: Session (Sessão de Pista)
 * - Módulo: events
 * - Papel arquitetural previsto: Entidade de Domínio
 *
 * Responsabilidade:
 * - Representa uma atividade cronometrada oficial em pista durante um fim de semana
 *   de GP, possuindo data/hora marcada, duração regulamentar e finalidade esportiva.
 * - Categoriza o tipo de sessão:
 *   - Treinos Livres: FP1, FP2, FP3
 *   - Qualificação: QUALIFYING, SPRINT_QUALIFYING / SPRINT_SHOOTOUT
 *   - Corridas: SPRINT, RACE
 * - Gerencia o ciclo de vida da sessão: SCHEDULED, LIVE, RED_FLAGGED, COMPLETED, CANCELLED.
 *
 * Relacionamentos:
 * - Pertence a um GrandPrix por meio de `grandPrixId`.
 * - Possui uma coleção de participantes inscritos na sessão (SessionEntry).
 * - Gera os resultados oficiais da sessão (SessionResult).
 * - Responsabilidades que NÃO pertencem a este componente:
 *   - Não define o grid de largada da corrida (grid de largada é derivado da qualificação/penalidades).
 *   - Não calcula pontuação de campeonato (escopo de Scoring).
 *   - Não transmite streams de vídeo ou áudio.
 *
 * Comportamento esperado:
 * - Transição de estados regulamentares da sessão (início, interrupção por bandeira vermelha, conclusão).
 * - Registro de horários UTC de início e término real para cálculo de tempo total decorrido.
 * - Indicação de pontualidade: se a sessão concede pontos oficiais (RACE, SPRINT)
 *   ou se é preparatória (treinos, classificações).
 *
 * Restrições e Invariantes:
 * - O tipo de sessão deve ser um dos valores regulamentares estritos.
 * - A data de término real não pode ser anterior à data de início.
 * - Uma sessão concluída (COMPLETED) torna-se imutável em seus horários e regras.
 * - Isolamento: não deve conter dependências de frameworks, timers de sistema ou websockets.
 *
 * Decisões pendentes:
 * - Avaliar se paralisações por bandeira vermelha que estendem o limite máximo de tempo
 *   da FIA (janela de 3 horas para GPs) devem ser controladas por períodos acumulados.
 * ============================================================================
 */

/**
 * Cria uma nova sessão oficial de pista para um Grande Prêmio.
 *
 * @name createSession
 * @conceptualSignature `(props: { id: EntityId; grandPrixId: EntityId; type: 'FP1' | 'FP2' | 'FP3' | 'QUALIFYING' | 'SPRINT_SHOOTOUT' | 'SPRINT' | 'RACE'; scheduledStartTime: Date; scheduledEndTime?: Date }): Result<Session, DomainError>`
 * @purpose Inicializar uma sessão de pista com horário agendado e tipo regulamentar.
 * @preconditions
 *   - `scheduledStartTime` deve ser uma data válida em UTC.
 *   - `type` deve ser um dos tipos válidos da Fórmula 1.
 * @postconditions
 *   - Retorna instância de Session com status SCHEDULED.
 * @invariants
 *   - O tipo da sessão não pode ser alterado após a criação.
 * @exceptionHandling
 *   - Retorna DomainError caso datas ou tipos sejam inválidos.
 * @justification
 *   - Elemento atômico de competição onde acontecem as disputas esportivas e geração de tempos.
 */

/**
 * Transiciona o estado da sessão para COMPLETED registrando o horário real de encerramento.
 *
 * @name completeSession
 * @conceptualSignature `(session: Session, actualEndTime: Date): Result<Session, DomainError>`
 * @purpose Homologar o encerramento das atividades de pista daquela sessão.
 * @preconditions
 *   - A sessão deve estar atualmente em estado LIVE ou SCHEDULED.
 *   - `actualEndTime` deve ser posterior ou igual ao horário de início.
 * @postconditions
 *   - Retorna nova instância da Session com status COMPLETED.
 * @invariants
 *   - Uma sessão concluída não pode reabrir seu status para LIVE.
 * @exceptionHandling
 *   - Retorna DomainError se o horário for inconsistente ou se a sessão já estiver cancelada.
 * @justification
 *   - Garante que resultados só sejam consolidados após a bandeirada de encerramento oficial.
 */
