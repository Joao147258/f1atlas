---
name: historical-fact-checking
description: Confrontar afirmações históricas, biografias e marcos automobilísticos com fontes primárias, prevenindo anacronismos e imprecisões.
---

# historical-fact-checking — Checagem de Fatos e Rigor Histórico

## Ativação e propósito

Conduzir auditoria factual independente de afirmações, cronologias, ordens de chegada, tempos, motivos de abandono e denominações técnicas presentes em conteúdos editoriais, garantindo que o F1Atlas publique apenas informações desportivas historicamente verificadas.

- **Quando acionar:** Antes da publicação ou consolidação de qualquer biografia, crônica histórica ou retrospectiva elaborada pelo `editorial-engineer`.
- **Quando NÃO acionar:** Para testes de software ou verificação estática de código-fonte (utilizar `test-design` ou `code-review`).

## Pré-condições

- Consultar `AGENTS.md` (Seção 4 e 5 — Integridade de Dados, Direitos e Domínio Esportivo) e `docs/specs/product/SPEC-EDIT-001.md`.
- Acesso aos registros oficiais da FIA, anuários reconhecidos e base de dados homologada do F1Atlas.
- Desconfiar de mitos populares, lendas urbanas de paddock ou memórias orais não documentadas por súmulas de prova.

## Procedimento

1. **Extração e Mapeamento de Afirmações Fatuais**:
   - Isolar todas as afirmações que expressam dados objetivos:
     - Datas, circuitos e condições de corrida.
     - Posições de grid de largada e classificação final homologada.
     - Intervalos de tempo entre pilotos e número exato de voltas.
     - Motivos mecânicos ou desportivos de abandonos (DNF).
     - Denominação oficial da equipe e construtor na temporada em questão.
2. **Confrontação com Fontes Primárias e Secundárias**:
   - Confrontar com os registros oficiais de cronometragem da FIA e da etapa.
   - Cruzar com pelo menos duas fontes secundárias independentes e documentadas.
3. **Classificação Tripartite das Afirmações**:
   - **Fato Confirmado**: sustentado por súmula oficial ou congruência de múltiplas fontes confiáveis.
   - **Contexto Controversial**: episódios com versões conflitantes (ex.: decisões controversas de comissários desportivos); deve registrar o resultado oficial homologado pela FIA acompanhado da descrição neutra dos protestos.
   - **Afirmação Incorreta / Não Corroborada**: dado divergente da cronometragem ou sem evidência documentada; veto imediato até correção.
4. **Verificação de Consistência Regulamentar da Época**:
   - Conferir se o sistema de pontuação citado corresponde ao regulamento do ano em questão.
   - Verificar se as regras de pneus, combustível e segurança citadas estavam vigentes na época.
5. **Auditoria de Denominações Históricas**:
   - Distinguir o construtor do patrocinador titular (ex.: *Lotus-Climax* em 1963; *Benetton-Ford* em 1994; *Brawn-Mercedes* em 2009).
6. **Emissão de Parecer e Aprovação**:
   - Registrar no laudo de checagem todos os apontamentos validados e pendências a retificar.

## Validação

- Conferir se todos os números de corrida citados no texto possuem paridade idêntica com o banco de dados oficial do F1Atlas.
- Executar validação de referências documentais: `npm run verify:docs`.
- Garantir que nenhum fato considerado controverso seja apresentado como verdade absoluta sem a menção às versões documentadas.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Posição de chegada diverge da súmula | Texto considerou resultado da pista antes de punição pós-corrida | Ajustar para a classificação final oficial homologada pelos comissários |
| Nome de equipe anacrônico | Aplicação de nome moderno a equipe histórica | Consultar o registro oficial de inscrição (*entry list*) da temporada exata |
| Equívoco em volta de abandono | Confusão entre momento do acidente e registro de encerramento | Verificar a cronometragem volta a volta (*lap chart*) oficial |
| Informação desportiva sem fonte | Reprodução de boato ou conteúdo não auditado | Exigir fonte primária ou suprimir a informação do texto |

### Limitações
- Controvérsias históricas não resolvidas documentalmente devem ser apresentadas com imparcialidade, mantendo sempre a decisão oficial como marco de dados.

## Entregáveis

- Laudo de Checagem Histórica contendo:
  - Afirmações verificadas com respectivas fontes primárias.
  - Ajustes obrigatórios de datas, números ou terminologia.
  - Parecer formal de aprovação: `HISTORICALLY ACCURATE` ou `REVISION REQUIRED`.
