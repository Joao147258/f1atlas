---
name: architecture-review
description: Avaliar conformidade arquitetural, limites modulares, respeito à direção Backend First e acoplamento entre camadas conceituais.
---

# architecture-review

## Ativação e propósito
Avaliar a organização estrutural do projeto, garantindo isolamento do domínio puro em relação a frameworks web, persistência e detalhes de interface.
- **Quando acionar:** Antes de criar novos pacotes, ao desenhar módulos conceituais, ao introduzir dependências de runtime ou ao propor ADRs.
- **Quando NÃO acionar:** Para revisões puramente sintáticas de código ou verificações de estilo (utilizar `code-review`).

## Pré-condições
- Consultar `ARCHITECTURE.md`, `docs/specs/engineering/SPEC-ARCH-001.md`, `docs/architecture/module-boundaries.md` e ADRs vigentes.
- Identificar as fronteiras conceituais (Identity/Participants, Competition, Results, Simulation, Editorial, Data Integration).

## Procedimento
1. **Preparação:** Mapear a direção de dependências pretendida: `Presentation/Infrastructure → Application → Domain`.
2. **Investigação:**
   - Inspecionar se `packages/domain` ou entidades contêm imports de `@nestjs/`, `next/`, `react/`, `@prisma/client`, `drizzle-orm` ou bibliotecas HTTP.
   - Verificar se módulos acessam dados internos de outros módulos sem interfaces ou contratos declarados.
3. **Decisão:** Identificar se uma nova exigência requer refatoração de limites ou justificativa em ADR específico.
4. **Execução:** Executar o verificador estático de dependências de arquitetura (`node scripts/architecture/verify-boundaries.mjs`).
5. **Validação:** Garantir que o gate `verify:architecture` execute e aprove o isolamento (ou reporte `SKIP` de forma justificada enquanto não houver código de aplicação).
6. **Entrega:** Emitir parecer arquitetural indicando aderência aos boundaries, trade-offs e necessidade de novos ADRs.

## Validação
- Executar `npm run verify:architecture` e validar ausência de violações de importação.
- Confirmar conformidade com os testes em `scripts/tests/contracts.test.mjs`.

## Falhas e limites
- O verificador estático atual atua sobre caminhos de importação conhecidos; não substitui o desenho consciente de contratos e inversão de dependência.
- Decisões com impacto de acoplamento ou custo exigem ADR aprovado antes de implementação.

## Entregáveis
- Parecer de arquitetura com análise de dependências, diagnóstico de limites modulares e minuta de ADR quando pertinente.
