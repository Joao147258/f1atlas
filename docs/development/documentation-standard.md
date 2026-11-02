# Padrões documentais

**Classes de Documentos:**
- **Política (normativa):** requisitos mandatórios de governança em `docs/development/` e `AGENTS.md`.
- **Arquitetura e Domínio:** modelagem de entidades, regras esportivas, limites de pacote e acompanhamento centralizado em `docs/domain/` e `ARCHITECTURE.md`.
- **SPEC (especificação verificável):** requisitos detalhados e critérios de aceitação em `docs/specs/`.
- **ADR (decisão arquitetural):** contexto, alternativas, justificativa e trade-offs aprovados em `docs/architecture/adr/`.
- **Guia / Runbook (procedimento):** passos reproduzíveis, pré-condições e recuperação em `docs/runbooks/` e skills.
- **Relatório (evidência):** registro factual de resultados de validação e comandos executados.

**Hierarquia das Fontes de Informação:**
1. *Documentação Arquitetural:* define intenção, decisões, invariantes e limites esperados.
2. *Código-Fonte:* reflete o comportamento efetivamente implementado no repositório.
3. *Testes Automatizados:* verificam e comprovam propriedades e comportamentos em runtime.
4. *Registros de Decisão (ADRs):* justificam o porquê de escolhas técnicas estruturais.
5. *Documentação de Status (`docs/domain/development-status.md`):* consolida o progresso real e as evidências de conclusão.
6. *Issues e Pull Requests:* rastreiam histórico de execução e discussões.

Divergências entre essas fontes devem ser tratadas como inconsistências a investigar, nunca como autorização para modificar silenciosamente uma delas.

**Governança de Atualizações Documentais:**
- **Atualização Obrigatória:** quando a mudança alterar responsabilidades de módulo, regras de negócio da FIA, invariantes, contratos públicos, decisões arquiteturais ou o estado de maturidade de componentes (deve atualizar `development-status.md`).
- **Atualização Opcional / Conforme Necessidade:** em refatorações internas sem mudança de comportamento observável, correções de digitação ou pequenas melhorias de legibilidade de código.

**Forma e Integridade:**
- Título, estado, escopo, conteúdo rastreável e referências cruzadas válidas.
- Escrever em português claro, mantendo termos técnicos canônicos da Fórmula 1 e da computação.
- Caminhos e links locais estritamente válidos (verificados via `scripts/quality/check-docs.mjs`).
- Nunca inventar funcionalidades inexistentes ou apresentar componentes planejados como implementados.
