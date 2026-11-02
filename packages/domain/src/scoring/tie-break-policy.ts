/**
 * ============================================================================
 * F1Atlas — Camada Domain: Documentação Arquitetural e Plano Conceitual
 * ============================================================================
 *
 * Identificação:
 * - Nome do componente: TieBreakPolicy (Política de Desempate de Classificação)
 * - Módulo: scoring
 * - Papel arquitetural previsto: Serviço de Domínio / Política de Regulamento
 *
 * Responsabilidade:
 * - Implementa a regra oficial de desempate da FIA (Countback System) para ordenar
 *   pilotos e construtores que possuam rigorosamente a mesma quantidade de pontos
 *   acumulados no campeonato mundial.
 * - Descreve o procedimento esportivo:
 *   1. Maior número de vitórias (1º lugar em Corridas Principais).
 *   2. Em caso de empate em vitórias, maior número de 2º lugares.
 *   3. Em caso de empate, maior número de 3º lugares, prosseguindo sucessivamente
 *      (4º, 5º... até a última posição classificada).
 *   4. Se persistir a igualdade completa em todas as posições de chegada, o regulamento
 *      da FIA prevê julgamento formal da federação ou consideração de outros critérios.
 *
 * Relacionamentos:
 * - Utilizado por StandingsCalculator para ordenar as tabelas de DriverStandings
 *   e ConstructorStandings.
 * - Consome o histórico ordenado de posições de chegada de cada competidor na temporada.
 * - Responsabilidades que NÃO pertencem a este componente:
 *   - Não computa a soma total de pontos (escopo de PointsCalculator).
 *   - Não armazena tabelas de classificação (escopo de Standings).
 *   - Não define os critérios de desclassificação ou punição (escopo de SessionResult).
 *
 * Comportamento esperado:
 * - Comparação entre dois competidores (função comparadora de ordenação estilo `-1, 0, 1`).
 * - Ordenação completa de uma lista de competidores empatados em pontos.
 * - Suporte a auditoria: capacidade de demonstrar detalhadamente por qual posição
 *   (ex.: "desempatado por 2º lugares: 3 vs 1") o desempate foi concluído.
 *
 * Restrições e Invariantes:
 * - O critério de desempate é puramente esportivo e determinístico.
 * - Resultados de Sprint Races só entram no desempate conforme previsão regulamentar do ano.
 * - Desclassificações (DSQ) não contam como posições de chegada válidas para o countback.
 * - Dependências proibidas: banco de dados, APIs de UI.
 *
 * Decisões pendentes:
 * - Avaliar se o desempate de construtores deve analisar os resultados individuais
 *   dos pilotos de cada construtor ou a melhor posição alcançada pela equipe em cada GP.
 * ============================================================================
 */

/**
 * Compara dois competidores pelo sistema de countback da FIA para desempatar posições no campeonato.
 *
 * @name compareCompetitorsCountback
 * @conceptualSignature `(finishesA: readonly number[], finishesB: readonly number[]): number`
 * @purpose Determinar a ordem de precedência entre dois competidores com a mesma pontuação.
 * @preconditions
 *   - `finishesA` e `finishesB` devem ser listas de posições de chegada oficiais na temporada.
 * @postconditions
 *   - Retorna um número negativo se A tem precedência sobre B (melhor histórico de posições).
 *   - Retorna um número positivo se B tem precedência sobre A.
 *   - Retorna 0 se o empate for absoluto em todas as posições avaliadas.
 * @invariants
 *   - A função é estritamente reflexiva, antissimétrica e transitiva (critério de ordenação estável).
 * @exceptionHandling
 *   - Trata coleções vazias sem lançar exceções, considerando competidor sem corridas como inferior.
 * @justification
 *   - Evita arbitrariedade na ordenação das tabelas de classificação da Fórmula 1.
 */

/**
 * Resolve e ordena uma lista completa de competidores aplicando primeiro os pontos e depois o desempate oficial.
 *
 * @name resolveStandingsOrder
 * @conceptualSignature `<T extends { points: number; finishPositions: readonly number[] }>(competitors: readonly T[]): T[]`
 * @purpose Ordenar deterministicamente a tabela do campeonato em conformidade com o regulamento esportivo.
 * @preconditions
 *   - A lista de competidores deve conter pontos consolidados e posições de chegada válidas.
 * @postconditions
 *   - Retorna novo array com os competidores ordenados do 1º ao último colocado.
 * @invariants
 *   - O competidor na posição 1 tem o maior número de pontos ou venceu o countback.
 * @exceptionHandling
 *   - Nenhuma exceção lançada; listas vazias retornam arrays vazios.
 * @justification
 *   - Núcleo de integridade da classificação de pilotos e construtores do F1Atlas.
 */
