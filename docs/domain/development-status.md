# Acompanhamento de Desenvolvimento da Camada Domain

> **Localização:** `docs/domain/development-status.md`  
> **Papel:** Índice oficial e centralizado de status de implementação e evidências da camada `packages/domain`  
> **Documento pai:** [README.md](./README.md)  
> **Relatório de Auditoria:** `RELATORIO-AUDITORIA-M1-DOMAIN.md` (Local / M1 Domain)  
> **Última atualização:** 2026-11-12 (Milestone M2.1 — Integração e Consistência Transversal do Domínio Concluído e Homologado; 459 testes automatizados de domínio 100% PASS)  
> **Relatórios de Integração e Homologação:** `RELATORIO-REVISAO-CONTRATOS-INTEGRACOES.md`, `ESPECIFICACAO-INVARIANTES-TRANSVERSAIS.md` e `RELATORIO-HOMOLOGACAO-M2-1.md`  

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
| **shared** | [shared.md](./shared.md) | 3 | 3 | 3 | **Validado** (3 implementados e validados: DomainError, EntityId, Result) |
| **seasons** | [seasons.md](./seasons.md) | 3 | 3 | 3 | **Validado** (3 implementados e validados: season.ts, season-status.ts, season-event-validator.ts) |
| **participants** | [participants.md](./participants.md) | 4 | 4 | 4 | **Validado** (4 implementados e validados: driver.ts, team.ts, constructor.ts, season-entry.ts) |
| **events** | [events.md](./events.md) | 6 | 6 | 6 | **Validado** (6 implementados e validados: circuit.ts, grand-prix.ts, session.ts, session-entry.ts, session-result.ts, session-participant-validator.ts) |
| **scoring** | [scoring.md](./scoring.md) | 3 | 3 | 3 | **Validado** (3 implementados e validados: scoring-ruleset.ts, points-calculator.ts, tie-break-policy.ts) |
| **championships** | [championships.md](./championships.md) | 3 | 3 | 3 | **Validado** (3 implementados e validados: driver-standings.ts, constructor-standings.ts, standings-calculator.ts) |
| **simulations** | [simulations.md](./simulations.md) | 2 | 0 | 0 | **Documentado** |
| **Total** | — | **24** | **22** | **22** | **M1, M2 e M2.1 100% Concluídos e Homologados (459 testes totais do domínio com 8 suítes de integração transversal e ciclo esportivo completo)** |

---

## 4. Detalhamento Componente a Componente

### 4.1. Módulo `shared`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `shared/domain-error.ts` | Classe base `DomainError`, factory `createDomainError`, códigos semânticos e type guard `isDomainError`. | **Validado** | - Suíte persistente em `packages/domain/test/shared/domain-error.test.ts` (19 testes unitários aprovados via `npm run test:domain`).<br/>- Cobertura de código: 100% linhas, 93.75% branches, 100% funções (`npm run test:coverage`).<br/>- Mutation testing: 100% de score (7/7 mutantes eliminados via `npm run test:mutation`).<br/>- Qualidade de testes auditada via `scripts/quality/verify-test-quality.mjs`.<br/>- Quality gate `verify:architecture` aprovado sem acoplamento a frameworks. | Nenhuma pendência imediata. Suíte piloto de referência de testes e mutação concluída. |
| `shared/entity-id.ts` | Value Object genérico imutável para identidades tipadas de entidades via Phantom Types. | **Validado** | - Suíte persistente em `packages/domain/test/shared/entity-id.test.ts` e `packages/domain/test/shared/entity-id.type.test.ts` (21 testes unitários e de tipos aprovados via `npm run test:domain`).<br/>- Cobertura de código: 100% linhas, 97.44% branches, 100% funções (`npm run test:coverage`).<br/>- Mutation testing integrado: 100% de score (7/7 mutantes de EntityId eliminados, 14/14 mutantes consolidados via `npm run test:mutation`).<br/>- Qualidade de testes auditada via `scripts/quality/verify-test-quality.mjs`.<br/>- Conformidade de fronteira pura sem dependência externa auditada via `scripts/architecture/verify-boundaries.mjs`. | Nenhuma pendência imediata. Componente pronto para uso por entidades e agregados. |
| `shared/result.ts` | Container monádico (`Result<T, E>`) para canal explícito de sucesso/falha, getters defensivos e agregação determinística via `combine`. | **Validado** | - Suíte persistente em `packages/domain/test/shared/result.test.ts` e `packages/domain/test/shared/result.type.test.ts` (24 testes unitários e de tipos aprovados via `npm run test:domain`).<br/>- Cobertura consolidada do domínio: 99.23% linhas, 95.08% branches, 100% funções (`npm run test:coverage`).<br/>- Mutation testing integrado: 100% de score (7/7 mutantes de Result eliminados, 21/21 mutantes totais do domínio via `npm run test:mutation`).<br/>- Qualidade de testes auditada via `scripts/quality/verify-test-quality.mjs`.<br/>- Imutabilidade e salvaguardas verificadas em runtime via `Object.freeze(this)`. | Nenhuma pendência imediata. Módulo shared 100% operacional. |

### 4.2. Módulo `seasons`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `seasons/season.ts` | Raiz de agregado para coordenação de campeonato anual, agendamento de Grandes Prêmios, sequencialidade contínua e cancelamentos históricos. | **Validado** | - Suítes em `packages/domain/test/seasons/season.test.ts` e `packages/domain/test/seasons/season.type.test.ts` (45 testes unitários e de tipos aprovados via `npm run test:domain`).<br/>- Cobertura de código do módulo: 99.24% linhas, 94.74% branches, 98.82% funções (`npm run test:coverage`).<br/>- Mutation testing integrado: 100% de score (7/7 mutantes de Season eliminados, 35/35 mutantes consolidados no domínio via `npm run test:mutation`).<br/>- Invariantes de ano (>= 1950), unicidade de rodadas, sequencialidade 1..N, cancelamentos (cenário Imola 2023), isolamento defensivo de datas e retificação histórica supervisionada comprovadas. | Nenhuma pendência imediata. Raiz pronta para integrar o agregado completo de temporada. |
| `seasons/season-status.ts` | Máquina de estados e validação de transições regulamentares e bloqueio histórico. | **Validado** | - Suíte em `packages/domain/test/seasons/season-status.test.ts` (3 testes aprovados via `npm run test:domain`).<br/>- Transições permitidas (`PLANNED` -> `IN_PROGRESS` -> `CONCLUDED` -> `HISTORICAL_REVISED`, `PLANNED` -> `CANCELLED`) e rejeições comprovadas. | Nenhuma pendência imediata. |
| `seasons/season-event-validator.ts` | Serviço de domínio puro para validação de consistência entre Temporada e Grande Prêmio (`INV-TR-SE-EV-01` e `02`). | **Validado** | - Suíte em `packages/domain/test/seasons/season-event-validator.test.ts` (6 testes unitários aprovados via `npm run test:domain`).<br/>- Validação de seasonId coincidente, presença de roundNumber no calendário e cancelamento comprovadas. | Nenhuma pendência imediata. Componente homologado no M2.1-F03. |

### 4.3. Módulo `participants`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `participants/driver.ts` | Entidade durável de piloto, código FIA de 3 letras e número permanente de carreira. | **Validado** | - Suíte em `packages/domain/test/participants/driver.test.ts` (19 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código do módulo: 99.24% linhas, 95.91% branches, 99.1% funções (`npm run test:coverage`).<br/>- Mutation testing integrado: 100% de score (5/5 mutantes de Driver eliminados via `npm run test:mutation`).<br/>- Invariantes de código FIA, número 17 aposentado, número 1 restrito a campeão e imutabilidade comprovadas. | Nenhuma pendência imediata. Entidade pronta para associação com `SeasonEntry`. |
| `participants/team.ts` | Entidade comercial competidora inscrita perante a FIA. | **Validado** | - Suíte em `packages/domain/test/participants/team.test.ts` (9 testes aprovados via `npm run test:domain`).<br/>- Invariantes de razão social, nome comercial, nacionalidade e fundação verificadas.<br/>- Imutabilidade via `Object.freeze` e igualdade por identidade tipada comprovadas. | Nenhuma pendência imediata. |
| `participants/constructor.ts` | Fabricante oficial do chassi homologado para o WCC. | **Validado** | - Suíte em `packages/domain/test/participants/constructor.test.ts` (8 testes aprovados via `npm run test:domain`).<br/>- Invariantes de nome técnico canônico, nacionalidade e configuração técnica verificadas.<br/>- Imutabilidade e igualdade por identidade tipada comprovadas. | Nenhuma pendência imediata. Âncora oficial pronta para o WCC. |
| `participants/season-entry.ts` | Vínculo contratual e temporal por temporada e etapa, e operação copy-on-write `deactivateEntry`. | **Validado** | - Suítes em `test/participants/season-entry.test.ts`, `test/participants/participants-scenarios.test.ts` e `test/participants/participants.type.test.ts` (28 testes aprovados via `npm run test:domain`).<br/>- Mutation testing integrado: 100% de score (6/6 mutantes de SeasonEntry eliminados via `npm run test:mutation`).<br/>- Validações de intervalos de rodadas (`startRound`, `endRound`), papéis `EntryRole` (`REGULAR`, `SUBSTITUTE`), número de carro e copy-on-write comprovadas.<br/>- Cenários históricos A (Sainz/Bearman), B (Sargeant/Colapinto), C (Verstappen 2016) e D (Antonelli FP1) verificados. | Nenhuma pendência imediata. Componente pronto para conexão com o módulo `events`. |

### 4.4. Módulo `events`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `events/circuit.ts` | Entidade física de autódromo, traçado, fuso horário IANA e cálculo regulamentar de voltas (Art. 5.4 FIA). | **Validado** | - Suítes em `packages/domain/test/events/circuit.test.ts` e `circuit.type.test.ts` (21 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código: 100% linhas, 96.67% branches, 100% funções.<br/>- Mutation testing integrado: 100% de score (6/6 mutantes eliminados via `npm run test:mutation`).<br/>- Cálculo exato de voltas ($> 305\text{km}$ e Mônaco $260\text{km}$) e copy-on-write comprovados. | Nenhuma pendência imediata. Entidade pronta para associação com `grand-prix.ts`. |
| `events/grand-prix.ts` | Raiz de agregado do fim de semana de Grande Prêmio, coordenação de sessões, formatos e ciclo de vida. | **Validado** | - Suítes em `packages/domain/test/events/grand-prix.test.ts` e `grand-prix.type.test.ts` (29 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código: 98.7% linhas, 93.75% branches, 100% funções.<br/>- Mutation testing integrado: 100% de score (7/7 mutantes eliminados via `npm run test:mutation`).<br/>- Invariantes de formato, sequencialidade cronológica de sessões e cancelamento/reagendamento comprovados. | Nenhuma pendência imediata. Aggregate root pronto para conexões com o calendário de `seasons`. |
| `events/session.ts` | Sessão cronometrada em pista (Treino, Quali, Sprint, Corrida), ciclo de vida (`SCHEDULED` -> `LIVE` -> `RED_FLAGGED` -> `COMPLETED` / `CANCELLED`), cópia defensiva de datas e elegibilidade de pontos. | **Validado** | - Suítes em `test/events/session.test.ts` e `test/events/session.type.test.ts` (29 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código: > 98% linhas, > 95% branches, 100% funções (`npm run test:coverage`).<br/>- Mutation testing integrado: 100% de score (7/7 mutantes de Session eliminados via `npm run test:mutation`).<br/>- Imutabilidade e cópia defensiva de datas validadas. | Nenhuma pendência imediata. Entidade pronta para coordenação por `grand-prix.ts` e resultados em `session-result.ts`. |
| `events/session-entry.ts` | Alinhamento e posições de largada/pit lane de participantes, número de carro e validador de grid. | **Validado** | - Suítes em `packages/domain/test/events/session-entry.test.ts` e `session-entry.type.test.ts` (25 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código: 100% linhas, 96% branches, 100% funções.<br/>- Mutation testing integrado: 100% de score (6/6 mutantes eliminados via `npm run test:mutation`).<br/>- Invariantes de carro #17 aposentado, posições de grid/pit lane e validador de unicidade em coleção comprovados. | Nenhuma pendência imediata. Objeto de alinhamento pronto para consumo pelas sessões. |
| `events/session-result.ts` | Registro de chegada, tempos, voltas, regra dos 90% (Art. 62.1 FIA), homologação e revisões dos comissários. | **Validado** | - Suítes em `packages/domain/test/events/session-result.test.ts` e `session-result.type.test.ts` (31 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código: 99.1% linhas, 95.8% branches, 100% funções.<br/>- Mutation testing integrado: 100% de score (8/8 mutantes eliminados via `npm run test:mutation`).<br/>- Regra dos 90% (Art. 62.1), homologação, retificação por comissários (`REVISED`), blindagem de simulação (`SIMULATED`) e validador de classificação comprovados. | Nenhuma pendência imediata. Registro factológico pronto para apuração de pontos no módulo `scoring`. |
| `events/session-participant-validator.ts` | Serviço de domínio puro para validação de elegibilidade de participantes no grid de sessão (`INV-TR-PA-EV-01` e `02`). | **Validado** | - Suíte em `packages/domain/test/events/session-participant-validator.test.ts` (12 testes unitários aprovados via `npm run test:domain`).<br/>- Cobertura de código: 100% linhas, 95.8% branches, 100% funções.<br/>- Validações de vigência por rodada, alinhamento competitivo vs treino livre e consistência de número de carro comprovadas. | Nenhuma pendência imediata. Componente homologado no M2.1-F03. |

### 4.5. Módulo `scoring`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `scoring/scoring-ruleset.ts` | Configuração das tabelas de pontos FIA por temporada, faixas de distância (Art. 6.5 FIA), pontos Sprint e abolição de volta rápida em 2025. | **Validado** | - Suíte em `packages/domain/test/scoring/scoring-ruleset.test.ts` (14 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código do módulo: 99.4% linhas, 96.5% branches, 100% funções (`npm run test:coverage`).<br/>- Mutation testing integrado: 100% de score (mutantes eliminados via `npm run test:mutation`).<br/>- Factories 2025 e 2024, tabelas reduzidas do Art. 6.5 e congelamento imutável `Object.freeze` validados. | Nenhuma pendência imediata. Componente pronto para consumo por `PointsCalculator`. |
| `scoring/points-calculator.ts` | Serviço determinístico puro de apuração de pontos individuais por sessão para pilotos e construtores. | **Validado** | - Suíte em `packages/domain/test/scoring/points-calculator.test.ts` (16 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código e mutação 100% verificadas.<br/>- Anulação estrita de pontos por status `DSQ`, elegibilidade de DNF com $\ge 90\%$ de voltas completadas (Art. 62.1 FIA), cálculo de Sprint e agregação por construtor validados. | Nenhuma pendência imediata. Domain service pronto para orquestração por `StandingsCalculator`. |
| `scoring/tie-break-policy.ts` | Algoritmo determinístico de desempate por *countback* da FIA (Artigo 7.2) com contrato estruturado `TieBreakResult`. | **Validado** | - Suíte em `packages/domain/test/scoring/tie-break-policy.test.ts` (19 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código e mutação 100% verificadas.<br/>- Comparador antissimétrico e transitivo, ordenação determinística de competidores, exclusão canônica de Sprint do countback em 2025 e empate absoluto `UNRESOLVED` comprovados. | Nenhuma pendência imediata. Política de desempate pronta para consumo por `StandingsCalculator`. |

### 4.6. Módulo `championships`

| Arquivo | Papel Arquitetural | Estado | Evidências / Validação | Pendências |
|---|---|---|---|---|
| `championships/driver-standings.ts` | Projeção de domínio imutável (Read-Model Snapshot) do Campeonato Mundial de Pilotos (WDC). | **Validado** | - Suíte em `packages/domain/test/championships/driver-standings.test.ts` (15 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código: 100% linhas, 95% branches, 100% funções.<br/>- Invariantes de posições sequenciais 1..N (`INV-CH-01`), unicidade de piloto (`INV-CH-02`), monotonia decrescente de pontos (`INV-CH-03`), cálculo de gap para líder e congelamento defensivo comprovados. | Nenhuma pendência imediata. Snapshot pronto para consumo por consultas e UI. |
| `championships/constructor-standings.ts` | Projeção de domínio imutável (Read-Model Snapshot) do Campeonato Mundial de Construtores (WCC). | **Validado** | - Suíte em `packages/domain/test/championships/constructor-standings.test.ts` (13 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código: 100% linhas, 95% branches, 100% funções.<br/>- Invariantes de unicidade de construtor, sequencialidade, agregação coletiva de múltiplos carros e imutabilidade comprovadas. | Nenhuma pendência imediata. Snapshot pronto para consumo por consultas e UI. |
| `championships/standings-calculator.ts` | Serviço de domínio puro para recálculo funcional de classificações acumuladas com tratamento de trocas de equipe e variações de posição. | **Validado** | - Suíte em `packages/domain/test/championships/standings-calculator.test.ts` (14 testes aprovados via `npm run test:domain`).<br/>- Cobertura de código: 99.5% linhas, 96.1% branches, 99.5% funções consolidadas no domínio.<br/>- Recálculo funcional puro ($O(R \cdot P + P \log P)$), tratamento de trocas de construtor (pontos acompanham piloto no WDC e construtor da prova no WCC), cálculo exato de `rankChange` e proteção contra dados simulados (`INV-CH-05`) comprovados. | Nenhuma pendência imediata. Motor de campeonatos 100% operacional. |

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
