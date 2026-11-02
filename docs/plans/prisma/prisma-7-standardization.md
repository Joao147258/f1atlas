# F1Atlas — Correção e padronização definitiva do Prisma ORM 7

**Status: proposta de execução futura — não executada nesta tarefa.**

## Missão

Auditar e corrigir uma implementação que mistura padrões, dependências ou configurações do Prisma ORM 6 e 7.

Decisão obrigatória:

**Prisma ORM 7 + NestJS + MySQL.**

Não utilizar Prisma 6 como alternativa nem migrar automaticamente para Prisma 8.

Preservar implementação válida e não recriar a API do zero.

## Referências oficiais

- https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- https://www.prisma.io/docs/ai/prompts/prisma-7
- https://www.prisma.io/docs/guides/v7/frameworks/nestjs
- https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql
- https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference
- https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production

## Auditoria

Inspecionar:

- Dependências e lockfile.
- Prisma CLI.
- Prisma Client.
- Driver adapter.
- Schema e generator.
- Prisma Config.
- Imports.
- PrismaService e PrismaModule.
- ESM e runtime NestJS.
- Scripts e testes.
- Migrations e seeds.
- Documentação, agentes e skills.
- Quality gates.

## Compatibilidade obrigatória

- `prisma` major 7.
- `@prisma/client` major 7.
- Adapter MariaDB compatível.
- Generator `prisma-client`.
- Diretório de saída explícito.
- Datasource MySQL.
- Prisma Config conforme versão.
- Client importado do caminho gerado.
- Instanciação com driver adapter.
- Runtime NestJS compatível.
- Geração explícita do Client.
- Seeding explícito.

Não instalar automaticamente a versão mais recente.

## Generator

Exemplo conceitual:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

O output deve ser ajustado ao workspace real.

## Datasource

```prisma
datasource db {
  provider = "mysql"
}
```

## Prisma Config

Exemplo de configuração, sujeito à versão instalada:

```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

Validar os caminhos.

## Driver adapter

Utilizar `@prisma/adapter-mariadb`.

Não embutir credenciais, não abrir novas conexões a cada requisição e não utilizar diretamente o ORM no domínio.

## NestJS

Verificar configuração ESM, TypeScript, imports gerados, decorators, build e inicialização no runtime compilado.

Não migrar o monorepo inteiro para ESM sem análise de impacto.

## Migrations

Distinguir desenvolvimento, testes e produção.

Não usar `migrate dev` em produção, `migrate reset` em bancos persistentes nem migrations automáticas em builds.

Não presumir que migrations geram automaticamente o Client.

## Regressão

Criar verificadores que identifiquem:

- Dependências Prisma incompatíveis.
- Generator legado.
- Imports incorretos.
- Adapter ausente.
- Configuração antiga.
- Comandos incompatíveis.
- Documentação operacional obsoleta.

Evitar falsos positivos em documentação histórica.

## Testes

Verificar versões, schema, config, geração, NestJS, build, runtime e integração MySQL isolada.

Não declarar integração real validada se não houver conexão com banco de teste.

## Harness

Atualizar instruções dos agentes e skills afetados, preservando fontes canônicas.

## Restrições

Não executar operações destrutivas, migrations de produção, alterações remotas, deploy, commit ou push sem autorização.

## Relatório

Produzir diagnóstico, inventário de incompatibilidades, alterações, versões, testes, segurança, governança e pendências.

Estados:

- `PRISMA 7 VERIFIED`
- `PRISMA 7 PARTIALLY VERIFIED`
- `PRISMA 7 MIGRATION BLOCKED`
