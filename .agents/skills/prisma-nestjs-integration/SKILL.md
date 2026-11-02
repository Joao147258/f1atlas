---
name: prisma-nestjs-integration
description: Integrar o Prisma ORM 7 com NestJS gerenciando ciclo de vida de conexões, driver adapter MariaDB e repositórios desacoplados.
---

# prisma-nestjs-integration — Integração Prisma ORM 7 com NestJS e MariaDB

## Ativação e propósito

Orientar a configuração, injeção de dependências e gerenciamento do ciclo de vida do Prisma ORM 7 no ecossistema NestJS utilizando o driver adapter oficial `@prisma/adapter-mariadb` e repositórios desacoplados.

- **Quando acionar:** Na implementação ou refatoração de `PrismaService`, `PrismaModule`, repositórios de persistência e injeção de dependências no backend NestJS.
- **Quando NÃO acionar:** Para desenho e modelagem puramente conceitual de entidades esportivas (utilizar `domain-modeling`) ou migração de banco em produção (utilizar `prisma-migrations`).

## Pré-condições

- Consultar `docs/specs/engineering/SPEC-PERSIST-001.md` e `docs/architecture/adr/0002-prisma-mysql-persistence.md`.
- Confirmar versões fixadas: `prisma@7.10.1`, `@prisma/client@7.10.1` e `@prisma/adapter-mariadb@7.10.1`.
- Respeitar o princípio Backend First: o domínio em `packages/domain` nunca deve importar `@prisma/client`, `@prisma/` ou `@nestjs/common`.

## Procedimento

1. **Isolamento Arquitetural da Camada de Persistência**:
   - Localizar a camada de persistência em `apps/api/src/infrastructure/database/prisma/`.
   - Garantir que o `schema.prisma` reside em `apps/api/prisma/schema.prisma` com `output = "../src/generated/prisma"`.
   - Garantir que `prisma.config.ts` governa a URL de conexão da CLI via `DATABASE_URL`.
2. **Ciclo de Vida do PrismaService no NestJS**:
   - Implementar `PrismaService` como singleton injetável estendendo `PrismaClient` com os hooks `OnModuleInit` e `OnModuleDestroy` do NestJS.
   - **Regra de Import:** Importar `PrismaClient` estritamente do caminho gerado (`apps/api/src/generated/prisma/client.js`), e NUNCA de `@prisma/client` diretamente na camada de aplicação/serviço.
   - No `onModuleInit`, inicializar a conexão via `await this.$connect()` com timeout e tratamento explícito de falhas.
   - No `onModuleDestroy`, desconectar graciosamente via `await this.$disconnect()` para liberar o pool de conexões do MySQL.
3. **Driver Adapter MariaDB e Controle de Pool**:
   - Instanciar `@prisma/adapter-mariadb` através do factory `createMariaDbAdapter`:
     ```typescript
     import { PrismaMariaDb } from '@prisma/adapter-mariadb';
     import { PrismaClient } from '../../../generated/prisma/client.js';

     const adapter = new PrismaMariaDb({
       host: process.env.DB_HOST || 'localhost',
       port: Number(process.env.DB_PORT) || 3306,
       connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 5, // Limite seguro para Hostinger
       connectTimeout: 10000
     });
     const prisma = new PrismaClient({ adapter });
     ```
   - Evitar criar instâncias múltiplas de `PrismaClient` por requisição (usar escopo padrão singleton provido pelo `PrismaModule`).
4. **Camada de Repositórios e Mappers**:
   - Criar adaptadores de repositório em `apps/api/src/infrastructure/database/prisma/repositories/` que implementam interfaces/ports da aplicação.
   - Traduzir modelos gerados do Prisma para entidades puras do domínio através de mappers tipados estáticos (ex.: `InfrastructureHealthMapper`).
5. **Tratamento de Exceções de Infraestrutura**:
   - Capturar erros conhecidos do Prisma (`PrismaClientKnownRequestError` com códigos P2002 para colisão de chaves, P2025 para registro não encontrado, P1001 para timeout) e mapeá-los para exceções semânticas da aplicação antes de propagar para controllers HTTP.

## Validação

- Executar `node scripts/architecture/verify-boundaries.mjs` para comprovar que o domínio permanece desacoplado do Prisma.
- Executar `node scripts/database/check-generated-client.mjs` para validar a presença e integridade dos artefatos do client gerado.
- Executar `node scripts/database/check-prisma-version.mjs` para comprovar ausência de regressões para Prisma 6.
- Executar os testes unitários do NestJS: `npm run test:api`.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Conexões órfãs esgotando pool MySQL | Falta de encerramento no ciclo de vida do NestJS | Implementar `OnModuleDestroy` com `await this.$disconnect()` |
| Import direto de `@prisma/client` | Quebra de isolamento de código gerado no monorepo | Importar exclusivamente do caminho local `src/generated/prisma/client.js` |
| Exceção `P2002` vazando para o controller | Falta de tratamento de erro no repositório | Mapear `P2002` para `ConflictException` ou erro de domínio correspondente |
| Timeout de conexão na inicialização | Host MySQL inacessível ou sem resposta | Verificar variáveis `DB_HOST`/`DB_PORT` e aplicar fallback seguro em desenvolvimento |

### Limitações
- Nunca expor instâncias do `PrismaClient` diretamente para controladores ou serviços de domínio.
- Nunca criar transações de longa duração sem controle de timeout, prevenindo travamento do pool MySQL.

## Entregáveis

- `PrismaService` e `PrismaModule` configurados com ciclo de vida seguro em `apps/api/src/infrastructure/database/prisma/`.
- Repositórios implementando contratos e interfaces da aplicação, com mappers isolando as entidades.
- Relatório de validação arquitetural e conformidade de persistência aprovado.
