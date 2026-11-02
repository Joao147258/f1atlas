/**
 * ============================================================================
 * F1Atlas — Camada Domain: Documentação Arquitetural e Plano Conceitual
 * ============================================================================
 *
 * Identificação:
 * - Nome do componente: SeasonEntry (Inscrição de Temporada)
 * - Módulo: participants
 * - Papel arquitetural previsto: Entidade de Ligação / Agregado de Participação
 *
 * Responsabilidade:
 * - Representa o vínculo temporal oficial e contratual entre um Piloto (Driver),
 *   uma Equipe Competidora (Team), um Construtor (Constructor) e um número de
 *   carro (Permanent/Season Number) em uma Temporada específica.
 * - Modela a realidade de que pilotos não competem de forma abstrata, mas sim
 *   inscritos em um time para uma temporada determinada, com períodos de vigência,
 *   substituições por pilotos reservas e eventuais trocas contratuais intra-temporada.
 * - Evita o acoplamento direto e anacrônico entre a carreira vitalícia de um piloto
 *   e uma única equipe.
 *
 * Relacionamentos:
 * - Conecta-se diretamente a SeasonId (temporada de disputa), DriverId (piloto inscrito),
 *   TeamId (equipe comercial) e ConstructorId (construtor de chassi oficial).
 * - Fornece dados para a composição de SessionEntry nos fins de semana de corrida.
 * - Responsabilidades que NÃO pertencem a este componente:
 *   - Não registra tempos de volta ou voltas completadas (escopo de Session/Result).
 *   - Não armazena dados biográficos imutáveis do piloto (escopo de Driver).
 *   - Não controla pontos de campeonato (escopo de Championships/Standings).
 *
 * Comportamento esperado:
 * - Registro de novas inscrições com validação de número de carro único por equipe/temporada.
 * - Suporte a papéis de participação (ex.: Piloto Titular vs. Piloto Reserva).
 * - Suporte a janelas de atividade temporal (etapa inicial e etapa final de vigência),
 *   permitindo substituições de pilotos (ex.: estreia no meio do ano).
 *
 * Restrições e Invariantes:
 * - Um mesmo número de carro não pode ser utilizado simultaneamente por dois pilotos
 *   titulares na mesma equipe durante o mesmo Grande Prêmio.
 * - Dependência proibida: não deve importar ORMs, decorators de framework, transporte HTTP
 *   ou bibliotecas de persistência.
 * - Isolamento: entidade puramente orientada a regras esportivas e temporais.
 *
 * Decisões pendentes:
 * - Avaliar se trocas de número de carro por pilotos reservas (ex.: números temporários
 *   de teste atribuídos pela FIA) exigem uma entidade separada ou atributos opcionais.
 * - Definir se a inscrição deve ser modelada como raiz de agregado independente
 *   ou como entidade interna de um agregado Season.
 * ============================================================================
 */

/**
 * Cria uma nova inscrição oficial de temporada vinculando piloto, equipe e construtor.
 *
 * @name createSeasonEntry
 * @conceptualSignature `(props: { id: EntityId; seasonId: EntityId; driverId: EntityId; teamId: EntityId; constructorId: EntityId; carNumber: number; role: 'PRIMARY' | 'RESERVE'; startRound?: number; endRound?: number }): Result<SeasonEntry, DomainError>`
 * @purpose Formalizar a entrada de um competidor em uma temporada sob um número e equipe específicos.
 * @preconditions
 *   - Identificadores válidos de temporada, piloto, equipe e construtor.
 *   - Número do carro deve ser positivo (1 a 99, respeitando o número 1 exclusivo do campeão vigente).
 * @postconditions
 *   - Retorna instância encapsulada de SeasonEntry com estado ativo.
 * @invariants
 *   - O número de carro é imutável durante a vigência do contrato dentro daquela temporada.
 * @exceptionHandling
 *   - Retorna DomainError caso o número de carro seja inválido ou o papel do piloto seja desconhecido.
 * @justification
 *   - Necessário para modelar fielmente a temporalidade dos grids da F1 sem corromper históricos passados.
 */

/**
 * Desativa ou encerra a vigência de uma inscrição na temporada após uma substituição ou rescisão.
 *
 * @name deactivateEntry
 * @conceptualSignature `(entry: SeasonEntry, finalRound: number): Result<SeasonEntry, DomainError>`
 * @purpose Marcar o encerramento do vínculo ativo de um piloto em determinada etapa do campeonato.
 * @preconditions
 *   - A inscrição deve estar atualmente ativa.
 *   - O `finalRound` deve ser maior ou igual à etapa inicial de inscrição (`startRound`).
 * @postconditions
 *   - A inscrição é atualizada com `endRound` e seu status passa a inativo para etapas subsequentes.
 * @invariants
 *   - Resultados conquistados em etapas anteriores à desativação permanecem íntegros e inalterados.
 * @exceptionHandling
 *   - Retorna DomainError se o `finalRound` for inconsistente ou anterior ao início da participação.
 * @justification
 *   - Essencial para representar substituições históricas (ex.: lesões, substituições táticas de pilotos).
 */
