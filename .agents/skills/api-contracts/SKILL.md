---
name: api-contracts
description: Definir contratos estáveis de API (DTOs, schemas, endpoints e status de erro) sem vazar modelos de persistência ou domínio.
---

# api-contracts

## Ativação e propósito
Especificar e validar as interfaces públicas e contratos de dados trocados entre o backend e os consumidores (web, apps e integrações).
- **Quando acionar:** Ao criar ou modificar endpoints REST, DTOs de entrada e saída, payloads de erro ou contratos de comunicação entre camadas.
- **Quando NÃO acionar:** Para regras de negócio internas ou cálculos esportivos de pontuação (utilizar `domain-modeling` ou `scoring-rules`).

## Pré-condições
- Consultar `ARCHITECTURE.md` (Seção 10), `docs/architecture/data-flow.md` e `packages/contracts/`.
- Garantir que contratos de apresentação não ditem nem contaminem as entidades do domínio.

## Procedimento
1. **Preparação:** Definir contratos em TypeScript/ESM compartilhados sob `packages/contracts` ou DTOs na camada Application.
2. **Investigação:**
   - Mapear identificadores estáveis (slugs, UUIDs ou IDs de domínio).
   - Definir unidades explícitas (ex.: milissegundos para tempos de volta, km/h para velocidade).
   - Padronizar datas e horários em formato ISO 8601 UTC.
   - Declarar explicitamente status do dado: `provisorio`, `oficial`, `corrigido`, `simulado`.
3. **Decisão:** Estruturar códigos de erro padronizados (`NOT_FOUND`, `INVALID_PAYLOAD`, `UNAUTHORIZED`, `CONFLICT`) com mensagens sem dados sensíveis.
4. **Execução:** Escrever schemas de validação e interfaces de DTO.
5. **Validação:** Criar testes de contrato garantindo que payloads de resposta correspondam aos tipos esperados.
6. **Entrega:** Contratos versionados e testados, prontos para consumo pelo frontend e backend.

## Validação
- Executar testes de contrato em `scripts/tests/` via `npm run test:harness`.
- Validar que mudanças incompatíveis sejam versionadas para evitar quebras em clientes existentes.

## Falhas e limites
- Não expor campos internos do banco de dados (chaves primárias numéricas sequenciais, metadados de infraestrutura) diretamente na API.
- Não retornar dados simulados misturados com dados oficiais sem indicador inequívoco de tipo.

## Entregáveis
- Interfaces de contrato em `packages/contracts/`, schemas de validação de payload e suíte de testes de contrato de API.
