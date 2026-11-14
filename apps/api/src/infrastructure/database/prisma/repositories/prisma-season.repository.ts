/**
 * ============================================================================
 * F1Atlas — Camada Infrastructure | Database: PrismaSeasonRepository
 * ============================================================================
 *
 * @component PrismaSeasonRepository
 * @module apps/api/src/infrastructure/database/prisma/repositories/prisma-season.repository
 * @layer Infrastructure (Persistência Relacional)
 * @implements {ISeasonRepository} (apps/api/src/application/ports/season-repository.port.ts)
 *
 * Responsabilidade Arquitetural:
 * Fornecer o adaptador concreto de persistência relacional para o ciclo de vida
 * e consulta da raiz de agregado `Season` (Temporadas de Fórmula 1). Consome o
 * `PrismaService` singleton para operações em MySQL/MariaDB e delega a tradução
 * e validação estrutural ao `SeasonMapper`.
 *
 * Limites e Conformidade:
 * - Clean Architecture & Hexagonal: Implementa estritamente a porta de aplicação
 *   `ISeasonRepository`, assegurando que o Domínio (`packages/domain`) permaneça 100%
 *   livre de anotações, classes ou tipos do Prisma ORM ou drivers de banco.
 * - Fronteira do Agregado e Consistência Transacional: A raiz de agregado `Season`
 *   governa o calendário anual (`ScheduledGrandPrix`). O método `save` realiza a persistência
 *   da temporada e a sincronização atômica das datas e rodadas das etapas em `$transaction`.
 * - Tratamento Defensivo: Encapsula falhas do Prisma Client através do `PrismaErrorHandler`,
 *   convertendo exceções conhecidas (P2002 de ano duplicado) em exceções de persistência
 *   sem vazar stack traces ou detalhes do motor SQL.
 *
 * Riscos de Manutenção:
 * - Alterar a reidratação sem utilizar o `SeasonMapper.toDomain` contorna as regras
 *   do domínio (validação de ano >= 1950 e integridade de status).
 * - Omitir o isolamento em `$transaction` na operação `save` pode gerar estados parciais
 *   onde a temporada é atualizada mas os vínculos do calendário permanecem dessincronizados.
 * ============================================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import type { Season, EntityId } from '@f1atlas/domain';
import type { ISeasonRepository } from '../../../../application/ports/season-repository.port.js';
import { PrismaService } from '../prisma.service.js';
import { SeasonMapper, type PrismaSeasonRecord } from '../../../mappers/season.mapper.js';
import { PrismaErrorHandler } from '../errors/prisma-error-handler.js';

@Injectable()
export class PrismaSeasonRepository implements ISeasonRepository {
  private readonly logger = new Logger(PrismaSeasonRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Localiza uma temporada por seu identificador durável e único.
   *
   * @param id - Identificador tipado nominal EntityId<'season'>.
   * @returns Raiz de agregado Season reconstituída com seu calendário, ou null se inexistente.
   * @throws {PersistenceError} Em caso de falha de conexão ou corrupção de dados.
   *
   * @remarks
   * Utiliza cláusula `include: { grandsPrix: { orderBy: { roundNumber: 'asc' } } }`
   * para reidratar a lista ordenada de Grandes Prêmios que compõem o calendário oficial.
   */
  async findById(id: EntityId<'season'>): Promise<Season | null> {
    try {
      const record = await this.prisma.season.findUnique({
        where: { id: id.value },
        include: {
          grandsPrix: {
            orderBy: { roundNumber: 'asc' }
          }
        }
      });

      if (!record) {
        return null;
      }

      return SeasonMapper.toDomain(record as unknown as PrismaSeasonRecord);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaSeasonRepository.findById(${id.value})`);
    }
  }

  /**
   * Localiza uma temporada pelo ano do campeonato mundial.
   *
   * @param year - Ano do campeonato (ex.: 2025).
   * @returns Raiz de agregado Season reconstituída ou null se não encontrada.
   * @throws {PersistenceError} Se ocorrer falha no driver ou inconsistência no registro.
   */
  async findByYear(year: number): Promise<Season | null> {
    try {
      const record = await this.prisma.season.findUnique({
        where: { year },
        include: {
          grandsPrix: {
            orderBy: { roundNumber: 'asc' }
          }
        }
      });

      if (!record) {
        return null;
      }

      return SeasonMapper.toDomain(record as unknown as PrismaSeasonRecord);
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaSeasonRepository.findByYear(${year})`);
    }
  }

  /**
   * Lista todas as temporadas cadastradas na plataforma.
   *
   * @param order - Critério de ordenação temporal pelo ano ('asc' ou 'desc', padrão 'desc').
   * @returns Coleção imutável de raízes de agregado Season.
   * @throws {PersistenceError} Se o banco estiver indisponível.
   */
  async findAll(order: 'asc' | 'desc' = 'desc'): Promise<Season[]> {
    try {
      const records = await this.prisma.season.findMany({
        orderBy: { year: order },
        include: {
          grandsPrix: {
            orderBy: { roundNumber: 'asc' }
          }
        }
      });

      return records.map(record => SeasonMapper.toDomain(record as unknown as PrismaSeasonRecord));
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, 'PrismaSeasonRepository.findAll');
    }
  }

  /**
   * Salva ou atualiza a raiz de agregado Season e sincroniza o calendário em transação atômica.
   *
   * @param season - Instância do agregado Season do Domínio.
   * @returns Entidade recarregada e reconstituída a partir da persistência física.
   * @throws {UniqueConstraintViolationError} Se houver conflito de ano único (P2002).
   * @throws {PersistenceError} Se qualquer etapa da transação atômica falhar.
   *
   * @remarks
   * Transacionalidade ($transaction):
   * Executa a gravação idempotente do registro mestre de Season e itera sobre a coleção
   * de `ScheduledGrandPrix` do agregado, sincronizando as datas e ordens das etapas pré-existentes.
   * Caso ocorra qualquer falha, todas as alterações são revertidas (rollback).
   */
  async save(season: Season): Promise<Season> {
    try {
      const dto = SeasonMapper.toPersistence(season);

      await this.prisma.$transaction(async tx => {
        // 1. Upsert na tabela principal de Season
        await tx.season.upsert({
          where: { id: dto.id },
          create: {
            id: dto.id,
            year: dto.year,
            officialName: dto.officialName,
            status: dto.status,
            startDate: dto.startDate,
            endDate: dto.endDate
          },
          update: {
            year: dto.year,
            officialName: dto.officialName,
            status: dto.status,
            startDate: dto.startDate,
            endDate: dto.endDate
          }
        });

        // 2. Sincronização atômica das etapas do calendário associadas à temporada
        for (const gp of season.grandPrixList) {
          const grandPrixId = gp.grandPrixId.value;
          const existingGp = await tx.grandPrix.findUnique({
            where: { id: grandPrixId }
          });

          if (existingGp) {
            await tx.grandPrix.update({
              where: { id: grandPrixId },
              data: {
                seasonId: dto.id,
                roundNumber: gp.roundNumber,
                officialName: gp.name,
                startDate: gp.startDate ?? existingGp.startDate,
                endDate: gp.endDate ?? existingGp.endDate
              }
            });
          }
        }
      });

      // Recarrega o agregado completo recém-persistido para garantir conformidade
      const persisted = await this.findById(season.id);
      if (!persisted) {
        throw new Error(`Falha ao recuperar a temporada ${season.id.value} após salvar.`);
      }

      return persisted;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaSeasonRepository.save(${season.id.value})`);
    }
  }

  /**
   * Verifica a existência de registro de temporada para determinado ano.
   *
   * @param year - Ano do campeonato.
   * @returns true se já existir registro cadastrado, false caso contrário.
   */
  async existsByYear(year: number): Promise<boolean> {
    try {
      const count = await this.prisma.season.count({
        where: { year }
      });
      return count > 0;
    } catch (error: unknown) {
      throw PrismaErrorHandler.handle(error, `PrismaSeasonRepository.existsByYear(${year})`);
    }
  }
}
