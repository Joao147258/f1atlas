# ADR-0002 — Fundação de Persistência com Prisma ORM 7 e MySQL no NestJS

**Estado:** approved

## Contexto

A plataforma F1Atlas necessita de uma camada de persistência relacional fortemente tipada para o backend NestJS, alinhada à infraestrutura de hospedagem da Hostinger (baseada em MariaDB/MySQL). 

A arquitetura do F1Atlas é guiada pelo princípio **Backend First**, onde as regras e entidades de domínio esportivo devem ser 100% isoladas de detalhes de persistência, drivers e frameworks web. Ao mesmo tempo, precisamos de migrations determinísticas, controle de schema versionável, facilidade de testes automatizados e integração limpa com injeção de dependências do NestJS.

Investigamos as versões disponíveis do Prisma ORM e observamos:
1. O **Prisma ORM 7** (especificamente `7.10.1`) é uma versão estável e madura com suporte estabelecido para MySQL e MariaDB através do adapter oficial `@prisma/adapter-mariadb`.
2. O **Prisma ORM 8** apresenta mudanças arquiteturais profundas, eliminando ou alterando mecanismos de engine e driver adapters, sem oferecer estabilidade equivalente para MySQL/MariaDB no momento da decisão.

## Decisão proposta

Adotar o **Prisma ORM 7** (`7.10.1`) com o driver adapter `@prisma/adapter-mariadb` e NestJS na camada de infraestrutura da API (`apps/api/src/infrastructure/database/prisma/`), com MySQL/MariaDB como banco relacional subjacente.

### Diretrizes obrigatórias da decisão:
1. **Fixação estrita de versão:** Fixar `prisma`, `@prisma/client` e `@prisma/adapter-mariadb` na versão estável `7.10.1`, sem tags flutuantes (`latest`) e sem upgrades automáticos para major 8 ou solução paliativa com Prisma 6.
2. **Arquitetura Prisma 7:** Generator padronizado com `provider = "prisma-client"` e `output` explícito em `apps/api/src/generated/prisma`. Conexão governada via `prisma.config.ts`.
3. **Driver Adapter Oficial:** Instanciação do PrismaClient exclusivamente com o driver adapter `@prisma/adapter-mariadb` e driver nativo `mariadb@3.5.4`.
4. **Isolamento do Domínio:** O Prisma Client é confinado à camada de infraestrutura (`PrismaService` e adaptadores de repositório). O domínio (`packages/domain`) não conhece nem importa o Prisma.
5. **Mapeamento Explícito:** Entidades de domínio puras são convertidas de e para modelos de banco através de mappers tipados.
6. **Governança de Migrations:** Migrations declarativas em `apps/api/prisma/migrations/`, com auditoria estática de integridade, bloqueio de `db push` em ambientes compartilhados e deploy controlado via `prisma migrate deploy`.

## Alternativas e trade-offs

- **Drizzle ORM:**
  - *Prós:* Menor overhead de runtime, SQL fluente muito próximo ao SQL nativo.
  - *Contras:* Menor maturidade no ecossistema NestJS, ecossistema de migrations menos unificado e maior esforço manual para gerenciamento de shadow database.
- **TypeORM:**
  - *Prós:* Tradicionalmente integrado ao NestJS via `@nestjs/typeorm`.
  - *Contras:* Histórico de instabilidade em migrations complexas, modelo de active record/Data Mapper com decorators pesados que incentivam acoplamento do domínio, tipagem menos rigorosa que a gerada pelo Prisma Schema.
- **Prisma ORM 8:**
  - *Prós:* Nova geração de arquitetura.
  - *Contras:* Falta de estabilidade comprovada para MySQL/MariaDB e driver adapters na linha 8 no momento atual; risco elevado de quebra e instabilidade.
- **Decisão:** A estabilidade da linha 7 do Prisma ORM oferece o melhor equilíbrio entre segurança de tipos, controle estrito de migrations e previsibilidade operacional na Hostinger.

## Consequências e riscos

- **Pontos Positivos:**
  - Schema declarativo centralizado com validação automatizada.
  - TypeScript types gerados automaticamente a partir do schema para a camada de infraestrutura.
  - Migrations reproduzíveis e auditáveis via scripts determinísticos.
  - Suporte completo ao lifecycle do NestJS (`OnModuleInit` e `OnModuleDestroy`).
- **Riscos e Mitigações:**
  - *Risco de acoplamento do domínio:* Mitigado pelo validador arquitetural `scripts/architecture/verify-boundaries.mjs` que bloqueia qualquer import de `@prisma/` no domínio.
  - *Limites de conexões na Hostinger:* Mitigado pela configuração adequada do pool de conexões no driver adapter MariaDB e desconexão graciosa no shutdown.
  - *Necessidade de Shadow Database no desenvolvimento:* Documentada na SPEC-PERSIST-001 e na skill `prisma-migrations`.

## Evidências, revisões e data

- **Data da aprovação:** 2026-11-01
- **Normas de referência:** `SPEC-PERSIST-001`, `AGENTS.md` (Seção 3), `ARCHITECTURE.md` (Seção 9)
- **Verificadores:** `npm run db:validate`, `npm run db:check-generated`, `npm run db:verify`, `npm run verify:architecture`
