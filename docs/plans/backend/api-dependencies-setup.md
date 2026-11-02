# F1Atlas — Instalação e validação das dependências da API NestJS

**Status: proposta de execução futura — não executada nesta tarefa.**

## Missão

Preparar `apps/api` com as dependências necessárias para:

- NestJS.
- TypeScript.
- Prisma ORM 7.
- MySQL.
- `@prisma/adapter-mariadb`.
- Configuração de ambiente.
- Testes.
- Quality gates.

Não implementar endpoints, models esportivos, migrations ou funcionalidades.

## Reconhecimento

Consultar governança, `package.json` raiz e API, lockfile, gerenciador de pacotes, versões, configurações Prisma, scripts e testes.

Não recriar a API se ela existir.

Não executar `prisma init` se o Prisma já estiver configurado.

## Documentação

- https://docs.nestjs.com/first-steps
- https://docs.nestjs.com/techniques/configuration
- https://www.prisma.io/docs/guides/v7/frameworks/nestjs
- https://www.prisma.io/docs/v7/prisma-orm/quickstart/mysql
- https://www.prisma.io/docs/orm/v7/reference/system-requirements

## Dependências a avaliar

### Runtime

- `@nestjs/common`
- `@nestjs/core`
- Adaptador HTTP aprovado.
- `reflect-metadata`
- `rxjs`
- `@nestjs/config`
- `@prisma/client` major 7.
- `@prisma/adapter-mariadb`.
- Driver necessário.
- `dotenv` quando utilizado em runtime.

### Desenvolvimento

- `prisma` major 7.
- `typescript`.
- `@types/node`.
- `@nestjs/testing`.
- Ferramentas já adotadas de teste e lint.
- `tsx` quando justificado.

### Opcionais

- `class-validator`
- `class-transformer`

Não instalar pacotes apenas porque aparecem em tutoriais.

## Prisma

- Fixar versões compatíveis da linha 7.
- Preservar lockfile.
- Não utilizar Prisma 6 ou 8.
- Não utilizar `prisma@latest`.
- Generator `prisma-client`.
- Output explícito.
- Adapter MariaDB.
- Imports do Client gerado.
- Configuração oficial da versão instalada.

Não criar outro ORM.

## Monorepo

Instalar no workspace `apps/api`, respeitando a estratégia de dependências existente.

Não criar lockfile independente se o monorepo usa lockfile central.

Não modificar frontend desnecessariamente.

## Ambiente

Validar contratos de variáveis, sem sobrescrever `.env` existente nem expor credenciais.

CLI Prisma e runtime NestJS podem carregar configuração de maneira diferente.

## Build e runtime

Verificar Node.js, TypeScript, NestJS, ESM e compatibilidade com Hostinger.

Não declarar build válido apenas porque as dependências foram instaladas.

## Testes

Reutilizar framework de testes existente.

Não instalar ferramentas redundantes.

Testes de persistência devem utilizar MySQL isolado.

## Scripts

Verificar comandos de desenvolvimento, typecheck, build, testes, Prisma validate e Prisma generate.

Não incluir migrations de produção no build.

## Validação

- Instalação.
- Dependências resolvidas.
- Lockfile.
- Prisma version.
- Prisma validate.
- Prisma generate.
- Typecheck.
- Build.
- Testes pertinentes.
- Quality gates.
- Segurança de dependências.

Não utilizar `npm audit fix --force`.

## Restrições

Não criar modelos esportivos, APIs, migrations ou alterações no MySQL da Hostinger.

Não realizar commit, push, deploy ou operações de banco.

Não gerar consultas SQL manuais.

## Entrega

Relatório de dependências anteriores e atuais, versões, compatibilidade, alterações, testes, vulnerabilidades, riscos e pendências.

Estados:

- `API DEPENDENCIES READY`
- `API DEPENDENCIES PARTIALLY READY`
- `API DEPENDENCIES BLOCKED`
