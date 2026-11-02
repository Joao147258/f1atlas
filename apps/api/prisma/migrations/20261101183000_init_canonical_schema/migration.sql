-- CreateTable
CREATE TABLE `infrastructure_health_checks` (
    `id` VARCHAR(191) NOT NULL,
    `component` VARCHAR(100) NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `details` TEXT NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `infrastructure_health_checks_component_checkedAt_idx`(`component`, `checkedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drivers` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `fullName` VARCHAR(200) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `permanentNumber` INTEGER NULL,
    `code` VARCHAR(3) NULL,
    `birthDate` DATE NULL,
    `birthPlace` VARCHAR(150) NULL,
    `nationality` VARCHAR(100) NOT NULL,
    `countryCode` VARCHAR(3) NULL,
    `biography` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `drivers_slug_key`(`slug`),
    INDEX `drivers_lastName_firstName_idx`(`lastName`, `firstName`),
    INDEX `drivers_nationality_idx`(`nationality`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `legalName` VARCHAR(200) NOT NULL,
    `commonName` VARCHAR(100) NOT NULL,
    `nationality` VARCHAR(100) NOT NULL,
    `countryCode` VARCHAR(3) NULL,
    `baseLocation` VARCHAR(150) NULL,
    `foundedYear` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `teams_slug_key`(`slug`),
    INDEX `teams_commonName_idx`(`commonName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `constructors` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `chassis` VARCHAR(100) NULL,
    `engineManufacturer` VARCHAR(100) NULL,
    `nationality` VARCHAR(100) NOT NULL,
    `countryCode` VARCHAR(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `constructors_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seasons` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `officialName` VARCHAR(200) NOT NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `status` ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `seasons_year_key`(`year`),
    INDEX `seasons_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `season_entrants` (
    `id` VARCHAR(191) NOT NULL,
    `seasonId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `constructorId` VARCHAR(191) NULL,
    `commercialName` VARCHAR(250) NOT NULL,
    `carDesignation` VARCHAR(100) NULL,
    `engineSupplier` VARCHAR(100) NULL,
    `teamPrincipal` VARCHAR(150) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `season_entrants_seasonId_idx`(`seasonId`),
    INDEX `season_entrants_teamId_idx`(`teamId`),
    UNIQUE INDEX `season_entrants_seasonId_teamId_key`(`seasonId`, `teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `season_driver_contracts` (
    `id` VARCHAR(191) NOT NULL,
    `seasonEntrantId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `role` ENUM('MAIN_DRIVER', 'RESERVE_DRIVER', 'TEST_DRIVER', 'REPLACEMENT') NOT NULL DEFAULT 'MAIN_DRIVER',
    `assignedNumber` INTEGER NOT NULL,
    `effectiveFrom` DATE NULL,
    `effectiveTo` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `season_driver_contracts_seasonEntrantId_idx`(`seasonEntrantId`),
    INDEX `season_driver_contracts_driverId_idx`(`driverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `circuits` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `location` VARCHAR(150) NOT NULL,
    `country` VARCHAR(100) NOT NULL,
    `countryCode` VARCHAR(3) NOT NULL,
    `latitude` DECIMAL(9, 6) NULL,
    `longitude` DECIMAL(9, 6) NULL,
    `timezone` VARCHAR(60) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `circuits_slug_key`(`slug`),
    INDEX `circuits_country_idx`(`country`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `circuit_layouts` (
    `id` VARCHAR(191) NOT NULL,
    `circuitId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `lengthMeters` INTEGER NOT NULL,
    `turnsCount` INTEGER NOT NULL,
    `validFromYear` INTEGER NULL,
    `validToYear` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `circuit_layouts_circuitId_idx`(`circuitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grands_prix` (
    `id` VARCHAR(191) NOT NULL,
    `seasonId` VARCHAR(191) NOT NULL,
    `circuitId` VARCHAR(191) NOT NULL,
    `circuitLayoutId` VARCHAR(191) NULL,
    `slug` VARCHAR(150) NOT NULL,
    `roundNumber` INTEGER NOT NULL,
    `officialName` VARCHAR(250) NOT NULL,
    `format` ENUM('STANDARD', 'SPRINT_WEEKEND', 'SPRINT_QUALIFYING_FORMAT') NOT NULL DEFAULT 'STANDARD',
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `scheduledLaps` INTEGER NULL,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `grands_prix_seasonId_idx`(`seasonId`),
    INDEX `grands_prix_circuitId_idx`(`circuitId`),
    UNIQUE INDEX `grands_prix_seasonId_roundNumber_key`(`seasonId`, `roundNumber`),
    UNIQUE INDEX `grands_prix_seasonId_slug_key`(`seasonId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `grandPrixId` VARCHAR(191) NOT NULL,
    `type` ENUM('PRACTICE_1', 'PRACTICE_2', 'PRACTICE_3', 'QUALIFYING', 'SPRINT_SHOOTOUT', 'SPRINT', 'RACE') NOT NULL,
    `sessionCode` VARCHAR(10) NOT NULL,
    `scheduledStartTime` DATETIME(3) NOT NULL,
    `scheduledEndTime` DATETIME(3) NULL,
    `actualStartTime` DATETIME(3) NULL,
    `actualEndTime` DATETIME(3) NULL,
    `status` ENUM('SCHEDULED', 'LIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `isOfficial` BOOLEAN NOT NULL DEFAULT false,
    `lapsCompleted` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `sessions_grandPrixId_idx`(`grandPrixId`),
    INDEX `sessions_scheduledStartTime_idx`(`scheduledStartTime`),
    UNIQUE INDEX `sessions_grandPrixId_type_key`(`grandPrixId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session_entries` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `seasonEntrantId` VARCHAR(191) NOT NULL,
    `carNumber` INTEGER NOT NULL,
    `isSubstitute` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ENTERED', 'DID_NOT_PARTICIPATE', 'WITHDRAWN') NOT NULL DEFAULT 'ENTERED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `session_entries_sessionId_idx`(`sessionId`),
    INDEX `session_entries_driverId_idx`(`driverId`),
    INDEX `session_entries_seasonEntrantId_idx`(`seasonEntrantId`),
    UNIQUE INDEX `session_entries_sessionId_driverId_key`(`sessionId`, `driverId`),
    UNIQUE INDEX `session_entries_sessionId_carNumber_key`(`sessionId`, `carNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session_results` (
    `id` VARCHAR(191) NOT NULL,
    `sessionEntryId` VARCHAR(191) NOT NULL,
    `positionOrder` INTEGER NOT NULL,
    `classifiedPosition` INTEGER NULL,
    `gridPosition` INTEGER NULL,
    `finishStatus` ENUM('FINISHED', 'LAPPED', 'ACCIDENT', 'COLLISION', 'MECHANICAL', 'RETIRED', 'DISQUALIFIED', 'DID_NOT_START', 'DID_NOT_QUALIFY') NOT NULL DEFAULT 'FINISHED',
    `isClassified` BOOLEAN NOT NULL DEFAULT true,
    `completedLaps` INTEGER NOT NULL DEFAULT 0,
    `totalTimeMillis` BIGINT NULL,
    `gapToLeaderMillis` BIGINT NULL,
    `gapToLeaderLaps` INTEGER NULL,
    `timeDifferenceRaw` VARCHAR(50) NULL,
    `fastestLapRank` INTEGER NULL,
    `fastestLapTimeMillis` INTEGER NULL,
    `fastestLapNumber` INTEGER NULL,
    `hasFastestLapBonus` BOOLEAN NOT NULL DEFAULT false,
    `pointsAwarded` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `homologationStatus` ENUM('PROVISIONAL', 'UNDER_INVESTIGATION', 'OFFICIAL', 'REVISED') NOT NULL DEFAULT 'PROVISIONAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `session_results_sessionEntryId_key`(`sessionEntryId`),
    INDEX `session_results_positionOrder_idx`(`positionOrder`),
    INDEX `session_results_classifiedPosition_idx`(`classifiedPosition`),
    INDEX `session_results_homologationStatus_idx`(`homologationStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qualifying_results` (
    `id` VARCHAR(191) NOT NULL,
    `sessionEntryId` VARCHAR(191) NOT NULL,
    `finalPosition` INTEGER NOT NULL,
    `q1TimeMillis` INTEGER NULL,
    `q1TimeRaw` VARCHAR(20) NULL,
    `q2TimeMillis` INTEGER NULL,
    `q2TimeRaw` VARCHAR(20) NULL,
    `q3TimeMillis` INTEGER NULL,
    `q3TimeRaw` VARCHAR(20) NULL,
    `eliminatedIn` ENUM('Q1', 'Q2', 'Q3') NULL,
    `lapsCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `qualifying_results_sessionEntryId_key`(`sessionEntryId`),
    INDEX `qualifying_results_finalPosition_idx`(`finalPosition`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `starting_grids` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `sessionEntryId` VARCHAR(191) NOT NULL,
    `gridPosition` INTEGER NOT NULL,
    `qualifyingPosition` INTEGER NULL,
    `startsFromPitLane` BOOLEAN NOT NULL DEFAULT false,
    `gridPenaltyPositions` INTEGER NOT NULL DEFAULT 0,
    `isDisqualified` BOOLEAN NOT NULL DEFAULT false,
    `tyreCompound` VARCHAR(30) NULL,
    `reasonForAdjustment` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `starting_grids_sessionEntryId_key`(`sessionEntryId`),
    INDEX `starting_grids_sessionId_gridPosition_idx`(`sessionId`, `gridPosition`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penalties` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `sessionEntryId` VARCHAR(191) NULL,
    `type` ENUM('TIME_PENALTY_SECONDS', 'DRIVE_THROUGH', 'STOP_AND_GO', 'GRID_DROP', 'DISQUALIFICATION', 'FINE', 'REPRIMAND', 'PENALTY_POINTS') NOT NULL,
    `penaltyValue` INTEGER NULL,
    `infringement` VARCHAR(255) NOT NULL,
    `reason` TEXT NULL,
    `stewardsDocumentNumber` VARCHAR(50) NULL,
    `servedDuringSession` BOOLEAN NOT NULL DEFAULT false,
    `impactApplied` BOOLEAN NOT NULL DEFAULT true,
    `issuedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `penalties_sessionId_idx`(`sessionId`),
    INDEX `penalties_sessionEntryId_idx`(`sessionEntryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `result_revisions` (
    `id` VARCHAR(191) NOT NULL,
    `sessionResultId` VARCHAR(191) NOT NULL,
    `revisionNumber` INTEGER NOT NULL,
    `previousStatus` VARCHAR(50) NOT NULL,
    `newStatus` VARCHAR(50) NOT NULL,
    `previousPosition` INTEGER NULL,
    `newPosition` INTEGER NULL,
    `previousPoints` DECIMAL(5, 2) NULL,
    `newPoints` DECIMAL(5, 2) NULL,
    `reason` TEXT NOT NULL,
    `officialReference` VARCHAR(200) NULL,
    `effectiveAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `result_revisions_sessionResultId_idx`(`sessionResultId`),
    UNIQUE INDEX `result_revisions_sessionResultId_revisionNumber_key`(`sessionResultId`, `revisionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scoring_rulesets` (
    `id` VARCHAR(191) NOT NULL,
    `seasonId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `fastestLapBonusPoints` DECIMAL(4, 2) NOT NULL DEFAULT 0.00,
    `fastestLapRequiresTop10` BOOLEAN NOT NULL DEFAULT true,
    `sprintPointsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `isHalfPointsSupported` BOOLEAN NOT NULL DEFAULT true,
    `regulationsReference` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `scoring_rulesets_seasonId_idx`(`seasonId`),
    UNIQUE INDEX `scoring_rulesets_seasonId_code_key`(`seasonId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scoring_positions` (
    `id` VARCHAR(191) NOT NULL,
    `scoringRulesetId` VARCHAR(191) NOT NULL,
    `sessionType` ENUM('RACE', 'SPRINT') NOT NULL,
    `position` INTEGER NOT NULL,
    `points` DECIMAL(5, 2) NOT NULL,
    `distanceCriteria` ENUM('FULL_DISTANCE', 'REDUCED_75_PERCENT', 'REDUCED_50_PERCENT', 'REDUCED_25_PERCENT') NOT NULL DEFAULT 'FULL_DISTANCE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `scoring_positions_scoringRulesetId_idx`(`scoringRulesetId`),
    UNIQUE INDEX `scoring_positions_scoringRulesetId_sessionType_position_dist_key`(`scoringRulesetId`, `sessionType`, `position`, `distanceCriteria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `championships` (
    `id` VARCHAR(191) NOT NULL,
    `seasonId` VARCHAR(191) NOT NULL,
    `type` ENUM('DRIVERS', 'CONSTRUCTORS') NOT NULL,
    `officialName` VARCHAR(200) NOT NULL,
    `status` ENUM('IN_PROGRESS', 'DECIDED', 'OFFICIAL') NOT NULL DEFAULT 'IN_PROGRESS',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `championships_seasonId_idx`(`seasonId`),
    UNIQUE INDEX `championships_seasonId_type_key`(`seasonId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `championship_standings` (
    `id` VARCHAR(191) NOT NULL,
    `championshipId` VARCHAR(191) NOT NULL,
    `grandPrixId` VARCHAR(191) NOT NULL,
    `roundNumber` INTEGER NOT NULL,
    `snapshotType` ENUM('OFFICIAL_FIA', 'CALCULATED', 'SIMULATED') NOT NULL DEFAULT 'OFFICIAL_FIA',
    `scenarioIdentifier` VARCHAR(100) NULL,
    `calculatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `championship_standings_championshipId_idx`(`championshipId`),
    INDEX `championship_standings_grandPrixId_idx`(`grandPrixId`),
    UNIQUE INDEX `championship_standings_championshipId_grandPrixId_snapshotTy_key`(`championshipId`, `grandPrixId`, `snapshotType`, `scenarioIdentifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver_standing_entries` (
    `id` VARCHAR(191) NOT NULL,
    `standingId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `points` DECIMAL(6, 2) NOT NULL,
    `winsCount` INTEGER NOT NULL DEFAULT 0,
    `podiumsCount` INTEGER NOT NULL DEFAULT 0,
    `tiebreakerRank` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `driver_standing_entries_standingId_idx`(`standingId`),
    INDEX `driver_standing_entries_driverId_idx`(`driverId`),
    UNIQUE INDEX `driver_standing_entries_standingId_driverId_key`(`standingId`, `driverId`),
    UNIQUE INDEX `driver_standing_entries_standingId_position_key`(`standingId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `constructor_standing_entries` (
    `id` VARCHAR(191) NOT NULL,
    `standingId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `constructorId` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL,
    `points` DECIMAL(6, 2) NOT NULL,
    `winsCount` INTEGER NOT NULL DEFAULT 0,
    `podiumsCount` INTEGER NOT NULL DEFAULT 0,
    `tiebreakerRank` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `constructor_standing_entries_standingId_idx`(`standingId`),
    INDEX `constructor_standing_entries_teamId_idx`(`teamId`),
    UNIQUE INDEX `constructor_standing_entries_standingId_teamId_key`(`standingId`, `teamId`),
    UNIQUE INDEX `constructor_standing_entries_standingId_position_key`(`standingId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lap_times` (
    `id` VARCHAR(191) NOT NULL,
    `sessionEntryId` VARCHAR(191) NOT NULL,
    `lapNumber` INTEGER NOT NULL,
    `lapTimeMillis` INTEGER NULL,
    `lapTimeRaw` VARCHAR(20) NULL,
    `positionOnLap` INTEGER NULL,
    `sector1Millis` INTEGER NULL,
    `sector2Millis` INTEGER NULL,
    `sector3Millis` INTEGER NULL,
    `isPersonalBest` BOOLEAN NOT NULL DEFAULT false,
    `isSessionBest` BOOLEAN NOT NULL DEFAULT false,
    `isValidLap` BOOLEAN NOT NULL DEFAULT true,
    `pitStopOccurred` BOOLEAN NOT NULL DEFAULT false,
    `tyreCompound` VARCHAR(30) NULL,
    `tyreAgeLaps` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lap_times_sessionEntryId_lapNumber_idx`(`sessionEntryId`, `lapNumber`),
    UNIQUE INDEX `lap_times_sessionEntryId_lapNumber_key`(`sessionEntryId`, `lapNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pit_stops` (
    `id` VARCHAR(191) NOT NULL,
    `sessionEntryId` VARCHAR(191) NOT NULL,
    `stopNumber` INTEGER NOT NULL,
    `lapNumber` INTEGER NOT NULL,
    `durationMillis` INTEGER NULL,
    `laneTimeMillis` INTEGER NULL,
    `durationRaw` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pit_stops_sessionEntryId_idx`(`sessionEntryId`),
    UNIQUE INDEX `pit_stops_sessionEntryId_stopNumber_key`(`sessionEntryId`, `stopNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_sources` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `category` ENUM('OFFICIAL_GOVERNING_BODY', 'PUBLIC_API', 'HISTORICAL_DATASET', 'MANUAL_EDITORIAL') NOT NULL,
    `referenceUrl` VARCHAR(255) NULL,
    `licenseType` VARCHAR(100) NULL,
    `termsSummary` TEXT NULL,
    `isAuthorizedForPublicUse` BOOLEAN NOT NULL DEFAULT false,
    `rateLimitInfo` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `data_sources_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_runs` (
    `id` VARCHAR(191) NOT NULL,
    `dataSourceId` VARCHAR(191) NOT NULL,
    `entityTarget` VARCHAR(100) NOT NULL,
    `status` ENUM('STARTED', 'COMPLETED', 'PARTIAL', 'FAILED') NOT NULL DEFAULT 'STARTED',
    `recordsProcessed` INTEGER NOT NULL DEFAULT 0,
    `recordsInserted` INTEGER NOT NULL DEFAULT 0,
    `recordsUpdated` INTEGER NOT NULL DEFAULT 0,
    `recordsFailed` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `import_runs_dataSourceId_startedAt_idx`(`dataSourceId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `external_references` (
    `id` VARCHAR(191) NOT NULL,
    `dataSourceId` VARCHAR(191) NOT NULL,
    `externalEntity` VARCHAR(50) NOT NULL,
    `externalId` VARCHAR(150) NOT NULL,
    `driverId` VARCHAR(191) NULL,
    `teamId` VARCHAR(191) NULL,
    `circuitId` VARCHAR(191) NULL,
    `grandPrixId` VARCHAR(191) NULL,
    `sessionResultId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `external_references_dataSourceId_idx`(`dataSourceId`),
    INDEX `external_references_driverId_idx`(`driverId`),
    INDEX `external_references_teamId_idx`(`teamId`),
    INDEX `external_references_circuitId_idx`(`circuitId`),
    INDEX `external_references_grandPrixId_idx`(`grandPrixId`),
    UNIQUE INDEX `external_references_dataSourceId_externalEntity_externalId_key`(`dataSourceId`, `externalEntity`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `record_provenance` (
    `id` VARCHAR(191) NOT NULL,
    `dataSourceId` VARCHAR(191) NOT NULL,
    `importRunId` VARCHAR(191) NULL,
    `recordType` VARCHAR(100) NOT NULL,
    `recordId` VARCHAR(36) NOT NULL,
    `confidenceLevel` ENUM('UNVERIFIED', 'DERIVED', 'COMMUNITY_CHECKED', 'OFFICIAL_CERTIFIED') NOT NULL DEFAULT 'UNVERIFIED',
    `ingestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATETIME(3) NULL,
    `verifiedBy` VARCHAR(100) NULL,
    `sourceVersion` VARCHAR(50) NULL,
    `checksum` VARCHAR(64) NULL,

    INDEX `record_provenance_recordType_recordId_idx`(`recordType`, `recordId`),
    INDEX `record_provenance_dataSourceId_ingestedAt_idx`(`dataSourceId`, `ingestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stories` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(150) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `subtitle` VARCHAR(255) NULL,
    `summary` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `heroImageUrl` VARCHAR(255) NULL,
    `heroImageAlt` VARCHAR(255) NULL,
    `primarySeasonId` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `authorName` VARCHAR(100) NOT NULL,
    `readingTimeMinutes` INTEGER NOT NULL DEFAULT 5,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stories_slug_key`(`slug`),
    INDEX `stories_status_idx`(`status`),
    INDEX `stories_publishedAt_idx`(`publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `story_chapters` (
    `id` VARCHAR(191) NOT NULL,
    `storyId` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `content` LONGTEXT NULL,
    `contentFileRef` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `story_chapters_storyId_idx`(`storyId`),
    UNIQUE INDEX `story_chapters_storyId_orderIndex_key`(`storyId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `story_references` (
    `id` VARCHAR(191) NOT NULL,
    `storyId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `sourceName` VARCHAR(150) NOT NULL,
    `url` VARCHAR(255) NULL,
    `publicationDate` DATE NULL,
    `referenceType` ENUM('OFFICIAL_DOCUMENT', 'BOOK', 'JOURNALISM_ARTICLE', 'INTERVIEW', 'HISTORICAL_VIDEO') NOT NULL DEFAULT 'JOURNALISM_ARTICLE',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `story_references_storyId_idx`(`storyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `story_entity_links` (
    `id` VARCHAR(191) NOT NULL,
    `storyId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NULL,
    `teamId` VARCHAR(191) NULL,
    `grandPrixId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `role` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `story_entity_links_storyId_idx`(`storyId`),
    INDEX `story_entity_links_driverId_idx`(`driverId`),
    INDEX `story_entity_links_teamId_idx`(`teamId`),
    INDEX `story_entity_links_grandPrixId_idx`(`grandPrixId`),
    INDEX `story_entity_links_sessionId_idx`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `season_entrants` ADD CONSTRAINT `season_entrants_seasonId_fkey` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `season_entrants` ADD CONSTRAINT `season_entrants_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `season_entrants` ADD CONSTRAINT `season_entrants_constructorId_fkey` FOREIGN KEY (`constructorId`) REFERENCES `constructors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `season_driver_contracts` ADD CONSTRAINT `season_driver_contracts_seasonEntrantId_fkey` FOREIGN KEY (`seasonEntrantId`) REFERENCES `season_entrants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `season_driver_contracts` ADD CONSTRAINT `season_driver_contracts_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `circuit_layouts` ADD CONSTRAINT `circuit_layouts_circuitId_fkey` FOREIGN KEY (`circuitId`) REFERENCES `circuits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grands_prix` ADD CONSTRAINT `grands_prix_seasonId_fkey` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grands_prix` ADD CONSTRAINT `grands_prix_circuitId_fkey` FOREIGN KEY (`circuitId`) REFERENCES `circuits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grands_prix` ADD CONSTRAINT `grands_prix_circuitLayoutId_fkey` FOREIGN KEY (`circuitLayoutId`) REFERENCES `circuit_layouts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_grandPrixId_fkey` FOREIGN KEY (`grandPrixId`) REFERENCES `grands_prix`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_entries` ADD CONSTRAINT `session_entries_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_entries` ADD CONSTRAINT `session_entries_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_entries` ADD CONSTRAINT `session_entries_seasonEntrantId_fkey` FOREIGN KEY (`seasonEntrantId`) REFERENCES `season_entrants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_results` ADD CONSTRAINT `session_results_sessionEntryId_fkey` FOREIGN KEY (`sessionEntryId`) REFERENCES `session_entries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qualifying_results` ADD CONSTRAINT `qualifying_results_sessionEntryId_fkey` FOREIGN KEY (`sessionEntryId`) REFERENCES `session_entries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `starting_grids` ADD CONSTRAINT `starting_grids_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `starting_grids` ADD CONSTRAINT `starting_grids_sessionEntryId_fkey` FOREIGN KEY (`sessionEntryId`) REFERENCES `session_entries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penalties` ADD CONSTRAINT `penalties_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penalties` ADD CONSTRAINT `penalties_sessionEntryId_fkey` FOREIGN KEY (`sessionEntryId`) REFERENCES `session_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `result_revisions` ADD CONSTRAINT `result_revisions_sessionResultId_fkey` FOREIGN KEY (`sessionResultId`) REFERENCES `session_results`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scoring_rulesets` ADD CONSTRAINT `scoring_rulesets_seasonId_fkey` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scoring_positions` ADD CONSTRAINT `scoring_positions_scoringRulesetId_fkey` FOREIGN KEY (`scoringRulesetId`) REFERENCES `scoring_rulesets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `championships` ADD CONSTRAINT `championships_seasonId_fkey` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `championship_standings` ADD CONSTRAINT `championship_standings_championshipId_fkey` FOREIGN KEY (`championshipId`) REFERENCES `championships`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `championship_standings` ADD CONSTRAINT `championship_standings_grandPrixId_fkey` FOREIGN KEY (`grandPrixId`) REFERENCES `grands_prix`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_standing_entries` ADD CONSTRAINT `driver_standing_entries_standingId_fkey` FOREIGN KEY (`standingId`) REFERENCES `championship_standings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_standing_entries` ADD CONSTRAINT `driver_standing_entries_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `constructor_standing_entries` ADD CONSTRAINT `constructor_standing_entries_standingId_fkey` FOREIGN KEY (`standingId`) REFERENCES `championship_standings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `constructor_standing_entries` ADD CONSTRAINT `constructor_standing_entries_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `constructor_standing_entries` ADD CONSTRAINT `constructor_standing_entries_constructorId_fkey` FOREIGN KEY (`constructorId`) REFERENCES `constructors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lap_times` ADD CONSTRAINT `lap_times_sessionEntryId_fkey` FOREIGN KEY (`sessionEntryId`) REFERENCES `session_entries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pit_stops` ADD CONSTRAINT `pit_stops_sessionEntryId_fkey` FOREIGN KEY (`sessionEntryId`) REFERENCES `session_entries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_runs` ADD CONSTRAINT `import_runs_dataSourceId_fkey` FOREIGN KEY (`dataSourceId`) REFERENCES `data_sources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `external_references` ADD CONSTRAINT `external_references_dataSourceId_fkey` FOREIGN KEY (`dataSourceId`) REFERENCES `data_sources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `external_references` ADD CONSTRAINT `external_references_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `external_references` ADD CONSTRAINT `external_references_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `external_references` ADD CONSTRAINT `external_references_circuitId_fkey` FOREIGN KEY (`circuitId`) REFERENCES `circuits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `external_references` ADD CONSTRAINT `external_references_grandPrixId_fkey` FOREIGN KEY (`grandPrixId`) REFERENCES `grands_prix`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `external_references` ADD CONSTRAINT `external_references_sessionResultId_fkey` FOREIGN KEY (`sessionResultId`) REFERENCES `session_results`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `record_provenance` ADD CONSTRAINT `record_provenance_dataSourceId_fkey` FOREIGN KEY (`dataSourceId`) REFERENCES `data_sources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `record_provenance` ADD CONSTRAINT `record_provenance_importRunId_fkey` FOREIGN KEY (`importRunId`) REFERENCES `import_runs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stories` ADD CONSTRAINT `stories_primarySeasonId_fkey` FOREIGN KEY (`primarySeasonId`) REFERENCES `seasons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story_chapters` ADD CONSTRAINT `story_chapters_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story_references` ADD CONSTRAINT `story_references_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story_entity_links` ADD CONSTRAINT `story_entity_links_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story_entity_links` ADD CONSTRAINT `story_entity_links_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story_entity_links` ADD CONSTRAINT `story_entity_links_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story_entity_links` ADD CONSTRAINT `story_entity_links_grandPrixId_fkey` FOREIGN KEY (`grandPrixId`) REFERENCES `grands_prix`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story_entity_links` ADD CONSTRAINT `story_entity_links_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

