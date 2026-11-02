# Limites modulares

> **Decisão Canônica de Segregação:** A camada de domínio reside no pacote independente `packages/domain`. Consulte a justificativa em [`docs/domain/architectural-separation.md`](../domain/architectural-separation.md) e o ADR-0003 em [`docs/architecture/adr/0003-domain-package-separation.md`](./adr/0003-domain-package-separation.md).

Módulos conceituais do domínio: `shared`, `seasons`, `participants`, `events`, `scoring`, `championships`, `simulations`. Não compartilhar modelos de banco por acesso direto a tabelas de outro módulo; interagir por interfaces explícitas. Dependências entre camadas seguem `ARCHITECTURE.md` e a regra de dependência unidirecional: `apps/api` $\longrightarrow$ `packages/domain` (sem dependência reversa).

**Verificadores automatizados:** `scripts/architecture/verify-boundaries.mjs` inspeciona continuamente `packages/domain/` para impedir mecanicamente importações de frameworks web (`@nestjs`, `next`, `react`) ou ORMs (`@prisma`, `drizzle-orm`). Executado publicamente via `npm run verify:architecture`.
