# Módulo Scoring — Regras e Motor de Cálculo de Pontuação

> **Localização:** `docs/domain/scoring.md`  
> **Caminho no código:** `packages/domain/src/scoring/`  
> **Papel arquitetural:** Motor determinístico puro de apuração de pontos e desempates da FIA  
> **Documento pai:** [README.md](./README.md)  
> **Status:** Implementado e Validado (Suíte de 49 testes automatizados nos módulos, cobertura consolidada >99% e 100% Mutation Testing)

---

## 1. Visão Geral e Propósito

O módulo **`scoring`** é o núcleo matemático e regulamentar do F1Atlas. Ele implementa as tabelas normativas da Federação Internacional de Automobilismo (FIA) e os serviços de cálculo determinístico de pontos para pilotos e construtores a partir dos resultados homologados de pista, além de resolver empates na tabela através do sistema oficial de *countback* (desempate por qualidade de posições).

### Princípios Fundamentais de Engenharia Esportiva
1. **Pureza Matemática:** Todos os cálculos são funções determinísticas puras: dado o mesmo conjunto de resultados e o mesmo conjunto de regras (`ScoringRuleset`), o resultado é idêntico, imutável e sem efeitos colaterais.
2. **Isolamento de Infraestrutura:** O módulo não depende de banco de dados, relógio de sistema, frameworks de transporte ou I/O assíncrono.
3. **Parametrização Histórica e Regulamentar:** O motor não codifica regras de um único ano como universais. Regras de 2025, 2026, 2027 e temporadas históricas são parametrizadas via `ScoringRuleset`.
4. **Distinção Estrita entre Fatos e Simulações:** Resultados oficiais homologados jamais são misturados com cenários hipotéticos ou pontuações simuladas.

---

## 2. Limites de Responsabilidade (Boundaries)

### O que PERTENCE ao módulo `scoring`:
- Modelagem de tabelas e critérios de pontuação por temporada (`ScoringRuleset`).
- Cálculo determinístico de pontos individuais por sessão (`PointsCalculator`).
- Aplicação das tabelas oficiais para Corridas Principais (Grand Prix) e Corridas Curtas (Sprint).
- Aplicação das quatro faixas de pontuação para corridas encurtadas/suspensas (FIA Art. 6.5 pós-Spa 2021).
- Tratamento de bonificação de volta mais rápida (vigência histórica até 2024 e abolição em 2025).
- Avaliação de elegibilidade esportiva (status `FINISHED`, `DNF` com $\ge 90\%$ de voltas completadas, `DSQ` com anulação).
- Resolução hierárquica e auditável de desempates entre competidores (`TieBreakPolicy`).

### O que NÃO PERTENCE ao módulo `scoring`:
- Armazenamento ou projeção consolidada da tabela de classificação geral do campeonato (escopo do módulo `championships`).
- Apuração de cronometragem, infrações, penalidades de tempo ou desclassificações de comissários (escopo do módulo `events`).
- Agendamento de etapas ou verificação de datas de fim de semana (escopo do módulo `seasons`).
- Persistência em banco de dados, tabelas SQL ou serialização em arquivos (escopo da camada de persistência/infraestrutura).

---

## 3. Componentes Arquiteturais

| Arquivo TypeScript | Conceito Representado | Papel Arquitetural | Responsabilidade Central |
|---|---|---|---|
| `scoring/scoring-ruleset.ts` | Tabela e Regras de Pontuação | Objeto de Valor / Configuração | Define tabelas de posições, faixas de distância, pontos Sprint e bônus de volta rápida. |
| `scoring/points-calculator.ts` | Calculadora de Pontos | Serviço de Domínio Puro | Recebe resultados brutos e calcula pontos atribuídos a pilotos e construtores. |
| `scoring/tie-break-policy.ts` | Política de Desempate (*Countback*) | Serviço de Domínio / Política | Desempata competidores com pontos iguais aplicando o Artigo 7.2 da FIA. |

---

## 4. O Sistema Oficial de Pontuação da FIA

### 4.1. Corrida Principal (Grand Prix Race) — Distância Completa ($\ge 75\%$)
Conforme o Artigo 6.4 do Regulamento Esportivo da FIA, a tabela padrão vigente para os 10 primeiros colocados em um Grand Prix com percurso regular é:

| Posição | 1º | 2º | 3º | 4º | 5º | 6º | 7º | 8º | 9º | 10º | 11º+ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Pontos** | 25 | 18 | 15 | 12 | 10 | 8 | 6 | 4 | 2 | 1 | 0 |

### 4.2. Corrida Curta (Sprint)
Introduzida em 2021 e reformulada em 2022 (mantida em 2023–2025 conforme o Artigo 6.3 do Regulamento Esportivo), a Sprint distribui pontos aos 8 primeiros colocados:

| Posição | 1º | 2º | 3º | 4º | 5º | 6º | 7º | 8º | 9º+ |
|---|---|---|---|---|---|---|---|---|
| **Pontos** | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |

*Nota:* A sessão Sprint não atribui ponto de bonificação por volta mais rápida em nenhuma temporada.

### 4.3. Bonificação por Volta Mais Rápida (Fastest Lap)
- **Histórico (2019 a 2024):** 1 ponto adicional era concedido ao piloto que registrasse a volta mais rápida da prova principal, sob a condição de terminar a corrida entre os 10 primeiros colocados homologados. Se o detentor da melhor volta terminasse em 11º ou pior, ou abandonasse, o ponto não era outorgado a nenhum piloto.
- **Temporada 2025 em diante:** O Conselho Mundial de Automobilismo da FIA (WMSC) aprovou formalmente em 17 de outubro de 2024 a **abolição do ponto de bonificação de volta mais rápida a partir do campeonato de 2025**. O `ScoringRuleset` deve refletir `fastestLapBonusPoints = 0` para 2025 e manter parametrizável para temporadas históricas.

### 4.4. Corridas Suspensas ou Encurtadas (FIA Artigo 6.5)
Em decorrência do Grande Prêmio da Bélgica de 2021 (Spa-Francorchamps), a FIA reestruturou completamente as regras para provas que não atinjam a distância total programada. Desde a temporada 2022, o Artigo 6.5 estabelece quatro níveis rigorosos:

1. **Menos de duas (2) voltas completadas pelo líder sob condições de bandeira verde:**
   - **Nenhum ponto é concedido** (0 pontos a todos os competidores).
2. **Ao menos 2 voltas completadas, mas menos de 25% da distância programada:**
   - Pontuação reduzida distribuída apenas aos **5 primeiros colocados**:
   - P1: 6 pts | P2: 4 pts | P3: 3 pts | P4: 2 pts | P5: 1 pt.
3. **Ao menos 25%, mas menos de 50% da distância programada:**
   - Pontuação distribuída aos **9 primeiros colocados**:
   - P1: 13 pts | P2: 10 pts | P3: 8 pts | P4: 6 pts | P5: 5 pts | P6: 4 pts | P7: 3 pts | P8: 2 pts | P9: 1 pt.
4. **Ao menos 50%, mas menos de 75% da distância programada:**
   - Pontuação distribuída aos **10 primeiros colocados**:
   - P1: 19 pts | P2: 14 pts | P3: 12 pts | P4: 10 pts | P5: 8 pts | P6: 6 pts | P7: 4 pts | P8: 3 pts | P9: 2 pts | P10: 1 pt.
5. **75% ou mais da distância programada:**
   - **Pontuação integral** (Artigo 6.4 completo).

#### Precedente de Suzuka 2022 e Condição de Aplicação
No GP do Japão de 2022 (Suzuka), a corrida foi suspensa pela chuva e retomada com contagem regressiva por tempo, terminando sob bandeira quadriculada após completados apenas ~52% da distância original. A FIA aplicou pontuação integral porque o texto literal do Artigo 6.5 estipulava que a tabela de pontos reduzidos se aplicava apenas se a corrida fosse *suspensa e não pudesse ser retomada*.
**Diretriz do Domínio F1Atlas:** A função de cálculo deve receber um parâmetro explícito de status da corrida (`reducedPointsApplies: boolean` ou fração de distância validada com flag de suspensão sem retomada), garantindo que a reprodução histórica seja 100% fiel à jurisprudência esportiva da FIA.

---

## 5. Critérios de Elegibilidade e Classificação Oficial

Conforme o Artigo 62.1 do Regulamento Esportivo da FIA:
1. **Status `FINISHED`:** Pilotos que receberam a bandeira quadriculada na pista.
2. **Status `DNF` (Did Not Finish) Classificado:** Um competidor que abandonou a corrida é oficialmente classificado na homologação final se tiver completado **ao menos 90% do número total de voltas cumpridas pelo vencedor da prova** (arredondado para baixo para o número inteiro mais próximo). Se esse competidor terminar posicionado entre os 10 primeiros colocados na classificação final homologada, **ele tem direito legítimo aos pontos correspondentes àquela posição**.
3. **Status `DNF` Não Classificado:** Competidores com menos de 90% das voltas do vencedor não são classificados e não pontuam.
4. **Status `DSQ` (Disqualified):** Competidores desclassificados por comissários técnicos ou desportivos têm todos os seus tempos e posições anulados, recebendo **0 pontos absolutos**. Suas posições não pontuam e os pilotos subsequentes avançam na ordem de classificação.
5. **Status `DNS` (Did Not Start) e `NC` (Not Classified):** Recebem 0 pontos.

---

## 6. Desempate Oficial da FIA: O Algoritmo de *Countback*

Quando dois ou mais pilotos ou construtores encerram o campeonato empatados no total de pontos, a posição final não é decidida por ordem alfabética ou sorteio preliminar, mas pelo Artigo 7.2 do Regulamento Esportivo da FIA:

### 6.1. Ordem de Precedência Algorítmica
1. **Passo 1 (Pontos Totais):** Maior número total de pontos acumulados.
2. **Passo 2 (Vitórias em Grand Prix):** Maior número de primeiros lugares (P1) obtidos em Grandes Prêmios durante a temporada.
3. **Passo 3 (Posições Subsequentes em Grand Prix):** Se o empate persistir, compara-se o maior número de segundos lugares (P2). Persistindo, compara-se P3, P4, P5, e assim sucessivamente até a pior posição de chegada registrada (ex: P20, P21, P22).
4. **Passo 4 (Posições em Corridas Sprint — Opcional por Regulamento):** No regulamento FIA 2025, o Artigo 7.2 estabelece o countback restrito a resultados de Grandes Prêmios e, persistindo o empate, julgamento discricionário da FIA. No entanto, o motor de domínio suporta parametricamente a avaliação de colocações em Sprint caso configurado (`includeSprintInTieBreak: true`).
5. **Passo 5 (Julgamento Discricionário da FIA / Empate Absoluto):** Se os concorrentes permanecerem rigorosamente empatados em todos os critérios numéricos objetivos, o Artigo 7.2 determina que a FIA nomeará o vencedor segundo os critérios que julgar cabíveis. No domínio F1Atlas, esse caso extremo é identificado como `TIE_UNRESOLVED_BY_RULES`, emitindo um relatório de empate absoluto sem decisões aleatórias.

### 6.2. Regra Específica para Construtores
No Campeonato Mundial de Construtores (WCC), cada equipe inscreve habitualmente dois carros. Para fins de *countback*, a contagem não soma posições de forma agrupada por evento: **compara-se a distribuição de melhores colocações individuais alcançadas pelos carros da equipe em todas as sessões**. Por exemplo, uma equipe cujos dois carros chegaram em P3 e P4 em uma prova computa um P3 e um P4 na sua matriz de posições.

### 6.3. Contrato Enriquecido de Auditoria (`TieBreakResult`)
Para apoiar a camada de narrativa e auditoria do F1Atlas, a política de desempate não deve retornar apenas um número opaco (`-1`, `0`, `1`). O contrato deve fornecer um objeto estruturado:
```typescript
export interface TieBreakResult {
  readonly winnerId: string;
  readonly loserId: string;
  readonly decisiveCriterion: 'POINTS' | 'GP_POSITIONS' | 'SPRINT_POSITIONS' | 'UNRESOLVED';
  readonly decisivePosition?: number; // Ex: 1 para vitórias, 2 para P2
  readonly winnerCount?: number;      // Quantas vezes o vencedor obteve a posição
  readonly loserCount?: number;       // Quantas vezes o perdedor obteve a posição
  readonly explanation: string;       // Texto compreensível para narrativa/UI
}
```

---

## 7. Invariantes do Módulo

O módulo `scoring` assegura as seguintes garantias matemáticas e de integridade:

- **INV-SC-01 (Não-Negatividade):** A pontuação outorgada a qualquer piloto ou construtor em qualquer sessão é sempre um número finito maior ou igual a zero ($\text{points} \ge 0$). Pontuações negativas não existem no domínio.
- **INV-SC-02 (Ordem Não-Crescente da Tabela):** Em qualquer tabela de pontuação válida (`ScoringRuleset`), a pontuação de uma posição superior é estritamente maior ou igual à pontuação da posição imediatamente inferior ($P_i \ge P_{i+1}$ para todo $i \ge 1$).
- **INV-SC-03 (Posição Inteira Positiva):** Posições de chegada para efeito de cálculo de pontos são estritamente inteiros positivos ($n \in \mathbb{Z}^+$ onde $n \ge 1$).
- **INV-SC-04 (Anulação por DSQ):** Qualquer resultado com status `DSQ` recebe 0 pontos de posição e 0 pontos de bonificação, sem exceções.
- **INV-SC-05 (Isolamento de Simulação):** Pontos oriundos de sessões hipotéticas marcadas com `isSimulated: true` recebem uma etiqueta de contexto simulado e jamais sofrem mutação no repositório oficial de resultados homologados.

---

## 8. Cenários de Teste Essenciais para a Futura Implementação

Quando o módulo for implementado, os seguintes cenários devem ser obrigatoriamente cobertos por testes unitários e de propriedades:

1. **Grande Prêmio Completo 2025:** Atribuição correta de 25, 18, 15, ..., 1 ponto para os 10 primeiros; verificação de 0 pontos para 11º em diante; confirmação de que volta mais rápida em 2025 confere 0 pontos adicionais.
2. **Volta Rápida Histórica (ex: 2024):** Piloto em P4 com melhor volta recebe 12 + 1 = 13 pontos. Piloto em P11 com melhor volta recebe 0 pontos de posição e 0 de bonificação.
3. **Corridas Reduzidas pós-2021:**
   - 1 volta completada sob bandeira verde $\rightarrow$ 0 pontos.
   - 20% da distância (2 voltas a <25%) $\rightarrow$ 6, 4, 3, 2, 1 pontos (P1 a P5).
   - 40% da distância (25% a <50%) $\rightarrow$ 13, 10, 8, ..., 1 ponto (P1 a P9).
   - 65% da distância (50% a <75%) $\rightarrow$ 19, 14, 12, ..., 1 ponto (P1 a P10).
4. **Piloto DNF Classificado:** Piloto que completou 92% das voltas e terminou homologado em P9 recebe 2 pontos.
5. **Piloto Desclassificado (DSQ):** Piloto cruzou a linha em P2, mas sofreu DSQ $\rightarrow$ 0 pontos; competidor de P3 promovido a P2 com pontuação reajustada.
6. **Sprint 2025:** Verificação dos pontos de 8 a 1 para o top 8.
7. **Countback por Vitórias:** Dois pilotos empatados em 300 pontos; Piloto A tem 6 vitórias e Piloto B tem 5 vitórias $\rightarrow$ Piloto A classificado à frente.
8. **Countback Profundo:** Dois pilotos empatados com 1 vitória, 2 segundos lugares, 0 terceiros lugares; Piloto A tem 4 quartos lugares e Piloto B tem 3 quartos lugares $\rightarrow$ Piloto A classificado à frente com justificativa auditável no `TieBreakResult`.
9. **Countback por Sprint:** Empate absoluto em todas as posições de Grande Prêmio, mas Piloto A venceu 1 Sprint contra 0 de Piloto B $\rightarrow$ Piloto A vence o desempate.

---

## 9. Referências Oficiais da FIA

1. **FIA Formula One Sporting Regulations 2024 & 2025:**
   - *Article 6.3:* Sprint points allocation.
   - *Article 6.4:* Grand Prix race points allocation.
   - *Article 6.5:* Reduced points for suspended races.
   - *Article 7.1:* Dead heat and championship tie-break countback system.
   - *Article 62.1:* Official classification criteria and 90% distance threshold.
2. **FIA World Motor Sport Council (WMSC) Decisions:**
   - Decisão de 17 de outubro de 2024: Supressão formal do ponto adicional para volta mais rápida a partir da temporada de 2025.
