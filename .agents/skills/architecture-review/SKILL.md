---
name: architecture-review
description: Avaliar conformidade arquitetural, limites modulares, respeito à direção Backend First e acoplamento entre camadas conceituais.
---

# architecture-review — Auditoria de Limites e Conformidade Arquitetural

## Ativação e propósito

Avaliar criticamente a conformidade estrutural do código-fonte e das decisões técnicas em relação à arquitetura canônica do F1Atlas, garantindo o respeito à direção Backend First, o isolamento do domínio esportivo e a independência entre módulos.

- **Quando acionar:** Antes da introdução de novos pacotes (`apps/` ou `packages/`), ao desenhar novos agregados ou casos de uso, ao avaliar dependências externas de runtime, ou durante a revisão de Pull Requests.
- **Quando NÃO acionar:** Para validações puramente sintáticas, estilo de formatação ou linting básico de código (utilizar `code-review`).

## Pré-condições

- Consultar `ARCHITECTURE.md`, `AGENTS.md` (Seção 3 — Princípios Obrigatórios de Engenharia) e `docs/architecture/adr/`.
- Ter clareza sobre as 6 fronteiras conceituais do produto:
  1. *Identity / Participants*: pilotos, construtores, equipes e vínculos históricos.
  2. *Competition*: calendários, circuitos, Grandes Prêmios e sessões.
  3. *Results*: tempos, voltas, classificação, pontuação e súmulas homologadas.
  4. *Simulation*: hipóteses, recálculos de cenários e dados isolados de produção.
  5. *Editorial*: crônicas, biografias, narrativas e contextualização humana.
  6. *Data Integration*: adaptadores, conectores de APIs externas e normalizadores.

## Procedimento

1. **Auditoria da Direção de Dependências (Clean Architecture)**:
   - Inspecionar a hierarquia de acoplamento:
     ```text
     [Apresentação / UI] ──┐
                           ├──> [Aplicação / Casos de Uso] ──> [Domínio Puro]
     [Infraestrutura / BD] ┘                                           ▲
     (Prisma, Adapters, HTTP)                                          │
        └────────────────── Impl. Interfaces (Ports) ─────────────────┘
     ```
   - O Domínio (`packages/domain`) não pode importar `@nestjs/`, `next/`, `react/`, `@prisma/client`, nem bancos de dados.
2. **Auditoria de Limites Modulares e Monólito Modular**:
   - Verificar se módulos acessam dados internos de outros módulos diretamente ou se comunicam exclusivamente por contratos e interfaces públicas de aplicação.
   - Detectar acoplamento circular ou dependências bidirecionais entre pacotes.
3. **Auditoria da Regra Backend First**:
   - Confirmar que as regras de negócio, cálculos desportivos e validações existem e são testadas no backend antes de qualquer implementação de tela.
   - Proibir que componentes React no frontend definam regras ou critérios de campeonato.
4. **Avaliação de Complexidade Proporcional**:
   - Questionar abstrações prematuras: fábricas desnecessárias, múltiplos bancos, microsserviços ou bibliotecas pesadas sem justificativa em ADR.
5. **Execução de Verificador Determinístico**:
   - Executar a checagem mecânica de boundaries e documentação viva: `npm run verify:architecture`.
6. **Auditoria da Documentação Arquitetural Viva (`docs/architecture/current-state.md`)**:
   - Verificar se a documentação arquitetural viva reflete com exatidão o estado implementado real.
   - Sempre que uma atividade introduzir ou alterar pacotes, módulos, tecnologias ou fronteiras, atualizar `current-state.md` e seus diagramas.
7. **Emissão de Parecer e Registro de ADR**:
   - Caso uma alteração estrutural seja justificada e aceita, orientar a redação formal de um Architecture Decision Record (ADR).

## Validação

- Executar `npm run verify:architecture` e confirmar ausência de imports proibidos em camadas nobres e sincronia de `current-state.md`.
- Executar os testes de limite arquitetural em `scripts/tests/contracts.test.mjs` e `scripts/tests/verify-current-state.test.mjs`.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Framework importado em entidade de domínio | Decorator do NestJS ou Next.js utilizado no domínio | Remover o decorator; transferir a responsabilidade para DTO na camada Application |
| Cliente Prisma importado em caso de uso | Caso de uso realizando consultas diretas no ORM | Definir interface de porta de repositório (`Port`) e injetar via inversão de dependência |
| Lógica de cálculo esportivo na UI | Frontend somando pontos manualmente | Mover o cálculo para o motor de regras de domínio (`packages/domain/scoring`) |
| Dependência circular entre módulos | Módulo A importando Módulo B e vice-versa | Extrair contrato compartilhado para `packages/contracts` ou reestruturar as portas |

### Limitações
- Verificadores estáticos inspecionam imports por regex/AST; não substituem a análise semântica de coesão e responsabilidade.

## Entregáveis

- Parecer Arquitetural detalhado com análise de fronteiras, acoplamento e direção de dependências.
- Proposta de ADR em caso de decisões duradouras ou novas tecnologias.
- Estado: `ARCHITECTURE COMPLIANT`, `ACID DEBT DETECTED` ou `BOUNDARY VIOLATION BLOCKED`.
