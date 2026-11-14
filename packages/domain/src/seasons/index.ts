/**
 * ============================================================================
 * F1Atlas — Camada Domain | Módulo Seasons (Índice Público)
 * ============================================================================
 */

export {
  Season,
  createSeason,
  scheduleGrandPrix,
  cancelGrandPrix,
  rescheduleGrandPrix,
  completeGrandPrix,
  startSeason,
  concludeSeason,
  cancelSeason,
  reviseHistorically,
  ScheduledGrandPrixStatus
} from './season.ts';

export type {
  CreateSeasonProps,
  SeasonStateProps,
  ScheduledGrandPrix
} from './season.ts';

export {
  SeasonStatus,
  isValidTransition,
  isLockedForModifications
} from './season-status.ts';

export {
  validateSeasonGrandPrixConsistency
} from './season-event-validator.ts';

export type {
  ValidateSeasonGrandPrixConsistencyProps
} from './season-event-validator.ts';
