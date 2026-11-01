---
name: quality-gates
description: Orquestrar e auditar a execução determinística dos quality gates públicos e locais, diferenciando aprovações reais de verificações não aplicáveis (SKIP).
---

# quality-gates

## Ativação e propósito
Orquestrar, auditar e interpretar a execução mecânica dos quality gates do projeto.
- **Quando acionar:** Antes da conclusão de qualquer incremento de engenharia, antes de submeter um Pull Request, ou durante diagnósticos de conformidade e integridade do repositório.
- **Quando NÃO acionar:** Para validação conceitual ou editorial pura que não possua verificadores automatizados; não substitui o julgamento de design ou revisão de código.

## Pré-condições
- Consultar `docs/development/quality-gates.md`, `AGENTS.md` (Seção 11) e `SPEC-GOV-005.md`.
- Confirmar que o Node.js >= 20 está disponível e o workspace está no diretório correto.
- Verificar o estado do Git (`git status`) antes de rodar os verificadores locais.
- Confirmar que os Git hooks estão ativos via `npm run hooks:verify` antes de propor commits ou pushes.

## Procedimento
1. **Preparação:** Inspecionar os gates ativos no `package.json` (`verify`, `verify:structure`, `verify:docs`, `verify:security`, `verify:architecture`, `verify:seo`, `verify:analytics`, `verify:local`, `test:harness`, `hooks:verify`, `hooks:pre-commit`, `hooks:pre-push`).
2. **Investigação:** Executar os gates individualmente ou via orquestrador consolidado (`node scripts/quality/run-all.mjs`).
3. **Decisão:** Avaliar os códigos de saída retornados:
   - Código `0` com `PASS`: gate executado e aprovado.
   - Código `0` com `SKIP` (`NÃO APLICÁVEL`): funcionalidade ausente no estágio atual; registrar como pendência justificada e **nunca** como conformidade implementada.
   - Código `1` com `FAIL`: violação determinística; interrupção mandatória da entrega até resolução.
   - Código `2` com `ERROR`: falha de infraestrutura ou sintaxe; diagnóstico de ambiente requerido.
4. **Execução:** Caso ocorram falhas, isolar o script causador, reproduzir com comando unitário e aplicar a correção mínima necessária.
5. **Validação:** Reexecutar `npm run verify` e `npm run verify:local` para confirmar a resolução sem regressão nos demais gates. Utilizar `npm run hooks:pre-commit` e `npm run hooks:pre-push` para validar o comportamento dos hooks em modo diagnóstico.
6. **Entrega:** Gerar o sumário consolidado de execução, indicando a contagem de PASS, SKIP, FAIL e ERROR.

## Validação
- Executar `npm run verify` e verificar o resumo final com contadores e código de saída `0`.
- Para inspeções locais na máquina do desenvolvedor, executar `npm run verify:local` e conferir proteção de arquivos privados e staging.
- Executar `npm run hooks:verify` para comprovar que os hooks estão configurados e ativos.

## Falhas e limites
- Não silenciar erros, desativar verificadores ou alterar scripts de validação para forçar aprovação.
- É expressamente proibido contornar os Git hooks com flags de bypass (`--no-verify`).
- Scanners estáticos não substituem testes comportamentais nem garantem ausência total de vulnerabilidades lógicas.

## Entregáveis
- Resumo de status dos quality gates contendo: lista de comandos executados, contagem consolidada (PASS / SKIP / FAIL / ERROR), lista de pendências (gates em SKIP) e evidências textuais da execução.
