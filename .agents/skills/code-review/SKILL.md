---
name: code-review
description: Conduzir revisão técnica independente de código, contratos, testes, segurança e aderência a limites modulares antes da integração.
---

# code-review — Revisão Técnica Independente de Código

## Ativação e propósito

Examinar criticamente alterações de código-fonte, contratos, migrações e testes automatizados quanto à correção funcional, conformidade arquitetural, segurança, legibilidade e cobertura antes de qualquer mesclagem (*merge*) ou conclusão de tarefa.

- **Quando acionar:** Antes da conclusão de qualquer funcionalidade, na submissão de Pull Requests ou após implementações executadas pelo `developer`, `backend-engineer` ou `frontend-engineer`.
- **Quando NÃO acionar:** Para atuar como implementador ou para validações puramente estéticas de design visual.

## Pré-condições

- Consultar `AGENTS.md` (Seção 9 e 10 — Processo de Trabalho e Política de Código e Testes).
- Obter o diff completo das alterações via `git diff` ou `git diff --staged`.
- **Princípio de Independência**: O revisor opera com distanciamento crítico; proíbe-se expressamente que um agente aprove suas próprias modificações sem auditoria independente.

## Procedimento

1. **Delimitação de Escopo e Requisitos**:
   - Inspecionar a SPEC ou Issue que originou a alteração.
   - Confrontar as mudanças com os critérios de aceite estabelecidos.
2. **Inspeção de Integridade Funcional e Regras de Negócio**:
   - Auditar a lógica de controle contra regressões, null pointers, erros de off-by-one e vazamento de exceções.
   - Verificar se as regras do automobilismo respeitam as invariantes da temporada (ex.: temporalidade, pontuação sem bônus de volta rápida em 2025).
3. **Inspeção Arquitetural e Limites**:
   - Checar se houve vazamento de banco de dados ou frameworks para o domínio esportivo puro.
   - Avaliar acoplamento e responsabilidade única de classes e funções.
4. **Auditoria de Qualidade dos Testes**:
   - Conferir se os testes realmente exercitam cenários de erro, valores-limite e invariantes, e não apenas o caminho feliz.
   - Rejeitar testes cosméticos que apenas executam código sem asserções determinísticas.
5. **Classificação Formal dos Achados por Severidade**:
   - **BLOCKER**: Falha de segurança, vulnerabilidade de segredos, quebra de contrato de API pública ou regressão confirmada.
   - **CRITICAL**: Violação de limite arquitetural, ausência de testes para caminho crítico ou cálculo incorreto de pontuação.
   - **MAJOR**: Duplicação excessiva, ausência de tratamento de erro ou acoplamento acidental evitável.
   - **MINOR**: Oportunidade de melhoria de legibilidade, nomes de variáveis ou comentários desnecessários.
   - **INFO**: Sugestão técnica futura ou elogio de boa prática aplicada.
6. **Emissão de Parecer Técnico Fundamentado**:
   - Referenciar cada apontamento com caminho de arquivo e número de linha.
   - Fornecer recomendação corretiva objetiva sem alterar o código diretamente.

## Validação

- Exigir aprovação de todos os testes unitários e de integração: `npm run test:harness`.
- Exigir aprovação integral nos quality gates: `npm run verify`.
- Comprovar que o código compila sem erros de tipo: `npm run typecheck:api` (quando aplicável).

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Teste passando sem verificar o resultado real | Asserção fraca (`expect(result).toBeDefined()`) | Requerer asserção estrita de valores e propriedades (`deepStrictEqual`) |
| Try/catch genérico mascarando erros | Captura silenciosa de falha impedindo diagnóstico | Remover o catch silencioso ou relatar o erro com código de saída adequado |
| Tratamento de erro Prisma exposto ao domínio | Controller ou use case tratando `P2002` | Mover tratamento para o repositório Prisma e emitir erro de domínio puro |
| Mudança contendo arquivos privados staged | Arquivo `.local/` ou `.env` incluído no git status | Exigir desindexação imediata (`git restore --staged`) e ajuste no `.gitignore` |

### Limitações
- A revisão técnica analisa evidências observáveis no diff; não substitui o teste dinâmico em ambiente real de homologação.

## Entregáveis

- Parecer de Revisão de Código estruturado contendo:
  - Escopo e diff analisado.
  - Tabela de achados classificados com arquivo, linha e justificativa técnica.
  - Resultado formal da auditoria: `APROVADO`, `REQUER_AJUSTES` ou `BLOQUEADO`.
