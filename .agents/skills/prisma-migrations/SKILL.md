---
name: prisma-migrations
description: Governar a evolução versionada de schemas com Prisma Migrate, validação de migrations e proteção contra operações destrutivas.
---

# prisma-migrations — Governança e Validação de Migrations

## Ativação e propósito

Governar o ciclo de criação, revisão, validação e aplicação de migrations versionadas do banco de dados MySQL utilizando o Prisma Migrate no Prisma ORM 7, garantindo rastreabilidade histórica e proteção contra comandos destrutivos.

- **Quando acionar:** Sempre que uma alteração estrutural no schema exigir criação de nova migration, verificação de histórico ou preparação para deploy.
- **Quando NÃO acionar:** Para testes unitários que utilizam mocks sem persistência ou para modificações provisórias ad hoc em banco compartilhado.

## Pré-condições

- Consultar `docs/specs/engineering/SPEC-PERSIST-001.md` e `docs/architecture/adr/0002-prisma-mysql-persistence.md`.
- Confirmar que as alterações no `apps/api/prisma/schema.prisma` foram validadas previamente via `validate-schema.mjs`.
- Confirmar que o ambiente de destino é um banco isolado e descartável de desenvolvimento ou teste.

## Procedimento

1. **Diferenciação Rigorosa de Ambientes**:
   - **Desenvolvimento Local:** Utilizar `prisma migrate dev --name <descricao_em_snake_case>` em banco MySQL local isolado.
   - **Geração Obrigatória do Client (Regra Prisma 7):** No Prisma 7, `migrate dev` NÃO gera o Prisma Client automaticamente; é mandatório executar `npm run db:generate` (`prisma generate`) após a migração.
   - **Seeding Explícito (Regra Prisma 7):** No Prisma 7, seeds devem ser executados explicitamente via `npm run prisma:seed --workspace=@f1atlas/api`, nunca presumindo disparo automático.
   - **Produção (Hostinger):** Executar exclusivamente `prisma migrate deploy` através de rotina supervisionada de implantação, após auditoria com `prisma migrate status`.
2. **Revisão Obrigatória do Arquivo SQL Gerado**:
   - Inspecionar o `migration.sql` gerado dentro de `apps/api/prisma/migrations/<timestamp>_<nome>/`.
   - Verificar ausência de comandos destrutivos perigosos (ex.: `DROP DATABASE`, `TRUNCATE`).
   - Avaliar impacto de `DROP TABLE` ou `DROP COLUMN` em dados históricos existentes.
3. **Auditoria de Histórico e Detecção de Drift**:
   - Executar `npx prisma migrate status` para validar alinhamento entre o histórico versionado e o banco de dados.
   - Auditar o histórico de migrations para detectar alterações retroativas ilegais ou arquivos corrompidos.
4. **Governança de Operações Proibidas**:
   - Bloquear terminantemente o uso de `prisma migrate reset` em bancos persistentes.
   - Bloquear o uso de `prisma db push` em homologação ou produção.
   - Bloquear a execução de migrations durante hooks de pre-commit, pre-push ou durante o build de artefatos.

## Validação

- Executar `node scripts/database/check-migrations.mjs` para checar nomenclatura cronológica (`YYYYMMDDHHMMSS_nome`) e ausência de SQL malicioso.
- Executar `node scripts/database/validate-schema.mjs` para certificar que o schema reflete as migrations aplicadas.
- Executar `node scripts/database/check-prisma-version.mjs` para certificar conformidade contínua com Prisma 7.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Validador reprova pasta de migration | Nome fora da convenção `YYYYMMDDHHMMSS_nome` | Renomear a pasta para carimbo temporal cronológico de 14 dígitos e descrição |
| Comando `DROP DATABASE` detectado | Migration gerada com instrução destrutiva proibida | Remover o comando destrutivo do `migration.sql` e revisar o modelo |
| Drift detectado entre schema e banco | Alterações manuais aplicadas diretamente no MySQL | Reverter mutações manuais e aplicar via migration versionada |
| Client Prisma desatualizado após migrate | Esquecimento do `prisma generate` (comportamento Prisma 7) | Executar `npm run db:generate` imediatamente após a migração |

### Limitações
- Nunca alterar o conteúdo de um arquivo de migration após seu versionamento e aplicação em outros ambientes.
- Jamais executar migrações de banco contra produção durante testes locais ou pipelines de CI.

## Entregáveis

- Arquivo `migration.sql` versionado e revisado sob `apps/api/prisma/migrations/`.
- Relatório de verificação de integridade aprovado pelo script `check-migrations.mjs`.
