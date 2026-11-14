/**
 * ============================================================================
 * F1Atlas — Camada Domain | Participants: SeasonEntry
 * ============================================================================
 *
 * Identificação:
 * - Componente: SeasonEntry (Inscrição de Temporada)
 * - Módulo: Participants
 * - Papel Arquitetural: Entidade de Ligação / Agregado de Participação
 *
 * Responsabilidade:
 * - Representar o vínculo temporal oficial e contratual entre um Piloto (Driver),
 *   uma Equipe Competidora (Team), um Construtor (Constructor) e um número de
 *   carro em uma Temporada específica.
 * - Modelar a realidade de que pilotos não competem de forma abstrata, mas sim
 *   inscritos em um time para uma temporada determinada, com períodos de vigência,
 *   substituições por pilotos reservas e eventuais trocas contratuais intra-temporada.
 * - Evitar o acoplamento direto e anacrônico entre a carreira vitalícia de um piloto
 *   e uma única equipe.
 *
 * Relacionamentos:
 * - Conecta-se diretamente a SeasonId (temporada de disputa), DriverId (piloto inscrito),
 *   TeamId (equipe comercial) e ConstructorId (construtor de chassi oficial).
 * - Fornece dados para a composição de SessionEntry nos fins de semana de corrida.
 * - Responsabilidades que NÃO pertencem a este componente:
 *   - Não registra tempos de volta ou voltas completadas (escopo de Session/Result).
 *   - Não armazena dados biográficos imutáveis do piloto (escopo de Driver).
 *   - Não controla pontos de campeonato (escopo de Championships/Standings).
 *
 * Comportamento esperado:
 * - Registro de novas inscrições com validação de número de carro e intervalo de rodadas.
 * - Suporte a papéis de participação (ex.: Piloto Titular vs. Piloto Substituto).
 * - Suporte a janelas de atividade temporal (etapa inicial e etapa final de vigência),
 *   permitindo substituições de pilotos (ex.: estreia no meio do ano).
 * - Operação copy-on-write de encerramento de vigência (deactivateEntry).
 *
 * Restrições e Invariantes:
 * - Número de carro deve estar entre 1 e 99 (exceto o 17, permanentemente aposentado).
 * - A etapa inicial (startRound) deve ser >= 1 (padrão: 1).
 * - A etapa final (endRound), quando informada, deve ser >= startRound.
 * - Instâncias imutáveis e congeladas em runtime via Object.freeze.
 *
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';
import { EntryRole, isValidEntryRole } from './entry-role.ts';

/**
 * Propriedades para criação da entidade SeasonEntry.
 */
export interface CreateSeasonEntryProps {
  readonly id: EntityId<'season-entry'>;
  readonly seasonId: EntityId<'season'>;
  readonly driverId: EntityId<'driver'>;
  readonly teamId: EntityId<'team'>;
  readonly constructorId: EntityId<'constructor'>;
  readonly carNumber: number;
  readonly role: EntryRole;
  readonly startRound?: number;
  readonly endRound?: number;
}

/**
 * Entidade de Domínio representando a Inscrição Oficial de Temporada.
 */
export class SeasonEntry {
  readonly id: EntityId<'season-entry'>;
  readonly seasonId: EntityId<'season'>;
  readonly driverId: EntityId<'driver'>;
  readonly teamId: EntityId<'team'>;
  readonly constructorId: EntityId<'constructor'>;
  readonly carNumber: number;
  readonly role: EntryRole;
  readonly startRound: number;
  readonly endRound?: number;

  private constructor(props: CreateSeasonEntryProps) {
    this.id = props.id;
    this.seasonId = props.seasonId;
    this.driverId = props.driverId;
    this.teamId = props.teamId;
    this.constructorId = props.constructorId;
    this.carNumber = props.carNumber;
    this.role = props.role;
    this.startRound = props.startRound !== undefined ? props.startRound : 1;
    this.endRound = props.endRound;

    Object.freeze(this);
  }

  /**
   * Indica se a inscrição está ativa em caráter aberto (sem etapa final de encerramento).
   */
  public get isActive(): boolean {
    return this.endRound === undefined;
  }

  /**
   * Verifica se a inscrição era válida e vigente em uma rodada específica do campeonato.
   *
   * @param round Número da rodada/etapa a consultar.
   * @returns Verdadeiro se a rodada estiver contida no intervalo [startRound, endRound].
   */
  public isActiveInRound(round: number): boolean {
    if (!Number.isInteger(round) || round < 1) {
      return false;
    }
    if (round < this.startRound) {
      return false;
    }
    if (this.endRound !== undefined && round > this.endRound) {
      return false;
    }
    return true;
  }

  /**
   * Compara igualdade de identidade com outro objeto.
   */
  public equals(other: unknown): boolean {
    if (!(other instanceof SeasonEntry)) {
      return false;
    }
    return this.id.equals(other.id);
  }

  /**
   * Factory para criação e validação rigorosa de instâncias de SeasonEntry.
   *
   * @param props Propriedades da inscrição.
   * @returns Result contendo SeasonEntry ou DomainError caso alguma invariante seja violada.
   */
  public static create(props: CreateSeasonEntryProps): Result<SeasonEntry, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Parâmetros obrigatórios de SeasonEntry não foram fornecidos.'
        )
      );
    }

    if (!props.id || !(props.id instanceof EntityId)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador da inscrição (id) deve ser um EntityId<"season-entry"> válido.'
        )
      );
    }

    if (!props.seasonId || !(props.seasonId instanceof EntityId)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador da temporada (seasonId) deve ser um EntityId<"season"> válido.'
        )
      );
    }

    if (!props.driverId || !(props.driverId instanceof EntityId)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador do piloto (driverId) deve ser um EntityId<"driver"> válido.'
        )
      );
    }

    if (!props.teamId || !(props.teamId instanceof EntityId)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador da equipe (teamId) deve ser um EntityId<"team"> válido.'
        )
      );
    }

    if (!props.constructorId || !(props.constructorId instanceof EntityId)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador do construtor (constructorId) deve ser um EntityId<"constructor"> válido.'
        )
      );
    }

    if (!Number.isInteger(props.carNumber) || props.carNumber < 1 || props.carNumber > 99) {
      return Result.fail(
        new DomainError(
          'INVALID_CAR_NUMBER',
          `Número do carro deve ser um inteiro entre 1 e 99. Recebido: ${props.carNumber}.`,
          { carNumber: props.carNumber }
        )
      );
    }

    if (props.carNumber === 17) {
      return Result.fail(
        new DomainError(
          'RETIRED_PERMANENT_NUMBER',
          'O número 17 foi permanentemente aposentado pela FIA em memória de Jules Bianchi.',
          { carNumber: 17 }
        )
      );
    }

    if (!isValidEntryRole(props.role)) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          `Papel de inscrição desportiva inválido ou desconhecido: "${String(props.role)}".`,
          { role: props.role }
        )
      );
    }

    const startRound = props.startRound !== undefined ? props.startRound : 1;
    if (!Number.isInteger(startRound) || startRound < 1) {
      return Result.fail(
        new DomainError(
          'INVALID_ROUND_RANGE',
          `A etapa inicial (startRound) deve ser um número inteiro positivo maior ou igual a 1. Recebido: ${startRound}.`,
          { startRound }
        )
      );
    }

    if (props.endRound !== undefined && props.endRound !== null) {
      if (!Number.isInteger(props.endRound) || props.endRound < 1) {
        return Result.fail(
          new DomainError(
            'INVALID_ROUND_RANGE',
            `A etapa final (endRound) deve ser um número inteiro positivo maior ou igual a 1. Recebido: ${props.endRound}.`,
            { endRound: props.endRound }
          )
        );
      }

      if (props.endRound < startRound) {
        return Result.fail(
          new DomainError(
            'INVALID_ROUND_RANGE',
            `A etapa final (endRound: ${props.endRound}) não pode ser anterior à etapa inicial (startRound: ${startRound}).`,
            { startRound, endRound: props.endRound }
          )
        );
      }
    }

    return Result.ok(new SeasonEntry({ ...props, startRound }));
  }
}

/**
 * Função funcional de conveniência para criação da entidade SeasonEntry.
 */
export function createSeasonEntry(props: CreateSeasonEntryProps): Result<SeasonEntry, DomainError> {
  return SeasonEntry.create(props);
}

/**
 * Desativa ou encerra a vigência de uma inscrição na temporada após uma substituição ou rescisão.
 * Aplica o padrão copy-on-write, retornando uma nova instância imutável com endRound definido
 * e preservando a instância original inalterada para auditoria histórica.
 *
 * @param entry Instância ativa de SeasonEntry a ser encerrada.
 * @param finalRound Número da etapa final em que a inscrição permaneceu ativa.
 * @returns Result contendo a nova SeasonEntry encerrada ou DomainError em caso de inconsistência temporal.
 */
export function deactivateEntry(
  entry: SeasonEntry,
  finalRound: number
): Result<SeasonEntry, DomainError> {
  if (!entry || !(entry instanceof SeasonEntry)) {
    return Result.fail(
      new DomainError(
        DomainErrorCode.INVALID_ARGUMENT,
        'Inscrição fornecida para desativação deve ser uma instância válida de SeasonEntry.'
      )
    );
  }

  if (!Number.isInteger(finalRound) || finalRound < 1) {
    return Result.fail(
      new DomainError(
        'INVALID_ROUND_RANGE',
        `A etapa de encerramento (finalRound) deve ser um número inteiro positivo maior ou igual a 1. Recebido: ${finalRound}.`,
        { finalRound }
      )
    );
  }

  if (finalRound < entry.startRound) {
    return Result.fail(
      new DomainError(
        'INVALID_ROUND_RANGE',
        `A etapa de encerramento (${finalRound}) não pode ser anterior à etapa inicial da inscrição (${entry.startRound}).`,
        { startRound: entry.startRound, finalRound }
      )
    );
  }

  if (entry.endRound !== undefined) {
    return Result.fail(
      new DomainError(
        'ENTRY_ALREADY_DEACTIVATED',
        `Inscrição já se encontra desativada com etapa final ${entry.endRound}.`,
        { startRound: entry.startRound, endRound: entry.endRound, finalRound }
      )
    );
  }

  return SeasonEntry.create({
    id: entry.id,
    seasonId: entry.seasonId,
    driverId: entry.driverId,
    teamId: entry.teamId,
    constructorId: entry.constructorId,
    carNumber: entry.carNumber,
    role: entry.role,
    startRound: entry.startRound,
    endRound: finalRound
  });
}
