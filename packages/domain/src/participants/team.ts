/**
 * ============================================================================
 * F1Atlas — Camada Domain | Participants: Team
 * ============================================================================
 *
 * Identificação:
 * - Componente: Team (Equipe Comercial / Entrante de Temporada)
 * - Módulo: Participants
 * - Papel Arquitetural: Entidade de Domínio (Entity)
 *
 * Responsabilidade:
 * - Representar a organização operacional e comercial que inscreve carros em uma temporada
 *   específica de Fórmula 1 (ex.: "Scuderia Ferrari HP", "Oracle Red Bull Racing",
 *   "Mercedes-AMG PETRONAS F1 Team").
 * - Diferenciar a equipe comercial do `Constructor` (o fabricante do chassi/motor).
 *   Na F1, nomes de equipes mudam frequentemente devido a patrocinadores titulares
 *   (title sponsors), enquanto a linhagem técnica do construtor permanece estável.
 *
 * Relacionamentos:
 * - Possui um `TeamId` único.
 * - Associa-se ao `Constructor` técnico responsável pelo chassi daquele período.
 * - Participa de temporadas através de instâncias de `SeasonEntry`.
 * - Referenciada nas inscrições de sessão (`SessionEntry`) e resultados (`SessionResult`).
 * - Não deve ser confundida com a identidade histórica duradoura do construtor.
 *
 * Comportamento Esperado:
 * - Manter o nome comercial oficial registrado na FIA para o período.
 * - Fornecer a base operacional e país sob o qual a licença de competidor foi emitida.
 * - Controlar a vigência temporal de suas inscrições comerciais.
 *
 * Restrições e Invariantes:
 * - O nome oficial da equipe não pode ser vazio.
 * - Toda equipe em competição deve estar associada a pelo menos um `Constructor` válido.
 *
 * Decisões Pendentes:
 * - Avaliar se a entidade `Team` deve ser modelada como uma entidade efêmera por temporada
 *   ou se deve manter uma árvore de linhagem histórica (ex.: linhagem Jordan -> Midland -> Spyker -> Force India -> Racing Point -> Aston Martin).
 *   A separação explícita entre Team (comercial) e Constructor (técnico) resolve a maior parte dessa complexidade.
 *
 * ============================================================================
 */

/**
 * Operação prevista: createTeam
 *
 * Objetivo:
 * Instanciar uma equipe comercial vinculada a um construtor técnico e país de licença.
 *
 * Motivação:
 * Representar fielmente os competidores oficiais conforme as listas de inscritos da FIA.
 *
 * Entradas previstas:
 * - id: TeamId.
 * - officialName: nome comercial completo registrado (ex.: "Scuderia Ferrari HP").
 * - constructorId: ConstructorId do fabricante do chassi.
 * - country: país da licença desportiva de competidor.
 *
 * Saída esperada:
 * - Result<Team, DomainError>.
 *
 * Regras:
 * - O nome oficial deve ser válido e não vazio.
 * - O constructorId é obrigatório.
 *
 * Invariantes:
 * - O vínculo com o construtor é estabelecido na criação.
 *
 * Validação futura:
 * - Criação com parâmetros válidos retorna instância com propriedades esperadas.
 * - Criação sem constructorId retorna erro de integridade referencial.
 *
 * Implementação:
 * A operação deverá ser escrita imediatamente abaixo deste comentário
 * durante a etapa de desenvolvimento.
 */
