---
name: script-development
description: Projetar, implementar e testar ferramentas CLI e verificadores determinísticos em Node.js com contratos padronizados pela SPEC-GOV-003.
---

# script-development — Engenharia de Ferramentas CLI e Automações

## Ativação e propósito

Projetar, implementar e auditar ferramentas de linha de comando (CLI), verificadores de qualidade e rotinas de automação em Node.js ESM sob o diretório `scripts/`, assegurando determinismo, contratos estritos de saída e segurança de caminhos.

- **Quando acionar:** Na criação ou evolução de verificadores de governança, scanners de segurança, rotinas de auditoria de banco de dados ou orquestradores de quality gates.
- **Quando NÃO acionar:** Para escrever scripts temporários informais (*one-liners*) que não façam parte da fundação durável do projeto.

## Pré-condições

- Consultar `docs/specs/governance/SPEC-GOV-003.md`, `AGENTS.md` (Seção 11) e `scripts/lib/workspace.mjs`.
- Usar estritamente Node.js ESM nativo (`type: "module"`) com importações prefixadas por `node:` (`node:fs`, `node:path`, `node:test`).
- Todos os scripts devem ser **somente leitura por padrão**. Mutações exigem flags explícitas (`--fix`, `--apply`) e suporte a `--dry-run`.

## Procedimento

1. **Definição de Categoria e Contrato CLI**:
   - Classificar o script:
     - *Validador*: inspeciona e reporta conformidade sem alterar arquivos.
     - *Transformador*: altera arquivos de modo controlado, exigindo `--dry-run`.
     - *Orquestrador*: executa múltiplos scripts e consolida o sumário final.
2. **Utilização da Biblioteca Compartilhada `scripts/lib/workspace.mjs`**:
   - Importar utilitários canônicos:
     ```javascript
     import { PROJECT_ROOT, isMain, report, isWithinRoot } from '../lib/workspace.mjs';
     ```
   - Resolver todos os caminhos relativos obrigatoriamente contra `PROJECT_ROOT`.
   - Validar que caminhos de entrada não escapam do workspace utilizando `isWithinRoot`.
3. **Implementação de Fail-Closed e Códigos de Retorno**:
   - Aplicar estritamente a convenção de exit codes da SPEC-GOV-003:
     - `process.exit(0)`: PASS ou SKIP justificado.
     - `process.exit(1)`: FAIL (violação identificada).
     - `process.exit(2)`: ERROR (falha de runtime, E/S ou exceção).
   - Envolver a execução em bloco `try/catch` de topo para capturar falhas inesperadas.
4. **Formatação de Saída Estruturada**:
   - Utilizar prefixos padronizados nos relatórios de console:
     - `OK:` para aprovações.
     - `FALHA:` para violações identificadas.
     - `NÃO APLICÁVEL:` para verificações em SKIP.
     - `ERRO:` para exceções de runtime.
5. **Construção de Testes Automatizados**:
   - Criar arquivo correspondente em `scripts/tests/<nome>.test.mjs`.
   - Testar 3 fluxos mandatórios:
     1. Caso nominal que deve retornar código `0` (PASS).
     2. Caso com violação que deve retornar código `1` (FAIL).
     3. Caso de entrada corrompida ou inexistente que deve falhar com segurança.
6. **Integração aos Quality Gates**:
   - Adicionar comando atalho em `package.json` (`scripts`).
   - Integrar ao orquestrador geral `scripts/quality/run-all.mjs` quando aplicável.

## Validação

- Executar os testes automatizados da suíte: `node --test scripts/tests/<script>.test.mjs`.
- Testar a execução CLI direta e verificar o código de retorno no shell:
  ```bash
  node scripts/<caminho-do-script>.mjs; echo "Exit code: $?"
  ```
- Executar a suíte de testes completa do harness: `npm run test:harness`.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Script reporta erro em outro diretório | Uso de `process.cwd()` em vez de `PROJECT_ROOT` | Substituir por `PROJECT_ROOT` importado de `workspace.mjs` |
| Exceção não tratada derrubando orquestrador | Falta de bloco `try/catch` de captura global | Tratar a exceção, imprimir mensagem clara e sair com código `2` |
| Script mutando arquivos silenciosamente | Ausência de modo seguro somente leitura | Reverter a mutação para default somente leitura e exigir flag `--apply` |
| Falha silenciosa retornando código 0 | `catch (e) {}` capturando erro sem setar exit code | Definir `process.exitCode = 1` ou `2` no bloco catch |

### Limitações
- Scripts de qualidade do F1Atlas devem rodar em ambiente limpo de CI sem depender de credenciais privadas ou banco de produção.

## Entregáveis

- Script Node.js ESM funcional com cabeçalho de documentação JSDoc.
- Suíte de testes automatizados em `scripts/tests/`.
- Registro em `package.json` e integração aos quality gates.
- Relatório de implementação com testes de código de saída verificados.
