# Fluxo Git e Política de Hooks Automatizados — F1Atlas

> **Documento:** `docs/development/git-workflow.md`  
> **Status:** Ativo / Normativo  
> **Projeto:** F1Atlas — Plataforma Interativa de Automobilismo  
> **Referência:** `AGENTS.md` (Seção 14), `docs/development/quality-gates.md`, `SPEC-GOV-003.md`  

---

## 1. Princípios Fundamentais

1. **Desenvolvimento Baseado em Branches:** Cada incremento, correção ou refatoração deve ocorrer em branch dedicada (`feature/*`, `fix/*`, `refactor/*`, `gov/*`), convergindo para `main` ou `development` via Pull Request revisado.
2. **Atomicidade e Rastreabilidade:** Commits devem ser atômicos e associados a um objetivo claro (Issue, SPEC ou tarefa).
3. **Bloqueio Mandatório Antes de Commitar e Enviar:** A conformidade com as regras de segurança, integridade, arquitetura e pré-deploy é assegurada automaticamente pelos Git hooks locais (`core.hooksPath`), impedindo commits ou pushes defeituosos.
4. **Proibição de Bypass:** O uso de flags que contornem verificações de hooks (`git commit --no-verify` ou `git push --no-verify`) é expressamente proibido no fluxo de trabalho padrão.

---

## 2. Política de Hooks Locais Automatizados

O F1Atlas utiliza ganchos nativos do Git configurados localmente em `.local/git/hooks/` através do orquestrador determinístico `.local/git/hook-runner.mjs`.

### 2.1. Hook `pre-commit` (Validação Rápida e Segura do Staging)
Disparado automaticamente a cada `git commit`. Opera exclusivamente sobre o snapshot dos arquivos preparados no índice Git (`git checkout-index`), isolando alterações parciais (`git add -p`):
- **Segurança Mandatória:**
  - `checkPublicationScope`: bloqueia inclusão de arquivos privados (`.local/`, `GEMINI.md`, `.env` reais).
  - `checkSensitiveFiles`: bloqueia certificados, chaves SSH, keystores e credenciais de contas de serviço.
  - `checkSecrets`: varre arquivos staged contra catálogo de tokens e chaves privadas conhecidas (AWS, Stripe, Slack, etc.).
  - `checkAbsolutePaths`: bloqueia caminhos absolutos locais do operador (diretórios pessoais de usuários no sistema operacional).
  - `checkWorkspaceSymlinks`: impede links simbólicos maliciosos ou fora da raiz.
- **Integridade Estrutural:**
  - `checkStructure`: assegura presença física dos arquivos canônicos da fundação.
  - `checkMarkdownLinks`: valida destinos de links locais relativos em documentos Markdown staged.
  - `checkAgentContracts`: valida contratos se arquivos de agentes ou skills forem staged.
  - `checkEnvFiles`: valida sintaxe e variáveis se `.env*` for modificado.
- **Preflight Rápido:**
  - Valida compatibilidade do runtime Node.js e restrições da Hostinger sobre o snapshot staged.

### 2.2. Hook `pre-push` (Validação Abrangente e Simulação de Deploy)
Disparado automaticamente a cada `git push`. Valida a integridade completa das revisões destinadas ao repositório remoto:
1. **Quality Gates Públicos:** Executa `npm run verify` (10 quality gates + 57 testes automatizados do harness).
2. **Verificações Locais Privadas:** Executa `npm run verify:local` (testes locais de segurança e preflight).
3. **Hostinger Local Preflight Completo:** Executa `preflight.mjs --mode=full --context=head` simulando a implantação da revisão `HEAD` (runtime, dependências, build, artefatos, inicialização e limites físicos).
4. **Tratamento de Deleção de Branch:** Caso a operação seja exclusivamente de deleção remota (`local_sha == 0000...`), a validação de código é ignorada com estado `SKIP` justificado.

---

## 3. Gestão e Comandos dos Hooks

| Comando | Finalidade |
| :--- | :--- |
| `npm run hooks:install` | Configura e ativa `core.hooksPath` no repositório local e define permissões executáveis. |
| `npm run hooks:verify` | Audita se os hooks estão ativos, arquivos existentes e scripts operacionais. |
| `npm run hooks:pre-commit`| Executa a esteira de `pre-commit` em modo diagnóstico manual (sem commitar). |
| `npm run hooks:pre-push` | Executa a esteira de `pre-push` em modo diagnóstico manual (sem enviar). |

---

## 4. Fluxo Operacional Recomendado

```text
1. Criar branch a partir de main
   git checkout -b feature/minha-mudanca

2. Implementar com testes e verificações intermediárias
   npm run verify
   npm run verify:local

3. Preparar arquivos de forma segura
   git status --short
   git add <arquivos-especificos>

4. Commit (aciona automaticamente o pre-commit hook)
   git commit -m "feat(modulo): descricao objetiva"
   ↳ hook-runner valida snapshot staged
   ↳ se FAIL: commit é abortado; corrigir violação e tentar novamente
   ↳ se PASS: commit criado

5. Push (aciona automaticamente o pre-push hook)
   git push origin feature/minha-mudanca
   ↳ hook-runner executa quality gates, testes do harness e Hostinger Preflight
   ↳ se NOT_READY ou FAIL: push é bloqueado
   ↳ se PASS: push concluído para revisão via Pull Request
```
