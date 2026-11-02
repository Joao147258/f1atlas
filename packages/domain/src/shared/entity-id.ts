/**
 * ============================================================================
 * F1Atlas — Camada Domain | Shared: EntityId
 * ============================================================================
 *
 * Identificação:
 * - Componente: EntityId
 * - Módulo: Shared
 * - Papel Arquitetural: Value Object / Tipo Base para Identidades de Entidades
 *
 * Responsabilidade:
 * - Representar o conceito de identidade opaca, imutável e fortemente tipada
 *   para entidades de domínio (DriverId, TeamId, SeasonId, GrandPrixId, etc.).
 * - Resolver o problema de "Obsessão por Primitivos" (Primitive Obsession),
 *   impedindo que strings arbitrárias (ex.: UUIDs, slugs ou códigos) sejam
 *   intercambiadas acidentalmente entre conceitos de domínio distintos.
 * - Garantir que duas entidades sejam comparadas por sua identidade durável
 *   no tempo, e não pela igualdade superficial de todos os seus atributos.
 *
 * Relacionamentos:
 * - Utilizado por todas as entidades e agregados do domínio (Driver, Team,
 *   Season, GrandPrix, Session, etc.) como tipo base para seus identificadores.
 * - Fornece métodos de comparação de igualdade estrutural entre identidades.
 * - Não deve conter regras de persistência (ex.: auto-incremento de banco relacional)
 *   nem depender de geradores específicos de infraestrutura.
 *
 * Comportamento Esperado:
 * - Encapsular um valor bruto (string/UUIDv4/slug normalizado) não vazio.
 * - Oferecer validação de formato e integridade no momento da instanciação.
 * - Permitir comparação por valor (`equals(other)`).
 * - Fornecer representação canônica em string para serialização e logs.
 *
 * Restrições e Invariantes:
 * - Imutabilidade estrita: uma vez criada, a identidade nunca muda de valor.
 * - Não nulidade e não vacuidade: o valor encapsulado nunca pode ser nulo,
 *   indefinido ou consistir exclusivamente de espaços em branco.
 * - Independência total de frameworks: zero dependência de NestJS, Prisma ou UUID libs no domínio puro.
 *
 * Decisões Pendentes:
 * - Avaliar se utilizaremos Brand Types do TypeScript (`type DriverId = string & { readonly __brand: unique symbol }`)
 *   ou uma classe concreta Value Object `EntityId<T>`. Brand Types oferecem zero overhead
 *   de runtime, enquanto classes facilitam métodos auxiliares como `.equals()` e validação.
 * - Definir se identificadores de participantes históricos aceitarão tanto UUIDs internos
 *   quanto slugs canônicos imutáveis (ex.: "senna-ayrton", "ferrari-scuderia").
 *
 * ============================================================================
 */

/**
 * Operação prevista: createEntityId
 *
 * Objetivo:
 * Instanciar e validar um identificador de entidade garantindo que seu valor
 * bruto seja uma string válida, não vazia e sanitizada.
 *
 * Motivação:
 * Centralizar a criação e a validação de identidades para impedir que strings
 * corrompidas ou em branco entrem nas raízes de agregação do domínio.
 *
 * Entradas previstas:
 * - rawValue: string representando o identificador bruto.
 *
 * Saída esperada:
 * - Instância de EntityId válida encapsulando o valor.
 * - Falha (DomainError ou Result.fail) se a string for nula, vazia ou inválida.
 *
 * Regras:
 * - Rejeitar strings vazias ou compostas apenas por espaços.
 * - Normalizar espaços extras nas extremidades (trim).
 *
 * Invariantes:
 * - O valor interno resultante é sempre imutável e válido.
 *
 * Validação futura:
 * - Criação com string válida retorna sucesso.
 * - Criação com string vazia ou nula resulta em erro de validação de domínio.
 *
 * Implementação:
 * A operação deverá ser escrita imediatamente abaixo deste comentário
 * durante a etapa de desenvolvimento.
 */

/**
 * Operação prevista: equals
 *
 * Objetivo:
 * Comparar se duas instâncias de identidade representam rigorosamente a mesma entidade.
 *
 * Motivação:
 * O conceito fundamental de Entidade no DDD depende da comparação por identidade
 * e não pelos demais atributos mutáveis do objeto.
 *
 * Entradas previstas:
 * - other: outra instância de EntityId para comparação.
 *
 * Saída esperada:
 * - Booleano indicando se os identificadores encapsulados são idênticos.
 *
 * Regras:
 * - Retornar falso se `other` for nulo, indefinido ou de tipo incompatível.
 * - Comparação sensível a maiúsculas/minúsculas conforme a política da entidade.
 *
 * Validação futura:
 * - Dois EntityIds com o mesmo valor retornam true.
 * - EntityIds com valores diferentes retornam false.
 * - Comparação com valor nulo retorna false sem disparar exceção.
 *
 * Implementação:
 * A operação deverá ser escrita imediatamente abaixo deste comentário
 * durante a etapa de desenvolvimento.
 */

/**
 * Operação prevista: toValue
 *
 * Objetivo:
 * Extrair o valor primitivo subjacente para uso em contratos de serialização,
 * DTOs ou adaptadores de persistência na fronteira do sistema.
 *
 * Motivação:
 * Permitir que adaptadores de infraestrutura (Prisma) e apresentação (API JSON)
 * obtenham a representação em texto puro sem quebrar o encapsulamento interno.
 *
 * Entradas previstas:
 * - Nenhuma (método de instância).
 *
 * Saída esperada:
 * - string primitiva correspondente ao identificador.
 *
 * Invariantes:
 * - A string retornada reflete fielmente o valor validado na instanciação.
 *
 * Validação futura:
 * - O valor retornado é idêntico à string primitiva sanitizada original.
 *
 * Implementação:
 * A operação deverá ser escrita imediatamente abaixo deste comentário
 * durante a etapa de desenvolvimento.
 */
