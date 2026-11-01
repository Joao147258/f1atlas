---
name: historical-fact-checking
description: Confrontar afirmações históricas, biografias e marcos automobilísticos com fontes primárias, prevenindo anacronismos e imprecisões.
---

# historical-fact-checking

## Ativação e propósito
Auditar e verificar a exatidão factual de afirmações históricas, resultados de corridas, datas, ordens de chegada e denominações de equipes no conteúdo editorial.
- **Quando acionar:** Antes da publicação de qualquer história, biografia ou análise retrospectiva produzida pelo `editorial-engineer`.
- **Quando NÃO acionar:** Para cálculos automatizados de pontuação ou testes de software (utilizar `scoring-rules` ou `test-design`).

## Pré-condições
- Consultar `AGENTS.md` (Seção 4 e 5), `docs/specs/product/SPEC-EDIT-001.md` e os arquivos oficiais da FIA ou publicações históricas reconhecidas.
- Desconfiar de memórias populares ou mitos esportivos não comprovados por registros de prova.

## Procedimento
1. **Preparação:** Isolar todas as afirmações factuais contidas no texto (datas, posições de largada/chegada, tempos, motivos de abandono, transferências de pilotos).
2. **Investigação:**
   - Confrontar cada afirmação contra os registros esportivos oficiais do campeonato.
   - Verificar a denominação oficial correta da equipe no ano específico (ex.: distinguir a equipe histórica da sua marca comercial na temporada).
   - Checar anacronismos em regulamentos técnicos ou sistemas de pontuação da época.
3. **Decisão:** Classificar cada declaração auditada:
   - **Fato Confirmado:** corroborado por duas ou mais fontes confiáveis ou registro oficial de sessão.
   - **Interpretação Contextual:** opinião de especialistas ou leitura de corrida; deve ser redigida explicitamente como análise.
   - **Não Corroborado / Incorreto:** requer correção imediata ou remoção do texto.
4. **Execução:** Marcar no documento as passagens aprovadas e indicar correções obrigatórias para passagens divergentes.
5. **Validação:** Reinspecionar o texto ajustado garantindo total precisão factual e coerência com os dados do F1Atlas.
6. **Entrega:** Emitir o laudo de checagem de fatos autorizando ou vetando a publicação.

## Validação
- Verificar se todas as citações desportivas possuem correspondência exata nos dados catalogados da temporada.

## Falhas e limites
- Não aceitar respostas de IA generativa como autoridade histórica final; exigir fontes primárias auditadas.
- Caso não haja evidências históricas suficientes para confirmar um detalhe, remover a afirmação ou declará-la expressamente como incerta.

## Entregáveis
- Relatório de checagem de fatos com lista de afirmações validadas, fontes primárias consultadas e parecer formal de publicação.
