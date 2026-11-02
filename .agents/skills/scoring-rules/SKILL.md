---
name: scoring-rules
description: Especificar e implementar o motor determinístico de cálculo de pontuação oficial, voltas rápidas, desempates e simulações por temporada.
---

# scoring-rules — Motor Determinístico de Pontuação Esportiva

## Ativação e propósito

Projetar, implementar e auditar os algoritmos matemáticos de pontuação desportiva oficial, tabelas de classificação de pilotos e construtores e critérios regulamentares de desempate no F1Atlas, respeitando as variações históricas de regras por temporada.

- **Quando acionar:** Na implementação ou verificação de tabelas de pontos de Grandes Prêmios, corridas Sprint, voltas rápidas históricas, corridas encurtadas por bandeira vermelha e simulações de cenários.
- **Quando NÃO acionar:** Para renderização visual de tabelas na interface (utilizar `frontend-implementation`) ou persistência em banco de dados (utilizar `prisma-schema-modeling`).

## Pré-condições

- Consultar `AGENTS.md` (Seção 4 — Domínio Esportivo), `docs/architecture/domain-model.md` e o regulamento desportivo da FIA correspondente à temporada calculada.
- **Invariante Regulamentar 2025**: A FIA eliminou o ponto de bonificação por volta mais rápida a partir da temporada de 2025; não conceder ponto extra de volta mais rápida para corridas de 2025 em diante.
- O motor de pontuação deve ser implementado como funções puras sem efeitos colaterais.

## Procedimento

1. **Configuração da Tabela de Pontuação por Temporada**:
   - Mapear a matriz de pontuação conforme a temporada selecionada:
     - **Corrida Principal (Padrão 2025)**:
       - 1º: 25 | 2º: 18 | 3º: 15 | 4º: 12 | 5º: 10 | 6º: 8 | 7º: 6 | 8º: 4 | 9º: 2 | 10º: 1.
     - **Corrida Sprint (Padrão 2025)**:
       - 1º: 8 | 2º: 7 | 3º: 6 | 4º: 5 | 5º: 4 | 6º: 3 | 7º: 2 | 8º: 1.
     - **Volta Mais Rápida**:
       - 2019–2024: 1 ponto adicional se o piloto terminar no top 10.
       - 2025 em diante: **0 pontos** (regra revogada pela FIA).
2. **Cálculo de Provas Encurtadas (Critério de Distância Percorrida)**:
   - Se a prova for suspensa e não puder ser retomada, aplicar os intervalos regulamentares da FIA:
     - Menos de 2 voltas sob bandeira verde: nenhum ponto concedido.
     - Entre 2 voltas e 25% da distância programada: pontuação reduzida (Coluna 1 FIA).
     - Entre 25% e 50% da distância programada: pontuação reduzida (Coluna 2 FIA).
     - Entre 50% e 75% da distância programada: pontuação reduzida (Coluna 3 FIA).
     - 75% ou mais da distância programada: pontuação integral (100%).
3. **Aplicação de Desempates no Campeonato (Countback)**:
   - Em caso de empate em pontos acumulados entre pilotos ou equipes, aplicar ordenação estrita:
     1. Maior número de vitórias (1º lugar).
     2. Maior número de 2º lugares, 3º lugares, sucessivamente, até desempate.
     3. Se permanecer o empate, critério de antiguidade de melhor resultado homologado.
4. **Agregação de Construtores**:
   - Somar os pontos conquistados por todos os carros inscritos sob o construtor naquela etapa, aplicando desclassificações ou penalidades de equipe quando aplicável.
5. **Garantia de Não Contaminação de Simulação**:
   - Cálculos gerados para simulação hipotética recebem a tag de contexto `isSimulation: true` e nunca alteram a tabela de pontos consolidada.

## Validação

- Executar a suíte de testes de pontuação: `npm run test:harness`.
- Validar casos-limite determinísticos:
  - Corrida encurtada com 48% de voltas (pontuação proporcional).
  - Empate perfeito de pontos entre dois pilotos com desempate por contagem de 2º lugares.
  - Temporada 2025 sem ponto adicional para volta mais rápida.
  - Temporada 2024 com ponto de volta mais rápida concedido ao 9º colocado e negado ao 12º colocado.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Ponto de volta mais rápida atribuído em 2025 | Uso de regra legada de 2019-2024 no motor de 2025 | Atualizar a matriz de regras da temporada 2025 com `fastestLapBonus: 0` |
| Piloto fora do top 10 recebendo ponto de volta rápida (2024) | Validação omitida da posição de chegada | Condicionar bonificação a `finishPosition <= 10` |
| Erro de desempate por ordem alfabética | Falta de aplicação do algoritmo countback | Implementar loop comparador de melhores colocações antes de fallback |
| Prova com 5 voltas pontuada integralmente | Ausência de verificação de porcentagem de voltas | Checar `lapsCompleted / totalLaps` antes de selecionar a tabela de pontos |

### Limitações
- O motor calcula pontuações matemáticas homologadas; revisões dependem de súmula oficial da FIA.

## Entregáveis

- Funções puras de cálculo em `packages/domain/scoring/`.
- Matriz de testes de pontuação cobrindo todas as variantes de regulamento e corridas encurtadas.
- Relatório de Validação de Pontuação com resultados de asserções nominais e de borda.
