---
name: editorial-research
description: Pesquisar e estruturar narrativas autorais, capítulos históricos e biografias conectados a dados esportivos rastreáveis.
---

# editorial-research

## Ativação e propósito
Conduzir a pesquisa, planejamento estrutural e redação de narrativas interativas e artigos históricos na vertente *Racing Stories*.
- **Quando acionar:** Na elaboração de capítulos de histórias de pilotos, equipes e marcos históricos de temporadas (ex.: temporada 2025).
- **Quando NÃO acionar:** Para validação de dados estatísticos brutos ou verificação formal de fontes primárias (utilizar `historical-fact-checking`).

## Pré-condições
- Consultar `docs/specs/product/SPEC-EDIT-001.md`, `DESIGN.md` (Seção 3.2), `docs/design/narrative-experience.md` e `AGENTS.md` (Seção 5 e 6).
- Respeitar a exigência de conteúdo autoral: proibir plágio de textos oficiais ou uso de imagens e marcas sem autorização.

## Procedimento
1. **Preparação:** Definir o tema central, arco narrativo e participantes envolvidos (pilotos, construtores, GPs).
2. **Investigação:**
   - Mapear os acontecimentos históricos reais associados aos dados do campeonato (etapas, voltas, abandonos, vitórias).
   - Coletar referências bibliográficas, entrevistas e reportagens com atribuição e datas claras.
3. **Decisão:** Estruturar a narrativa em capítulos modulares navegáveis:
   - Identificar pontos de entrada onde a narrativa se conecta a gráficos e dados de desempenho da vertente *Race Intelligence*.
   - Diferenciar rigorosamente fatos documentados, interpretações contextuais e hipóteses.
4. **Execução:**
   - Escrever os capítulos no formato Markdown editorial.
   - Incluir links contextuais para perfis de participantes e etapas relacionadas.
   - Adicionar notas de fontes e proveniência ao final de cada capítulo.
5. **Validação:** Submeter o conteúdo à checagem de fatos (`historical-fact-checking`) e auditoria de links locais (`check-docs.mjs`).
6. **Entrega:** Capítulo editorial revisado e pronto para publicação ou catalogação em rascunho.

## Validação
- Validar integridade dos links de Markdown via `node scripts/quality/check-docs.mjs`.
- Comprovar que todo dado esportivo citado no texto corresponde a um resultado real registrado no banco/domínio.

## Falhas e limites
- Não inventar causalidade entre acontecimentos e números estatísticos sem fundamentação documental.
- Conteúdos sem fontes suficientes devem ser marcados como rascunho (`draft`), nunca publicados como registros definitivos.

## Entregáveis
- Arquivo de capítulo editorial estruturado em Markdown, índice cronológico de acontecimentos e lista de fontes verificadas.
