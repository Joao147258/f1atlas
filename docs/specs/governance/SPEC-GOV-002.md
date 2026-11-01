# SPEC-GOV-002 — Contrato de skills

**Estado:** proposed  
**Tipo:** especificação verificável  
**Fonte normativa:** `docs/development/skill-governance.md`, `AGENTS.md` (Seção 8)  
**Agente responsável:** `documentation-engineer`  
**Skill canônica:** `.agents/skills/documentation-validation/SKILL.md`  

---

## Motivação

As skills representam capacidades e procedimentos técnicos especializados e reutilizáveis pelos agentes do F1Atlas. O propósito da SPEC-GOV-002 é assegurar que uma skill não seja apenas um documento estático com instruções vagas ("siga boas práticas"), mas sim um procedimento operacional acionável, com gatilhos de ativação inequívocos, pré-condições verificáveis, integração com scripts determinísticos, tratamento de falhas e contratos de saída estruturados.

---

## Escopo e regras

### Princípio da capacidade única e reutilizável
- Cada skill reside em diretório próprio sob `.agents/skills/<nome-da-skill>/SKILL.md`.
- Cada skill implementa uma capacidade especializada de engenharia (ex.: modelagem de domínio, validação documental, revisão de segurança).
- O nome da pasta deve coincidir perfeitamente com o campo `name` do frontmatter YAML.

### Frontmatter e descoberta
- YAML delimitado por `---` com campos obrigatórios:
  - `name`: identificador único em kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).
  - `description`: descrição rica de 40 a 250 caracteres comunicando o problema resolvido, o contexto de utilização e os gatilhos que diferenciam a skill de outras semelhantes.
- Proibição de tags de boilerplate genérico repetitivo ("use esta skill quando a tarefa corresponder a esta responsabilidade").

### Estrutura obrigatória do documento
O arquivo `SKILL.md` deve conter obrigatoriamente as seguintes seções estruturadas:
1. `# <nome-da-skill>`
2. `## Ativação e propósito`: declaração do problema que a capacidade resolve e critérios objetivos de quando NÃO utilizar.
3. `## Pré-condições`: pré-requisitos, permissões, leituras canônicas e verificação do estado do workspace antes da ação.
4. `## Procedimento`: passos operacionais concretos estruturados preferencialmente no fluxo **Preparação → Investigação → Decisão → Execução → Validação → Entrega**.
5. `## Validação`: verificação mecânica do resultado, comandos de teste aplicáveis e critérios determinísticos de aprovação.
6. `## Falhas e limites`: contingências diante de ferramentas indisponíveis, restrições de permissão, casos proibidos e limites da autonomia do executor.
7. `## Entregáveis`: contrato de saída e formato estruturado de evidências a retornar ao agente solicitante.

### Integração com scripts determinísticos
- Toda skill cuja responsabilidade possa ser automatizada ou auditada mecanicamente deve referenciar e executar scripts reais em `scripts/` ou `.local/`.
- É expressamente proibido citar comandos ou scripts inexistentes no repositório.
- A skill deve orientar a interpretação dos códigos de saída (`0` PASS/SKIP, `1` FAIL, `2` ERROR) em conformidade com a SPEC-GOV-003.

### Segurança e integridade
- Uma skill não autoriza contornar verificadores, ignorar políticas de segurança ou realizar operações destrutivas sem aprovação explícita.
- Em cenários com dados externos, segredos ou caminhos locais, a skill deve impor o princípio de menor privilégio e mascaramento de credenciais.

---

## Critérios de aceitação

1. **Validação Estrutural:** O script `scripts/quality/check-agent-contracts.mjs` deve aprovar todas as skills cadastradas (frontmatter, seções obrigatórias, tamanho de descrição e unicidade).
2. **Consistência de Referências:** Scripts e documentos referenciados dentro de cada `SKILL.md` devem existir fisicamente no repositório.
3. **Associação com Agentes:** Cada skill em `.agents/skills/` deve ser referenciada por pelo menos um agente canônico em `.gemini/agents/*.md`, e toda skill referenciada por um agente deve existir.
4. **Resolução de Conflitos e Descoberta:** Não deve haver ambiguidade nos gatilhos de ativação entre skills de áreas semelhantes (ex.: `security-review` vs `code-review`; `editorial-research` vs `historical-fact-checking`).

---

## Falhas, dependências e riscos

- **Ambiguidade Semântica:** A validação estática via regex não garante que o procedimento humano ou da IA será executado com precisão; requer validação comportamental periódica.
- **Acoplamento de Comandos:** Mudança no nome ou parâmetros de um script em `scripts/` exige atualização imediata das skills consumidoras.

---

## Evidências requeridas

Para homologação de conformidade com a SPEC-GOV-002:
1. Aprovação unânime em `npm run verify:docs` e nos testes de contrato de governança.
2. Matriz de rastreabilidade relacionando cada skill com seus agentes consumidores e scripts de suporte.
3. Execução de cenários de validação comportamental (ativação correta, não-ativação, tratamento de erro).
