# Limites modulares

Módulos conceituais: Identity/Participants, Competition, Results, Simulation, Editorial, Data Integration. Não compartilhar modelos de banco por acesso direto a tabelas de outro módulo; interagir por interfaces explícitas. Dependências entre camadas seguem `ARCHITECTURE.md`.

**Verificadores:** `scripts/architecture/verify-boundaries.mjs` verificará caminhos de importação quando `apps/api/src` ou `packages/domain` existirem. Até lá declara não aplicável. Um grafo real será documentado quando o primeiro módulo for implementado.
