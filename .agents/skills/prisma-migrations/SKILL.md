---
name: prisma-migrations
description: Governar a evolução versionada de schemas com Prisma Migrate, validação de migrations e proteção contra operações destrutivas.
---

# prisma-migrations

## Ativação e propósito
Governar o ciclo de criação, revisão, validação e aplicação de migrations versionadas do banco de dados MySQL utilizando o Prisma Migrate no Prisma ORM 7.
- **Quando acionar:** Sempre que uma alteração estrutural no schema exigir criação de nova migration, verificação de histórico ou preparação para deploy.
- **Quando NÃO acionar:** Para testes unitários que utilizam mocks sem persistência ou para modificações provisórias ad hoc em banco compartilhado.

## Pré-condições
- Consultar `docs/specs/engineering/SPEC-PERSIST-001.md` e `docs/architecture/adr/0002-prisma-mysql-persistence.md`.
- Confirmar que as alterações no `apps/api/prisma/schema.prisma` foram validadas previamente via `validate-schema.mjs`.
- Confirmar que o ambiente de destino é um banco isolado e descartável de desenvolvimento ou teste.

## Procedimento
1. **Diferenciação Rigorosa de Ambientes:**
   - **Desenvolvimento Local:** Utilizar `prisma migrate dev --name <descricao_em_snake_case>` em banco MySQL local isolado. Requer shadow database para validação de integridade pelo Prisma.
   - **Geração Obrigatória do Client (Regra Prisma 7):** No Prisma 7, `migrate dev` NÃO gera o Prisma Client automaticamente; é mandatório executar `npm run db:generate` (`prisma generate`) após a migração.
   - **Seeding Explícito (Regra Prisma 7):** No Prisma 7, seeds devem ser executados explicitamente via `prisma db seed` (`npm run prisma:seed --workspace=@f1atlas/api`), nunca presumindo disparo automático.
   - **Testes Automatizados (CI):** Aplicar migrations versionadas via `prisma migrate deploy` sobre instância limpa descartável.
   - **Produção (Hostinger):** Executar exclusivamente `prisma migrate deploy` através de rotina supervisionada de implantação, após auditoria com `prisma migrate status`.
2. **Revisão Obrigatória do Arquivo SQL Gerado:**
   - Inspecionar o `migration.sql` gerado dentro de `apps/api/prisma/migrations/<timestamp>_<nome>/`.
   - Verificar ausência de comandos destrutivos perigosos (ex.: `DROP DATABASE`, `TRUNCATE`).
   - Avaliar impacto de `DROP TABLE` ou `DROP COLUMN` em dados históricos existentes.
3. **Auditoria de Histórico e Detecção de Drift:**
   - Executar `prisma migrate status` para validar alinhamento entre o histórico versionado e o banco de dados.
   - Auditar o histórico de migrations para detectar alterações retroativas ilegais ou arquivos corrompidos.
4. **Governança de Operações Proibidas:**
   - Bloquear terminantemente o uso de `prisma migrate reset` em bancos persistentes.
   - Bloquear o uso de `prisma db push` em homologação ou produção.
   - Bloquear a execução de migrations durante hooks de pre-commit, pre-push ou durante o build de artefatos.

## Validação
- Executar `node scripts/database/check-migrations.mjs` para checar nomenclatura cronológica (`YYYYMMDDHHMMSS_nome`) e ausência de SQL malicioso.
- Executar `node scripts/database/validate-schema.mjs` para certificar que o schema reflete as migrations aplicadas.
- Executar `node scripts/database/check-prisma-version.mjs` para certificar conformidade contínua com Prisma 7.

## Falhas e limites
- Nunca alterar o conteúdo de um arquivo de migration após seu versionamento e aplicação em outros ambientes.
- Se uma migration falhar em produção, interromper o deploy imediatamente e seguir o runbook de recuperação documental sem aplicar correções manuais ocultas.
- Jamais executar migrações de banco contra produção durante testes locais ou pipelines de CI.

## Entregáveis
- Arquivo `migration.sql` versionado e revisado sob `apps/api/prisma/migrations/`.
- Relatório de verificação de integridade aprovado pelo script `check-migrations.mjs`.
