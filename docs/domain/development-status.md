# Acompanhamento de Desenvolvimento da Camada Domain

> **Localização:** `docs/domain/development-status.md`  
> **Papel:** Índice oficial e centralizado de status de implementação e evidências da camada `packages/domain`  
> **Documento pai:** [README.md](./README.md)  
> **Última atualização:** 2026-11-02 (Fundação v0.2 / Início da Camada Domain)  

---

## 1. Objetivo e Princípios de Governança

Este documento consolida o estado real de implementação da camada **Domain** (`packages/domain/src`). Ele atua como o registro oficial de progresso para desenvolvedores e agentes de IA, garantindo que:

1. **Fidelidade à Realidade:** Um componente só é marcado como `Implementado` quando código TypeScript executável existe e compila; comentários JSDoc e esqueletos de arquivos representam estado `Documentado`.
2. **Evidência Obrigatória:** Um componente só é promovido a `Validado` quando testes unitários automatizados cobrem suas regras de negócio e os quality gates aprovam sua execução.
3. **Fonte Canônica Única de Status:** As páginas individuais dos módulos em `docs/domain/` descrevem conceitos, regras e limites; o estado de maturidade e acompanhamento reside **exclusivamente aqui**, evitando tabelas divergentes.

---

## 2. Vocabulário Padronizado de Estados

Para manter a consistência em todo o projeto, são utilizados os seguintes estados formais:

| Estado | Significado e Critério |
|---|---|
| **Planejado** | Responsabilidade e necessidade identificadas conceitualmente, sem especificação ou arquivo associado. |
| **Documentado** | Arquivo existente com documentação arquitetural e de operações (níveis 1 e 2 em comentários TypeScript), sem implementação de código executável. |
| **Em desenvolvimento** | Implementação de código funcional iniciada, mas incompleta ou com pendências de assinatura. |
| **Implementado** | Código funcional completo existente e tipado, mas com suite de testes formal ou cobertura ainda pendente. |
| **Validado** | Implementação concluída com testes automatizados executando com sucesso e quality gates aprovados sem ressalvas. |
| **Em revisão** | Componente existente sendo reavaliado ou modificado em virtude de mudança de especificação ou refatoração. |
| **Bloqueado** | Desenvolvimento interrompido por dependência externa não resolvida ou decisão de arquitetura pendente. |

---

## 3. Painel Executivo por Módulo

| Módulo | Documento do Módulo | Componentes Totais | Implementados | Validados | Estado Consolidado |
|---|---|:---:|:---:|:---:|---|
| **shared** | [shared.md](./shared.md) | 3 | 1 | 1 | **Em desenvolvimento** (1 implementado e validado; 2 documentados) |
| **seasons** | [seasons.md](./seasons.md) | 2 | 0 | 0 | **Documentado** (estrutura planejada via comentários) |
| **participants** | [participants.md](./participants.md) | 4 | 0 | 0 | **Documentado** |
| **events** | [events.md](./events.md) | 5 | 0 | 0 | **Documentado** |
| **scoring** | [scoring.md](./scoring.md) | 3 | 0 | 0 | **Documentado** |
| **championships** | [championships.md](./championships.md) | 3 | 0 | 0 | **Documentado** |
| **simulations** | [simulations.md](./simulations.md) | 2 | 0 | 0 | **Documentado** |
| **Total** | — | **22** | **1** | **1** | **Fundação Estruturada** |

---

## 4. Detalhamento Componente a Componente

### 4.1. Módulo `shared`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `shared/domain-error.ts` | Classe base `DomainError`, factory `createDomainError`, códigos semânticos e type guard `isDomainError`. | **Validado** | - Suíte persistente em `packages/domain/test/shared/domain-error.test.ts` (19 testes unitários aprovados via `npm run test:domain`).<br/>- Cobertura de código: 100% linhas, 93.75% branches, 100% funções (`npm run test:coverage`).<br/>- Mutation testing: 100% de score (7/7 mutantes eliminados via `npm run test:mutation`).<br/>- Qualidade de testes auditada via `scripts/quality/verify-test-quality.mjs`.<br/>- Quality gate `verify:architecture` aprovado sem acoplamento a frameworks. | Nenhuma pendência imediata. Suíte piloto de referência de testes e mutação concluída. |
| `shared/entity-id.ts` | Value Object base para identidades imutáveis e tipadas. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Implementar classe/tipo `EntityId`, validações de string não vazia e sanitização (`trim`). |
| `shared/result.ts` | Container monádico (`Result<T, E>`) para canal explícito de sucesso/falha. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Implementar métodos `ok`, `fail` e `combine`. |

### 4.2. Módulo `seasons`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `seasons/season.ts` | Raiz de agregado para coordenação de calendário da temporada. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda implementação de `shared/entity-id.ts` e `shared/result.ts`. |
| `seasons/season-status.ts` | Máquina de estados e validação de transições regulamentares. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Implementar enums/tipos e função pura `isValidTransition`. |

### 4.3. Módulo `participants`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `participants/driver.ts` | Entidade durável de piloto e número permanente de carreira. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda primitivas de `shared`. |
| `participants/team.ts` | Entidade comercial competidora inscrita perante a FIA. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda primitivas de `shared`. |
| `participants/constructor.ts` | Fabricante oficial do chassi homologado para o WCC. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda primitivas de `shared`. |
| `participants/season-entry.ts` | Vínculo contratual e temporal por temporada e etapa. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda entidades base de participantes. |

### 4.4. Módulo `events`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `events/grand-prix.ts` | Raiz de agregado do fim de semana de Grande Prêmio. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda módulo `seasons`. |
| `events/circuit.ts` | Entidade física de autódromo, traçado e fuso horário. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda primitivas de `shared`. |
| `events/session.ts` | Sessão cronometrada em pista (Treino, Quali, Sprint, Corrida). | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda `grand-prix.ts`. |
| `events/session-entry.ts` | Alinhamento e posições de largada/pit lane de participantes. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda `session.ts`. |
| `events/session-result.ts` | Registro de chegada, tempos, voltas, status e homologação FIA. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda `session.ts`. |

### 4.5. Módulo `scoring`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `scoring/scoring-ruleset.ts` | Configuração das tabelas de pontos FIA por temporada. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Implementar tabelas de 2025 (volta rápida = 0). |
| `scoring/points-calculator.ts` | Serviço de cálculo determinístico por sessão. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda `scoring-ruleset.ts` e `session-result.ts`. |
| `scoring/tie-break-policy.ts` | Algoritmo determinístico de desempate por *countback*. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Implementar comparador de posições sequenciais. |

### 4.6. Módulo `championships`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `championships/driver-standings.ts` | Tabela consolidada do Campeonato de Pilotos (WDC). | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda motor de `scoring`. |
| `championships/constructor-standings.ts` | Tabela consolidada do Campeonato de Construtores (WCC). | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda motor de `scoring`. |
| `championships/standings-calculator.ts` | Serviço orquestrador de classificação geral acumulada. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda tabelas de standings e `scoring`. |

### 4.7. Módulo `simulations`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `simulations/championship-scenario.ts` | Sandbox de cenário hipotético ("What-If"). | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda `championships` e `events`. |
| `simulations/scenario-evaluator.ts` | Avaliador de cenários e cálculo de teto matemático de pontos. | **Documentado** | Planejamento nível 1 e 2 concluído no arquivo. | Aguarda `championship-scenario.ts`. |

---

## 5. Regras de Atualização Contínua

Ao realizar qualquer alteração na camada de domínio, o desenvolvedor ou agente de IA deve obrigatoriamente seguir as seguintes regras neste arquivo:

1. **Atualização Simultânea:** Alterações que mudem o estado de um arquivo (ex.: de `Documentado` para `Implementado` ou `Validado`) devem atualizar a tabela correspondente na mesma entrega.
2. **Registro de Evidências:** Ao mover para `Validado`, registrar quais comandos, suítes de teste ou verificadores comprovaram a correção.
3. **Bloqueios Explícitos:** Se o desenvolvimento for impedido por uma dúvida de regulamento ou dependência não resolvida, o estado deve ser marcado como `Bloqueado` e a pendência descrita na coluna correspondente.
