/**
 * ============================================================================
 * F1Atlas — Camada Domain: Documentação Arquitetural e Plano Conceitual
 * ============================================================================
 *
 * Identificação:
 * - Nome do componente: GrandPrix (Grande Prêmio)
 * - Módulo: events
 * - Papel arquitetural previsto: Raiz de Agregado (Aggregate Root)
 *
 * Responsabilidade:
 * - Representa a etapa oficial de um campeonato de Fórmula 1 (evento de fim de semana),
 *   como o "Grande Prêmio de Mônaco" ou "Grande Prêmio de São Paulo".
 * - Coordena o conjunto de sessões cronometradas e competitivas que compõem o fim
 *   de semana (Treinos Livres, Classificação, Sprint Shootout/Qualifying, Sprint e Corrida Principal).
 * - Controla o número da rodada (roundNumber) no calendário da temporada, o formato
 *   do evento (Padrão ou Sprint Weekend), o circuito sede e o estado geral do evento.
 *
 * Relacionamentos:
 * - Pertence a uma Season (Temporada) por meio de `seasonId`.
 * - Aponta para um Circuit físico por meio de `circuitId`.
 * - Contém e coordena uma coleção interna de entidades Session.
 * - Responsabilidades que NÃO pertencem a este componente:
 *   - Não executa o cálculo de pontos do campeonato mundial (escopo de Scoring).
 *   - Não armazena tabelas de classificação geral (escopo de Championships).
 *   - Não armazena dados de telemetria segundo a segundo.
 *
 * Comportamento esperado:
 * - Adição e agendamento ordenado de sessões respeitando a sequência cronológica do regulamento.
 * - Validação da unicidade do número da rodada (`roundNumber`) na temporada.
 * - Suporte à transição de status do evento (Agendado, Em Andamento, Concluído, Cancelado).
 * - Identificação explícita do formato do fim de semana (ex.: `STANDARD` vs `SPRINT`).
 *
 * Restrições e Invariantes:
 * - O evento deve possuir pelo menos uma sessão de Corrida (RACE) e uma de Classificação (QUALIFYING).
 * - A data de início do GP deve ser anterior à data de encerramento.
 * - Em finais de semana com formato Sprint, deve haver obrigatoriamente as sessões correspondentes.
 * - Dependências proibidas: ORMs, drivers de banco, bibliotecas de serialização HTTP.
 *
 * Decisões pendentes:
 * - Avaliar se cancelamentos parciais de sessões (ex.: chuva extrema que cancela qualificação
 *   ou treinos livres) devem ser geridos na raiz do GP ou individualmente em cada Session.
 * ============================================================================
 */

/**
 * Cria uma nova raiz de agregado de Grande Prêmio associada a uma temporada e circuito.
 *
 * @name createGrandPrix
 * @conceptualSignature `(props: { id: EntityId; seasonId: EntityId; circuitId: EntityId; name: string; roundNumber: number; format: 'STANDARD' | 'SPRINT'; startDate: Date; endDate: Date }): Result<GrandPrix, DomainError>`
 * @purpose Inicializar um Grande Prêmio como etapa oficial do calendário de uma temporada.
 * @preconditions
 *   - `name` não pode ser vazio.
 *   - `roundNumber` deve ser um inteiro positivo (>= 1).
 *   - `startDate` deve ser anterior ou igual a `endDate`.
 * @postconditions
 *   - Retorna instância encapsulada de GrandPrix com coleção de sessões vazia e status SCHEDULED.
 * @invariants
 *   - A associação à temporada e ao circuito é imutável após a criação.
 * @exceptionHandling
 *   - Retorna DomainError caso datas sejam inconsistentes ou parâmetros inválidos.
 * @justification
 *   - Estrutura necessária para organizar o calendário esportivo e agrupar as sessões cronometradas.
 */

/**
 * Adiciona uma sessão oficial (Treino, Classificação, Sprint ou Corrida) ao fim de semana do GP.
 *
 * @name addSessionToGrandPrix
 * @conceptualSignature `(grandPrix: GrandPrix, session: Session): Result<GrandPrix, DomainError>`
 * @purpose Incorporar uma sessão específica ao cronograma do evento respeitando regras do formato.
 * @preconditions
 *   - A sessão deve pertencer ao intervalo temporal do Grande Prêmio.
 *   - Não deve duplicar uma sessão do mesmo tipo que só é permitida uma vez (ex.: duas corridas principais).
 * @postconditions
 *   - Retorna nova versão do GrandPrix contendo a sessão adicionada.
 * @invariants
 *   - A ordem cronológica das sessões deve ser preservada (ex.: Qualifying antes de Race).
 * @exceptionHandling
 *   - Retorna DomainError caso o horário da sessão esteja fora das datas do GP ou viole a sequência lógica.
 * @justification
 *   - Garante a integridade temporal do evento de acordo com os regulamentos esportivos da FIA.
 */
