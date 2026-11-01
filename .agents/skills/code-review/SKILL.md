---
name: code-review
description: Conduzir revisão técnica independente de código, contratos, testes, segurança e aderência a limites modulares antes da integração.
---

# code-review

## Ativação e propósito
Examinar criticamente alterações de código e documentação quanto a defeitos, conformidade com as SPECs, segurança, cobertura de testes e manutenção.
- **Quando acionar:** Antes da conclusão de qualquer implementação, durante preparação de PRs ou ao avaliar código submetido por outros agentes.
- **Quando NÃO acionar:** Para substituir a fase de implementação do desenvolvedor ou para avaliações puramente visuais/estéticas de UI.

## Pré-condições
- Consultar `AGENTS.md` (Seção 10 e 14), `docs/development/git-workflow.md` e a SPEC da funcionalidade em revisão.
- Obter o diff completo das mudanças através de `git diff` ou `git status --short`.

## Procedimento
1. **Preparação:** Identificar o escopo da tarefa, a SPEC correspondente e os arquivos alterados.
2. **Investigação:**
   - Inspecionar separação de responsabilidades (Backend First, pureza do domínio).
   - Verificar se há vazamento de abstrações (ex.: imports de infraestrutura em camadas de domínio).
   - Analisar tratamento de erros e integridade de tipos.
   - Conferir se os testes cobrem casos de sucesso, falha e bordas relevantes.
3. **Decisão:** Classificar os achados por severidade:
   - **Bloqueador:** quebra de contrato, falha de segurança, violação de limite arquitetural, ausência de testes obrigatórios.
   - **Melhoria recomendada:** oportunidade de simplificação, legibilidade ou refatoração menor.
   - **Dúvida/Esclarecimento:** comportamento ambíguo que exige validação com a SPEC.
4. **Execução:** Formular o parecer de revisão referenciando arquivo e linha de cada apontamento. Proibir autoaprovação de código pelo próprio autor da mudança.
5. **Validação:** Exigir evidências de aprovação nos gates pertinentes (`npm run verify`, testes do harness).
6. **Entrega:** Emitir o parecer com status formal: `APROVADO`, `REQUER_AJUSTES` ou `BLOQUEADO`.

## Validação
- O código sob revisão deve ser submetido aos quality gates públicos (`npm run verify`) e testes automatizados sem erros.

## Falhas e limites
- O revisor de código não deve aplicar silenciosamente alterações em nome do autor; deve relatar e requerer correções.
- Uma revisão de código não substitui a auditoria especializada de segurança quando houver manipulação de credenciais ou dados externos.

## Entregáveis
- Parecer de revisão contendo: escopo avaliado, achados classificados com localização exata, impactos identificados e status de aprovação.
