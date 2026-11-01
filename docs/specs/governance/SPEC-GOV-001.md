# SPEC-GOV-001 — Contrato de agentes

**Estado:** approved
**Tipo:** especificação verificável

## Motivação

Assegurar que todos os agentes especializados do F1Atlas possuam papéis, responsabilidades, limites de autonomia, skills associadas, verificadores e contratos de saída claramente definidos e auditáveis, evitando agentes ambíguos, privilégios excessivos ou entregas sem evidências determinísticas.

## Escopo e regras

- **Fonte canônica única:** Os 11 agentes especializados residem exclusivamente em `.gemini/agents/`, eliminando a necessidade de mecanismos de espelhamento ou cópias concorrentes.
- **Formato e Metadados:** Cada agente é definido em arquivo Markdown individual com frontmatter YAML válido contendo:
  - `name`: identificador único em kebab-case correspondendo exatamente ao nome do arquivo.
  - `description`: descrição rica e contextualizada com no mínimo 30 caracteres para descoberta precisa.
  - `kind: local`: modelo local de subagente para o executor.
- **Seções obrigatórias estruturadas:**
  - `## Quando acionar`
  - `## Limites`
  - `## Procedimento`
  - `## Skills`
  - `## Entregáveis`
- **Associação com Skills:** Todas as skills declaradas sob `## Skills` devem existir fisicamente em `.agents/skills/<nome>/SKILL.md`.
- **Proibição de Diretório Obsoleto:** É proibida a reintrodução do diretório legado `.agents/agents/`.
- **Segurança e Privacidade:** Os agentes devem ser elegíveis para versionamento público, sem conter credenciais, dados pessoais ou instruções que contornem quality gates.

## Critérios de aceitação

1. Exatamente 11 agentes canônicos definidos em `.gemini/agents/` (`developer`, `backend-engineer`, `frontend-engineer`, `test-engineer`, `code-reviewer`, `script-developer`, `security-auditor`, `documentation-engineer`, `editorial-engineer`, `seo-engineer`, `analytics-engineer`).
2. Validação determinística unânime via `node scripts/quality/check-agent-contracts.mjs` (ou `npm run agents:check`).
3. Detecção e reprovação imediata caso o diretório legado `.agents/agents/` seja recriado.
4. Reprovação caso haja `name` divergente do nome do arquivo, frontmatter inválido, ausência de seções obrigatórias ou referência a skill inexistente.
5. Suíte automatizada de testes de contrato (`scripts/tests/contracts.test.mjs`) aprovada com 100% de sucesso.

## Falhas, dependências e riscos

- **Divergência de configuração do Gemini CLI:** Caso o executor não aponte para `.gemini/agents/`, a descoberta automática pode falhar. Mitigação: padronização e documentação em `GEMINI.md` e verificação nos testes do harness.
- **Skills órfãs ou quebradas:** Alterações em `.agents/skills/` podem quebrar referências nos agentes. Mitigação: o validador de contratos inspeciona bidirecionalmente a integridade entre agentes e skills.

## Evidências requeridas

1. Execução de `npm run agents:check` com retorno 0 (PASS).
2. Execução de `npm run test:harness` com aprovação dos testes de contrato e ausência de espelhos.
3. Execução de `npm run verify` com aprovação integral de todos os quality gates aplicáveis.
