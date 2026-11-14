/**
 * ============================================================================
 * F1Atlas — Camada Domain | Shared: Result
 * ============================================================================
 *
 * Identificação:
 * - Componente: Result<T, E> (Either Monad pattern simplificado)
 * - Módulo: Shared
 * - Papel Arquitetural: Padrão de Retorno Explícito para Operações de Domínio
 * - Estado: Implementado e Validado
 *
 * Responsabilidade:
 * - Representar o resultado de uma operação que pode ser bem-sucedida (Success)
 *   ou falhar previsivelmente (Failure) sem forçar o uso de exceções (`throw`).
 * - Tornar o tratamento de erros parte explícita da assinatura dos métodos,
 *   obrigando os consumidores a lidar tanto com o caso de sucesso quanto com a falha.
 * - Combater o anti-padrão de silenciamento de erros ou retorno ambíguo de null/undefined.
 *
 * Relacionamentos:
 * - Utilizado por factories de entidades, validadores de regras esportivas,
 *   calculadoras de pontuação e casos de uso da aplicação.
 * - Carrega instâncias de `DomainError` em seu canal de erro quando ocorre falha.
 * - Não deve ser confundido com HTTP Responses (RFC 7807) ou DTOs de transporte.
 *
 * Comportamento Implementado:
 * - Prover estado binário: `isSuccess: boolean` e `isFailure: boolean`.
 * - Em caso de sucesso, disponibilizar o valor através de `.getValue()` ou getter `.value`.
 * - Em caso de falha, disponibilizar o erro através de `.getError()` ou getter `.error`.
 * - Tentar acessar o valor em um estado de falha lança erro explícito de programação.
 * - Tentar acessar o erro em um estado de sucesso lança erro explícito de programação.
 *
 * Restrições e Invariantes:
 * - INV-01: Exclusividade de estado (isSuccess !== isFailure).
 * - INV-02: Se for sucesso, o erro é indefinido; se for falha, o valor é indefinido.
 * - INV-03: Result.ok encapsula valor (incluindo falsy: 0, false, "", null, undefined).
 * - INV-04: Result.fail encapsula erro de domínio ou erro especializado.
 * - INV-05: A instância de Result é imutável via Object.freeze(this).
 * - INV-06: getValue()/value lança Error ao acessar em estado de falha.
 * - INV-07: getError()/error lança Error ao acessar em estado de sucesso.
 * - INV-08: Result.combine agrega múltiplos sucessos preservando a ordem original.
 * - INV-09: Result.combine retorna determinística e estritamente a primeira falha encontrada.
 * - INV-10: Result.combine não muta a coleção recebida; freeze é raso no container.
 *
 * ============================================================================
 */

import { DomainError } from './domain-error.ts';

/**
 * Container monádico imutável que representa explicitamente sucesso ou falha previsível.
 *
 * @typeParam T Tipo do valor retornado em caso de sucesso (default: void).
 * @typeParam E Tipo do erro retornado em caso de falha (default: DomainError).
 */
export class Result<T = void, E = DomainError> {
  /**
   * Indica se a operação foi concluída com sucesso.
   */
  readonly isSuccess: boolean;

  /**
   * Indica se a operação resultou em falha esperada.
   */
  readonly isFailure: boolean;

  /**
   * Armazenamento interno e encapsulado do valor de sucesso.
   */
  private readonly _value?: T;

  /**
   * Armazenamento interno e encapsulado do erro de falha.
   */
  private readonly _error?: E;

  /**
   * Construtor privado garantindo instanciação controlada via fábricas estáticas.
   */
  private constructor(isSuccess: boolean, error?: E, value?: T) {
    if (isSuccess && error !== undefined) {
      throw new Error('Um Result bem-sucedido não pode conter erro.');
    }
    if (!isSuccess && error === undefined) {
      throw new Error('Um Result em falha deve conter um erro.');
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this._value = value;
    this._error = error;

    Object.freeze(this);
  }

  /**
   * Operação: ok
   *
   * Objetivo:
   * Construir uma instância de Result em estado de sucesso contendo o valor retornado.
   *
   * Motivação:
   * Fornecer uma fábrica ergonômica e declarativa para operações bem-sucedidas.
   *
   * Entradas:
   * - value: dado ou entidade resultante da operação (opcional, default void).
   *
   * Saída:
   * - Result<T, never> marcado como sucesso (compatível com Result<T, E>).
   */
  public static ok<T = void, E = never>(value?: T): Result<T, E> {
    return new Result<T, E>(true, undefined, value as T);
  }

  /**
   * Operação: fail
   *
   * Objetivo:
   * Construir uma instância de Result em estado de falha contendo o erro correspondente.
   *
   * Motivação:
   * Fornecer uma fábrica padronizada para retorno de falhas previsíveis de negócio.
   *
   * Entradas:
   * - error: instância de DomainError ou erro especializado.
   *
   * Saída:
   * - Result<never, E> marcado como falha (compatível com Result<T, E>).
   */
  public static fail<E, T = never>(error: E): Result<T, E> {
    return new Result<T, E>(false, error, undefined);
  }

  /**
   * Operação: combine
   *
   * Objetivo:
   * Avaliar uma coleção de Results retornando a primeira falha encontrada ou
   * sucesso com a lista de valores agregados se todos forem bem-sucedidos.
   *
   * Motivação:
   * Facilitar validação encadeada de múltiplos atributos na criação de agregados complexos.
   *
   * Entradas:
   * - results: array de instâncias de Result.
   *
   * Saída:
   * - Result<T[], E> contendo o array ordenado de valores ou o primeiro erro.
   */
  public static combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];
    for (const result of results) {
      if (result.isFailure) {
        return Result.fail<E, T[]>(result.getError());
      }
      values.push(result.getValue());
    }
    return Result.ok<T[], E>(values);
  }

  /**
   * Retorna o valor contido em caso de sucesso.
   *
   * @throws {Error} Se invocado em um Result em estado de falha.
   */
  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error('Não é possível obter o valor de um Result em estado de falha.');
    }
    return this._value as T;
  }

  /**
   * Retorna o erro contido em caso de falha.
   *
   * @throws {Error} Se invocado em um Result em estado de sucesso.
   */
  public getError(): E {
    if (this.isSuccess) {
      throw new Error('Não é possível obter o erro de um Result em estado de sucesso.');
    }
    return this._error as E;
  }

  /**
   * Acesso ergonômico em formato getter para o valor de sucesso.
   */
  public get value(): T {
    return this.getValue();
  }

  /**
   * Acesso ergonômico em formato getter para o erro de falha.
   */
  public get error(): E {
    return this.getError();
  }
}
