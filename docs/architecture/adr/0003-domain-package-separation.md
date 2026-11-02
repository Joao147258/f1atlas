# ADR-0003 — Segregação da Camada Domain em Pacote Independente (`packages/domain`)

**Estado:** Aprovado  
**Data:** 2026-11-02  
**Fonte Canônica Detalhada:** [docs/domain/architectural-separation.md](../../domain/architectural-separation.md)  

---

## Contexto

O F1Atlas é estruturado como um monorepositório contendo aplicações executáveis (`apps/api`, `apps/web`) e pacotes compartilhados (`packages/`). As regras de negócio esportivas (regras da FIA, cálculo de pontuação, desempates e simulações) exigem isolamento rigoroso contra acoplamentos acidentais com frameworks web (NestJS, Next.js) e mecanismos de persistência (Prisma, MySQL).

Surgiu a necessidade de definir se a camada Domain deveria residir internamente na API (`apps/api/src/domain/`) ou ser segregada como um pacote de biblioteca próprio do monorepositório (`packages/domain/`).

---

## Decisão Aprovada

A camada Domain do F1Atlas é estabelecida formalmente como um **pacote TypeScript independente** localizado em:

`packages/domain/`

- **Isolamento de Framework:** O pacote `packages/domain` não possui dependências de NestJS, Next.js, Prisma, TypeORM ou bibliotecas de transporte HTTP.
- **Direção Unidirecional de Dependências:** `apps/api` e outros consumidores dependem de `packages/domain`; o domínio tem zero dependências externas.
- **Aplicação de Verificadores:** O quality gate `scripts/architecture/verify-boundaries.mjs` protege mecanicamente a fronteira do pacote contra importações proibidas.

---

## Alternativas e Trade-offs

1. **Alternativa A — Domínio dentro de `apps/api/src/domain/`:**  
   *Trade-off:* Menor configuração inicial de monorepo, mas elevado risco de vazamento de decorators `@Injectable()` e anotações HTTP nas entidades, além de inviabilizar a reutilização direta das fórmulas esportivas por outras ferramentas (CLI, workers ou web offline).
2. **Alternativa B — Pacote Independente `packages/domain/` (Escolhida):**  
   *Trade-off:* Exige configuração de workspaces no `package.json` raiz e mapeamento de DTOs na API, mas garante pureza esportiva, testabilidade ultra-rápida sem runtime do NestJS e respeito estrito ao princípio *Backend First*.

---

## Consequências e Riscos

- **Consequências Positivas:** Regras esportivas determinísticas, auditáveis e portáveis; testes unitários executam em milissegundos; evolução do NestJS ou do banco de dados não afeta o domínio.
- **Riscos e Mitigações:** Risco de quebra de resolução de módulos no monorepo mitigado pela validação automatizada contínua nos quality gates públicos (`npm run verify:architecture`).

---

## Evidências, Revisões e Referências

- Documento canônico detalhado com diagramas e matriz de decisões: [docs/domain/architectural-separation.md](../../domain/architectural-separation.md).
- Verificador arquitetural aprovado: `scripts/architecture/verify-boundaries.mjs`.
- Acompanhamento de status dos módulos: [docs/domain/development-status.md](../../domain/development-status.md).
