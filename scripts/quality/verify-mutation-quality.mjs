#!/usr/bin/env node
/**
 * @fileoverview Verificador de Eficácia de Testes — Mutation Testing — F1Atlas
 *
 * Avalia a capacidade da suíte de testes de detectar defeitos intencionais introduzidos
 * no código de produção da camada Domain (Mutation Testing).
 *
 * Aplica mutadores semânticos controlados em memória e execução isolada:
 * 1. Inversão de operadores condicionais e lógicos.
 * 2. Modificação de retornos e predicados de tipo.
 * 3. Remoção de salvaguardas de imutabilidade (Object.freeze).
 * 4. Alteração de argumentos e cópias defensivas.
 *
 * Threshold Mínimo de Aprovação:
 * - Mutation Score >= 80% para componentes do Domínio.
 *
 * @module scripts/quality/verify-mutation-quality
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT, STATUS, isMain, report } from '../lib/workspace.mjs';

/**
 * Limite mínimo de pontuação de mutação exigido para código crítico.
 * @type {number}
 */
export const DEFAULT_MUTATION_THRESHOLD = 80.0;

/**
 * Catálogo de mutações semânticas controladas para o componente piloto DomainError.
 * Cada mutante possui uma descrição, trecho original (target) e substituição (replacement).
 */
export const DOMAIN_ERROR_MUTANTS = Object.freeze([
  {
    id: 'MUT_01_TYPE_GUARD_INSTANCEOF',
    description: 'Inversão do retorno de instanceof no type guard isDomainError',
    target: 'if (error instanceof DomainError) {\n    return true;\n  }',
    replacement: 'if (error instanceof DomainError) {\n    return false;\n  }'
  },
  {
    id: 'MUT_02_NAME_SUFFIX_CHECK',
    description: 'Alteração de endsWith("Error") para startsWith("Error")',
    target: "candidate.name.endsWith('Error')",
    replacement: "candidate.name.startsWith('Error')"
  },
  {
    id: 'MUT_03_IMMUTABILITY_INSTANCE',
    description: 'Remoção do congelamento de instância (Object.freeze(this))',
    target: 'Object.freeze(this);',
    replacement: '/* Object.freeze(this); */'
  },
  {
    id: 'MUT_04_CONTEXT_SHALLOW_COPY',
    description: 'Remoção da cópia defensiva do contexto (não isola objeto original)',
    target: 'this.context = context ? Object.freeze({ ...context }) : undefined;',
    replacement: 'this.context = context ? Object.freeze(context as any) : undefined;'
  },
  {
    id: 'MUT_05_FACTORY_MESSAGE_CORRUPTION',
    description: 'Corrupção de mensagem retornada pela factory createDomainError',
    target: 'return new DomainError(code, message, context);',
    replacement: "return new DomainError(code, 'MENSAGEM_MUTADA_CORROMPIDA', context);"
  },
  {
    id: 'MUT_06_CODE_TYPE_CHECK',
    description: 'Inversão da verificação de tipo de candidate.code',
    target: "typeof candidate.code === 'string'",
    replacement: "typeof candidate.code !== 'string'"
  },
  {
    id: 'MUT_07_NAME_PRESERVATION',
    description: 'Forçamento de nome estático genérico em vez do nome da subclasse',
    target: "this.name = new.target.name || 'DomainError';",
    replacement: "this.name = 'GenericStaticError';"
  }
]);

/**
 * Catálogo de mutações semânticas controladas para o componente EntityId.
 */
export const ENTITY_ID_MUTANTS = Object.freeze([
  {
    id: 'MUT_EID_01_TYPE_CHECK',
    description: 'Remoção da verificação de tipo string no from',
    target: "if (typeof rawValue !== 'string') {",
    replacement: "if (typeof rawValue === 'string') {"
  },
  {
    id: 'MUT_EID_02_EMPTY_CHECK',
    description: 'Inversão da verificação de identificador vazio',
    target: "if (rawValue.length === 0) {",
    replacement: "if (rawValue.length > 0) {"
  },
  {
    id: 'MUT_EID_03_TRIM_CHECK',
    description: 'Remoção da rejeição de espaços nas extremidades',
    target: "if (rawValue !== rawValue.trim()) {",
    replacement: "if (false && rawValue !== rawValue.trim()) {"
  },
  {
    id: 'MUT_EID_04_IMMUTABILITY_FREEZE',
    description: 'Remoção do congelamento de instância (Object.freeze(this))',
    target: 'Object.freeze(this);',
    replacement: '/* Object.freeze(this); */'
  },
  {
    id: 'MUT_EID_05_EQUALS_ALWAYS_TRUE',
    description: 'Forçamento de retorno sempre true em equals()',
    target: 'return this._value === other._value;',
    replacement: 'return true;'
  },
  {
    id: 'MUT_EID_06_EQUALS_ALWAYS_FALSE',
    description: 'Forçamento de retorno sempre false em equals()',
    target: 'return this._value === other._value;',
    replacement: 'return false;'
  },
  {
    id: 'MUT_EID_07_EQUALS_NULL_CHECK',
    description: 'Inversão do check de null/undefined em equals()',
    target: 'if (other === null || other === undefined) {\n      return false;\n    }',
    replacement: 'if (other === null || other === undefined) {\n      return true;\n    }'
  }
]);

/**
 * Catálogo de mutações semânticas controladas para o componente Result.
 */
export const RESULT_MUTANTS = Object.freeze([
  {
    id: 'MUT_RES_01_SUCCESS_FLAG',
    description: 'Inversão da atribuição de isSuccess',
    target: 'this.isSuccess = isSuccess;',
    replacement: 'this.isSuccess = !isSuccess;'
  },
  {
    id: 'MUT_RES_02_FAILURE_FLAG',
    description: 'Inversão da atribuição de isFailure',
    target: 'this.isFailure = !isSuccess;',
    replacement: 'this.isFailure = isSuccess;'
  },
  {
    id: 'MUT_RES_03_FREEZE',
    description: 'Remoção do congelamento de instância (Object.freeze(this))',
    target: 'Object.freeze(this);',
    replacement: '/* Object.freeze(this); */'
  },
  {
    id: 'MUT_RES_04_GET_VALUE_CHECK',
    description: 'Inversão da verificação de sucesso em getValue()',
    target: 'if (!this.isSuccess) {',
    replacement: 'if (this.isSuccess) {'
  },
  {
    id: 'MUT_RES_05_GET_ERROR_CHECK',
    description: 'Inversão da verificação de sucesso em getError()',
    target: 'if (this.isSuccess) {',
    replacement: 'if (!this.isSuccess) {'
  },
  {
    id: 'MUT_RES_06_COMBINE_FAILURE_DETECTION',
    description: 'Inversão da detecção de falha no loop de combine',
    target: 'if (result.isFailure) {',
    replacement: 'if (!result.isFailure) {'
  },
  {
    id: 'MUT_RES_07_COMBINE_ORDER_PRESERVATION',
    description: 'Inversão da ordem de agregação de valores em combine (unshift em vez de push)',
    target: 'values.push(result.getValue());',
    replacement: 'values.unshift(result.getValue());'
  }
]);

/**
 * Catálogo de mutações semânticas controladas para o componente Session.
 */
export const SESSION_MUTANTS = Object.freeze([
  {
    id: 'MUT_SES_01_START_END_TIME_CHECK',
    description: 'Inversão da verificação de término agendado anterior ao início',
    target: 'if (props.scheduledEndTime.getTime() < props.scheduledStartTime.getTime()) {',
    replacement: 'if (props.scheduledEndTime.getTime() > props.scheduledStartTime.getTime()) {'
  },
  {
    id: 'MUT_SES_02_POINTS_ELIGIBLE',
    description: 'Corrupção da elegibilidade de pontos de corrida e sprint',
    target: 'return this.type === SessionType.RACE || this.type === SessionType.SPRINT;',
    replacement: 'return false;'
  },
  {
    id: 'MUT_SES_03_FREEZE',
    description: 'Remoção do congelamento de instância (Object.freeze(this)) em Session',
    target: 'Object.freeze(this);',
    replacement: '/* Object.freeze(this); */'
  },
  {
    id: 'MUT_SES_04_START_STATE_CHECK',
    description: 'Inversão da verificação de estado SCHEDULED para início de sessão',
    target: 'if (this.status !== SessionStatus.SCHEDULED) {',
    replacement: 'if (this.status === SessionStatus.SCHEDULED) {'
  },
  {
    id: 'MUT_SES_05_COMPLETE_TIME_CHECK',
    description: 'Inversão da verificação de término real anterior ao início real',
    target: 'if (this._actualStartTime !== undefined && actualEndTime.getTime() < this._actualStartTime) {',
    replacement: 'if (this._actualStartTime !== undefined && actualEndTime.getTime() > this._actualStartTime) {'
  },
  {
    id: 'MUT_SES_06_CANCEL_COMPLETED_CHECK',
    description: 'Permissão indevida de cancelamento de sessão concluída',
    target: 'if (this.status === SessionStatus.COMPLETED || this.status === SessionStatus.CANCELLED) {',
    replacement: 'if (false) {'
  },
  {
    id: 'MUT_SES_07_RESUME_STATE_CHECK',
    description: 'Inversão da verificação de estado RED_FLAGGED para retomada',
    target: 'if (this.status !== SessionStatus.RED_FLAGGED) {',
    replacement: 'if (this.status === SessionStatus.RED_FLAGGED) {'
  }
]);

/**
 * Catálogo de mutações semânticas controladas para o componente Season.
 */
export const SEASON_MUTANTS = Object.freeze([
  {
    id: 'MUT_SEA_01_YEAR_CHECK',
    description: 'Inversão da validação de ano mínimo (1950) na criação de temporada',
    target: 'if (props.year < 1950) {',
    replacement: 'if (props.year > 1950) {'
  },
  {
    id: 'MUT_SEA_02_LOCKED_CHECK',
    description: 'Inversão da verificação de bloqueio histórico em scheduleGrandPrix',
    target: 'if (this.isLocked) {',
    replacement: 'if (!this.isLocked) {'
  },
  {
    id: 'MUT_SEA_03_ROUND_NUMBER_CHECK',
    description: 'Permissão indevida de roundNumber inválido ou zero',
    target: 'if (!grandPrix.roundNumber || !Number.isInteger(grandPrix.roundNumber) || grandPrix.roundNumber < 1) {',
    replacement: 'if (false) {'
  },
  {
    id: 'MUT_SEA_04_DUPLICATE_ROUND_CHECK',
    description: 'Remoção da verificação de unicidade de roundNumber',
    target: 'if (existingByRound) {',
    replacement: 'if (false && existingByRound) {'
  },
  {
    id: 'MUT_SEA_05_START_STATUS_CHECK',
    description: 'Inversão da verificação de status PLANNED para início da temporada',
    target: 'if (this.status !== SeasonStatus.PLANNED) {',
    replacement: 'if (this.status === SeasonStatus.PLANNED) {'
  },
  {
    id: 'MUT_SEA_06_START_EMPTY_LIST_CHECK',
    description: 'Inversão da exigência de ao menos 1 etapa para iniciar a temporada',
    target: 'if (this.grandPrixList.length === 0) {',
    replacement: 'if (this.grandPrixList.length > 0) {'
  },
  {
    id: 'MUT_SEA_07_CONCLUDE_STATUS_CHECK',
    description: 'Inversão da verificação de status IN_PROGRESS para conclusão da temporada',
    target: 'if (this.status !== SeasonStatus.IN_PROGRESS) {',
    replacement: 'if (this.status === SeasonStatus.IN_PROGRESS) {'
  }
]);

/**
 * Catálogo de mutações semânticas controladas para a entidade Driver.
 */
export const DRIVER_MUTANTS = Object.freeze([
  {
    id: 'MUT_DRV_01_CODE_REGEX',
    description: 'Alteração do regex de código FIA de 3 letras maiúsculas para 2 letras',
    target: 'if (!/^[A-Z]{3}$/.test(trimmedCode)) {',
    replacement: 'if (!/^[A-Z]{2}$/.test(trimmedCode)) {'
  },
  {
    id: 'MUT_DRV_02_RETIRED_17_CHECK',
    description: 'Inversão da verificação de número permanente 17 aposentado',
    target: 'if (props.permanentNumber === 17) {',
    replacement: 'if (props.permanentNumber === 18) {'
  },
  {
    id: 'MUT_DRV_03_CHAMPION_1_CHECK',
    description: 'Remoção da restrição de uso do número 1 apenas para campeão mundial',
    target: 'if (props.permanentNumber === 1 && !props.isWorldChampion) {',
    replacement: 'if (false && props.permanentNumber === 1) {'
  },
  {
    id: 'MUT_DRV_04_RANGE_CHECK',
    description: 'Flexibilização do intervalo válido de número permanente (permite fora de 1-99)',
    target: 'if (props.permanentNumber < 1 || props.permanentNumber > 99) {',
    replacement: 'if (props.permanentNumber < 0 || props.permanentNumber > 100) {'
  },
  {
    id: 'MUT_DRV_05_FREEZE',
    description: 'Remoção do congelamento de instância (Object.freeze) em Driver',
    target: 'Object.freeze(this);\n  }\n\n  /**\n   * Nome completo do piloto',
    replacement: '/* Object.freeze(this); */\n  }\n\n  /**\n   * Nome completo do piloto'
  }
]);

/**
 * Catálogo de mutações semânticas controladas para a entidade SeasonEntry.
 */
export const SEASON_ENTRY_MUTANTS = Object.freeze([
  {
    id: 'MUT_SNE_01_CAR_17_CHECK',
    description: 'Inversão da checagem do carro número 17 aposentado em SeasonEntry',
    target: 'if (props.carNumber === 17) {',
    replacement: 'if (props.carNumber === 18) {'
  },
  {
    id: 'MUT_SNE_02_CAR_RANGE_CHECK',
    description: 'Remoção da validação de número de carro entre 1 e 99',
    target: 'if (!Number.isInteger(props.carNumber) || props.carNumber < 1 || props.carNumber > 99) {',
    replacement: 'if (false) {'
  },
  {
    id: 'MUT_SNE_03_END_ROUND_CHECK',
    description: 'Inversão da validação de endRound menor que startRound',
    target: 'if (props.endRound < startRound) {',
    replacement: 'if (props.endRound > startRound) {'
  },
  {
    id: 'MUT_SNE_04_DEACTIVATE_ROUND_CHECK',
    description: 'Inversão da validação de finalRound menor que startRound em deactivateEntry',
    target: 'if (finalRound < entry.startRound) {',
    replacement: 'if (finalRound > entry.startRound) {'
  },
  {
    id: 'MUT_SNE_05_DEACTIVATE_ALREADY_CLOSED',
    description: 'Remoção da proteção contra encerramento repetido em deactivateEntry',
    target: 'if (entry.endRound !== undefined) {',
    replacement: 'if (false && entry.endRound !== undefined) {'
  },
  {
    id: 'MUT_SNE_06_FREEZE',
    description: 'Remoção do congelamento de instância (Object.freeze) em SeasonEntry',
    target: 'Object.freeze(this);\n  }\n\n  /**\n   * Indica se a inscrição está ativa',
    replacement: '/* Object.freeze(this); */\n  }\n\n  /**\n   * Indica se a inscrição está ativa'
  }
]);

export const CIRCUIT_MUTANTS = Object.freeze([
  {
    id: 'MUT_CIR_01_CALCULATE_LAPS_FLOOR',
    description: 'Corrupção do cálculo de voltas de corrida (remove o +1 que garante exceder a distância)',
    target: 'return Math.floor(targetDistance / this.trackLengthMeters) + 1;',
    replacement: 'return Math.floor(targetDistance / this.trackLengthMeters);'
  },
  {
    id: 'MUT_CIR_02_MONACO_DISTANCE',
    description: 'Inversão da lógica de distância para Mônaco em calculateRaceLaps',
    target: 'const targetDistance = isMonaco\n      ? CIRCUIT_CONSTRAINTS.MONACO_RACE_DISTANCE_METERS\n      : CIRCUIT_CONSTRAINTS.STANDARD_RACE_DISTANCE_METERS;',
    replacement: 'const targetDistance = !isMonaco\n      ? CIRCUIT_CONSTRAINTS.MONACO_RACE_DISTANCE_METERS\n      : CIRCUIT_CONSTRAINTS.STANDARD_RACE_DISTANCE_METERS;'
  },
  {
    id: 'MUT_CIR_03_MIN_LENGTH_CHECK',
    description: 'Inversão da verificação de extensão mínima do circuito em Circuit.create',
    target: 'props.trackLengthMeters < CIRCUIT_CONSTRAINTS.MIN_TRACK_LENGTH_METERS ||',
    replacement: 'props.trackLengthMeters > CIRCUIT_CONSTRAINTS.MAX_TRACK_LENGTH_METERS ||'
  },
  {
    id: 'MUT_CIR_04_FREEZE',
    description: 'Remoção do congelamento de instância (Object.freeze) em Circuit',
    target: 'Object.freeze(this);\n  }\n\n  /**\n   * Calcula deterministamente',
    replacement: '/* Object.freeze(this); */\n  }\n\n  /**\n   * Calcula deterministamente'
  }
]);

export const GRAND_PRIX_MUTANTS = Object.freeze([
  {
    id: 'MUT_GP_01_START_END_DATE_CHECK',
    description: 'Inversão da validação de datas startDate > endDate em GrandPrix.create',
    target: 'if (props.startDate.getTime() > props.endDate.getTime()) {',
    replacement: 'if (props.startDate.getTime() < props.endDate.getTime()) {'
  },
  {
    id: 'MUT_GP_02_ROUND_NUMBER_CHECK',
    description: 'Inversão da validação de roundNumber positivo em GrandPrix.create',
    target: 'props.roundNumber < 1',
    replacement: 'props.roundNumber > 1'
  },
  {
    id: 'MUT_GP_03_RACE_DUPLICATE_CHECK',
    description: 'Remoção da restrição de corrida única por GP em addSession',
    target: 'if (alreadyHasRace) {',
    replacement: 'if (false && alreadyHasRace) {'
  },
  {
    id: 'MUT_GP_04_FREEZE',
    description: 'Remoção do congelamento de instância (Object.freeze) em GrandPrix',
    target: 'Object.freeze(this);\n  }\n\n  /**\n   * Data de início',
    replacement: '/* Object.freeze(this); */\n  }\n\n  /**\n   * Data de início'
  }
]);

export const SESSION_ENTRY_MUTANTS = Object.freeze([
  {
    id: 'MUT_STE_01_PIT_LANE_CHECK',
    description: 'Remoção da rejeição de gridPosition para largada do pit lane (EVT-INV-009)',
    target: 'if (isPitLane) {\n      if (props.gridPosition !== undefined && props.gridPosition !== null) {',
    replacement: 'if (isPitLane) {\n      if (false) {'
  },
  {
    id: 'MUT_STE_02_CAR_17_CHECK',
    description: 'Remoção do bloqueio regulamentar ao numeral #17 aposentado pela FIA',
    target: 'if (props.carNumber === RETIRED_CAR_NUMBER) {',
    replacement: 'if (false && props.carNumber === RETIRED_CAR_NUMBER) {'
  },
  {
    id: 'MUT_STE_03_FREEZE',
    description: 'Remoção do congelamento de instância (Object.freeze) em SessionEntry',
    target: 'Object.freeze(this);\n  }\n\n  /**\n   * Atualiza as condições de largada',
    replacement: '/* Object.freeze(this); */\n  }\n\n  /**\n   * Atualiza as condições de largada'
  }
]);

export const SESSION_RESULT_MUTANTS = Object.freeze([
  {
    id: 'MUT_STR_01_FINISHED_POS_CHECK',
    description: 'Remoção da exigência de posição válida para competidor FINISHED (EVT-INV-010)',
    target: 'if (props.status === ResultStatus.FINISHED) {\n      if (\n        typeof props.position !== \'number\' ||\n        !Number.isInteger(props.position) ||\n        props.position < 1\n      ) {',
    replacement: 'if (props.status === ResultStatus.FINISHED) {\n      if (false) {'
  },
  {
    id: 'MUT_STR_02_DNS_LAPS_CHECK',
    description: 'Remoção da exigência de zero voltas completadas para status DNS (EVT-INV-011)',
    target: 'if (props.status === ResultStatus.DNS) {\n      if (props.lapsCompleted !== 0) {',
    replacement: 'if (props.status === ResultStatus.DNS) {\n      if (false) {'
  },
  {
    id: 'MUT_STR_03_SIMULATED_HOMOLOGATE',
    description: 'Remoção da proibição de homologar resultado SIMULATED como oficial (EVT-INV-015)',
    target: 'if (this.publicationState === PublicationState.SIMULATED) {',
    replacement: 'if (false && this.publicationState === PublicationState.SIMULATED) {'
  },
  {
    id: 'MUT_STR_04_REVISION_REASON_CHECK',
    description: 'Remoção da exigência de justificativa para revisão dos comissários (EVT-INV-016)',
    target: 'if (typeof revision.reason !== \'string\' || revision.reason.trim().length === 0) {',
    replacement: 'if (false) {'
  },
  {
    id: 'MUT_STR_05_FREEZE',
    description: 'Remoção do congelamento de instância (Object.freeze) em SessionResult',
    target: 'Object.freeze(this);\n  }\n\n  /**\n   * Indica se este competidor',
    replacement: '/* Object.freeze(this); */\n  }\n\n  /**\n   * Indica se este competidor'
  }
]);

export const SCORING_RULESET_MUTANTS = Object.freeze([
  {
    id: 'MUT_SCR_01_FASTEST_LAP_CHECK',
    description: 'Alteração da validação de fastestLapBonusPoints >= 0 para > 0',
    target: 'props.fastestLapBonusPoints < 0',
    replacement: 'props.fastestLapBonusPoints <= 0'
  },
  {
    id: 'MUT_SCR_02_RACE_POINTS_ORDER',
    description: 'Inversão da verificação de ordem decrescente de pontuações',
    target: 'p > points[i - 1]',
    replacement: 'p < points[i - 1]'
  },
  {
    id: 'MUT_SCR_03_FREEZE',
    description: 'Remoção do congelamento de instância (Object.freeze) em ScoringRuleset',
    target: 'Object.freeze(this);\n  }\n\n  /**\n   * Factory method para validação',
    replacement: '/* Object.freeze(this); */\n  }\n\n  /**\n   * Factory method para validação'
  }
]);

export const POINTS_CALCULATOR_MUTANTS = Object.freeze([
  {
    id: 'MUT_PTC_01_DSQ_CHECK',
    description: 'Remoção da anulação de pontos para competidor desclassificado (DSQ)',
    target: 'result.status === ResultStatus.DSQ ||',
    replacement: 'false && result.status === ResultStatus.DSQ ||'
  },
  {
    id: 'MUT_PTC_02_FASTEST_LAP_TOP10',
    description: 'Remoção da exigência regulamentar de top 10 para bonificação de melhor volta',
    target: 'const isTop10Eligible = !ruleset.fastestLapRequiresTop10 || result.position <= 10;',
    replacement: 'const isTop10Eligible = true;'
  }
]);

export const TIE_BREAK_POLICY_MUTANTS = Object.freeze([
  {
    id: 'MUT_TBP_01_POINTS_DIFF',
    description: 'Inversão da ordem de comparação por pontos em TieBreakPolicy',
    target: 'return compB.points - compA.points;',
    replacement: 'return compA.points - compB.points;'
  },
  {
    id: 'MUT_TBP_02_COUNTBACK_DIFF',
    description: 'Inversão da precedência na comparação por countback de posições',
    target: 'return countB - countA;',
    replacement: 'return countA - countB;'
  }
]);

export const DRIVER_STANDINGS_MUTANTS = Object.freeze([
  {
    id: 'MUT_DST_01_RANK_SEQUENCE',
    description: 'Remoção da validação de sequencialidade estrita de posições (INV-CH-01)',
    target: 'if (entry.rank !== expectedRank) {',
    replacement: 'if (false && entry.rank !== expectedRank) {'
  },
  {
    id: 'MUT_DST_02_DUPLICATE_DRIVER',
    description: 'Remoção da detecção de pilotos duplicados na tabela (INV-CH-02)',
    target: 'if (driverIdsSet.has(entry.driverId.value)) {',
    replacement: 'if (false) {'
  }
]);

export const STANDINGS_CALCULATOR_MUTANTS = Object.freeze([
  {
    id: 'MUT_STC_01_SIMULATED_REJECTION',
    description: 'Remoção do bloqueio a dados SIMULATED em apuração oficial (INV-CH-05)',
    target: 'if (!isSimulation && res.publicationState === PublicationState.SIMULATED) {',
    replacement: 'if (false) {'
  },
  {
    id: 'MUT_STC_02_ROUND_FILTER',
    description: 'Inversão do filtro de rodadas em StandingsCalculator',
    target: 'if (sessionData.roundNumber > props.roundNumber) {',
    replacement: 'if (sessionData.roundNumber < props.roundNumber) {'
  }
]);

/**
 * Executa um ciclo de teste de mutação aplicando mutantes sobre um arquivo alvo.
 *
 * @param {Object} options - Configurações da execução.
 * @param {string} options.targetFile - Caminho absoluto do arquivo de produção.
 * @param {string} options.testCommand - Argumentos para executar o teste do componente.
 * @param {Array<Object>} options.mutants - Lista de mutações a serem avaliadas.
 * @param {number} [options.threshold=DEFAULT_MUTATION_THRESHOLD] - Score mínimo.
 * @param {string} [options.workspaceRoot=PROJECT_ROOT] - Raiz do projeto.
 * @returns {{ score: number, killed: number, survived: number, total: number, violations: string[], details: Array<Object> }}
 */
export function runMutationTesting({
  targetFile,
  testCommand,
  mutants,
  threshold = DEFAULT_MUTATION_THRESHOLD,
  workspaceRoot = PROJECT_ROOT
}) {
  if (!fs.existsSync(targetFile)) {
    return {
      score: 0,
      killed: 0,
      survived: 0,
      total: 0,
      violations: [`Arquivo alvo de mutação não encontrado: ${targetFile}`],
      details: []
    };
  }

  const originalContent = fs.readFileSync(targetFile, 'utf8');
  const details = [];
  let killedCount = 0;
  let survivedCount = 0;

  for (const mutant of mutants) {
    if (!originalContent.includes(mutant.target)) {
      details.push({
        id: mutant.id,
        description: mutant.description,
        status: 'SKIPPED',
        reason: 'Trecho alvo do mutante não localizado no código atual'
      });
      continue;
    }

    const mutatedContent = originalContent.replace(mutant.target, mutant.replacement);

    try {
      // Aplica a mutação temporária
      fs.writeFileSync(targetFile, mutatedContent, 'utf8');

      // Sanitiza o ambiente para evitar que execuções aninhadas no node:test sejam ignoradas
      const cleanEnv = { ...process.env };
      delete cleanEnv.NODE_TEST_CONTEXT;
      delete cleanEnv.NODE_TEST_WORKER_ID;

      // Executa o teste contra o código mutado
      const testRun = spawnSync(
        process.execPath,
        testCommand,
        {
          cwd: workspaceRoot,
          encoding: 'utf8',
          stdio: 'pipe',
          env: cleanEnv
        }
      );

      // Se o teste FALHAR, o mutante foi MORTO (Detectado com sucesso)
      if (testRun.status !== 0) {
        killedCount++;
        details.push({
          id: mutant.id,
          description: mutant.description,
          status: 'KILLED'
        });
      } else {
        // Se o teste PASSAR, o mutante SOBREVIVEU (Falha de cobertura da suite)
        survivedCount++;
        details.push({
          id: mutant.id,
          description: mutant.description,
          status: 'SURVIVED'
        });
      }
    } finally {
      // Restaura incondicionalmente o arquivo de produção original
      fs.writeFileSync(targetFile, originalContent, 'utf8');
    }
  }

  const evaluatedTotal = killedCount + survivedCount;
  const score = evaluatedTotal > 0 ? (killedCount / evaluatedTotal) * 100 : 0;
  const violations = [];

  if (score < threshold) {
    violations.push(
      `Mutation score (${score.toFixed(1)}%) abaixo do threshold mínimo exigido (${threshold}%). ${survivedCount} mutante(s) sobreviveram.`
    );
  }

  if (survivedCount > 0) {
    for (const item of details.filter(d => d.status === 'SURVIVED')) {
      violations.push(`Mutante SOBREVIVEU [${item.id}]: ${item.description}`);
    }
  }

  return {
    score,
    killed: killedCount,
    survived: survivedCount,
    total: evaluatedTotal,
    violations,
    details
  };
}

if (isMain(import.meta.url)) {
  const suites = [
    {
      name: 'DomainError',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/shared/domain-error.ts'),
      testCommand: ['--test', 'packages/domain/test/shared/domain-error.test.ts'],
      mutants: DOMAIN_ERROR_MUTANTS
    },
    {
      name: 'EntityId',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/shared/entity-id.ts'),
      testCommand: ['--test', 'packages/domain/test/shared/entity-id.test.ts'],
      mutants: ENTITY_ID_MUTANTS
    },
    {
      name: 'Result',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/shared/result.ts'),
      testCommand: ['--test', 'packages/domain/test/shared/result.test.ts'],
      mutants: RESULT_MUTANTS
    },
    {
      name: 'Session',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/events/session.ts'),
      testCommand: ['--test', 'packages/domain/test/events/session.test.ts'],
      mutants: SESSION_MUTANTS
    },
    {
      name: 'Season',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/seasons/season.ts'),
      testCommand: ['--test', 'packages/domain/test/seasons/season.test.ts'],
      mutants: SEASON_MUTANTS
    },
    {
      name: 'Driver',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/participants/driver.ts'),
      testCommand: ['--test', 'packages/domain/test/participants/driver.test.ts'],
      mutants: DRIVER_MUTANTS
    },
    {
      name: 'SeasonEntry',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/participants/season-entry.ts'),
      testCommand: ['--test', 'packages/domain/test/participants/season-entry.test.ts'],
      mutants: SEASON_ENTRY_MUTANTS
    },
    {
      name: 'Circuit',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/events/circuit.ts'),
      testCommand: ['--test', 'packages/domain/test/events/circuit.test.ts'],
      mutants: CIRCUIT_MUTANTS
    },
    {
      name: 'GrandPrix',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/events/grand-prix.ts'),
      testCommand: ['--test', 'packages/domain/test/events/grand-prix.test.ts'],
      mutants: GRAND_PRIX_MUTANTS
    },
    {
      name: 'SessionEntry',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/events/session-entry.ts'),
      testCommand: ['--test', 'packages/domain/test/events/session-entry.test.ts'],
      mutants: SESSION_ENTRY_MUTANTS
    },
    {
      name: 'SessionResult',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/events/session-result.ts'),
      testCommand: ['--test', 'packages/domain/test/events/session-result.test.ts'],
      mutants: SESSION_RESULT_MUTANTS
    },
    {
      name: 'ScoringRuleset',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/scoring/scoring-ruleset.ts'),
      testCommand: ['--test', 'packages/domain/test/scoring/scoring-ruleset.test.ts'],
      mutants: SCORING_RULESET_MUTANTS
    },
    {
      name: 'PointsCalculator',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/scoring/points-calculator.ts'),
      testCommand: ['--test', 'packages/domain/test/scoring/points-calculator.test.ts'],
      mutants: POINTS_CALCULATOR_MUTANTS
    },
    {
      name: 'TieBreakPolicy',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/scoring/tie-break-policy.ts'),
      testCommand: ['--test', 'packages/domain/test/scoring/tie-break-policy.test.ts'],
      mutants: TIE_BREAK_POLICY_MUTANTS
    },
    {
      name: 'DriverStandings',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/championships/driver-standings.ts'),
      testCommand: ['--test', 'packages/domain/test/championships/driver-standings.test.ts'],
      mutants: DRIVER_STANDINGS_MUTANTS
    },
    {
      name: 'StandingsCalculator',
      targetFile: path.join(PROJECT_ROOT, 'packages/domain/src/championships/standings-calculator.ts'),
      testCommand: ['--test', 'packages/domain/test/championships/standings-calculator.test.ts'],
      mutants: STANDINGS_CALCULATOR_MUTANTS
    }
  ];

  let totalKilled = 0;
  let totalEvaluated = 0;
  let totalSurvived = 0;
  const allViolations = [];
  const allDetails = [];

  for (const suite of suites) {
    const result = runMutationTesting({
      targetFile: suite.targetFile,
      testCommand: suite.testCommand,
      mutants: suite.mutants,
      threshold: DEFAULT_MUTATION_THRESHOLD,
      workspaceRoot: PROJECT_ROOT
    });

    totalKilled += result.killed;
    totalEvaluated += result.total;
    totalSurvived += result.survived;
    allViolations.push(...result.violations);
    allDetails.push(...result.details);
  }

  const consolidatedScore = totalEvaluated > 0 ? (totalKilled / totalEvaluated) * 100 : 0;

  report('Eficácia de detecção de defeitos (Mutation Testing)', allViolations);

  console.log(`\nResumo da Análise de Mutação Consolidada:`);
  console.log(`- Total de mutantes avaliados: ${totalEvaluated}`);
  console.log(`- Mutantes eliminados (Killed): ${totalKilled}`);
  console.log(`- Mutantes sobreviventes:       ${totalSurvived}`);
  console.log(`- Mutation Score:               ${consolidatedScore.toFixed(1)}% (alvo: >= ${DEFAULT_MUTATION_THRESHOLD}%)`);

  for (const item of allDetails) {
    const symbol = item.status === 'KILLED' ? '✔' : '✖';
    console.log(`  ${symbol} [${item.status}] ${item.id}: ${item.description}`);
  }
}
