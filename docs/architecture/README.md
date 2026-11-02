# Arquitetura — F1Atlas

> **Diretório:** `docs/architecture/`  
> **Finalidade:** Documentação arquitetural canônica, limites modulares, fluxos de dados e decisões registradas.

---

## 1. Documentação Viva da Arquitetura

- **[Estado Atual da Arquitetura (Living Architecture)](./current-state.md)**: Retrato canônico do estado real implementado, dependências verificadas, organização de pacotes e conformidade arquitetural contínua.

---

## 2. Modelagem e Limites

- **[Modelo Conceitual do Domínio](./domain-model.md)**: Entidades duráveis, invariantes desportivas e ciclo de vida de resultados da FIA.
- **[Limites Modulares](./module-boundaries.md)**: Fronteiras entre módulos e isolamento do domínio contra frameworks e persistência.
- **[Fluxo de Dados](./data-flow.md)**: Fluxo da ingestão até a apresentação e isolamento de simulações.
- **[Estratégia de Integração](./integration-strategy.md)**: Ingestão de fontes autorizadas e proveniência de dados.

---

## 3. Decisões Arquiteturais Registradas (ADRs)

- **[Índice de ADRs](./adr/README.md)**:
  - [ADR-0001: Monólito Modular como Hipótese Inicial](./adr/0001-modular-monolith.md)
  - [ADR-0002: Persistência com Prisma ORM 7 e MySQL no NestJS](./adr/0002-prisma-mysql-persistence.md)
  - [ADR-0003: Segregação da Camada Domain em Pacote Independente (`packages/domain`)](./adr/0003-domain-package-separation.md)
