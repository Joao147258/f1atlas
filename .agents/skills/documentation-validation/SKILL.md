---
name: documentation-validation
description: Auditar integridade estrutural, referências relativas, contratos de SPECs e ausência de links quebrados em documentos Markdown.
---

# documentation-validation

## Ativação e propósito
Verificar a consistência técnica, integridade referencial e conformidade de formato de toda a documentação, SPECs e ADRs do projeto.
- **Quando acionar:** Após criar ou modificar qualquer documento Markdown em `docs/`, `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `GEMINI.md` ou relatórios.
- **Quando NÃO acionar:** Para validação de precisão factual de história automobilística (utilizar `historical-fact-checking`).

## Pré-condições
- Consultar `docs/specs/governance/SPEC-GOV-004.md`, `docs/development/documentation-standard.md` e `docs/development/specification-standard.md`.
- Inspecionar a árvore de documentação em `docs/` e modelos em `.agents/templates/`.

## Procedimento
1. **Preparação:** Mapear arquivos modificados e suas referências cruzadas (`git status --short`).
2. **Investigação:**
   - Verificar se as SPECs contêm os cabeçalhos obrigatórios (`## Motivação`, `## Escopo e regras`, `## Critérios de aceitação`, etc.).
   - Verificar se links internos apontam para arquivos existentes e não ultrapassam os limites da raiz do repositório.
3. **Decisão:** Identificar se discrepâncias exigem correção de path relativo, criação de documento faltante ou atualização de link legado.
4. **Execução:**
   - Executar `node scripts/quality/verify-integrity.mjs`.
   - Executar `node scripts/documentation/validate-specs.mjs`.
   - Executar `node scripts/quality/check-docs.mjs`.
   - Executar `node scripts/documentation/validate-references.mjs`.
5. **Validação:** Corrigir os apontamentos e reexecutar `npm run verify:docs`.
6. **Entrega:** Confirmar que nenhum documento faz referência a arquivos inexistentes ou utiliza caminhos absolutos privados da máquina.

## Validação
- Executar `npm run verify:docs` e garantir que retorne código `0` com todas as checagens em `OK`.

## Falhas e limites
- Verificadores estáticos confirmam que o arquivo referenciado existe e tem a estrutura esperada, mas não atestam a qualidade semântica da redação técnica.
- Não inventar arquivos apenas para satisfazer um link quebrado; remover o link ou corrigir para o destino canônico correto.

## Entregáveis
- Relatório de integridade documental contendo lista de arquivos auditados, links e referências corrigidos e confirmação de sucesso no gate `verify:docs`.
