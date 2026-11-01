# SPEC-GOV-003 — Contrato e teste de scripts

**Estado:** proposed  
**Tipo:** especificação verificável  
**Fonte normativa:** `docs/development/script-governance.md`, `AGENTS.md` (Seção 11)  
**Agente responsável:** `script-developer`  
**Skill canônica:** `.agents/skills/script-development/SKILL.md`  

---

## Motivação

Verificações determinísticas de conformidade, segurança, integridade e limites arquiteturais não devem depender de avaliações subjetivas de agentes ou operadores. Scripts determinísticos fornecem repetibilidade, rapidez, auditabilidade em CI e independência de modelo de IA. Para que essa camada seja confiável, cada script deve obedecer a contratos formais de entrada, execução, saída, segurança e cobertura de testes adversariais.

---

## Escopo e regras

### Princípio da responsabilidade única
- Cada script deve ter uma responsabilidade clara, delimitada e identificável no nome do arquivo (ex.: `check-secrets.mjs`, `verify-boundaries.mjs`).
- Scripts que realizam múltiplas verificações conceituais distintas devem ser decompostos ou coordenados por um orquestrador específico (`run-all.mjs`).

### Execução independente, isolada e reproduzível
- Um script deve ser executável diretamente pela linha de comando (`node scripts/<categoria>/<script>.mjs`) a partir de qualquer diretório, resolvendo a raiz do projeto dinamicamente através de biblioteca compartilhada (`PROJECT_ROOT` em `scripts/lib/workspace.mjs`).
- Um script não deve depender de variáveis de ambiente não declaradas nem de estado mutável compartilhado entre execuções.
- As funções lógicas de validação devem ser exportadas como funções puras desacopladas da interface de linha de comando (`isMain`).

### Modo de operação e mutabilidade
- **Somente leitura por padrão:** Verificadores e validadores devem inspecionar o sistema de arquivos sem alterá-lo.
- **Mutações explícitas:** Operações de escrita ou correção automatizada exigem obrigatoriamente passagem de flag explícita (`--write` ou `--fix`).
- A passagem simultânea de flags mutuamente exclusivas (ex.: `--check` e `--write`) deve resultar em encerramento imediato com código de erro `2` (`ERROR`).

### Códigos de saída e estados padronizados
Todo script deve aderir rigorosamente à convenção de códigos de saída do sistema:

| Código | Estado | Significado | Exemplo de Saída |
| :---: | :---: | :--- | :--- |
| `0` | `PASS` | Todas as asserções foram executadas e aprovadas sem violações. | `OK: Padrões de segredos conhecidos` |
| `0` | `SKIP` | Verificação não aplicável no estágio atual do projeto (ex.: código de aplicação ainda inexistente). | `NÃO APLICÁVEL: sem módulos de domínio implementados` |
| `1` | `FAIL` | Uma ou mais violações determinísticas foram encontradas nos arquivos analisados. | `FALHA: Escopo de publicação (1 problema(s))` |
| `2` | `ERROR` | Falha fatal de infraestrutura, erro de sintaxe, flags inválidas ou exceção não tratada de E/S. | `ERRO DE EXECUÇÃO: parâmetros inválidos` |

> O estado `SKIP` (NÃO APLICÁVEL) nunca deve ser contabilizado como aprovação de funcionalidade implementada. Ele representa ausência justificada de escopo verificável.

### Segurança de caminhos, links simbólicos e travessia
- **Resolução de Caminhos:** Toda resolução deve utilizar validação contra a raiz (`path.resolve` e verificação de fronteira).
- **Symlinks Maliciosos:** Verificadores devem validar se links simbólicos no workspace apontam para alvos fora do repositório ou criam referências circulares. Links ilegais que ultrapassam a raiz devem ser reportados como violação.
- **Tamanho de Arquivo e Binários:** Scanners de conteúdo de texto (como `check-secrets`) devem impor limite estrito de tamanho (máximo 1 MB) e ignorar arquivos binários (detecção de byte nulo `\0`).

### Proteção de segredos e dados sensíveis
- **Não Exposição:** Em nenhuma circunstância o script deve imprimir ou persistir o valor textual de uma credencial, chave ou dado pessoal identificado.
- O relatório de falha deve informar exclusivamente o caminho do arquivo, a regra violada e a ação recomendada:
  `caminho/arquivo.ext: padrão compatível com AWS access key ID (valor ocultado)`

### Integração e observabilidade
- O orquestrador de qualidade (`run-all.mjs`) deve capturar o resultado de cada verificador e emitir um resumo consolidado de status contendo:
  - Total de verificadores executados.
  - Quantidade em `PASS`, `SKIP`, `FAIL` e `ERROR`.
  - Código final `1` caso qualquer gate termine em `FAIL` ou `ERROR`.

---

## Critérios de aceitação

1. **Testabilidade Positiva e Negativa:** Todo script em `scripts/` deve possuir testes automatizados em `scripts/tests/` demonstrando tanto a aprovação de entradas válidas quanto a rejeição de entradas inválidas.
2. **Testes Adversariais:** Scanners de segurança devem possuir testes que submetam payloads sintéticos de ataque (symlinks externos, arquivos de alta entropia, paths maliciosos) comprovando detecção e não-vazamento.
3. **Isolamento em Fixtures Temporárias:** Testes de arquivos, git staging e links não devem criar artefatos persistentes no workspace real; devem operar em diretórios temporários (`os.tmpdir()`) com limpeza garantida em bloco `finally`.
4. **Sem Dependências Externas Não Justificadas:** O conjunto de scripts da fundação deve executar integralmente no runtime nativo do Node.js (>= 20) sem depender de pacotes em `node_modules`.

---

## Falhas, dependências e riscos

- **Limitação de Análise Estática:** Scanners heurísticos baseados em regex identificam padrões conhecidos, mas não garantem matematicamente ausência total de segredos de baixa entropia ou novas classes de credenciais.
- **Dependência de Git:** Verificações de staging (`check-git-staging.mjs`) dependem de um binário `git` funcional no PATH do sistema.

---

## Evidências requeridas

Para que um script seja considerado em conformidade com a SPEC-GOV-003, o autor deve apresentar:
1. Execução direta com código de saída coerente (`0`, `1` ou `2`).
2. Teste automatizado associado no test runner nativo (`npm run test:harness`).
3. Demonstração de caso de falha com fixture sintética.
4. Demonstração de ausência de efeitos colaterais no repositório.
