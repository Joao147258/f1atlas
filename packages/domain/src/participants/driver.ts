/**
 * ============================================================================
 * F1Atlas — Camada Domain | Participants: Driver
 * ============================================================================
 *
 * Identificação:
 * - Componente: Driver
 * - Módulo: Participants
 * - Papel Arquitetural: Entidade de Domínio (Entity)
 *
 * Responsabilidade:
 * - Representar a identidade desportiva durável de um piloto de Fórmula 1 ao longo da história.
 * - Manter os atributos perenes do competidor (nome civil, código de 3 letras da FIA,
 *   nacionalidade, data de nascimento, slug canônico) que transcendem temporadas e equipes.
 * - Evitar acoplar o piloto permanentemente a uma equipe ou número de carro específico:
 *   no automobilismo, pilotos trocam de construtores, mudam de número (ex.: uso do número #1
 *   pelo campeão) e até competem por mais de uma equipe no mesmo ano (ex.: Max Verstappen em 2016).
 *
 * Relacionamentos:
 * - Possui um `DriverId` único e imutável.
 * - Vincula-se a temporadas e equipes através de instâncias de `SeasonEntry`.
 * - Referenciado em `SessionEntry` e `SessionResult` para indicar participação e resultados em pista.
 * - Vinculado aos dados de classificação em `DriverStandings`.
 * - Não deve conter listas de vitórias ou pontos embutidos como estado próprio:
 *   estatísticas são agregações derivadas de resultados, não atributos primitivos da pessoa.
 *
 * Comportamento Esperado:
 * - Fornecer nome de exibição formatado e código FIA de cronometragem (ex.: "VER", "HAM", "SEN").
 * - Permitir atualização supervisionada de dados biográficos cadastrais sem alterar a identidade.
 * - Validar formato do código FIA (exatamente 3 letras maiúsculas).
 *
 * Restrições e Invariantes:
 * - O código FIA deve ser composto por 3 caracteres alfabéticos maiúsculos.
 * - O nome completo e o país de representação desportiva são obrigatórios.
 * - A identidade do piloto é perene: Ayrton Senna na Toleman (1984), Lotus (1985-87),
 *   McLaren (1988-93) e Williams (1994) é a mesma entidade `Driver`.
 *
 * Decisões Pendentes:
 * - Avaliar como modelar pilotos que alteraram sua nacionalidade desportiva oficial
 *   ao longo da carreira ou que possuíam grafias divergentes em registros históricos antigos.
 *
 * ============================================================================
 */

/**
 * Operação prevista: createDriver
 *
 * Objetivo:
 * Instanciar uma entidade de piloto validando seus dados biográficos e código FIA.
 *
 * Motivação:
 * Assegurar integridade cadastral de atletas na base de dados do F1Atlas.
 *
 * Entradas previstas:
 * - id: DriverId válido.
 * - firstName: primeiro nome do piloto.
 * - lastName: sobrenome do piloto.
 * - code: código de 3 letras da FIA (ex.: "HAM").
 * - nationality: nacionalidade de representação desportiva (código ISO 3166-1 alpha-3 ou nome).
 * - birthDate?: data de nascimento.
 *
 * Saída esperada:
 * - Result<Driver, DomainError>.
 *
 * Regras:
 * - O código FIA deve ter exatamente 3 caracteres alfabéticos (A-Z).
 * - O primeiro e o último nome não podem ser vazios.
 *
 * Invariantes:
 * - O DriverId e o código FIA são preservados.
 *
 * Validação futura:
 * - Criação com dados válidos retorna instância correta.
 * - Criação com código de 2 ou 4 letras retorna erro de validação.
 *
 * Implementação:
 * A operação deverá ser escrita imediatamente abaixo deste comentário
 * durante a etapa de desenvolvimento.
 */

/**
 * Operação prevista: getDisplayName
 *
 * Objetivo:
 * Retornar a denominação desportiva oficial para exibição em tabelas e telas.
 *
 * Motivação:
 * Padronizar a apresentação de nomes de pilotos (ex.: "Max Verstappen" ou "M. Verstappen")
 * em diferentes densidades de interface no portal.
 *
 * Entradas previstas:
 * - format?: 'FULL' | 'ABBREVIATED' | 'TELEMETRY' (padrão 'FULL').
 *
 * Saída esperada:
 * - string formatada.
 *
 * Validação futura:
 * - 'FULL' retorna "Ayrton Senna".
 * - 'ABBREVIATED' retorna "A. Senna".
 * - 'TELEMETRY' retorna "SEN".
 *
 * Implementação:
 * A operação deverá ser escrita imediatamente abaixo deste comentário
 * durante a etapa de desenvolvimento.
 */
