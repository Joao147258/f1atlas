/**
 * ============================================================================
 * F1Atlas — Camada Domain | Shared: Result
 * ============================================================================
 *
 * Identificação:
 * - Componente: Result (Either Monad pattern simplificado)
 * - Módulo: Shared
 * - Papel Arquitetural: Padrão de Retorno Explícito para Operações de Domínio
 *
 * Responsabilidade:
 * - Representar o resultado de uma operação que pode ser bem-sucedida (Success)
 *   ou falhar previsivelmente (Failure) sem forçar o uso de exceções (`throw`).
 * - Tornar o tratamento de erros parte explícita da assinatura dos métodos,
 *   obrigando os consumidores a lidar tanto com o caso de sucesso quanto com a falha.
 *
 * Relacionamentos:
 * - Utilizado por factories de entidades, validadores de regras esportivas,
 *   calculadoras de pontuação e casos de uso da aplicação.
 * - Carrega instâncias de `DomainError` em seu canal de erro quando ocorre falha.
 * - Não deve ser confundido com HTTP Responses (RFC 7807) ou DTOs de transporte.
 *
 * Comportamento Esperado:
 * - Prover estado binário: `isSuccess: boolean` e `isFailure: boolean`.
 * - Em caso de sucesso, disponibilizar o valor através de `.getValue()`.
 * - Em caso de falha, disponibilizar o erro através de `.getError()`.
 * - Tentar acessar o valor em um estado de falha deve lançar erro explícito de programação.
 *
 * Restrições e Invariantes:
 * - Um Result nunca pode ser simultaneamente sucesso e falha.
 * - Se for sucesso, o erro deve ser nulo/indefinido; se for falha, o valor deve ser nulo/indefinido.
 * - O objeto Result é completamente imutável.
 *
 * Decisões Pendentes:
 * - Avaliar se implementaremos operadores funcionais como `.map()`, `.flatMap()` e
 *   `.fold()`, ou se manteremos uma interface procedural simples com getters para
 *   reduzir a curva de aprendizado da equipe.
 *
 * ============================================================================
 */

/**
 * Operação prevista: ok
 *
 * Objetivo:
 * Construir uma instância de Result em estado de sucesso contendo o valor retornado.
 *
 * Motivação:
 * Fornecer uma fábrica ergonômica e declarativa para operações bem-sucedidas.
 *
 * Entradas previstas:
 * - value: dado ou entidade resultante da operação (pode ser void/null em comandos).
 *
 * Saída esperada:
 * - Result<T, never> marcado como sucesso.
 *
 * Invariantes:
 * - isSuccess é true, isFailure é false, erro é nulo.
 *
 * Validação futura:
 * - Result.ok(dado) possui isSuccess === true e getValue() retorna o dado.
 *
 * Implementação:
 * A operação deverá ser escrita imediatamente abaixo deste comentário
 * durante a etapa de desenvolvimento.
 */

/**
 * Operação prevista: fail
 *
 * Objetivo:
 * Construir uma instância de Result em estado de falha contendo o erro de domínio correspondente.
 *
 * Motivação:
 * Fornecer uma fábrica padronizada para retorno de falhas previsíveis de negócio.
 *
 * Entradas previstas:
 * - error: instância de DomainError ou erro especializado.
 *
 * Saída esperada:
 * - Result<never, E> marcado como falha.
 *
 * Invariantes:
 * - isSuccess é false, isFailure é true, valor é indefinido.
 *
 * Validação futura:
 * - Result.fail(erro) possui isFailure === true e getError() retorna o erro fornecido.
 * - Chamar getValue() em Result.fail lança exceção alertando acesso indevido.
 *
 * Implementação:
 * A operação deverá ser escrita imediatamente abaixo deste comentário
 * durante a etapa de desenvolvimento.
 */

/**
 * Operação prevista: combine
 *
 * Objetivo:
 * Avaliar uma coleção de Results retornando o primeiro erro encontrado ou
 * sucesso se todos forem válidos.
 *
 * Motivação:
 * Facilitar validação encadeada de múltiplos atributos na criação de agregados complexos.
 *
 * Entradas previstas:
 * - results: array de instâncias de Result.
 *
 * Saída esperada:
 * - Result de sucesso (se todos forem ok) ou o primeiro Result de falha.
 *
 * Validação futura:
 * - Retorna sucesso quando array está vazio ou contém apenas sucessos.
 * - Retorna o primeiro erro quando houver um ou mais fracassos no array.
 *
 * Implementação:
 * A operação deverá ser escrita imediatamente abaixo deste comentário
 * durante a etapa de desenvolvimento.
 */
