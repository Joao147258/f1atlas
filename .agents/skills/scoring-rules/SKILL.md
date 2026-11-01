---
name: scoring-rules
description: Especificar e implementar o motor determinístico de cálculo de pontuação oficial, voltas rápidas, desempates e simulações por temporada.
---

# scoring-rules

## Ativação e propósito
Projetar e validar os algoritmos de cálculo de pontos, tabelas de classificação de pilotos e construtores, e aplicação de regras desportivas específicas por temporada.
- **Quando acionar:** Na implementação ou validação de regras de pontuação (corridas normais, sprints, voltas rápidas, provas encurtadas e critérios de desempate).
- **Quando NÃO acionar:** Para renderização gráfica de tabelas de classificação em frontend (utilizar `frontend-implementation`).

## Pré-condições
- Consultar `docs/specs/domain/SPEC-DOM-003.md`, `docs/architecture/domain-model.md` e os regulamentos oficiais da temporada sob cálculo (ex.: 2025).
- Reconhecer que regras de 2025 não são universais e não podem ser projetadas retroativamente ou prospectivamente sem validação.

## Procedimento
1. **Preparação:** Isolar o motor de regras como funções puras determinísticas dentro de `packages/domain/scoring`.
2. **Investigação:**
   - Mapear a tabela de pontos da temporada (ex.: 25-18-15-12-10-8-6-4-2-1 para os 10 primeiros em corrida principal).
   - Mapear critérios de volta mais rápida (ex.: elegibilidade apenas para pilotos no top 10).
   - Mapear sessões sprint (ex.: 8-7-6-5-4-3-2-1 para os 8 primeiros).
   - Mapear provas encurtadas por bandeira vermelha conforme intervalos de distância percorrida.
   - Mapear critérios de desempate no campeonato (maior número de vitórias, 2º lugares, etc.).
3. **Decisão:** Separar rigorosamente resultados oficiais de simulações hipotéticas. Uma projeção de simulação nunca altera dados gravados de sessões reais.
4. **Execução:** Implementar as funções de cálculo puras, recebendo resultados da sessão e retornando pontuação e classificação calculada.
5. **Validação:** Construir fixtures sintéticas de teste cobrindo casos nominais, provas encurtadas, empates em pontos e penalidades pós-corrida.
6. **Entrega:** Motor de pontuação com 100% de cobertura determinística em testes unitários offline.

## Validação
- Executar os testes automatizados de pontuação via `npm run test:harness`.
- Comprovar que dados de entrada idênticos produzem invariavelmente os mesmos resultados (determinismo estrito).

## Falhas e limites
- Não codificar regras com 'números mágicos' espalhados pelo código; usar tabelas de configuração versionadas por regulamento.
- Alterações em regras de novas temporadas não devem alterar silenciosamente os cálculos de temporadas passadas.

## Entregáveis
- Módulo de pontuação determinístico, fixtures sintéticas de validação desportiva e suíte de testes de regressão.
