---
name: prisma-operations
description: Conduzir operações controladas de manutenção, diagnóstico de conexão MySQL, geração de cliente e auditoria de persistência.
---

# prisma-operations — Operações e Manutenção de Persistência

## Ativação e propósito

Conduzir operações técnicas de rotina, diagnósticos de conectividade, geração de cliente e manutenção do ecossistema Prisma ORM 7 no F1Atlas, respeitando os limites da infraestrutura e hospedagem Hostinger.

- **Quando acionar:** Em rotinas de preflight de persistência, auditoria de conexão, geração de artefatos locais e diagnóstico de falhas de pool.
- **Quando NÃO acionar:** Para alterações no schema sem revisão arquitetural ou aplicação autônoma de migrations destrutivas.

## Pré-condições

- Consultar `docs/specs/engineering/SPEC-PERSIST-001.md`, `docs/architecture/adr/0002-prisma-mysql-persistence.md` e `AGENTS.md` (Seção 12).
- Garantir que parâmetros de conexão venham de variáveis sanitizadas e não vazem em logs de execução.
- Verificar que comandos que modifiquem o banco exijam autorização humana prévia caso afetem dados persistentes.

## Procedimento

1. **Geração Segura de Artefatos (Prisma 7)**:
   - Invocar `npm run db:generate` (`npm run prisma:generate --workspace=@f1atlas/api`) após alterações validadas no schema.
   - Confirmar geração dos artefatos em `apps/api/src/generated/prisma/client.js` e `apps/api/src/generated/prisma/models/`.
   - Auditar os artefatos gerados com `npm run db:check-generated` antes de compilar com `npm run build:api`.
2. **Proteção Anti-Regressão**:
   - Executar `npm run db:check-version` para auditar que dependências, schemas e códigos ativos não utilizam padrões obsoletos do Prisma 6 ou Prisma 8.
3. **Diagnóstico de Conectividade e Pool**:
   - Verificar resolução de DNS, latência de rede e handshake TLS com o servidor MySQL/MariaDB da Hostinger.
   - Validar limites de conexões simultâneas do pool (`connectionLimit: 5`) para evitar esgotamento de recursos compartilhados.
4. **Preflight de Persistência**:
   - Executar verificador integrado `npm run db:verify` antes de procedimentos de deploy.
   - Confirmar alinhamento entre o schema versionado e o estado esperado do banco.
5. **Sanitização de Registros e Logs**:
   - Mascarar senhas, tokens de autenticação e credenciais em relatórios e saídas de terminal.

## Validação

- Executar `node scripts/database/validate-schema.mjs` (ou `npm run db:validate`) para checar sintaxe e conformidade do schema.
- Executar `node scripts/database/check-generated-client.mjs` (ou `npm run db:check-generated`) para checar que o client gerado está pronto e íntegro.
- Executar `node scripts/database/check-prisma-version.mjs` (ou `npm run db:check-version`) para validar ausência de regressões.
- Executar `node scripts/database/run-database-verify.mjs` (ou `npm run db:verify`) para consolidar o estado de prontidão da persistência.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Client gerado ausente ao rodar build | Falta de execução do `prisma generate` após checkout limpo | Executar `npm run db:generate` para materializar os arquivos tipados |
| Conexão rejeitada com erro de handshake TLS | Servidor remoto exigindo certificado SSL | Configurar flags de SSL/TLS nos parâmetros de conexão do driver adapter |
| Esgotamento do pool de conexões (Too many connections) | Parâmetro `connectionLimit` configurado com valor excessivo | Reduzir o limite do pool para 5 conexões simultâneas em `PrismaService` |
| Credencial de banco exposta no terminal | Log imprimindo `process.env.DATABASE_URL` integral | Utilizar máscara `***` em senhas e tokens antes de exibir diagnósticos |

### Limitações
- Não tentar acessar bancos de dados remotos da Hostinger sem credenciais autorizadas e canal seguro (TLS).
- Se a conexão falhar por timeout ou credencial incorreta, emitir diagnóstico estruturado sem repetir segredos.

## Entregáveis

- Relatório de status operacional da persistência sanitizado e auditável.
- Artefatos do Prisma Client gerados de forma reproduzível em `apps/api/src/generated/prisma`.
