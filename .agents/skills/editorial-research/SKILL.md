---
name: editorial-research
description: Pesquisar e estruturar narrativas autorais, capítulos históricos e biografias conectados a dados esportivos rastreáveis.
---

# editorial-research — Pesquisa e Estruturação Editorial Desportiva

## Ativação e propósito

Conduzir a pesquisa histórica, curadoria de fontes primárias e secundárias, e estruturação de crônicas autorais e perfis biográficos no F1Atlas, interligando a narrativa humana aos registros esportivos verificados do campeonato.

- **Quando acionar:** Na elaboração de biografias de pilotos, perfis de equipes históricas, análises de eras técnicas ou retrospectivas de Grandes Prêmios marcantes.
- **Quando NÃO acionar:** Para cálculos de classificação matemática de campeonato (utilizar `scoring-rules`) ou auditoria técnica de código (utilizar `code-review`).

## Pré-condições

- Consultar `AGENTS.md` (Seção 1 — Missão e Limites; Seção 6 — Editorial) e `docs/specs/product/SPEC-EDIT-001.md`.
- Conhecimento da diretriz de **narrativa contextualizada**: toda história deve possuir conexão rastreável com dados estatísticos e resultados do banco de dados.
- Proibição absoluta de utilizar IA generativa para inventar fatos, diálogos ou estatísticas.

## Procedimento

1. **Definição da Pauta e Época Histórica**:
   - Mapear a temporada, os Grandes Prêmios e os pilotos centrais da narrativa.
   - Identificar o regulamento técnico e desportivo vigente no período para contextualização precisa.
2. **Coleta e Triagem de Fontes**:
   - Consultar fontes primárias (súmulas da FIA, boletins oficiais de comissários, tempos homologados).
   - Consultar fontes secundárias respeitadas (imprensa desportiva especializada da época, autobiografias de engenheiros e pilotos).
   - Exigir congruência entre ao menos duas fontes independentes para fatos controversos.
3. **Estruturação Conforme a Arquitetura Editorial**:
   - **Metadados Canônicos**: tags de piloto (`driver_id`), equipe (`team_id`), Grande Prêmio (`gp_id`) e temporada (`season`).
   - **O Fato Desportivo**: o acontecimento objetivo e comprovado na pista.
   - **O Contexto Histórico e Técnico**: temperatura da pista, confiabilidade dos motores, pressão de campeonato, inovações mecânicas.
   - **A Análise Crítica Autoral**: interpretação e significado esportivo do momento pelo autor.
4. **Vinculação com Gráficos e Registros Numéricos**:
   - Identificar tabelas de resultados, gráficos de posições por volta ou comparações de tempos que devem ilustrar o texto.
   - Inserir chamadas contextuais para navegação cruzada (ex.: link direto para a súmula da corrida).
5. **Revisão contra Anacronismos**:
   - Eliminar conceitos modernos aplicados retrospectivamente de forma indevida (ex.: falar em *DRS train* nos anos 1980 ou penalidades de limites de pista modernas em pistas com caixas de brita originais).

## Validação

- Executar a checagem cruzada de fatos via skill `historical-fact-checking`.
- Validar integridade de links Markdown e ausência de links quebrados: `npm run verify:docs`.
- Comprovar que todo número citado no texto (ex.: volta de abandono, diferença de tempo na bandeirada) corresponde exatamente aos dados registrados no F1Atlas.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Discrepância no número de voltas lideradas | Uso de fonte jornalística informal | Recorrer à súmula de cronometragem oficial da FIA/etapa |
| Conclusão apresentando boato como verdade | Ausência de fontes primárias confirmadas | Reclassificar a passagem explicitamente como *versão de bastidores* ou remover |
| Texto desconectado das estatísticas da etapa | Escrita isolada sem consulta ao banco de dados | Adicionar referências de dados e links para a classificação da corrida |
| Atribuição de intenção desportiva sem prova | Julgamento pessoal do redator sobre manobra | Descrever a manobra fisicamente e citar o relatório dos comissários |

### Limitações
- Narrativas editoriais expressam perspectiva autoral, mas os fatos que a sustentam são imutáveis e verificáveis.

## Entregáveis

- Capítulo editorial em Markdown estruturado em conformidade com `SPEC-EDIT-001`.
- Lista bibliográfica e matriz de fontes consultadas anexada ao documento.
- Relatório de Curadoria Editorial com vínculos de dados estabelecidos e aprovados.
