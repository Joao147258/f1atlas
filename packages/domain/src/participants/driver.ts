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
 * - Possui um `DriverId` único e imutável (`EntityId<'driver'>`).
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
 * - O número permanente de carreira, quando informado, deve estar entre 1 e 99 e não pode ser 17.
 * - O número 1 só é elegível caso o piloto possua a prerrogativa de campeão mundial.
 *
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';

/**
 * Propriedades para criação ou instanciação da entidade Driver.
 */
export interface CreateDriverProps {
  readonly id: EntityId<'driver'>;
  readonly firstName: string;
  readonly lastName: string;
  readonly code: string;
  readonly nationality: string;
  readonly permanentNumber?: number | null;
  readonly isWorldChampion?: boolean;
  readonly birthDate?: string | null;
}

/**
 * Entidade de Domínio representando um Piloto de Fórmula 1.
 */
export class Driver {
  readonly id: EntityId<'driver'>;
  readonly firstName: string;
  readonly lastName: string;
  readonly code: string;
  readonly nationality: string;
  readonly permanentNumber?: number | null;
  readonly isWorldChampion: boolean;
  readonly birthDate?: string | null;

  private constructor(props: CreateDriverProps) {
    this.id = props.id;
    this.firstName = props.firstName.trim();
    this.lastName = props.lastName.trim();
    this.code = props.code.trim();
    this.nationality = props.nationality.trim();
    this.permanentNumber = props.permanentNumber !== undefined ? props.permanentNumber : null;
    this.isWorldChampion = Boolean(props.isWorldChampion);
    this.birthDate = props.birthDate !== undefined ? props.birthDate : null;

    Object.freeze(this);
  }

  /**
   * Nome completo do piloto (primeiro nome + sobrenome).
   */
  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Retorna a denominação desportiva oficial para exibição em tabelas e telas.
   *
   * @param format Formato de exibição: 'FULL' | 'ABBREVIATED' | 'TELEMETRY' (padrão 'FULL').
   * @returns String formatada com o nome do piloto.
   */
  public displayName(format: 'FULL' | 'ABBREVIATED' | 'TELEMETRY' = 'FULL'): string {
    switch (format) {
      case 'ABBREVIATED': {
        const initial = this.firstName.length > 0 ? `${this.firstName.charAt(0)}.` : '';
        return initial ? `${initial} ${this.lastName}` : this.lastName;
      }
      case 'TELEMETRY':
        return this.code;
      case 'FULL':
      default:
        return this.fullName;
    }
  }

  /**
   * Compara igualdade de identidade com outro objeto.
   */
  public equals(other: unknown): boolean {
    if (!(other instanceof Driver)) {
      return false;
    }
    return this.id.equals(other.id);
  }

  /**
   * Factory para criação e validação rigorosa de instâncias da entidade Driver.
   *
   * @param props Propriedades do piloto a ser instanciado.
   * @returns Result contendo a entidade Driver ou DomainError caso alguma invariante seja violada.
   */
  public static create(props: CreateDriverProps): Result<Driver, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Parâmetros obrigatórios de Driver não foram fornecidos.'
        )
      );
    }

    if (!props.id || !(props.id instanceof EntityId)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador do piloto (id) deve ser um EntityId<"driver"> válido.'
        )
      );
    }

    if (!props.firstName || typeof props.firstName !== 'string' || props.firstName.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Primeiro nome (firstName) do piloto é obrigatório e não pode ser vazio.'
        )
      );
    }

    if (!props.lastName || typeof props.lastName !== 'string' || props.lastName.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Sobrenome (lastName) do piloto é obrigatório e não pode ser vazio.'
        )
      );
    }

    if (!props.code || typeof props.code !== 'string') {
      return Result.fail(
        new DomainError(
          'INVALID_DRIVER_CODE',
          'Código de cronometragem do piloto (code) é obrigatório.'
        )
      );
    }

    const trimmedCode = props.code.trim();
    if (!/^[A-Z]{3}$/.test(trimmedCode)) {
      return Result.fail(
        new DomainError(
          'INVALID_DRIVER_CODE',
          `Código do piloto deve conter exatamente 3 letras maiúsculas (ex.: VER, HAM). Recebido: "${props.code}".`,
          { code: props.code }
        )
      );
    }

    if (!props.nationality || typeof props.nationality !== 'string' || props.nationality.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Nacionalidade desportiva (nationality) é obrigatória e não pode ser vazia.'
        )
      );
    }

    if (props.permanentNumber !== undefined && props.permanentNumber !== null) {
      if (!Number.isInteger(props.permanentNumber)) {
        return Result.fail(
          new DomainError(
            'INVALID_PERMANENT_NUMBER',
            'Número permanente de carreira deve ser um número inteiro.',
            { permanentNumber: props.permanentNumber }
          )
        );
      }

      if (props.permanentNumber === 17) {
        return Result.fail(
          new DomainError(
            'RETIRED_PERMANENT_NUMBER',
            'O número 17 foi permanentemente aposentado pela FIA em memória de Jules Bianchi.',
            { permanentNumber: 17 }
          )
        );
      }

      if (props.permanentNumber === 1 && !props.isWorldChampion) {
        return Result.fail(
          new DomainError(
            'UNAUTHORIZED_CHAMPION_NUMBER',
            'O número 1 é restrito exclusivamente a pilotos campeões mundiais vigentes.',
            { permanentNumber: 1 }
          )
        );
      }

      if (props.permanentNumber < 1 || props.permanentNumber > 99) {
        return Result.fail(
          new DomainError(
            'INVALID_PERMANENT_NUMBER',
            `Número permanente deve estar entre 1 e 99. Recebido: ${props.permanentNumber}.`,
            { permanentNumber: props.permanentNumber }
          )
        );
      }
    }

    return Result.ok(new Driver(props));
  }
}

/**
 * Função funcional de conveniência para criação da entidade Driver.
 */
export function createDriver(props: CreateDriverProps): Result<Driver, DomainError> {
  return Driver.create(props);
}
