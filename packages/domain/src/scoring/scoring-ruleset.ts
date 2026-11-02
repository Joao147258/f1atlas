/**
 * ============================================================================
 * F1Atlas — Camada Domain: Documentação Arquitetural e Plano Conceitual
 * ============================================================================
 *
 * Identificação:
 * - Nome do componente: ScoringRuleset (Conjunto de Regras de Pontuação)
 * - Módulo: scoring
 * - Papel arquitetural previsto: Objeto de Valor / Entidade de Configuração de Regras
 *
 * Responsabilidade:
 * - Define a tabela normativa e as condições de pontuação aplicáveis a uma temporada
 *   ou competição específica da Fórmula 1.
 * - Descreve de forma determinística:
 *   - Pontos atribuídos por posição para a Corrida Principal (Grand Prix Race): ex.: 25, 18, 15...
 *   - Pontos atribuídos por posição para Corridas Curtas (Sprint Race): ex.: 8, 7, 6, 5, 4, 3, 2, 1.
 *   - Regra de volta mais rápida (fastest lap bonus point): elegibilidade (top 10) e vigência.
 *     Importante: Na temporada 2025, a FIA aboliu formalmente o ponto extra da volta mais rápida.
 *   - Escalas de pontos para corridas encurtadas por chuva ou bandeira vermelha
 *     (intervalos de distância percorrida: <25%, 25-50%, 50-75%, >75% conforme regulamento pós-Spa 2021).
 *
 * Relacionamentos:
 * - Vincula-se a uma Season por meio de `seasonId` ou identificador de era regulamentar.
 * - É consumido pelo PointsCalculator para apurar pontuações a partir de SessionResult.
 * - Responsabilidades que NÃO pertencem a este componente:
 *   - Não processa resultados nem computa classificações (escopo de PointsCalculator e Standings).
 *   - Não persiste configurações em tabelas SQL ou lê de arquivos JSON diretamente.
 *   - Não aplica julgamentos subjetivos ou discricionários.
 *
 * Comportamento esperado:
 * - Fornecimento de pontos para uma posição de chegada em um tipo de sessão.
 * - Avaliação de elegibilidade para ponto de volta mais rápida com base na posição final.
 * - Obtenção da tabela reduzida quando a corrida não atinge 75% da distância programada.
 *
 * Restrições e Invariantes:
 * - A pontuação deve ser estritamente não-negativa.
 * - Posições mais altas não podem receber menos pontos que posições mais baixas no mesmo evento.
 * - O conjunto de regras é imutável para uma temporada já encerrada.
 * - Não deve codificar regras de 2025 de maneira fixa e universal em código estático;
 *   deve permitir instanciar conjuntos de regras de diferentes eras históricas.
 *
 * Decisões pendentes:
 * - Modelar as quatro faixas percentuais de distância pós-2022 como sub-estruturas
 *   específicas dentro do ruleset ou estratégias polimórficas de cálculo.
 * ============================================================================
 */

/**
 * Cria um conjunto de regras de pontuação parametrizado para uma temporada ou regulamento.
 *
 * @name createScoringRuleset
 * @conceptualSignature `(props: { id: EntityId; seasonId: EntityId; racePoints: readonly number[]; sprintPoints?: readonly number[]; fastestLapBonusPoints: number; fastestLapRequiresTop10: boolean }): Result<ScoringRuleset, DomainError>`
 * @purpose Inicializar a tabela de pontuação com as regras oficiais vigentes no ano em questão.
 * @preconditions
 *   - `racePoints` não pode ser vazio e deve estar em ordem estritamente decrescente para as posições pontuadas.
 *   - `fastestLapBonusPoints` deve ser um inteiro >= 0 (ex.: 0 para 2025 em diante, 1 para 2019-2024).
 * @postconditions
 *   - Retorna instância imutável de ScoringRuleset pronta para uso nos cálculos.
 * @invariants
 *   - Todas as pontuações são determinísticas e livres de efeitos colaterais.
 * @exceptionHandling
 *   - Retorna DomainError caso os arrays de pontos violem a ordem decrescente ou contenham valores negativos.
 * @justification
 *   - Permite ao F1Atlas suportar temporadas de diferentes épocas sem alterar o motor de cálculo.
 */

/**
 * Consulta a pontuação base correspondente à posição final alcançada em um tipo de sessão.
 *
 * @name getPointsForPosition
 * @conceptualSignature `(ruleset: ScoringRuleset, sessionType: 'RACE' | 'SPRINT', position: number, distancePercentage?: number): number`
 * @purpose Obter os pontos oficiais atribuíveis a um piloto ou construtor por seu resultado na pista.
 * @preconditions
 *   - `position` deve ser um número inteiro >= 1.
 *   - Se `distancePercentage` for informado, deve estar entre 0 e 100.
 * @postconditions
 *   - Retorna a quantidade numérica de pontos obtidos (0 se a posição for fora da zona de pontuação).
 * @invariants
 *   - Uma posição fora do intervalo pontuável (ex.: 11º lugar sem volta rápida) sempre retorna 0.
 * @exceptionHandling
 *   - Nenhuma exceção lançada; posições não pontuadas retornam 0 de forma segura.
 * @justification
 *   - Função pura central para alimentar a apuração do campeonato de pilotos e construtores.
 */
