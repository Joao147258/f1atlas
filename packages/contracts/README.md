# @f1atlas/contracts — Pacote de Contratos Públicos da API

> **Localização:** `packages/contracts/`  
> **Nome no Workspace:** `@f1atlas/contracts`  
> **Papel Arquitetural:** Contratos de interface pública, DTOs tipados e schemas de validação  
> **Estado:** Implementado e Validado  

---

## 1. Visão Geral e Missão

O pacote **`@f1atlas/contracts`** estabelece a camada canônica compartilhada de comunicação e dados para a plataforma F1Atlas. Ele permite que a API NestJS, o frontend Next.js e integrações externas troquem informações de forma fortemente tipada, validável em tempo de execução e estritamente independente das regras internas e dos agregados do domínio.

```text
packages/domain (Regras de Domínio Puras)
      ↑
      | (Mapeamento nas fronteiras da aplicação)
Aplicação / API (apps/api)
      |
      ↓ (Consome e emite DTOs validados)
packages/contracts (@f1atlas/contracts)
      ↑
      | (Consome schemas e tipos inferidos)
Frontend / Clientes Públicos (apps/web)
```

---

## 2. Invariantes e Limites Arquiteturais

1. **Independência Estrita do Domínio:** `packages/contracts` não importa `packages/domain`. Modelos conceituais e Value Objects internos (como `EntityId`) nunca vazam diretamente para a fronteira pública. Identificadores são expostos como representações primitivas (strings ou slugs).
2. **Agnóstico à Infraestrutura:** Não possui dependência de frameworks web (NestJS, Express), ORMs (Prisma, Drizzle) ou clientes de banco de dados.
3. **Schemas Executáveis como Fonte Única da Verdade:** Utiliza **Zod** para validação determinística de entrada e saída em runtime. Os tipos estáticos TypeScript são inferidos via `z.infer<typeof Schema>`, eliminando duplicação e risco de descompasso.
4. **Padronização Temporal e Discriminatória:**
   - Timestamps obrigatoriamente em formato **ISO 8601 UTC** (`z.string().datetime()`).
   - Datas de calendário em formato estrito **YYYY-MM-DD** (`^\d{4}-\d{2}-\d{2}$`).
   - Classificações esportivas contêm o discriminador booleano obrigatório `isSimulation: boolean` para evitar que cenários simulados sejam confundidos com registros oficiais da FIA.
   - Payloads de erro padronizados no formato RFC 7807 (Problem Details).

---

## 3. Estrutura e Catálogo de Contratos

```text
packages/contracts/
├── package.json
├── tsconfig.json
├── analytics.mjs                     # Telemetria desacoplada e privacidade estrita (SPEC-AN-001)
├── analytics.d.ts                    # Declaração de tipos para telemetria
├── src/
│   ├── shared/
│   │   ├── api-error.contract.ts     # RFC 7807 (statusCode, error, message, timestamp, correlationId)
│   │   └── pagination.contract.ts    # PaginationQuerySchema, PaginationMetaSchema, PaginatedResponse<T>
│   ├── drivers/
│   │   ├── driver-response.contract.ts    # DriverResponse (id, slug, nomes, code, permanentNumber)
│   │   └── list-drivers-query.contract.ts # ListDriversQuery (paginação, nationality, isActive, search)
│   ├── teams/
│   │   ├── team-response.contract.ts        # TeamResponse (equipe comercial, legalName, foundedYear)
│   │   └── constructor-response.contract.ts # ConstructorResponse (entidade técnica homologada FIA)
│   ├── seasons/
│   │   └── season-response.contract.ts      # SeasonResponse, SeasonStatus (PLANNED, ACTIVE, COMPLETED)
│   ├── grand-prix/
│   │   └── grand-prix-response.contract.ts  # GrandPrixResponse, EventFormat, EventStatus, CircuitSummary
│   ├── standings/
│   │   ├── driver-standing.contract.ts      # DriverStandingsResponse, DriverStandingEntry, WDC
│   │   └── constructor-standing.contract.ts # ConstructorStandingsResponse, ConstructorStandingEntry, WCC
│   └── index.ts                             # Ponto de exportação pública unificada
└── test/
    ├── shared.contract.test.ts       # Testes de ApiError e Pagination
    ├── drivers.contract.test.ts      # Testes de Drivers
    ├── teams.contract.test.ts        # Testes de Teams e Constructors
    ├── seasons.contract.test.ts      # Testes de Seasons
    ├── grand-prix.contract.test.ts   # Testes de Grand Prix
    ├── standings.contract.test.ts    # Testes de Standings (WDC/WCC)
    └── type-inference.test.ts        # Testes estáticos de tipagem TypeScript
```

---

## 4. Comandos de Verificação

| Ação | Comando |
|---|---|
| Executar suíte de testes de contratos | `npm run test:contracts` |
| Verificação estática de tipos (TypeScript) | `npm run typecheck:contracts` |
| Auditoria geral de limites e quality gates | `npm run verify` |
