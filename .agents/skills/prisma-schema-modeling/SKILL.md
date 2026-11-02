---
name: prisma-schema-modeling
description: Modelar schemas relacionais no Prisma ORM 7 com tipos MySQL, constraints, índices determinísticos e integridade referencial.
---

# prisma-schema-modeling

## Ativação e propósito
Definir e evoluir o modelo de dados relacional em `apps/api/prisma/schema.prisma` com foco em integridade, índices eficientes e conformidade com MySQL/MariaDB na linha Prisma ORM 7.
- **Quando acionar:** Ao desenhar ou alterar tabelas, relacionamentos, constraints de unicidade, chaves estrangeiras ou índices no schema Prisma.
- **Quando NÃO acionar:** Para inventar tabelas de regras esportivas sem especificação formal em `docs/specs/domain/` ou para aplicar migrations diretamente em servidores.

## Pré-condições
- Consultar `docs/specs/engineering/SPEC-PERSIST-001.md` e `docs/architecture/adr/0002-prisma-mysql-persistence.md`.
- Verificar que o schema adota os padrões canônicos do Prisma ORM 7:
  ```prisma
  generator client {
    provider = "prisma-client"
    output   = "../src/generated/prisma"
  }

  datasource db {
    provider = "mysql"
  }
  ```
- Confirmar que a URL de conexão reside estritamente em `prisma.config.ts`, e não no schema.
- Seguir o princípio de que o schema relacional atende às necessidades dos casos de uso, e não o contrário.

## Procedimento
1. **Mapeamento de Entidades para Persistência:**
   - Avaliar as entidades puras de domínio aprovadas e projetar a estrutura relacional normalizada correspondente.
   - Definir identificadores estáveis (`id String @id @default(uuid())` ou chaves compostas quando estritamente aplicável).
   - Mapear nomes de tabelas para `snake_case` com `@@map` e colunas com `@map` quando aplicável.
2. **Tipos e Constraints MySQL:**
   - Utilizar tipos nativos adequados para MySQL (`@db.VarChar`, `@db.Text`, `@db.Decimal(10, 3)` para telemetria/tempos de volta, `@db.DateTime(3)` para precisão temporal de milissegundos).
   - Estabelecer constraints de unicidade compostas para chaves naturais de negócio (ex.: `@@unique([seasonYear, roundNumber])`).
   - Declarar explicitamente integridade referencial com ações controladas (`onDelete: Restrict` ou `Cascade` somente quando justificado).
3. **Indexação Estratégica:**
   - Projetar índices secundários com `@@index` baseados nos padrões reais de consulta dos casos de uso e listagens.
4. **Campos Temporais e Auditoria:**
   - Incluir `createdAt DateTime @default(now())` e `updatedAt DateTime @updatedAt` quando houver necessidade de rastreabilidade.
5. **Prevenção de Modelagem Prematura:**
   - Não adicionar tabelas desnecessárias ou modelos esportivos que não possuam especificações e testes prontos.
6. **Validação Estática:**
   - Executar o validador determinístico de schema para verificar sintaxe e proibições de governança.

## Validação
- Executar `node scripts/database/validate-schema.mjs` (ou `npm run db:validate`) para checar conformidade estática, integridade de blocos e ausência de modelos não autorizados.
- Executar `node scripts/database/check-prisma-version.mjs` para certificar ausência de generator ou configurações legadas.
- Em ambiente de desenvolvimento com banco isolado, validar geração com `npx prisma validate`.

## Falhas e limites
- Proibido criar tabelas de domínio esportivo sem SPEC aprovada (violação da SPEC-PERSIST-001).
- Proibido utilizar `provider = "prisma-client-js"` ou colocar `url = env("DATABASE_URL")` dentro do schema.
- Proibido utilizar tipos proprietários ou não suportados pelo MySQL/MariaDB.
- Não utilizar `db push` como substituto de modelagem estruturada e migrations versionadas.

## Entregáveis
- Schema Prisma documentado e consistente em `apps/api/prisma/schema.prisma`.
- Relatório de validação estática aprovado sem avisos ou violações estruturais.
