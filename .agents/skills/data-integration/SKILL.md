---
name: data-integration
description: Integrar fontes de dados externas autorizadas com normalização, proveniência, resolução de identidades e isolamento via adaptadores.
---

# data-integration — Integração e Ingestão de Dados Externos

## Ativação e propósito

Conduzir a ingestão, validação de esquemas, normalização de dados esportivos e resolução de identidades provenientes de APIs e arquivos externos autorizados (ex.: OpenF1, Jolpica), garantindo isolamento através de portas e adaptadores.

- **Quando acionar:** No desenvolvimento ou manutenção de clientes HTTP de dados esportivos, parsers de telemetria externa, mapeadores de identidades de pilotos/equipes e rotinas de importação de calendário.
- **Quando NÃO acionar:** Antes da verificação de conformidade de licenciamento comercial e redistribuição (ver `SPEC-DATA-001.md`).

## Pré-condições

- Consultar `AGENTS.md` (Seção 5 — Integridade de Dados, Direitos e Informação Confiável) e `docs/specs/product/SPEC-DATA-001.md`.
- **Regra de Não Confiança**: Tratar todos os dados de provedores externos como entradas não confiáveis, sujeitas a schema validation rigorosa antes de alcançar a aplicação.
- Nunca embutir chaves de API secretas ou credenciais em código versionado.

## Procedimento

1. **Isolamento em Porta e Adaptador (Hexagonal Architecture)**:
   - Declarar a interface de porta no Domínio/Aplicação (ex.: `ExternalGrandPrixDataProviderPort`).
   - Implementar o adaptador na camada de Infraestrutura (`apps/api/src/infrastructure/external/`).
2. **Validação Estrita de Esquema na Fronteira**:
   - Definir schemas de validação para cada resposta de API externa.
   - Rejeitar payloads que não correspondam aos tipos esperados ou que contenham dados corrompidos.
3. **Resolução de Identidades e Mapeamento Temporal**:
   - Manter tabela de mapeamento entre IDs externos do provedor (ex.: `"max_verstappen"`, `"verstappen_1"`) e a identidade canônica interna do F1Atlas (`driver-max-verstappen-uuid`).
   - Mapear nomes de equipes históricas para evitar criação de construtores duplicados devido a patrocinadores de temporada.
4. **Normalização e Rastreabilidade de Proveniência**:
   - Converter datas para padrão ISO 8601 UTC.
   - Converter tempos de volta para milissegundos inteiros (`lapTimeMs`).
   - Registrar metadados de proveniência em cada registro importado:
     - `sourceProvider`: nome do provedor de dados.
     - `ingestedAt`: timestamp UTC da importação.
     - `externalRevisionId`: hash ou versão da resposta do provedor.
5. **Tratamento de Resiliência (Timeout, Rate Limits e Fallback)**:
   - Configurar timeout estrito (ex.: 5000ms) para chamadas HTTP externas.
   - Implementar retentativas com backoff exponencial para erros transitórios (HTTP 429, 502, 503).
   - Utilizar cache local ou dados estáticos de fallback quando a API externa estiver fora do ar.

## Validação

- Executar testes automatizados com fixtures sintéticas offline: `npm run test:harness`.
- Validar que credenciais de API não são expostas nos testes ou logs: `npm run verify:security`.
- Simular respostas com campos ausentes, duplicados ou com formatação inválida, garantindo que o adaptador falha de modo seguro (*fail-closed*).

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Driver duplicado com nomes divergentes | Provedor externo alterou grafia ou slug | Consultar a tabela de resolução de apelidos (*aliases*) antes de criar novo piloto |
| Ingestão quebrando por campo ausente | Provedor removeu ou renomeou campo | Tornar o campo opcional no schema do parser e registrar aviso de diagnóstico |
| Bloqueio por limite de requisições (429) | Disparo excessivo sem throttling | Implementar fila de requisições com taxa máxima permitida pelo provedor |
| Dados externos corrompendo resultados oficiais | Importação direta sem conferência de estado | Isolar dados importados em estado `PROVISIONAL` até validação por súmula oficial |

### Limitações
- APIs públicas gratuitas não garantem SLA nem direito de redistribuição comercial; sempre verificar autorizações.

## Entregáveis

- Adaptador HTTP de integração implementado na camada de infraestrutura.
- Schemas de validação e tabela de mapeamento de identidades.
- Fixtures sintéticas de teste reproduzindo cenários nominais e de erro.
- Relatório de Ingestão de Dados com registros importados, proveniência e integridade verificada.
