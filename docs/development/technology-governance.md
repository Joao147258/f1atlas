# Governança tecnológica

**Hipóteses:** Next.js + TypeScript, NestJS + TypeScript, PostgreSQL, monólito modular, monorepo. ORM e hospedagem pendentes.

**Critérios:** valor do requisito, simplicidade, acoplamento, manutenção, custo, segurança, compatibilidade e reversibilidade.

**Decisões:** registrar ADR para escolhas de alto impacto. Evitar inserir Redis, broker, microserviços, ORM, framework de testes, analytics SDK ou SEO SDK sem necessidade/experimento. Dependência adicionada precisa de justificativa e verificação de licenciamento.

**Backend First:** regras esportivas e contratos não dependem de framework visual ou SDK externo.
