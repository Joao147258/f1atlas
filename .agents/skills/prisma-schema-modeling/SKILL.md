---
name: prisma-schema-modeling
description: Modelar schemas relacionais no Prisma ORM 7 com tipos MySQL, constraints, índices determinísticos e integridade referencial.
---

# prisma-schema-modeling — Modelagem de Schemas Relacionais no Prisma ORM 7

## Ativação e propósito

Definir, evoluir e auditar o modelo de dados relacional em `apps/api/prisma/schema.prisma` com foco em integridade, tipos nativos do MySQL/MariaDB, constraints de unicidade, índices eficientes e conformidade com a linha Prisma ORM 7.

- **Quando acionar:** Ao desenhar ou alterar tabelas, relacionamentos, constraints de unicidade, chaves estrangeiras ou índices no schema Prisma.
- **Quando NÃO acionar:** Para inventar tabelas de regras esportivas sem especificação prévia aprovada em `docs/specs/domain/` ou para aplicar migrations diretamente em servidores.

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

1. **Mapeamento de Entidades para Persistência**:
   - Avaliar as entidades puras de domínio aprovadas e projetar a estrutura relacional normalizada correspondente.
   - Definir identificadores estáveis (`id String @id @default(uuid())`).
   - Mapear nomes de tabelas para `snake_case` com `@@map` e colunas com `@map` quando aplicável.
2. **Tipos e Constraints MySQL**:
   - Utilizar tipos nativos adequados para MySQL (`@db.VarChar`, `@db.Text`, `@db.Decimal(10, 3)` para telemetria/tempos de volta, `@db.DateTime(3)` para precisão temporal de milissegundos).
   - Estabelecer constraints de unicidade compostas para chaves naturais de negócio (ex.: `@@unique([seasonYear, roundNumber])`).
   - Declarar explicitamente integridade referencial com ações controladas (`onDelete: Restrict` ou `Cascade` somente quando justificado).
3. **Indexação Estratégica**:
   - Projetar índices secundários com `@@index` baseados nos padrões reais de consulta dos casos de uso e listagens.
4. **Campos Temporais e Auditoria**:
   - Incluir `createdAt DateTime @default(now())` e `updatedAt DateTime @updatedAt` para rastreabilidade de dados.
5. **Prevenção de Modelagem Prematura**:
   - Não adicionar tabelas desnecessárias ou modelos esportivos que não possuam especificações e testes prontos.
6. **Validação Estática**:
   - Executar o validador determinístico de schema para verificar sintaxe e proibições de governança.

## Validação

- Executar `node scripts/database/validate-schema.mjs` (ou `npm run db:validate`) para checar conformidade estática, integridade de blocos e ausência de modelos não autorizados.
- Executar `node scripts/database/check-prisma-version.mjs` para certificar ausência de generator ou configurações legadas.
- Em ambiente de desenvolvimento com banco isolado, validar geração com `npx prisma validate`.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Validador rejeita generator `prisma-client-js` | Uso de generator legado do Prisma 6 | Atualizar para `provider = "prisma-client"` com output explícito |
| Validador reprova URL no datasource | Conexão declarada dentro do `schema.prisma` | Remover `url` do schema e declará-la exclusivamente em `prisma.config.ts` |
| Erro de precisão em milissegundos | Coluna `DateTime` sem precisão fracionária | Utilizar `@db.DateTime(3)` para preservar frações de segundo |
| Modelo esportivo não aprovado no schema | Tabela adicionada sem SPEC correspondente | Submeter SPEC de persistência antes de introduzir novas tabelas relacionais |

### Limitações
- Proibido utilizar `db push` como substituto de modelagem estruturada e migrations versionadas.
- Proibido utilizar tipos proprietários não suportados pelo MySQL/MariaDB.

## Entregáveis

- Schema Prisma documentado e consistente em `apps/api/prisma/schema.prisma`.
- Relatório de validação estática aprovado sem avisos ou violações estruturais via `db:validate`.
