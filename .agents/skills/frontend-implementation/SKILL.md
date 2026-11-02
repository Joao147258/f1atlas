---
name: frontend-implementation
description: Implementar interfaces responsivas e acessíveis aderentes à direção Precision Motorsport Editorial consumindo contratos de API.
---

# frontend-implementation — Engenharia de Componentes e Interfaces Web

## Ativação e propósito

Construir e refatorar páginas web, layouts responsivos e componentes modulares de interface segundo a direção estética **Precision Motorsport Editorial** no F1Atlas, consumindo contratos tipados e garantindo acessibilidade, performance e estados explícitos de carregamento.

- **Quando acionar:** Na criação ou evolução de rotas, layouts, tabelas de classificação, cronogramas de Grandes Prêmios, comparadores de pilotos e cartões editoriais.
- **Quando NÃO acionar:** Para validação de regras de pontuação esportiva ou cálculos de campeonato (devem residir exclusivamente no backend/domínio).

## Pré-condições

- Consultar `DESIGN.md`, `AGENTS.md` (Seção 6 — Design e Acessibilidade) e contratos tipados em `packages/contracts/`.
- Conhecimento da paleta canônica de design tokens:
  - Fundo Analítico (*Race Intelligence*): Carbon (`#101820`).
  - Fundo Editorial (*Racing Stories*): Warm Ivory (`#F6F3EC`).
  - Ação e Foco Visual: Signal Mint (`#67E3CD`).
  - Destaque Histórico: Heritage Amber (`#E5A93C`).
- O código de interface deve residir nas aplicações web (`apps/site` ou `apps/web`), mantendo componentes de apresentação desacoplados de regras de persistência.

## Procedimento

1. **Separação entre Server e Client Components**:
   - Manter páginas e contêineres de dados como React Server Components (RSC) para otimizar SEO, LCP e reduzir payload de JavaScript.
   - Restringir a diretiva `'use client'` aos componentes que necessitam de estado local ou eventos de interação (ex.: alternância de visualização de voltas, filtros interativos de pilotos).
2. **Tratamento dos 4 Estados de Interface**:
   - Implementar para cada componente ou tela os 4 estados obrigatórios:
     - `Loading`: skeletons acessíveis preservando o layout visual sem causar layout shifts (CLS).
     - `Success`: renderização fluida com tipografia monoespaçada (`tabular-nums`) para tempos de volta e gaps.
     - `Empty State`: aviso contextual claro e amigável quando a temporada ou etapa ainda não possui dados.
     - `Error Boundary`: interface amigável com opção de retentativa sem travamento da aplicação.
3. **Aplicação de Tipografia e Alinhamento Esportivo**:
   - Utilizar fontes monoespaçadas com suporte a `tabular-nums` para tabelas de cronometragem, intervalos de setores e posições.
   - Garantir alinhamento numérico à direita para tempos e diferenças de cronômetro.
4. **Garantia de Independência de Cor**:
   - Nunca transmitir o status de uma volta ou piloto (ex.: abandono, volta rápida, pole position) exclusivamente por cor; sempre associar badge textual, ícone semântico ou abreviação reconhecível.
5. **Integração com Contratos Tipados**:
   - Importar DTOs e interfaces de `packages/contracts/`, garantindo tipagem forte de ponta a ponta sem tipos `any`.

## Validação

- Executar a checagem de acessibilidade da interface via `accessibility-review`.
- Validar conformidade de metadados e rotas: `npm run verify:seo`.
- Validar integridade geral do workspace: `npm run verify`.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Layout Shift elevado (CLS) durante carregamento | Renderização condicional sem skeleton de altura fixa | Substituir spinner solto por skeleton com dimensões idênticas ao conteúdo final |
| Tempos desalinhados verticalmente na tabela | Ausência de propriedade de numerais tabulares | Aplicar classe CSS `tabular-nums` ou fonte monoespaçada nas colunas de tempos |
| Client Component desnecessário inflando o bundle | Diretiva `'use client'` colocada na raiz da página | Mover `'use client'` apenas para o botão/filtro específico, mantendo a página como RSC |
| Cálculo de pontos executado no componente | Desenvolvedor somando pontos no cliente | Consumir o total de pontos já calculado e fornecido pelo DTO da API |

### Limitações
- A interface não recalcula dados oficiais nem introduz logos/marcas registradas sem autorização legal.

## Entregáveis

- Componentes e layouts Next.js implementados com tokens oficiais de `DESIGN.md`.
- Estados de UI (loading, empty, error, success) tratados explicitamente.
- Relatório de Entrega de Frontend com validação de responsividade e contratos.
