/**
 * ============================================================================
 * F1Atlas — Camada Domain | Shared: EntityId
 * ============================================================================
 *
 * Identificação:
 * - Componente: EntityId<TKind>
 * - Módulo: Shared
 * - Papel Arquitetural: Value Object / Identidade Tipada
 * - Estado: Implementado e Validado
 *
 * Responsabilidade:
 * - Representar identificadores de entidades do domínio de maneira imutável,
 *   encapsulada, validada na construção, comparável por valor e semanticamente
 *   diferenciada pelo sistema de tipos (Phantom Type / Nominal Typing).
 * - Combater o anti-padrão "Obsessão por Primitivos" (Primitive Obsession),
 *   impedindo que identificadores de entidades distintas (ex.: DriverId vs
 *   TeamId) sejam intercambiados acidentalmente como strings comuns.
 *
 * Fundamentos Teóricos:
 * - DDD — Value Object: Objeto caracterizado exclusivamente por seu valor,
 *   sem ciclo de vida próprio e com igualdade semântica estrutural.
 * - Invariants: Condições obrigatórias que permanecem verdadeiras durante toda
 *   a vida do objeto (não-vacuidade, ausência de espaços externos, imutabilidade).
 * - Phantom Types / Nominal Typing: Utilização do parâmetro genérico TKind para
 *   transportar informação semântica de categoria estática no TypeScript, com
 *   zero overhead de memória e tempo de execução.
 *
 * Relacionamentos:
 * - Utilizado por entidades e agregados do domínio (Driver, Team, Season, GrandPrix,
 *   Session, etc.) como tipo canônico de identidade.
 * - Utiliza o contrato semântico de erro DomainError (DomainErrorCode.INVALID_ARGUMENT).
 * - Totalmente desacoplado de frameworks web (NestJS), ORMs (Prisma), HTTP e libs externas.
 *
 * ============================================================================
 */

import { DomainError, DomainErrorCode } from './domain-error.ts';

/**
 * Value Object genérico imutável que encapsula a identidade durável de uma entidade.
 *
 * @typeParam TKind Categoria lógica da entidade associada ao identificador (ex.: "driver", "team").
 */
export class EntityId<TKind extends string> {
  /**
   * Phantom brand para diferenciação nominal estática entre categorias no TypeScript.
   * Não ocupa espaço de memória em tempo de execução (type erasure).
   */
  declare private readonly __kind: TKind;

  /**
   * Valor primitivo canônico encapsulado.
   */
  private readonly _value: string;

  /**
   * Construtor privado para restringir instanciação direta e assegurar invariantes.
   * A construção só pode ocorrer através das factories controladas.
   */
  private constructor(value: string) {
    this._value = value;
    Object.freeze(this);
  }

  /**
   * Constrói e valida uma nova identidade tipada imutável.
   *
   * Invariantes validadas:
   * - INV-01: O valor de entrada deve ser uma string em runtime.
   * - INV-02: O valor não pode ser vazio ("").
   * - INV-03: O valor não pode conter apenas espaços em branco.
   * - INV-04: O valor não pode conter espaços nas extremidades (rejeição de espaços externos).
   * - INV-05: A instância é congelada após a criação, garantindo imutabilidade estrita.
   * - INV-08: A representação e capitalização originais são integralmente preservadas.
   *
   * @typeParam TKind Categoria nominal da entidade.
   * @param rawValue String representando o identificador bruto.
   * @returns Instância congelada de EntityId<TKind>.
   * @throws {DomainError} Caso alguma invariante de construção seja violada.
   */
  static from<TKind extends string>(rawValue: string): EntityId<TKind> {
    if (typeof rawValue !== 'string') {
      throw new DomainError(
        DomainErrorCode.INVALID_ARGUMENT,
        'O identificador deve ser uma string válida.'
      );
    }

    if (rawValue.length === 0) {
      throw new DomainError(
        DomainErrorCode.INVALID_ARGUMENT,
        'O identificador não pode ser vazio.'
      );
    }

    if (rawValue.trim().length === 0) {
      throw new DomainError(
        DomainErrorCode.INVALID_ARGUMENT,
        'O identificador não pode conter apenas espaços em branco.'
      );
    }

    if (rawValue !== rawValue.trim()) {
      throw new DomainError(
        DomainErrorCode.INVALID_ARGUMENT,
        'O identificador não pode conter espaços nas extremidades.'
      );
    }

    return new EntityId<TKind>(rawValue);
  }

  /**
   * Fábrica estática alternativa aderente à convenção createEntityId.
   */
  static createEntityId<TKind extends string>(rawValue: string): EntityId<TKind> {
    return EntityId.from<TKind>(rawValue);
  }

  /**
   * Getter que expõe o valor primitivo sanitizado do identificador.
   */
  get value(): string {
    return this._value;
  }

  /**
   * Retorna a representação primitiva do identificador para uso em persistência ou DTOs.
   */
  toValue(): string {
    return this._value;
  }

  /**
   * Retorna a representação textual canônica da identidade.
   */
  toString(): string {
    return this._value;
  }

  /**
   * Compara dois identificadores pelo valor encapsulado (Value Equality).
   *
   * Propriedades matemáticas garantidas:
   * - Reflexividade: a.equals(a) === true.
   * - Simetria: a.equals(b) === b.equals(a).
   * - Transitividade: a.equals(b) && b.equals(c) => a.equals(c).
   *
   * @param other Outro identificador ou valor a ser comparado.
   * @returns true se ambos possuírem o mesmo valor canônico; false se for nulo, indefinido ou diferente.
   */
  equals(other: EntityId<TKind> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof EntityId)) {
      return false;
    }

    return this._value === other._value;
  }
}

/**
 * Factory funcional auxiliar para construção de instâncias de EntityId.
 */
export function createEntityId<TKind extends string>(rawValue: string): EntityId<TKind> {
  return EntityId.from<TKind>(rawValue);
}
