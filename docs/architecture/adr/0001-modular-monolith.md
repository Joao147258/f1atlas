# ADR-0001 — Monólito modular como hipótese inicial

**Status:** Proposto

## Contexto

O projeto começa com uma fatia funcional, uma equipe pequena e forte necessidade de explorar limites de domínio. Não há dados que demonstrem necessidade de distribuição operacional.

## Alternativas

- Monólito modular, com fronteiras lógicas e testes de dependências.
- Aplicação integralmente no framework frontend.
- Serviços distribuídos desde o início.

## Direção proposta

Avaliar NestJS como monólito modular e Next.js como frontend. Não dividir serviços por módulos nesta etapa; testar regras do domínio independentemente de integrações e persistência. Confirmar com prova de conceito após as specs.

## Trade-offs

Facilita execução local, transações e observabilidade inicial, mas requer disciplina em dependências internas. Separação frontend/backend aumenta contratos e infraestrutura. Serviços distribuídos antecipariam custo operacional sem evidência de benefício.

## Critérios para aceitar

Prova de conceito de domínio/integração, ambiente de desenvolvimento reproduzível e avaliação de custo de hospedagem.
