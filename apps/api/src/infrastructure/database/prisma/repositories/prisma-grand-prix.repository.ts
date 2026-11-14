/**
 * ============================================================================
 * F1Atlas — Camada Infrastructure | Database: PrismaGrandPrixRepository
 * ============================================================================
 *
 * @component PrismaGrandPrixRepository
 * @module apps/api/src/infrastructure/database/prisma/repositories/prisma-grand-prix.repository
 * @layer Infrastructure (Persistência Relacional)
 * @implements {IGrandPrixRepository} (apps/api/src/application/ports/grand-prix-repository.port.ts)
 *
 * Responsabilidade Arquitetural:
 * Fornecer o adaptador concreto de persistência relacional para eventos automobilísticos:
 * 1. Autódromos e Circuitos (`Circuit`): Locais físicos de competição e seus traçados (`CircuitLayout`).
 * 2. Grandes Prêmios (`GrandPrix`): Raiz de agregado que representa o fim de semana esportivo.
 * 3. Sessões de Pista (`Session`): Treinos livres, qualificações, sprint shootouts, sprints e corridas.
 * 4. Resultados Homologados (`SessionResult`): Apuração esportiva final dos participantes.
 *
 * Princípios e Invariantes Assegurados:
 * - Anti-fabricação de Dados Esportivos: Não gera autódromos, curvas ou extensões substitutas.
 *   Se um circuito não possuir layout físico ativo configurado no banco, a recuperação falha
 *   com `PersistenceError` para evitar exibição de dados esportivos enganosos.
 * - Inscrição Prévia Obrigatória: No salvamento de resultados (`saveResults`), o competidor
 *   deve possuir inscrição formal na sessão (`SessionEntry`). Rejeita-se a fabricação
 *   de participações sintéticas apenas para satisfazer chaves estrangeiras.
 * - Transacionalidade Atômica ($transaction): A gravação de resultados de uma sessão é executada
 *   em lote dentro de uma transação. Se qualquer resultado falhar, ocorre rollback completo.
 *
 * Riscos de Manutenção:
 * - Gravar resultados sem `$transaction` pode gerar sessões com grid incompleto ou classificação parcial.
 * - Não validar a presença de `seasonId` ao persistir Grandes Prêmios pode criar eventos órfãos.
 * ============================================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  GrandPrix,
  Circuit,
  Session,
  SessionResult,
  EntityId
} from '@f1atlas/domain';
import type { IGrandPrixRepository } from '../../../../application/ports/grand-prix-repository.port.js';
import { PrismaService } from '../prisma.service.js';
import {
  EventMapper,
  type PrismaSessionResultRecord
} from '../../../mappers/event.mapper.js';
import { PrismaErrorHandler } from '../errors/prisma-error-handler.js';
import { EntityNotFoundError, PersistenceError } from '../errors/persistence-errors.js';
import type {
  EventFormat,
  EventStatus,
  SessionType,
  SessionStatus,
  FinishStatus,
  HomologationStatus
} from '../../../../generated/prisma/enums.js';

@Injectable()
export class PrismaGrandPrixRepository implements IGrandPrixRepository {
  private readonly logger = new Logger(PrismaGrandPrixRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. Circuitos / Autódromos (Circuit)
  // ==========================================

  /**
   * Localiza um circuito pelo seu identificador durável.
   *
   * @param id - Identificador EntityId<'circuit'>.
   * @returns Entidade Circuit reconstituída ou null se não encontrada.
   * @throws {PersistenceError} Se o circuito existir mas não possuir layout ativo válido.
   */
  async findCircuitById(id: EntityId<'circuit'>): Promise<Circuit | null> {
    try {
      const record = await this.prisma.circuit.findUnique({
        where: { id: id.value },
        include: { layouts: { where: { isActive: true }, take: 1 } }
      });

      if (!record) return null;

      const activeLayout = record.layouts?.[0];
      if (!activeLayout) {
        throw new PersistenceError(
          `[PrismaGrandPrixRepository.findCircuitById] Circuito "${record.name}" (${id.value}) não possui layout físico ativo registrado.`
        );
      }

      return EventMapper.circuitToDomain({
        id: record.id,
        name: record.name,
        city: record.location,
        country: record.country,
        trackLengthMeters: activeLayout.lengthMeters,
        cornersCount: activeLayout.turnsCount,
        timezone: record.timezone
      });
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaGrandPrixRepository.findCircuitById(${id.value})`);
    }
  }

  /**
   * Lista todos os autódromos cadastrados que possuem layout ativo configurado.
   *
   * @returns Lista de circuitos. Registros sem traçado ativo são omitidos com aviso em log.
   */
  async findAllCircuits(): Promise<Circuit[]> {
    try {
      const records = await this.prisma.circuit.findMany({
        include: { layouts: { where: { isActive: true }, take: 1 } },
        orderBy: { name: 'asc' }
      });

      const circuits: Circuit[] = [];
      for (const record of records) {
        const activeLayout = record.layouts?.[0];
        if (!activeLayout) {
          this.logger.warn(
            `Circuito "${record.name}" (${record.id}) omitido na listagem por não possuir layout ativo válido.`
          );
          continue;
        }

        circuits.push(
          EventMapper.circuitToDomain({
            id: record.id,
            name: record.name,
            city: record.location,
            country: record.country,
            trackLengthMeters: activeLayout.lengthMeters,
            cornersCount: activeLayout.turnsCount,
            timezone: record.timezone
          })
        );
      }

      return circuits;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, 'PrismaGrandPrixRepository.findAllCircuits');
    }
  }

  /**
   * Salva o autódromo e seu layout físico correspondente em transação atômica.
   *
   * @param circuit - Entidade Circuit do Domínio.
   * @returns Entidade Circuit persistida e recarregada.
   */
  async saveCircuit(circuit: Circuit): Promise<Circuit> {
    try {
      const dto = EventMapper.circuitToPersistence(circuit);

      await this.prisma.$transaction(async tx => {
        await tx.circuit.upsert({
          where: { id: dto.id },
          create: {
            id: dto.id,
            slug: dto.slug,
            name: dto.name,
            location: dto.city,
            country: dto.country,
            countryCode: dto.country.slice(0, 3).toUpperCase(),
            timezone: dto.timezone
          },
          update: {
            slug: dto.slug,
            name: dto.name,
            location: dto.city,
            country: dto.country,
            countryCode: dto.country.slice(0, 3).toUpperCase(),
            timezone: dto.timezone
          }
        });

        const layoutId = `${dto.id}-main-layout`;
        await tx.circuitLayout.upsert({
          where: { id: layoutId },
          create: {
            id: layoutId,
            circuitId: dto.id,
            name: 'Grand Prix Circuit Layout',
            lengthMeters: dto.trackLengthMeters,
            turnsCount: dto.cornersCount,
            isActive: true
          },
          update: {
            lengthMeters: dto.trackLengthMeters,
            turnsCount: dto.cornersCount,
            isActive: true
          }
        });
      });

      const persisted = await this.findCircuitById(circuit.id);
      if (!persisted) {
        throw new Error(`Falha ao recuperar o circuito ${circuit.id.value} após salvar.`);
      }

      return persisted;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaGrandPrixRepository.saveCircuit(${circuit.id.value})`);
    }
  }

  // ==========================================
  // 2. Grandes Prêmios (GrandPrix - Raiz de Agregado)
  // ==========================================

  /**
   * Localiza um Grande Prêmio por seu identificador durável.
   *
   * @param id - Identificador EntityId<'grand-prix'>.
   * @returns Raiz de agregado GrandPrix ou null se não encontrada.
   */
  async findById(id: EntityId<'grand-prix'>): Promise<GrandPrix | null> {
    try {
      const record = await this.prisma.grandPrix.findUnique({
        where: { id: id.value }
      });

      if (!record) return null;
      return EventMapper.grandPrixToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaGrandPrixRepository.findById(${id.value})`);
    }
  }

  /**
   * Localiza um Grande Prêmio pela temporada e número de rodada oficial.
   *
   * @param seasonId - Identificador da temporada.
   * @param roundNumber - Número da etapa no calendário oficial (ex.: 1 para abertura).
   * @returns Raiz de agregado GrandPrix ou null se inexistente.
   */
  async findBySeasonAndRound(seasonId: EntityId<'season'>, roundNumber: number): Promise<GrandPrix | null> {
    try {
      const record = await this.prisma.grandPrix.findUnique({
        where: {
          seasonId_roundNumber: {
            seasonId: seasonId.value,
            roundNumber
          }
        }
      });

      if (!record) return null;
      return EventMapper.grandPrixToDomain(record);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(
        error,
        `PrismaGrandPrixRepository.findBySeasonAndRound(season=${seasonId.value}, round=${roundNumber})`
      );
    }
  }

  /**
   * Lista todos os Grandes Prêmios de uma temporada completa.
   *
   * @param seasonId - Identificador da temporada.
   * @returns Lista de Grandes Prêmios ordenada por número de rodada.
   */
  async findBySeason(seasonId: EntityId<'season'>): Promise<GrandPrix[]> {
    try {
      const records = await this.prisma.grandPrix.findMany({
        where: { seasonId: seasonId.value },
        orderBy: { roundNumber: 'asc' }
      });

      return records.map(record => EventMapper.grandPrixToDomain(record));
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaGrandPrixRepository.findBySeason(${seasonId.value})`);
    }
  }

  /**
   * Salva a raiz de agregado GrandPrix.
   *
   * @param grandPrix - Instância de GrandPrix do Domínio.
   * @returns Raiz de agregado persistida e recarregada.
   * @throws {EntityNotFoundError} Se a temporada associada não existir no banco.
   */
  async save(grandPrix: GrandPrix): Promise<GrandPrix> {
    try {
      const dto = EventMapper.grandPrixToPersistence(grandPrix);

      // Validação de pré-requisito relacional: a temporada deve existir
      const seasonExists = await this.prisma.season.count({
        where: { id: dto.seasonId }
      });
      if (seasonExists === 0) {
        throw new EntityNotFoundError(
          `[PrismaGrandPrixRepository.save] Temporada "${dto.seasonId}" inexistente. Não é permitido criar GP desvinculado.`
        );
      }

      await this.prisma.grandPrix.upsert({
        where: { id: dto.id },
        create: {
          id: dto.id,
          seasonId: dto.seasonId,
          circuitId: dto.circuitId,
          slug: dto.slug,
          roundNumber: dto.roundNumber,
          officialName: dto.officialName,
          format: dto.format as EventFormat,
          startDate: dto.startDate,
          endDate: dto.endDate,
          status: dto.status as EventStatus
        },
        update: {
          seasonId: dto.seasonId,
          circuitId: dto.circuitId,
          slug: dto.slug,
          roundNumber: dto.roundNumber,
          officialName: dto.officialName,
          format: dto.format as EventFormat,
          startDate: dto.startDate,
          endDate: dto.endDate,
          status: dto.status as EventStatus
        }
      });

      const persisted = await this.findById(grandPrix.id);
      if (!persisted) {
        throw new Error(`Falha ao recuperar o Grande Prêmio ${grandPrix.id.value} após salvar.`);
      }

      return persisted;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaGrandPrixRepository.save(${grandPrix.id.value})`);
    }
  }

  // ==========================================
  // 3. Sessões e Resultados (Session & SessionResult)
  // ==========================================

  /**
   * Localiza uma sessão cronometrada de pista pelo identificador.
   *
   * @param id - Identificador EntityId<'session'>.
   * @returns Entidade Session ou null se inexistente.
   */
  async findSessionById(id: EntityId<'session'>): Promise<Session | null> {
    try {
      const record = await this.prisma.session.findUnique({
        where: { id: id.value }
      });

      if (!record) return null;
      return EventMapper.sessionToDomain({
        id: record.id,
        grandPrixId: record.grandPrixId,
        sessionType: record.type,
        sessionStatus: record.status,
        scheduledStartTime: record.scheduledStartTime,
        scheduledEndTime: record.scheduledEndTime,
        actualStartTime: record.actualStartTime,
        actualEndTime: record.actualEndTime
      });
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaGrandPrixRepository.findSessionById(${id.value})`);
    }
  }

  /**
   * Recupera todas as sessões cronometradas pertencentes a um Grande Prêmio.
   *
   * @param grandPrixId - Identificador do Grande Prêmio.
   * @returns Lista de sessões ordenada cronologicamente pelo horário agendado de início.
   */
  async findSessionsByGrandPrix(grandPrixId: EntityId<'grand-prix'>): Promise<Session[]> {
    try {
      const records = await this.prisma.session.findMany({
        where: { grandPrixId: grandPrixId.value },
        orderBy: { scheduledStartTime: 'asc' }
      });

      return records.map(record =>
        EventMapper.sessionToDomain({
          id: record.id,
          grandPrixId: record.grandPrixId,
          sessionType: record.type,
          sessionStatus: record.status,
          scheduledStartTime: record.scheduledStartTime,
          scheduledEndTime: record.scheduledEndTime,
          actualStartTime: record.actualStartTime,
          actualEndTime: record.actualEndTime
        })
      );
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(
        error,
        `PrismaGrandPrixRepository.findSessionsByGrandPrix(${grandPrixId.value})`
      );
    }
  }

  /**
   * Salva uma sessão esportiva de pista (Treino, Quali, Sprint ou Corrida).
   *
   * @param session - Entidade Session do Domínio.
   * @returns Entidade Session persistida.
   */
  async saveSession(session: Session): Promise<Session> {
    try {
      const dto = EventMapper.sessionToPersistence(session);

      await this.prisma.session.upsert({
        where: { id: dto.id },
        create: {
          id: dto.id,
          grandPrixId: dto.grandPrixId,
          type: dto.sessionType as SessionType,
          sessionCode: dto.sessionType.slice(0, 4),
          status: dto.sessionStatus as SessionStatus,
          scheduledStartTime: dto.scheduledStartTime,
          scheduledEndTime: dto.scheduledEndTime,
          actualStartTime: dto.actualStartTime,
          actualEndTime: dto.actualEndTime
        },
        update: {
          grandPrixId: dto.grandPrixId,
          type: dto.sessionType as SessionType,
          sessionCode: dto.sessionType.slice(0, 4),
          status: dto.sessionStatus as SessionStatus,
          scheduledStartTime: dto.scheduledStartTime,
          scheduledEndTime: dto.scheduledEndTime,
          actualStartTime: dto.actualStartTime,
          actualEndTime: dto.actualEndTime
        }
      });

      const persisted = await this.findSessionById(session.id);
      if (!persisted) {
        throw new Error(`Falha ao recuperar a sessão ${session.id.value} após salvar.`);
      }

      return persisted;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaGrandPrixRepository.saveSession(${session.id.value})`);
    }
  }

  /**
   * Recupera os resultados apurados de uma sessão ordenados por posição de classificação.
   *
   * @param sessionId - Identificador EntityId<'session'>.
   * @returns Coleção de SessionResult com tempos, voltas e status de homologação.
   */
  async findResultsBySession(sessionId: EntityId<'session'>): Promise<SessionResult[]> {
    try {
      const results = await this.prisma.sessionResult.findMany({
        where: {
          sessionEntry: {
            sessionId: sessionId.value
          }
        },
        include: {
          sessionEntry: {
            include: {
              seasonEntrant: true
            }
          }
        },
        orderBy: { positionOrder: 'asc' }
      });

      return results.map(r => {
        const entry = r.sessionEntry;
        const record: PrismaSessionResultRecord = {
          id: r.id,
          sessionId: entry.sessionId,
          driverId: entry.driverId,
          teamId: entry.seasonEntrant.teamId,
          constructorId: entry.seasonEntrant.constructorId || entry.seasonEntrant.teamId,
          position: r.classifiedPosition ?? r.positionOrder,
          lapsCompleted: r.completedLaps,
          finishStatus: r.finishStatus,
          totalTimeMillis: r.totalTimeMillis !== null ? Number(r.totalTimeMillis) : null,
          gapToLeaderMillis: r.gapToLeaderMillis !== null ? Number(r.gapToLeaderMillis) : null,
          fastestLapTimeMillis: r.fastestLapTimeMillis,
          fastestLapRank: r.fastestLapRank,
          homologationStatus: r.homologationStatus,
          revisionReason: null
        };

        return EventMapper.resultToDomain(record);
      });
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(
        error,
        `PrismaGrandPrixRepository.findResultsBySession(${sessionId.value})`
      );
    }
  }

  /**
   * Salva em lote os resultados de uma sessão garantindo atomicidade estrita em transação.
   *
   * @param results - Coleção imutável de resultados apurados da sessão.
   * @throws {EntityNotFoundError} Se o piloto não possuir inscrição formal prévia (SessionEntry) na sessão.
   * @throws {PersistenceError} Se qualquer gravação intermediária falhar, provocando rollback total.
   *
   * @remarks
   * Transacionalidade ($transaction):
   * Executa a validação e o upsert de cada `SessionResult` dentro de um único bloco transacional.
   * O vínculo `sessionEntryId` deve apontar para uma participação previamente formalizada.
   * Se o piloto não tiver `SessionEntry`, a operação rejeita a persistência sem fabricar dados fictícios.
   */
  async saveResults(results: readonly SessionResult[]): Promise<void> {
    if (results.length === 0) return;

    try {
      await this.prisma.$transaction(async tx => {
        for (const res of results) {
          const dto = EventMapper.resultToPersistence(res);

          const entry = await tx.sessionEntry.findFirst({
            where: {
              sessionId: dto.sessionId,
              driverId: dto.driverId
            }
          });

          if (!entry) {
            throw new EntityNotFoundError(
              `[PrismaGrandPrixRepository.saveResults] Piloto "${dto.driverId}" não está inscrito formalmente na sessão "${dto.sessionId}". Rejeitando gravação de resultado não rastreável.`
            );
          }

          const positionOrder = dto.position ?? 999;

          await tx.sessionResult.upsert({
            where: { sessionEntryId: entry.id },
            create: {
              id: dto.id,
              sessionEntryId: entry.id,
              positionOrder,
              classifiedPosition: dto.position,
              finishStatus: dto.finishStatus as FinishStatus,
              completedLaps: dto.lapsCompleted,
              totalTimeMillis: dto.totalTimeMillis !== null && dto.totalTimeMillis !== undefined ? BigInt(dto.totalTimeMillis) : null,
              gapToLeaderMillis: dto.gapToLeaderMillis !== null && dto.gapToLeaderMillis !== undefined ? BigInt(dto.gapToLeaderMillis) : null,
              fastestLapTimeMillis: dto.fastestLapTimeMillis,
              fastestLapRank: dto.fastestLapRank,
              homologationStatus: dto.homologationStatus as HomologationStatus
            },
            update: {
              positionOrder,
              classifiedPosition: dto.position,
              finishStatus: dto.finishStatus as FinishStatus,
              completedLaps: dto.lapsCompleted,
              totalTimeMillis: dto.totalTimeMillis !== null && dto.totalTimeMillis !== undefined ? BigInt(dto.totalTimeMillis) : null,
              gapToLeaderMillis: dto.gapToLeaderMillis !== null && dto.gapToLeaderMillis !== undefined ? BigInt(dto.gapToLeaderMillis) : null,
              fastestLapTimeMillis: dto.fastestLapTimeMillis,
              fastestLapRank: dto.fastestLapRank,
              homologationStatus: dto.homologationStatus as HomologationStatus
            }
          });
        }
      });
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, 'PrismaGrandPrixRepository.saveResults');
    }
  }
}
