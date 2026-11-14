/**
 * ============================================================================
 * F1Atlas — Camada Domain | Participants: Constructor
 * ============================================================================
 *
 * Identificação:
 * - Componente: Constructor (Construtor Técnico / Fabricante de Chassi)
 * - Módulo: Participants
 * - Papel Arquitetural: Entidade de Domínio (Entity)
 *
 * Responsabilidade:
 * - Representar a entidade técnica que projeta e constrói o chassi e compete pelo
 *   Campeonato Mundial de Construtores (World Constructors' Championship — WCC).
 * - Servir como a âncora histórica oficial de pontuação de marcas na Fórmula 1
 *   (ex.: Ferrari, McLaren, Williams, Red Bull, Mercedes, Lotus, Brabham, Tyrrell).
 * - Na definição do Artigo Regulamentar da FIA, o "Construtor" é a pessoa jurídica
 *   que detém os direitos de propriedade intelectual e responsabilidade do chassi.
 *
 * Relacionamentos:
 * - Possui um `ConstructorId` único e duradouro no tempo (`EntityId<'constructor'>`).
 * - Vincula-se a equipes comerciais (`Team`) que operam o chassi na pista via `SeasonEntry`.
 * - Pontuado diretamente nas classificações de construtores em `ConstructorStandings`.
 * - Não deve ser modificado a cada troca de patrocinador titular.
 *
 * Comportamento Esperado:
 * - Manter o nome técnico canônico da marca (ex.: "Ferrari", "McLaren", "Williams").
 * - Fornecer a nacionalidade histórica do fabricante do chassi.
 * - Servir como chave de agregação de pontos para o campeonato de construtores.
 *
 * Restrições e Invariantes:
 * - O nome canônico do construtor é imutável e obrigatório.
 * - A nacionalidade técnica do fabricante é obrigatória.
 * - O construtor é a única entidade elegível para acumular pontos no campeonato de construtores.
 *
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';

/**
 * Propriedades para criação da entidade Constructor.
 */
export interface CreateConstructorProps {
  readonly id: EntityId<'constructor'>;
  readonly name: string;
  readonly nationality: string;
  readonly chassis?: string | null;
  readonly engineManufacturer?: string | null;
}

/**
 * Entidade de Domínio representando um Construtor Oficial homologado pela FIA.
 */
export class Constructor {
  readonly id: EntityId<'constructor'>;
  readonly name: string;
  readonly nationality: string;
  readonly chassis?: string | null;
  readonly engineManufacturer?: string | null;

  private constructor(props: CreateConstructorProps) {
    this.id = props.id;
    this.name = props.name.trim();
    this.nationality = props.nationality.trim();
    this.chassis = props.chassis !== undefined && props.chassis !== null ? props.chassis.trim() : null;
    this.engineManufacturer =
      props.engineManufacturer !== undefined && props.engineManufacturer !== null
        ? props.engineManufacturer.trim()
        : null;

    Object.freeze(this);
  }

  /**
   * Compara igualdade de identidade com outro objeto.
   */
  public equals(other: unknown): boolean {
    if (!(other instanceof Constructor)) {
      return false;
    }
    return this.id.equals(other.id);
  }

  /**
   * Factory para criação e validação rigorosa de instâncias da entidade Constructor.
   *
   * @param props Propriedades do construtor a ser instanciado.
   * @returns Result contendo a entidade Constructor ou DomainError caso alguma invariante seja violada.
   */
  public static create(props: CreateConstructorProps): Result<Constructor, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Parâmetros obrigatórios de Constructor não foram fornecidos.'
        )
      );
    }

    if (!props.id || !(props.id instanceof EntityId)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador do construtor (id) deve ser um EntityId<"constructor"> válido.'
        )
      );
    }

    if (!props.name || typeof props.name !== 'string' || props.name.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Nome técnico do construtor (name) é obrigatório e não pode ser vazio.'
        )
      );
    }

    if (!props.nationality || typeof props.nationality !== 'string' || props.nationality.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Nacionalidade técnica do construtor (nationality) é obrigatória e não pode ser vazia.'
        )
      );
    }

    return Result.ok(new Constructor(props));
  }
}

/**
 * Função funcional de conveniência para criação da entidade Constructor.
 */
export function createConstructor(props: CreateConstructorProps): Result<Constructor, DomainError> {
  return Constructor.create(props);
}
