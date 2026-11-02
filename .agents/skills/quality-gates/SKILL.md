---
name: quality-gates
description: Orquestrar e auditar a execução determinística dos quality gates públicos e locais, diferenciando aprovações reais de verificações não aplicáveis (SKIP).
---

# quality-gates — Orquestração e Auditoria de Quality Gates

## Ativação e propósito

Orquestrar, auditar e interpretar a execução mecânica e determinística de toda a esteira de verificadores de integridade, segurança, arquitetura, persistência e contratos do F1Atlas, diferenciando aprovações reais de verificações não aplicáveis (SKIP).

- **Quando acionar:** Antes da conclusão de qualquer incremento de engenharia, antes de submeter commits ou Pull Requests, e durante auditorias de conformidade do repositório.
- **Quando NÃO acionar:** Para validação subjetiva de conteúdo editorial ou julgamento estético de design que não possua verificadores automatizados.

## Pré-condições

- Consultar `AGENTS.md` (Seção 11 — Política de Scripts, Verificadores e Quality Gates), `docs/development/quality-gates.md` e `SPEC-GOV-005.md`.
- Confirmar que o Node.js >= 20 está instalado e o workspace limpo verificado via `git status`.
- Reconhecer a regra fundamental: **um gate em status SKIP nunca atesta conformidade de funcionalidade**, apenas informa que a verificação é não aplicável no estágio atual.

## Procedimento

1. **Reconhecimento da Esteira de Gates**:
   - Inspecionar a relação de scripts de verificação configurados em `package.json`:
     - `verify`: orquestrador público geral (`scripts/quality/run-all.mjs`).
     - `verify:docs`: integridade de Markdown, links e SPECs.
     - `verify:security`: segurança, segredos, symlinks e variáveis.
     - `verify:architecture`: limites conceituais e isolamento do domínio.
     - `verify:seo`: metadados, canonicals e sitemaps.
     - `verify:analytics`: catálogo de eventos e privacidade anti-PII.
     - `db:verify`: governança do schema Prisma, cliente gerado e migrations.
     - `agents:check`: contratos canônicos dos 12 agentes e 23 skills.
     - `test:harness`: suíte automatizada de testes do harness.
     - `verify:local`: verificações adicionais privadas da máquina do operador.
2. **Execução Isolada ou Consolidada**:
   - Executar o comando consolidado: `npm run verify`.
   - Se houver falha, isolar o gate reprovado e executá-lo individualmente para obter o diagnóstico detalhado.
3. **Interpretação Estrita dos Códigos de Saída**:
   - `0` com `PASS`: gate executado com sucesso e aprovado.
   - `0` com `SKIP` (`NÃO APLICÁVEL`): registrar o motivo documental e não considerar a funcionalidade como validada.
   - `1` com `FAIL`: violação de política ou requisito; bloqueio mandatório da entrega até correção.
   - `2` com `ERROR`: erro inesperado de ambiente ou exceção de runtime; requer diagnóstico de infraestrutura.
4. **Resolução de Falhas Sem Atalhos**:
   - Corrigir a causa raiz da violação.
   - É expressamente proibido alterar os critérios de validação do script ou desativar o gate para forçar aprovação.
5. **Auditoria de Git Hooks**:
   - Executar `npm run hooks:verify` para validar que os hooks de pre-commit e pre-push estão instalados e ativos.
   - Testar pre-commit com `npm run hooks:pre-commit` e pre-push com `npm run hooks:pre-push`.

## Validação

- Executar `npm run verify` e verificar o sumário consolidado com contadores de PASS, SKIP, FAIL e ERROR.
- Confirmar que o comando termina com código de saída `0` e zero falhas.
- Executar `npm run agents:check` para assegurar que nenhum agente ou skill foi quebrado durante as alterações.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Gate reprovando com código 1 (FAIL) | Arquivo fora do padrão, link quebrado ou segredo | Inspecionar a linha apontada pelo validador e aplicar a correção mínima necessária |
| Script abortando com código 2 (ERROR) | Dependência ausente ou sintaxe inválida no script | Corrigir a sintaxe do script verificador garantindo execução segura |
| Tentativa de contornar hook com `--no-verify` | Violação de governança para acelerar commit | Bloquear o commit; executar os quality gates e sanar as violações antes de prosseguir |
| Gate em SKIP tratado como aprovação | Interpretação indevida de funcionalidade não implementada | Documentar no relatório que o gate está em SKIP justificado e não validado |

### Limitações
- Quality gates atestam critérios determinísticos mensuráveis; não substituem a revisão crítica de arquitetura e código.

## Entregáveis

- Sumário de Execução de Quality Gates contendo:
  - Total de gates executados.
  - Contagem consolidada de PASS, SKIP, FAIL e ERROR.
  - Lista explícita de gates em SKIP com justificativa.
  - Estado: `GATES PASSED` ou `GATES FAILED`.
