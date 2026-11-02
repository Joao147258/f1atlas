---
name: documentation-validation
description: Auditar integridade estrutural, referências relativas, contratos de SPECs e ausência de links quebrados em documentos Markdown.
---

# documentation-validation — Auditoria de Documentação e Links Markdown

## Ativação e propósito

Executar auditoria mecânica e semântica sobre a árvore de documentação em Markdown do F1Atlas, garantindo integridade referencial de links relativos, conformidade com os templates de SPECs e ADRs, e ausência de arquivos órfãos ou instruções desatualizadas.

- **Quando acionar:** Antes de qualquer entrega documental, na criação ou alteração de SPECs, ADRs, manuais em `docs/` ou arquivos de governança de agentes e skills.
- **Quando NÃO acionar:** Para validação de código TypeScript ou testes unitários de aplicação (utilizar `code-review` ou `test-design`).

## Pré-condições

- Consultar `AGENTS.md` (Seção 13 — Documentação e Rastreabilidade), `docs/development/documentation-standard.md` e `SPEC-GOV-004.md`.
- Conhecimento da árvore documental oficial: `docs/specs/`, `docs/architecture/adr/`, `docs/design/`, `docs/editorial/` e `.agents/templates/`.
- Execução determinística através de `scripts/quality/check-docs.mjs`.

## Procedimento

1. **Varredura e Mapeamento de Arquivos Markdown**:
   - Listar todos os arquivos `.md` presentes no workspace (excluindo `node_modules` e `.local/`).
   - Identificar novos documentos ou arquivos renomeados.
2. **Auditoria de Links Relativos e Âncoras**:
   - Extrair todos os hiperlinks relativos em formato Markdown de cada documento.
   - Resolver caminhos relativos em relação ao diretório do arquivo emissor.
   - Confirmar que o arquivo de destino existe fisicamente no disco.
   - Validar que links externos começam obrigatoriamente com `https://`.
3. **Auditoria Estrutural de SPECs**:
   - Verificar se as SPECs em `docs/specs/` possuem o cabeçalho obrigatório:
     - `Estado:` (`draft`, `proposed`, `approved`, `superseded`).
     - `Tipo:` (`especificação verificável`, etc.).
     - `Critérios de aceitação:` lista numerada com condições objetivas.
     - `Evidências requeridas:` testes ou comandos determinísticos.
4. **Auditoria Estrutural de ADRs**:
   - Verificar se as decisões arquiteturais em `docs/architecture/adr/` contêm:
     - Número sequencial formatado (`0001-...`, `0002-...`).
     - Seções obrigatórias: *Contexto*, *Decisão*, *Alternativas Consideradas*, *Consequências* e *Status*.
5. **Auditoria de Sincronismo com Índices Centrais**:
   - Garantir que cada SPEC e ADR conste no respectivo arquivo `README.md` da pasta.
6. **Execução de Verificador Automatizado**:
   - Rodar o validador do harness: `node scripts/quality/check-docs.mjs`.

## Validação

- Executar o quality gate de documentação: `npm run verify:docs`.
- Garantir código de saída `0` com zero links quebrados e zero cabeçalhos de SPECs malformados.
- Confirmar conformidade com os testes em `scripts/tests/contracts.test.mjs`.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Link relativo quebrado (404 local) | Arquivo movido ou renomeado sem atualizar links | Atualizar o caminho relativo no documento emissor para o novo destino |
| SPEC reprovada por estado ausente | Cabeçalho sem campo `**Estado:**` | Incluir metadados normativos conforme o template oficial em `.agents/templates/` |
| ADR sem número sequencial de 4 dígitos | Arquivo nomeado fora do padrão `000X-nome.md` | Renomear o arquivo para a numeração sequencial correta |
| Link escapando do workspace com `../../` | Path traversal indevido em link Markdown | Restringir o link aos limites da árvore de arquivos do projeto |

### Limitações
- O validador atesta integridade sintática e existência de caminhos; a precisão do conteúdo exige revisão humana especializada.

## Entregáveis

- Documentos Markdown corrigidos e livres de links quebrados.
- Índices de documentação (`docs/specs/README.md`, `docs/architecture/adr/README.md`) atualizados.
- Relatório de Auditoria Documental emitido pelo gate `verify:docs`.
