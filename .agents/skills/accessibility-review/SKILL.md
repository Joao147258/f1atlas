---
name: accessibility-review
description: Auditar interfaces quanto a conformidade WCAG 2.2 AA, navegação por teclado, contraste semântico, foco e textos alternativos.
---

# accessibility-review

## Ativação e propósito
Auditar e certificar a acessibilidade digital das páginas e componentes da plataforma, assegurando usabilidade universal e conformidade com WCAG 2.2 AA.
- **Quando acionar:** Antes da liberação de novos componentes de UI, páginas públicas, tabelas de classificação ou visualizações gráficas de dados.
- **Quando NÃO acionar:** Para validação de código backend ou scripts CLI que não possuem superfície de interação visual.

## Pré-condições
- Consultar `docs/design/accessibility.md`, `DESIGN.md` (Seção 5 e 6) e `AGENTS.md` (Seção 6).
- Compreender os tokens de cores semânticas e a exigência de contraste mínimo de 4.5:1 para texto normal e 3:1 para elementos de interface.

## Procedimento
1. **Preparação:** Listar as páginas e componentes sob auditoria e seus estados interativos (normal, hover, foco, ativo, desabilitado).
2. **Investigação:**
   - **Semântica HTML:** Inspecionar uso de tags semânticas (`<main>`, `<nav>`, `<article>`, `<table>`, `<caption>`, `<header>`).
   - **Teclado e Foco:** Testar ordem de tabulação sequencial e conferir foco visível (`--color-focus`, Signal Mint `#67E3CD`).
   - **Contraste de Cores:** Medir taxas de contraste em superfícies escuras (Carbon) e claras (Warm Ivory).
   - **Independência de Cor:** Assegurar que status, posições e variações de dados utilizem textos ou ícones complementares à cor.
   - **Alternativas Textuais:** Conferir textos alternativos (`alt`) em imagens autorais e tabelas equivalentes para gráficos interativos.
3. **Decisão:** Classificar barreiras identificadas por criticidade (A, AA, AAA).
4. **Execução:** Propor ajustes no código de marcação, CSS ou tokens para eliminar as barreiras de acessibilidade.
5. **Validação:** Reavaliar com ferramentas automatizadas (ex.: axe-core / lighthouse quando integrados) e testes manuais de teclado.
6. **Entrega:** Emitir laudo de acessibilidade apontando conformidade ou pendências a sanar.

## Validação
- Verificar ausência de erros de marcação semântica e conformidade visual com `DESIGN.md`.

## Falhas e limites
- Testes automatizados cobrem apenas parte dos critérios de acessibilidade; a navegação assistiva e de teclado exige inspeção orientada.
- Não presumir conformidade WCAG sem testes de contraste e navegabilidade comprovados.

## Entregáveis
- Relatório de auditoria de acessibilidade contendo: lista de telas avaliadas, taxas de contraste medidas, apontamentos de foco e recomendações corretivas.
