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
 * - Possui um `TeamId` único (`EntityId<'team'>`).
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
 * - O identificador deve ser um EntityId<'team'> válido.
 * - A razão social (legalName) e a denominação comercial (commercialName) são obrigatórias e não vazias.
 * - A nacionalidade de filiação desportiva é obrigatória e não vazia.
 *
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';

/**
 * Propriedades para criação da entidade Team.
 */
export interface CreateTeamProps {
  readonly id: EntityId<'team'>;
  readonly legalName: string;
  readonly commercialName: string;
  readonly nationality: string;
  readonly baseLocation?: string | null;
  readonly foundedYear?: number | null;
}

/**
 * Entidade de Domínio representando uma Equipe Comercial / Concorrente (Entrant) na Fórmula 1.
 */
export class Team {
  readonly id: EntityId<'team'>;
  readonly legalName: string;
  readonly commercialName: string;
  readonly nationality: string;
  readonly baseLocation?: string | null;
  readonly foundedYear?: number | null;

  private constructor(props: CreateTeamProps) {
    this.id = props.id;
    this.legalName = props.legalName.trim();
    this.commercialName = props.commercialName.trim();
    this.nationality = props.nationality.trim();
    this.baseLocation = props.baseLocation !== undefined && props.baseLocation !== null ? props.baseLocation.trim() : null;
    this.foundedYear = props.foundedYear !== undefined ? props.foundedYear : null;

    Object.freeze(this);
  }

  /**
   * Compara igualdade de identidade com outro objeto.
   */
  public equals(other: unknown): boolean {
    if (!(other instanceof Team)) {
      return false;
    }
    return this.id.equals(other.id);
  }

  /**
   * Factory para criação e validação rigorosa de instâncias da entidade Team.
   *
   * @param props Propriedades da equipe a ser instanciada.
   * @returns Result contendo a entidade Team ou DomainError caso alguma invariante seja violada.
   */
  public static create(props: CreateTeamProps): Result<Team, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Parâmetros obrigatórios de Team não foram fornecidos.'
        )
      );
    }

    if (!props.id || !(props.id instanceof EntityId)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador da equipe (id) deve ser um EntityId<"team"> válido.'
        )
      );
    }

    if (!props.legalName || typeof props.legalName !== 'string' || props.legalName.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Razão social (legalName) da equipe é obrigatória e não pode ser vazia.'
        )
      );
    }

    if (!props.commercialName || typeof props.commercialName !== 'string' || props.commercialName.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Nome comercial (commercialName) da equipe é obrigatório e não pode ser vazio.'
        )
      );
    }

    if (!props.nationality || typeof props.nationality !== 'string' || props.nationality.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Nacionalidade (nationality) da equipe é obrigatória e não pode ser vazia.'
        )
      );
    }

    if (props.foundedYear !== undefined && props.foundedYear !== null) {
      if (!Number.isInteger(props.foundedYear) || props.foundedYear < 1900 || props.foundedYear > 2100) {
        return Result.fail(
          new DomainError(
            DomainErrorCode.INVALID_ARGUMENT,
            `Ano de fundação da equipe deve ser um número inteiro entre 1900 e 2100. Recebido: ${props.foundedYear}.`,
            { foundedYear: props.foundedYear }
          )
        );
      }
    }

    return Result.ok(new Team(props));
  }
}

/**
 * Função funcional de conveniência para criação da entidade Team.
 */
export function createTeam(props: CreateTeamProps): Result<Team, DomainError> {
  return Team.create(props);
}
