# SPEC-PERSIST-001 — Fundação de Persistência com Prisma ORM 7, NestJS e MySQL

**Estado:** approved  
**Tipo:** especificação verificável  
**Fonte normativa:** `AGENTS.md` (Seções 3, 4, 10, 11 e 12), `ARCHITECTURE.md` (Seção 9)  
**Agente responsável:** `prisma-engineer`  
**Skills associadas:**  
- `.agents/skills/prisma-nestjs-integration/SKILL.md`  
- `.agents/skills/prisma-schema-modeling/SKILL.md`  
- `.agents/skills/prisma-migrations/SKILL.md`  
- `.agents/skills/prisma-testing/SKILL.md`  
- `.agents/skills/prisma-operations/SKILL.md`  

---

## Motivação

O F1Atlas exige uma fundação de persistência relacional determinística, robusta e desacoplada do domínio esportivo. O backend NestJS utiliza MySQL/MariaDB na infraestrutura (compatível com a hospedagem Hostinger). O ORM adotado deve prover segurança de tipos (type safety), migrations rastreáveis, lifecycle hooks previsíveis no NestJS e drivers otimizados, sem permitir o vazamento de detalhes de persistência para as entidades ou regras de negócio esportivas.

---

## Escopo e regras de engenharia

### 1. Política estrita de versões (Prisma 7 vs Prisma 8)
- A fundação adota exclusivamente a linha estável **Prisma ORM 7** (`7.10.1`), com fixação determinística no `package.json` e `package-lock.json`.
- É expressamente proibido o uso de `prisma@latest` ou a migração automática para a linha **Prisma ORM 8**, uma vez que a versão 8 introduz rupturas arquiteturais profundas e não possui suporte estável comprovado para driver adapters MySQL/MariaDB.
- O driver adapter oficial adotado para integração com MySQL/MariaDB é o `@prisma/adapter-mariadb` (versão fixada `7.10.1`, com driver `mariadb@3.5.4`).
- Qualquer atualização futura de versão do Prisma exigirá um ADR específico com comprovação de compatibilidade em ambiente de teste isolado.

### 2. Desacoplamento arquitetural e Backend First
- **Isolamento do Domínio:** O código do domínio em `packages/domain/` ou `apps/api/src/domain/` nunca importa `@prisma/client`, schemas Prisma, adaptadores ou decoradores do NestJS.
- **Camada de Infraestrutura:** O Prisma Client, `PrismaService` e `PrismaModule` residem estritamente sob `apps/api/src/infrastructure/database/prisma/`.
- **Inversão de Dependências:** O acesso a dados ocorre exclusivamente através de interfaces e contratos de repositório definidos na camada de domínio ou aplicação. A infraestrutura implementa essas interfaces e traduz registros de persistência em entidades puras via Mappers.
- **Tratamento de Exceções:** Erros nativos do Prisma (`PrismaClientKnownRequestError`, falhas de conexão ou violação de constraints) devem ser capturados e traduzidos na camada de infraestrutura em erros de domínio ou aplicação antes de qualquer propagação.

### 3. Governança do Schema, Configuração e Modelagem
- O schema canônico reside em `apps/api/prisma/schema.prisma`.
- A configuração oficial reside em `prisma.config.ts` (raiz e `apps/api/`), governando paths e URL via `DATABASE_URL`.
- O schema deve declarar explicitamente:
  - `generator client`: provider `prisma-client` com `output` explícito (`../src/generated/prisma`).
  - `datasource db`: provider `mysql` (sem URL hardcoded no schema).
- **Proibição de Modelos Esportivos Prematuros:** Não criar tabelas esportivas (pilotos, equipes, corridas) sem especificações funcionais previamente aprovadas em `docs/specs/domain/`.
- Para homologação da infraestrutura, utiliza-se exclusivamente um modelo técnico de verificação (`InfrastructureHealthCheck` ou `DatabaseMigrationBaseline`).

### 4. Ciclo de Vida e Integração NestJS
- `PrismaService` utiliza o cliente gerado e deve ser inicializado com o driver adapter oficial `@prisma/adapter-mariadb`.
- `PrismaService` implementa os hooks `OnModuleInit` e `OnModuleDestroy` do NestJS.
- O gerenciamento de conexões deve garantir o encerramento gracioso (`$disconnect`) na terminação da aplicação para evitar vazamento de pools de conexões em ambientes com limites restritos (como Hostinger).
- É proibido instanciar `PrismaClient` sob demanda ou a cada requisição HTTP (singleton injetável via `PrismaModule`).

### 5. Governança de Migrations por Ambiente
- **Desenvolvimento:** Criação controlada via `prisma migrate dev` em banco local ou container descartável.
- **Testes de Integração:** Execução em banco isolado e descartável (`migrate deploy` ou pipeline de teste).
- **Produção (Hostinger):** Execução exclusiva de migrations já versionadas via `prisma migrate deploy` através de processo controlado e manual/supervisionado.
- **Operações Proibidas:**
  - `prisma migrate reset` em bancos persistentes ou compartilhados.
  - `prisma db push` em ambientes de homologação ou produção.
  - Execução de migrations durante o build de artefatos ou no pre-commit/pre-push.
  - Alteração ou exclusão de migrations já aplicadas no histórico.

### 6. Segurança e Proteção de Credenciais
- Nenhuma string de conexão (`DATABASE_URL`), senha ou usuário deve ser persistida em repositório público ou impressa em logs.
- Arquivos `.env` contendo credenciais são estritamente privados e ignorados pelo Git. O arquivo `.env.example` deve conter apenas template sanitizado com placeholders.
- Verificadores determinísticos de pre-commit e scripts de segurança devem auditar a ausência de credenciais expostas.

---

## Critérios de aceitação

1. **Validação de Schema:** Execução de `npm run db:validate` valida a sintaxe, provider MySQL e integridade do schema Prisma sem alterar o arquivo.
2. **Geração Reproduzível:** Execução de `npm run db:generate` gera os artefatos do Prisma Client de forma determinística e verificável via `npm run db:check-generated`.
3. **Verificação de Migrations:** Script `npm run db:migrate:check` valida a nomenclatura, histórico e ausência de SQL malicioso nas migrations.
4. **Isolamento Arquitetural:** `npm run verify:architecture` comprova ausência de imports do Prisma no domínio esportivo.
5. **Quality Gates:** `npm run db:verify` e os scripts do harness integram-se ao fluxo do `npm run verify` e hooks Git.
6. **Segurança de Execução:** Tentativas de executar operações perigosas contra ambientes não explicitamente configurados como desenvolvimento/teste são bloqueadas imediatamente.

---

## Falhas, dependências e riscos

- **Indisponibilidade do Daemon MySQL/Docker:** Se o ambiente de execução não dispuser de daemon MySQL ativo ou permissão de socket Docker, as validações de schema, artefatos gerados, integridade estática e mocks estruturais devem executar normalmente em modo `PASS`, enquanto testes dependentes de rede direta com o banco relatam status explícito `SKIP (banco MySQL isolado indisponível)`, sem emitir falsos positivos nem bloquear pipelines locais offline.
- **Limites de Conexão na Hospedagem:** A Hostinger impõe limites no pool MySQL. O `PrismaService` deve utilizar pools configuráveis e desconexão graciosa.

---

## Evidências requeridas

1. Relatório de validação do schema Prisma sem erros sintáticos.
2. Comprovação da integridade dos artefatos gerados pelo client.
3. Execução dos testes automatizados de governança de banco (`npm run test:harness`).
4. Aprovação nos quality gates públicos (`npm run verify`) e locais (`npm run verify:local`).
