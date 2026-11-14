/**
 * ============================================================================
 * F1Atlas — Camada Domain | Events: Circuit
 * ============================================================================
 *
 * NÍVEL 1 — ESPECIFICAÇÃO ARQUITETURAL DO COMPONENTE
 *
 * Identificação:
 * - Componente: Circuit (Circuito / Autódromo)
 * - Módulo: events
 * - Papel Arquitetural: Entidade de Domínio Autônoma (Autonomous Entity)
 * - Referência Normativa DDS: docs/domain/events.md (Seção 4)
 * - Invariantes Vinculadas: EVT-INV-007, EVT-INV-008
 *
 * Responsabilidade de Domínio:
 * - Representar a praça desportiva física (autódromo permanente, circuito de rua
 *   ou traçado semi-permanente) onde os Grandes Prêmios da Fórmula 1 são sediados.
 * - Manter as características geográficas e dimensionais canônicas da pista: nome oficial,
 *   localidade (cidade e país), extensão métrica do traçado (trackLengthMeters),
 *   contagem de curvas (cornersCount) e fuso horário oficial registrado na base IANA.
 * - Fornecer o cálculo determinístico da distância regulamentar de corrida conforme
 *   o Artigo 5.4 do Regulamento Esportivo da FIA (regra dos 305 km e exceção de Mônaco).
 * - Dissociar ontologicamente a praça desportiva física (Circuito) do evento desportivo
 *   comercial (Grande Prêmio), visto que o mesmo autódromo pode sediar diferentes
 *   etapas históricas (ex.: Silverstone sediando o GP da Grã-Bretanha e o GP dos 70 Anos em 2020).
 *
 * Relacionamentos e Fronteiras:
 * - Referenciado por identidade em `GrandPrix` através de `circuitId: EntityId<'circuit'>`.
 * - Não encapsula banco de dados, bibliotecas de mapas (Leaflet, Mapbox, Google Maps),
 *   ORMs, frameworks de UI ou transporte HTTP.
 * - Não controla o calendário anual de etapas (escopo exclusivo de `Season` e `GrandPrix`).
 * - Não armazena telemetria volta a volta ou resultados de pilotos (escopo de `SessionResult`).
 *
 * Invariantes do Domínio:
 * - [EVT-INV-007]: A extensão da pista deve ser estritamente positiva, dentro de parâmetros
 *   físicos plausíveis de homologação da FIA (2.000m <= trackLengthMeters <= 15.000m).
 *   O número de curvas deve ser maior ou igual a 3.
 * - [EVT-INV-008]: A distância de corrida deve ser apurada como o menor número inteiro de voltas
 *   completas para exceder estritamente 305 km (Math.floor(305000 / trackLengthMeters) + 1),
 *   excetuando-se a regra histórica especial do GP de Mônaco com teto de 260 km
 *   (Math.floor(260000 / trackLengthMeters) + 1).
 *
 * ============================================================================
 * NÍVEL 2 — ORIENTAÇÃO TÉCNICA PARA IMPLEMENTAÇÃO (DEVELOPER & TEST ENGINEER)
 * ============================================================================
 */

import { EntityId } from '../shared/entity-id.ts';
import { DomainError, DomainErrorCode } from '../shared/domain-error.ts';
import { Result } from '../shared/result.ts';

/**
 * Limites regulamentares da FIA para homologação de circuitos de Grau 1.
 */
export const CIRCUIT_CONSTRAINTS = {
  MIN_TRACK_LENGTH_METERS: 2000,
  MAX_TRACK_LENGTH_METERS: 15000,
  MIN_CORNERS_COUNT: 3,
  STANDARD_RACE_DISTANCE_METERS: 305000,
  MONACO_RACE_DISTANCE_METERS: 260000
} as const;

/**
 * Propriedades necessárias para instanciação de um Circuito.
 */
export interface CreateCircuitProps {
  readonly id: EntityId<'circuit'>;
  readonly name: string;
  readonly city: string;
  readonly country: string;
  readonly trackLengthMeters: number;
  readonly cornersCount: number;
  readonly timezone: string;
}

/**
 * Propriedades para atualização de traçado de um Circuito (reforma física).
 */
export interface UpdateTrackConfigurationProps {
  readonly trackLengthMeters: number;
  readonly cornersCount: number;
}

/**
 * Entidade de Domínio representando um Circuito / Autódromo homologado da Fórmula 1.
 */
export class Circuit {
  readonly id: EntityId<'circuit'>;
  readonly name: string;
  readonly city: string;
  readonly country: string;
  readonly trackLengthMeters: number;
  readonly cornersCount: number;
  readonly timezone: string;

  private constructor(props: CreateCircuitProps) {
    this.id = props.id;
    this.name = props.name.trim();
    this.city = props.city.trim();
    this.country = props.country.trim();
    this.trackLengthMeters = props.trackLengthMeters;
    this.cornersCount = props.cornersCount;
    this.timezone = props.timezone.trim();

    Object.freeze(this);
  }

  /**
   * Calcula deterministamente o número mínimo de voltas de corrida necessárias para
   * exceder a distância mínima regulamentar da FIA (Artigo 5.4 do Regulamento Esportivo).
   *
   * @param isMonaco Flag indicativa se o cálculo aplica a exceção regulamentar de Mônaco (260 km).
   * @returns Menor número inteiro de voltas que excede estritamente a distância regulamentar.
   */
  public calculateRaceLaps(isMonaco = false): number {
    const targetDistance = isMonaco
      ? CIRCUIT_CONSTRAINTS.MONACO_RACE_DISTANCE_METERS
      : CIRCUIT_CONSTRAINTS.STANDARD_RACE_DISTANCE_METERS;

    return Math.floor(targetDistance / this.trackLengthMeters) + 1;
  }

  /**
   * Calcula a distância total percorrida em metros em uma corrida completa.
   *
   * @param isMonaco Flag para aplicar a exceção de Mônaco.
   * @returns Distância total em metros da corrida.
   */
  public calculateRaceDistanceMeters(isMonaco = false): number {
    return this.calculateRaceLaps(isMonaco) * this.trackLengthMeters;
  }

  /**
   * Cria uma nova versão imutável do circuito com traçado atualizado (copy-on-write).
   * Modela reformas físicas ou alterações de extensão e curvas no autódromo.
   *
   * @param update Novos parâmetros dimensionais da pista.
   * @returns Result contendo nova instância do Circuito ou DomainError.
   */
  public updateTrackConfiguration(update: UpdateTrackConfigurationProps): Result<Circuit, DomainError> {
    return Circuit.create({
      id: this.id,
      name: this.name,
      city: this.city,
      country: this.country,
      timezone: this.timezone,
      trackLengthMeters: update.trackLengthMeters,
      cornersCount: update.cornersCount
    });
  }

  /**
   * Compara a equivalência entre dois circuitos através de sua identidade tipada.
   */
  public equals(other: unknown): boolean {
    if (!(other instanceof Circuit)) {
      return false;
    }
    return this.id.equals(other.id);
  }

  /**
   * Factory method para criação e validação rigorosa de um Circuito.
   *
   * @param props Propriedades do circuito a validar e construir.
   * @returns Result contendo a instância de Circuit ou DomainError.
   */
  public static create(props: CreateCircuitProps): Result<Circuit, DomainError> {
    if (!props || typeof props !== 'object') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Propriedades de instanciação do Circuito não podem ser nulas ou indefinidas.'
        )
      );
    }

    if (!props.id || typeof props.id.toValue !== 'function') {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Identificador do circuito é obrigatório e deve ser uma instância válida de EntityId<\'circuit\'>.'
        )
      );
    }

    if (typeof props.name !== 'string' || props.name.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Nome oficial do circuito é obrigatório e não pode ser vazio.'
        )
      );
    }

    if (typeof props.city !== 'string' || props.city.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Cidade do circuito é obrigatória e não pode ser vazia.'
        )
      );
    }

    if (typeof props.country !== 'string' || props.country.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'País do circuito é obrigatório e não pode ser vazio.'
        )
      );
    }

    if (typeof props.timezone !== 'string' || props.timezone.trim().length === 0) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVALID_ARGUMENT,
          'Fuso horário do circuito é obrigatório e não pode ser vazio.'
        )
      );
    }

    // Validação da extensão métrica (EVT-INV-007)
    if (
      typeof props.trackLengthMeters !== 'number' ||
      !Number.isFinite(props.trackLengthMeters) ||
      props.trackLengthMeters < CIRCUIT_CONSTRAINTS.MIN_TRACK_LENGTH_METERS ||
      props.trackLengthMeters > CIRCUIT_CONSTRAINTS.MAX_TRACK_LENGTH_METERS
    ) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `Extensão do circuito (${props.trackLengthMeters}m) inválida. Deve estar entre ${CIRCUIT_CONSTRAINTS.MIN_TRACK_LENGTH_METERS}m e ${CIRCUIT_CONSTRAINTS.MAX_TRACK_LENGTH_METERS}m conforme homologação FIA Grau 1 (EVT-INV-007).`,
          { trackLengthMeters: props.trackLengthMeters }
        )
      );
    }

    // Validação da quantidade de curvas (EVT-INV-007)
    if (
      typeof props.cornersCount !== 'number' ||
      !Number.isInteger(props.cornersCount) ||
      props.cornersCount < CIRCUIT_CONSTRAINTS.MIN_CORNERS_COUNT
    ) {
      return Result.fail(
        new DomainError(
          DomainErrorCode.INVARIANT_VIOLATION,
          `Quantidade de curvas (${props.cornersCount}) inválida. Um circuito homologado deve possuir ao menos ${CIRCUIT_CONSTRAINTS.MIN_CORNERS_COUNT} curvas (EVT-INV-007).`,
          { cornersCount: props.cornersCount }
        )
      );
    }

    return Result.ok(new Circuit(props));
  }

  /**
   * Reconstitui um Circuito a partir de persistência sem validações destrutivas.
   */
  public static reconstitute(props: CreateCircuitProps): Result<Circuit, DomainError> {
    return Circuit.create(props);
  }
}

/**
 * Função utilitária factory de conveniência para criação de circuitos.
 */
export function createCircuit(props: CreateCircuitProps): Result<Circuit, DomainError> {
  return Circuit.create(props);
}
