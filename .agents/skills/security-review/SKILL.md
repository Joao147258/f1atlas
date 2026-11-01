---
name: security-review
description: Investigar riscos de exposição de segredos, arquivos privados, vulnerabilidades de dependências, symlinks e integridade de publicação.
---

# security-review

## Ativação e propósito
Auditar e mitigar riscos de segurança relacionados a credenciais expostas, arquivos privados rastreados indevidamente, symlink traversal e superfícies de ataque.
- **Quando acionar:** Antes de qualquer commit, ao alterar dependências, ao manipular variáveis de ambiente, ou ao integrar dados de fontes externas.
- **Quando NÃO acionar:** Para validação de regras de negócio ou de tipagem que não envolvam risco de vazamento ou segurança.

## Pré-condições
- Consultar `docs/specs/engineering/SPEC-SEC-001.md`, `docs/development/security-governance.md` e `AGENTS.md` (Seção 12).
- Confirmar integridade do `.gitignore` e do `.geminiignore`.

## Procedimento
1. **Preparação:** Inspecionar o workspace contra arquivos temporários, fixtures sensíveis ou configurações privadas.
2. **Investigação:**
   - Executar scanner de segredos conhecidos (`node scripts/security/check-secrets.mjs`).
   - Executar detector de arquivos sensíveis (`node scripts/security/check-sensitive-files.mjs`).
   - Executar auditoria de links simbólicos (`node scripts/security/check-symlinks.mjs`).
   - Executar verificação de escopo de publicação (`node scripts/security/verify-publication-scope.mjs`).
   - No ambiente de desenvolvimento local, executar checagens locais (`npm run verify:local`).
3. **Decisão:** Caso seja detectada potencial credencial, isolar imediatamente o arquivo sem reproduzir o valor em logs, prompts ou relatórios.
4. **Execução:**
   - Adicionar regras de exclusão no `.gitignore` se o arquivo for privado legítimo.
   - Remover arquivos staged indevidamente (`git reset HEAD <arquivo>`).
   - Sanitizar caminhos absolutos locais substituindo por caminhos relativos ao workspace.
5. **Validação:** Reexecutar `npm run verify:security` e `npm run verify:local` comprovando resolução do problema.
6. **Entrega:** Documentar os vetores de risco analisados, ações de contenção adotadas e confirmação de proteção ativa.

## Validação
- Executar `npm run verify:security` com código de saída `0` e todas as checagens públicas em `OK`.
- Em ambiente local, executar `npm run verify:local` com sucesso.

## Falhas e limites
- Scanners heurísticos não garantem ausência total de segredos não padronizados.
- Não imprimir valores identificados de tokens ou senhas na saída do terminal ou relatórios; mascarar strings com `(valor ocultado)`.

## Entregáveis
- Relatório de auditoria de segurança contendo: verificadores executados, achados classificados (com valor ocultado), medidas de saneamento e parecer final.
