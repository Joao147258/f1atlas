---
name: accessibility-review
description: Auditar interfaces quanto a conformidade WCAG 2.2 AA, navegação por teclado, contraste semântico, foco e textos alternativos.
---

# accessibility-review — Auditoria de Acessibilidade Digital (WCAG 2.2 AA)

## Ativação e propósito

Auditar, diagnosticar e certificar a acessibilidade digital das superfícies de interface, páginas web e componentes visuais do F1Atlas, garantindo conformidade com os critérios de sucesso do **WCAG 2.2 Nível AA** e usabilidade universal para pessoas que utilizam tecnologias assistivas ou navegação por teclado.

- **Quando acionar:** Antes da aprovação e merge de novos componentes de UI, páginas públicas de Grandes Prêmios, tabelas de classificação, formulários ou gráficos estatísticos.
- **Quando NÃO acionar:** Para validação de código backend ou scripts CLI de console sem interface visual.

## Pré-condições

- Consultar `docs/design/accessibility.md`, `DESIGN.md` (Seção 5 e 6) e `AGENTS.md` (Seção 6).
- Conhecimento dos parâmetros normativos de contraste:
  - Mínimo de **4.5:1** para texto normal (< 18pt ou < 14pt em negrito).
  - Mínimo de **3.0:1** para texto grande (>= 18pt ou >= 14pt em negrito) e componentes essenciais de interface/ícones.
- O anel de foco de teclado deve utilizar o token de destaque Signal Mint (`#67E3CD`).

## Procedimento

1. **Auditoria de Semântica e Estrutura HTML**:
   - Inspecionar a hierarquia de títulos (`<h1>` a `<h6>`), garantindo ordem lógica e presença de apenas um `<h1>` por página.
   - Verificar elementos semânticos de demarcação (*landmarks*): `<main>`, `<header>`, `<nav>`, `<footer>`, `<aside>`.
   - Garantir que tabelas de resultados utilizem `<table>`, `<thead>`, `<tbody>`, `<th>` com atributos `scope="col"` ou `scope="row"` e `<caption>` descritivo.
2. **Auditoria de Navegabilidade por Teclado e Foco Visível**:
   - Testar o fluxo de tabulação sequencial (`Tab` e `Shift+Tab`) por todos os controles interativos.
   - Proibir terminantemente `outline: none` ou `outline: 0` no CSS sem substituição equivalente.
   - Confirmar a visibilidade inequívoca do anel de foco com Signal Mint (`outline: 2px solid #67E3CD`).
   - Garantir que modais, drawers e diálogos fechem via tecla `Escape` e aprisionem o foco enquanto abertos (*focus trap*).
3. **Medição de Contraste Semântico**:
   - Medir a taxa de contraste sobre superfícies escuras Carbon (`#101820`) e superfícies editoriais Warm Ivory (`#F6F3EC`).
   - Rejeitar textos em tons de cinza desbotados que fiquem abaixo de 4.5:1.
4. **Auditoria de Textos Alternativos e Gráficos**:
   - Garantir que imagens informativas possuam atributo `alt` conciso e descritivo.
   - Imagens puramente decorativas devem conter `alt=""` e `aria-hidden="true"`.
   - Para gráficos complexos de telemetria ou tempos de volta, exigir visualização alternativa em tabela acessível correspondente.
5. **Auditoria de Independência de Cor**:
   - Confirmar que estados (ex.: bandeira amarela, liderança, abandono) utilizem texto explícito, ícones ou formas geométricas além da cor.

## Validação

- Testar a página via ferramentas automatizadas (ex.: axe-core / Lighthouse Accessibility quando configurados).
- Executar teste mecânico de navegação por teclado: todas as ações possíveis por clique de mouse devem ser executáveis via `Enter` ou `Space`.
- Validar conformidade de tags e links: `npm run verify:docs`.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Elemento interativo inacessível por teclado | Uso de `<div>` ou `<span>` com `onClick` sem semântica | Substituir por `<button>` nativo ou adicionar `role="button"` e `tabIndex={0}` |
| Foco invisível ao navegar com tecla Tab | CSS com `outline: none` em reset global | Aplicar `focus-visible: outline-2 focus-visible:outline-[#67E3CD]` |
| Contraste insuficiente em texto secundário | Uso de cinza claro sobre fundo branco/ivory | Escurecer a cor do texto até atingir taxa mínima comprovada de 4.5:1 |
| Tabela de classificação sem identificação de cabeçalho | Células de topo utilizando `<td>` em vez de `<th>` | Substituir por `<th scope="col">` para interpretação correta por leitor de tela |

### Limitações
- Scanners automatizados cobrem apenas ~30-40% das barreiras de acessibilidade; a auditoria humana e testes manuais de teclado são indispensáveis.

## Entregáveis

- Laudo de Auditoria de Acessibilidade contendo:
  - Telas e componentes inspecionados.
  - Taxas de contraste medidas e elementos corrigidos.
  - Comprovação de conformidade WCAG 2.2 AA.
  - Estado: `ACCESSIBLE (WCAG 2.2 AA COMPLIANT)` ou `BARRIERS DETECTED`.
