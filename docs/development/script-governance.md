# Governança de Scripts — F1Atlas

> **Documento:** `docs/development/script-governance.md`  
> **Status:** Ativo / Normativo  
> **Projeto:** F1Atlas — Plataforma Interativa de Automobilismo  
> **Agente Responsável:** `script-developer`  
> **Skill Associada:** `.agents/skills/script-development/SKILL.md`  
> **Especificação Canônica:** `docs/specs/governance/SPEC-GOV-003.md`  

---

## 1. Princípios Fundamentais

Um script de automação, validação ou governança no F1Atlas não deve ser avaliado apenas pelo fato de funcionar mecanicamente. Ele deve constituir um ativo de engenharia sustentável, legível, auditável e compreensível por qualquer colaborador ou agente sem depender do autor original.

1. **Responsabilidade Única:** Cada script deve possuir um propósito delimitado, manifesto em seu nome de arquivo e documentado em seu cabeçalho.
2. **Separação de Camadas:**
   - **Regra de Validação:** Lógica pura e determinística, exportada como função testável isolada do console.
   - **Infraestrutura:** Resolução de caminhos contra a raiz calculada (`PROJECT_ROOT`), leitura de arquivos e processos.
   - **Apresentação (CLI):** Ponto de entrada condicional protegido por `isMain(import.meta.url)`, emitindo saída formatada e exit code padronizado.
3. **Modo Somente Leitura por Padrão:** Verificadores e scanners de auditoria inspecionam o sistema de arquivos sem modificá-lo. Qualquer mutação ou autocorreção requer parâmetro explícito (`--fix` ou `--write`).
4. **Resolução Dinâmica da Raiz:** É terminantemente proibido presumir o diretório de trabalho atual (`process.cwd()`). Scripts devem resolver a raiz canônica do projeto dinamicamente via `scripts/lib/workspace.mjs` (`PROJECT_ROOT`).
5. **Tratamento Explícito de Erros:** Proibido capturar exceções silenciosamente (`catch {}`). Falhas de E/S, arquivos ausentes e permissões negadas devem ser tratadas e diferenciadas expressamente.
6. **Segurança e Sanitização:** Em nenhuma hipótese scripts devem imprimir valores literais de credenciais, chaves ou caminhos de diretórios pessoais do operador (`/home/...`).

---

## 2. Contrato de Execução e Códigos de Retorno

Todo script executável via linha de comando deve seguir a tabela de códigos de saída da SPEC-GOV-003:

| Código | Estado | Significado | Exemplo de Saída |
| :---: | :---: | :--- | :--- |
| `0` | `PASS` | Todas as asserções executadas e aprovadas sem violações. | `OK: Padrões de segredos conhecidos` |
| `0` | `SKIP` | Verificação não aplicável no estágio atual (informativo). | `NÃO APLICÁVEL: sem módulos de domínio implementados` |
| `1` | `FAIL` | Uma ou mais violações determinísticas encontradas. | `FALHA: Escopo de publicação (1 problema(s))` |
| `2` | `ERROR` | Falha fatal de infraestrutura, sintaxe ou flags inválidas. | `ERRO DE EXECUÇÃO: parâmetros inválidos` |

> [!IMPORTANT]
> O estado `SKIP` (NÃO APLICÁVEL) nunca deve ser computado como aprovação de funcionalidade implementada. Ele representa ausência justificada de escopo verificável (ex.: frontend ou banco ainda não construídos na fundação).

---

## 3. Padrão Obrigatório de Legibilidade e Documentação Inline

Todos os scripts do harness devem seguir as diretrizes do guia técnico de documentação:
- **Cabeçalho de Módulo (`@fileoverview`):** Finalidade, entradas, saídas, dependências e efeitos colaterais.
- **JSDoc em Funções Exportadas:** `@param`, `@returns` e `@throws` rigorosamente alinhados com o comportamento real.
- **Comentários de Decisão:** Explicar o "porquê" de restrições de segurança, limites de tamanho ou comportamentos não óbvios, evitando comentários redundantes que apenas repetem a instrução de código.
- **Nomes Expressivos:** Utilizar identificadores descritivos (`relativeFilePath`, `workspaceRoot`, `detectedIssues`), banindo abreviações enigmáticas de uma letra (`f`, `p`, `x`, `ent`).

Consulte o guia complementar completo com 10 exemplos práticos:
👉 [Guia de Legibilidade e Documentação de Scripts](./script-documentation-guide.md)

---

## 4. Política de Testes e Qualidade

1. **Testes Positivos e Negativos:** Todo script em `scripts/` deve possuir testes equivalentes em `scripts/tests/` comprovando aceitação de dados corretos e bloqueio de violações.
2. **Isolamento de Efeitos Colaterais:** Testes que manipulam arquivos ou repositórios Git devem operar em pastas temporárias (`os.tmpdir()`), com exclusão garantida no bloco `finally`.
3. **Ausência de Dependências Externas na Fundação:** Os scripts da fundação devem executar exclusivamente com os módulos nativos do Node.js (ESM), sem requerer pacotes de terceiros no `node_modules`.
