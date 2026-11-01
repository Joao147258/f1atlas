---
name: frontend-implementation
description: Implementar interfaces responsivas e acessíveis aderentes à direção Precision Motorsport Editorial consumindo contratos de API.
---

# frontend-implementation

## Ativação e propósito
Construir páginas, componentes visuais e fluxos interativos no frontend conforme a linguagem de design do projeto (*Race Intelligence* e *Racing Stories*).
- **Quando acionar:** Na criação ou refatoração de páginas web, layouts, componentes de design system ou gráficos esportivos em `apps/web/`.
- **Quando NÃO acionar:** Para cálculo de pontuações oficiais ou validação de regras de campeonato (devem residir no backend/domínio).

## Pré-condições
- Consultar `DESIGN.md`, `docs/design/design-system.md`, `docs/design/information-architecture.md` e os contratos em `packages/contracts/`.
- Compreender a distinção de densidade: *Race Intelligence* (superfície analítica escura Carbon `#101820`) vs. *Racing Stories* (superfície editorial Warm Ivory `#F6F3EC`).

## Procedimento
1. **Preparação:** Identificar os componentes necessários da biblioteca (Header, Season Selector, Grand Prix Card, Standings Table, Performance Chart, etc.).
2. **Investigação:**
   - Conferir contratos da API para consumo tipado de dados.
   - Analisar requisitos responsivos (mobile 360px, tablet 640px, desktop 1024px+).
3. **Decisão:** Mapear estados do componente: carregamento (`loading`), sucesso com dados, ausência de dados (`empty state`) e erro (`error state`).
4. **Execução:**
   - Implementar componentes utilizando tokens semânticos de cor (`--color-bg-primary`, `--color-action`, `--color-status-*`).
   - Aplicar `tabular-nums` e fonte IBM Plex Mono para alinhamento rigoroso de números, tempos e posições.
   - Garantir navegabilidade completa por teclado e rótulos acessíveis.
5. **Validação:**
   - Validar renderização nos breakpoints prioritários.
   - Conferir contraste de cores e ausência de dependência exclusiva de cor para transmitir informação.
6. **Entrega:** Componentes integrados com testes de renderização e acessibilidade.

## Validação
- Executar testes de componentes e acessibilidade quando implementados.
- Validar conformidade de contratos e links com `npm run verify:docs`.

## Falhas e limites
- Não incorporar logotipos, fotos ou marcas registradas oficiais de equipes/F1 sem licença verificada.
- O frontend não deve alterar ou recalcular resultados esportivos recebidos da API oficial.

## Entregáveis
- Código de componentes em `apps/web/`, estilos com tokens semânticos e estados de UI tratados de forma explícita.
