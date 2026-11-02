---
name: prisma-testing
description: Projetar e executar testes determinísticos de persistência, mapeadores, transações e integração contra banco MySQL isolado.
---

# prisma-testing — Testes de Persistência e Integração com MySQL

## Ativação e propósito

Orientar o planejamento, implementação e execução de testes automatizados determinísticos de persistência com Prisma ORM 7, distinguindo testes de mappers, contratos de repositório e testes de integração com banco MySQL isolado.

- **Quando acionar:** Na criação de suítes de teste para repositórios, validação de transações, constraints relacionais e integridade de dados.
- **Quando NÃO acionar:** Para testes unitários puros de lógica esportiva no domínio (utilizar `test-design`).

## Pré-condições

- Consultar `docs/specs/engineering/SPEC-PERSIST-001.md` e `docs/architecture/adr/0002-prisma-mysql-persistence.md`.
- Garantir que o ambiente de teste com banco MySQL seja 100% isolado, efêmero e não compartilhe credenciais com produção.
- Reconhecer que mocks unitários validam lógica de mapeamento, mas não substituem testes reais de integração contra MySQL.

## Procedimento

1. **Pirâmide de Testes de Persistência**:
   - **Nível 1 (Unitário / Mappers):** Testar conversão bidirecional entre entidades de domínio e modelos do Prisma em memória, sem necessidade de banco de dados (`InfrastructureHealthMapper.toApplication`).
   - **Nível 2 (Repositórios com Test-Doubles):** Validar chamadas de método e comportamento de transação isolada utilizando stubs controlados e injeção do NestJS (`Test.createTestingModule`).
   - **Nível 3 (Integração com MySQL Real):** Executar sobre instância descartável de banco (container efêmero local ou serviço de CI).
2. **Ciclo de Vida do Banco de Testes e Status SKIP**:
   - Confirmar que a URL de conexão aponta explicitamente para banco de teste (`_test` ou ambiente isolado).
   - Se o daemon MySQL ou container de teste estiver indisponível no ambiente local, o teste de rede relata status explícito **`SKIP (banco MySQL isolado indisponível)`**, sem emitir falsos positivos de `PASS` simulado e sem falhar o quality gate da fundação.
   - Aplicar migrations versionadas via `prisma migrate deploy`.
   - Limpar fixtures entre casos de teste para garantir idempotência.
   - Encerrar conexões graciosamente no encerramento da suíte via `onModuleDestroy()` / `$disconnect()`.
3. **Casos de Teste Mandatórios**:
   - Teste de inserção e consulta de registros válidos.
   - Teste de unicidade (violação de `@unique` lançando erro de constraint tratado).
   - Teste de transações atômicas (rollback automático em caso de falha intermediária).
   - Teste de integridade referencial com chaves estrangeiras.

## Validação

- Executar os testes automatizados do harness via `npm run test:harness`.
- Executar `node scripts/database/run-database-verify.mjs` para validações estáticas preliminares.
- Executar `node scripts/database/check-prisma-version.mjs` para certificar que os testes respeitam Prisma ORM 7.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Teste de persistência falhando em CI limpo | Tentativa de conectar em MySQL sem servidor ativo | Emitir status SKIP documentado informando que o banco de teste está ausente |
| Testes interferindo entre si | Ausência de limpeza de tabelas entre execuções | Executar rotina de truncagem ou delete de fixtures no hook `afterEach` |
| Erro de constraint ignorado | Teste capturando exceção sem assert | Verificar que o erro esperado (`PrismaClientKnownRequestError`) é realmente lançado |
| Conexão não finalizada travando processo | Falta de `$disconnect()` ao final do teste | Adicionar hook `afterAll` garantindo desconexão do PrismaClient |

### Limitações
- Jamais executar testes de integração contra banco de dados de produção ou homologação da Hostinger.
- Bloquear testes caso o identificador do banco não confirme seu status descartável.

## Entregáveis

- Testes de mapeadores e repositórios em `apps/api/src/infrastructure/database/prisma/tests/` ou `scripts/tests/`.
- Evidências determinísticas de execução positiva, negativa e tratamento adequado de indisponibilidade de banco (status SKIP justificado).
