---
name: api-contracts
description: Definir contratos estáveis de API (DTOs, schemas, endpoints e status de erro) sem vazar modelos de persistência ou domínio.
---

# api-contracts — Engenharia de Contratos Públicos de API

## Ativação e propósito

Especificar, validar e governar os contratos de interface pública (DTOs de entrada e saída, schemas de validação, convenções de rotas e códigos de erro HTTP) entre os serviços de backend e seus consumidores (portal Next.js, clientes móveis e integrações).

- **Quando acionar:** Na criação ou evolução de endpoints REST, DTOs de transporte, esquemas de validação de payload ou na definição de payloads de erro.
- **Quando NÃO acionar:** Para regras internas de negócio do domínio desportivo (utilizar `domain-modeling`) ou esquemas físicos do banco de dados (utilizar `prisma-schema-modeling`).

## Pré-condições

- Consultar `ARCHITECTURE.md` (Seção 10 — Contratos e Comunicação entre Camadas) e `packages/contracts/`.
- **Princípio do Não Vazamento**: Modelos de persistência do Prisma e entidades internas do domínio nunca devem ser expostos diretamente através da API pública.
- Todos os identificadores públicos devem ser estáveis e seguros (ex.: UUIDs ou slugs semânticos, nunca IDs auto-incrementais expostos).

## Procedimento

1. **Definição de DTOs e Schemas Fortemente Tipados**:
   - Estruturar interfaces TypeScript sob `packages/contracts/` compartilhadas entre backend e frontend.
   - Definir regras de validação para cada campo: tipos primitivos, enums fechados, valores mínimos/máximos e formatos estritos.
2. **Padronização de Unidades e Tipos de Dados**:
   - Timestamps obrigatoriamente no padrão **ISO 8601 UTC** (`2025-11-09T17:00:00Z`).
   - Tempos de volta e setores obrigatoriamente em **milissegundos inteiros** (`lapTimeMs: 72450`).
   - Velocidades em quilômetros por hora (`speedKmh: 342.5`).
3. **Identificação Explícita do Estado do Dado**:
   - Incluir campo discriminatório obrigatório em respostas de resultados desportivos:
     - `status`: `"PROVISIONAL"`, `"OFFICIAL"`, `"REVISED"`, `"SIMULATED"`.
4. **Estrutura Padronizada de Erros (RFC 7807 / Problem Details)**:
   - Estruturar payloads de erro com:
     - `statusCode`: código HTTP (`400`, `401`, `403`, `404`, `409`, `422`, `500`).
     - `error`: identificador textual do erro (ex.: `"NOT_FOUND"`, `"VALIDATION_FAILED"`).
     - `message`: mensagem explicativa sanitizada sem vazamento de stack trace ou dados internos.
     - `timestamp`: momento do erro em UTC.
5. **Versionamento e Compatibilidade**:
   - Proibir breaking changes em contratos vigentes sem estratégia documentada de versionamento de rotas (ex.: `/api/v1/`).
6. **Implementação de Testes de Contrato**:
   - Criar testes que validam se as respostas reais da API satisfazem estritamente o schema TypeScript declarado.

## Validação

- Executar testes de contrato na API: `npm run test:api`.
- Validar conformidade de tipos em toda a aplicação: `npm run typecheck:api`.
- Verificar ausência de vazamento de entidades nos contratos: `npm run verify:architecture`.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Chave primária numérica interna exposta | Retorno direto de model Prisma no controller | Mapear para DTO público ocultando campos de infraestrutura |
| Erro de formato de data no frontend | Backend retornando timestamp sem fuso ou formato local | Forçar serialização em `.toISOString()` UTC no mapper |
| Resultado simulado confundido com oficial | Ausência de propriedade discriminatória | Adicionar obrigatoriamente `isSimulation: boolean` no DTO de resposta |
| Stack trace de banco vazando em erro 500 | Falta de filtro global de exceções no NestJS | Sanitizar mensagens de erro capturadas na camada de transporte HTTP |

### Limitações
- Contratos de API garantem a estabilidade da interface; não executam a lógica de negócios das regras esportivas.

## Entregáveis

- Interfaces TypeScript de DTOs e tipos de resposta em `packages/contracts/`.
- Schemas de validação de payload integrados aos controladores de API.
- Suíte de testes de contrato automatizados.
- Relatório de Conformidade de API com endpoints especificados e compatibilidade atestada.
