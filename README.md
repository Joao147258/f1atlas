# F1Atlas — Plataforma Interativa de Automobilismo

**Dados verificáveis, análise interativa e histórias que conectam números, acontecimentos e pessoas.**

O **F1Atlas** (denominado **F12027** durante a fase de bootstrap do harness) é um projeto independente de engenharia de software dedicado à construção de uma plataforma digital de automobilismo, com foco inicial na Fórmula 1.

A proposta é integrar informações esportivas, ferramentas analíticas e narrativas históricas em uma experiência que permita compreender não apenas os resultados das competições, mas também os acontecimentos, as decisões e as trajetórias que os contextualizam.

Além do produto, o F1Atlas é um laboratório público de engenharia de software. Sua evolução envolve documentação de decisões arquiteturais, desenvolvimento incremental, testes automatizados, governança de agentes de IA e mecanismos de validação técnica.

> **Estado do projeto:** fundação de engenharia e governança. As aplicações e funcionalidades esportivas serão desenvolvidas progressivamente.

---

## 1. Visão do produto

O F1Atlas integra três capacidades fundamentais.

### Dados verificáveis

Organização e apresentação de informações sobre:

- Temporadas e campeonatos.

- Pilotos e equipes.

- Circuitos e Grandes Prêmios.

- Sessões e resultados.

- Classificações de pilotos e construtores.

- Evolução histórica de desempenho.

As informações deverão preservar sua origem, contexto temporal e integridade.

### Exploração interativa

Ferramentas destinadas a transformar informações esportivas em experiências de análise:

- Comparação entre pilotos e equipes.

- Evolução de pontos e posições.

- Estatísticas históricas.

- Simulação de cenários do campeonato.

- Exploração de resultados e acontecimentos.

- Visualizações interativas de desempenho.

Os resultados simulados deverão ser claramente diferenciados dos dados esportivos reais.

### Narrativas históricas

Histórias interativas sobre pilotos, equipes, rivalidades e acontecimentos relevantes.

A experiência editorial deverá conectar capítulos narrativos a eventos, resultados e evidências históricas, permitindo ao leitor explorar diferentes perspectivas de uma mesma trajetória.

**Princípio central:** dados fundamentam análises; análises ajudam a compreender acontecimentos; narrativas acrescentam contexto e significado.

---

## 2. Roadmap do produto

A evolução funcional está organizada em três marcos associados às temporadas esportivas.

| Marco | Objetivo | Capacidades previstas |
| --- | --- | --- |
| **2025 — MVP histórico** | Validar o núcleo funcional | Domínio esportivo, calendário, resultados selecionados, classificações e primeira narrativa interativa |
| **2026 — Consolidação** | Expandir a exploração dos dados | Múltiplas temporadas, comparações, estatísticas e simulações |
| **2027 — Escopo-alvo** | Consolidar a experiência planejada | Análises avançadas, expansão editorial e acompanhamento ao vivo, quando viável |

Esses marcos representam recortes funcionais baseados nas temporadas, e não prazos garantidos de publicação.

O desenvolvimento seguirá uma evolução incremental, priorizando capacidades verificáveis antes da ampliação do escopo.

Consulte `docs/product/roadmap.md` para o planejamento detalhado.

---

## 3. Filosofia de engenharia

O F1Atlas adota uma abordagem **Backend First**, priorizando a compreensão, a modelagem e a validação das regras de negócio antes de desenvolver suas representações visuais.

A engenharia do projeto é orientada pelos seguintes princípios:

**Domínio protegido**

As regras esportivas devem permanecer independentes de detalhes desnecessários de frameworks, bancos de dados e interfaces.

**Responsabilidades explícitas**

Os componentes devem possuir limites claros, reduzindo acoplamento e facilitando testes e manutenção.

**Evolução incremental**

A complexidade arquitetural deve acompanhar necessidades demonstráveis do produto.

**Decisões fundamentadas**

Alternativas, trade-offs e consequências relevantes devem ser registrados e revisados conforme o sistema evolui.

**Testabilidade**

Regras, contratos e mecanismos críticos devem possuir critérios verificáveis e testes adequados aos riscos envolvidos.

**Segurança por construção**

A proteção de informações, as restrições operacionais e a validação de entradas são consideradas desde as primeiras etapas.

**Automação governada**

Agentes de IA e scripts apoiam o desenvolvimento, mas não substituem a definição de requisitos, a supervisão humana e a avaliação dos resultados.

### Direção tecnológica

A arquitetura inicialmente proposta considera:

| Camada | Tecnologia candidata |
| --- | --- |
| Linguagem principal | TypeScript |
| Aplicação web | Next.js |
| API | NestJS |
| Persistência | PostgreSQL |
| Organização | Arquitetura modular com domínio protegido |
| Testes | Testes automatizados e verificações arquiteturais |
| Automação | Gemini CLI, agentes, skills e scripts |

Essas escolhas estão sujeitas às decisões arquiteturais documentadas. Uma tecnologia candidata não deve ser tratada como aprovada apenas por constar neste README.

Os fundamentos estão documentados em `ARCHITECTURE.md`.

---

## 4. Identidade e experiência

A direção visual do F1Atlas é denominada **Precision Motorsport Editorial**.

Ela combina precisão informacional, linguagem visual inspirada no automobilismo e uma experiência editorial voltada à compreensão histórica.

O produto contempla duas experiências complementares.

### Race Intelligence

Ambiente de exploração e acompanhamento esportivo:

- Classificações.

- Resultados.

- Estatísticas.

- Comparações.

- Simulações.

- Visualizações de desempenho.

### Racing Stories

Ambiente de descoberta e leitura:

- Histórias de pilotos e equipes.

- Capítulos narrativos.

- Linhas do tempo.

- Acontecimentos históricos.

- Conexões entre narrativa e resultados verificáveis.

As duas experiências compartilham um design system, preservando diferenças de densidade visual, organização da informação e contexto de utilização.

Consulte `DESIGN.md` para as diretrizes de identidade, acessibilidade, componentes e experiência do usuário.

---

## 5. Estado atual de desenvolvimento

O projeto está estruturado para apoiar o desenvolvimento progressivo da plataforma.

### Fundação de engenharia

O repositório contempla:

- Documentação de arquitetura e design.

- Visão do produto e roadmap.

- Especificações de produto, domínio e engenharia.

- Agentes especializados.

- Skills operacionais reutilizáveis.

- Scripts de qualidade e segurança.

- Testes automatizados do harness.

- Políticas de desenvolvimento e governança.

- Templates e registros de decisões arquiteturais.

- Configuração de integração contínua.

### Capacidades planejadas

A implementação funcional deverá contemplar progressivamente:

- Aplicação web.

- API esportiva.

- Persistência.

- Importação controlada de dados.

- Cálculo e apresentação de classificações.

- Ferramentas de comparação.

- Simulador de campeonato.

- Narrativas históricas interativas.

- Recursos de acompanhamento esportivo.

A presença de documentação ou diretórios reservados não implica que essas capacidades já estejam disponíveis.

---

## 6. Estrutura do repositório

A organização separa produto, arquitetura, governança, automação e aplicações.

| Diretório ou arquivo | Responsabilidade |
| --- | --- |
| `README.md` | Apresentação e ponto de entrada do projeto |
| `AGENTS.md` | Regras públicas de engenharia e governança |
| `ARCHITECTURE.md` | Diretrizes e decisões arquiteturais |
| `DESIGN.md` | Identidade e experiência do produto |
| `.gemini/agents/` | Agentes especializados |
| `.agents/skills/` | Skills e procedimentos reutilizáveis |
| `.agents/templates/` | Templates de governança |
| `docs/product/` | Visão, escopo e roadmap |
| `docs/specs/` | Especificações e critérios de aceitação |
| `docs/development/` | Políticas normativas de engenharia |
| `docs/architecture/` | Modelagem, integrações e decisões arquiteturais |
| `docs/design/` | Diretrizes complementares de design |
| `docs/analytics/` | Catálogo e contratos de eventos |
| `docs/seo/` | Diretrizes de SEO |
| `docs/runbooks/` | Procedimentos operacionais documentados |
| `scripts/` | Scripts públicos de validação e automação |
| `apps/` | Aplicações do produto |
| `packages/` | Pacotes compartilhados |
| `.github/workflows/` | Integração contínua |

A estrutura poderá evoluir conforme decisões arquiteturais aprovadas.

---

## 7. Executando o harness

### Pré-requisitos

- Node.js 20 ou superior.

- npm.

- Git.

O Gemini CLI é utilizado para execução dos agentes e procedimentos especializados do projeto.

### Inicialização

Clone o repositório:

```
git clone <URL-DO-REPOSITORIO>
cd <DIRETORIO-DO-PROJETO>
```

Execute as verificações principais:

```
npm run verify
```

Esse comando executa os mecanismos públicos de qualidade definidos no projeto.

Antes de realizar modificações, consulte:

1. `AGENTS.md`

2. `ARCHITECTURE.md`

3. `DESIGN.md`

4. As especificações relacionadas à atividade.

### Comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run verify` | Execução geral dos quality gates públicos |
| `npm run agents:check` | Validação estrutural e contratual dos agentes |
| `npm run test:harness` | Testes automatizados do harness |
| `npm run verify:structure` | Verificação da estrutura |
| `npm run verify:docs` | Integridade documental |
| `npm run verify:security` | Verificações públicas de segurança |
| `npm run verify:architecture` | Limites arquiteturais e dependências |
| `npm run verify:seo` | Verificações aplicáveis de SEO |
| `npm run verify:analytics` | Validação dos contratos de analytics |

Consulte `package.json` para confirmar os comandos disponíveis na revisão utilizada.

### Estados de validação

Os mecanismos de qualidade devem distinguir:

| Estado | Significado |
| --- | --- |
| `PASS` | Verificação executada e aprovada |
| `FAIL` | Violação de um critério |
| `SKIP` | Verificação não aplicável ou não executada por condição justificada |
| `ERROR` | Falha na execução da verificação |

Um resultado `SKIP` não constitui aprovação.

Algumas verificações dependem da existência de componentes que ainda serão implementados.

---

## 8. Governança de agentes e automações

A governança do F1Atlas separa responsabilidades para tornar o desenvolvimento assistido por IA mais compreensível e verificável.

### Agentes

Representam especializações como desenvolvimento, backend, frontend, testes, segurança, revisão de código, documentação, analytics e SEO.

### Skills

Definem capacidades reutilizáveis, com procedimentos, pré-condições, critérios de decisão, restrições e resultados esperados.

### Scripts

Executam operações e verificações determinísticas, reduzindo a necessidade de repetir manualmente processos padronizados.

### Especificações

Estabelecem requisitos, contratos técnicos e critérios de aceitação.

### ADRs

Registram decisões arquiteturais, alternativas consideradas, justificativas e consequências.

**Modelo de responsabilidade:**

- Agentes executam responsabilidades especializadas.

- Skills orientam procedimentos.

- Scripts automatizam tarefas e validam condições objetivas.

- Especificações definem os critérios a atender.

- ADRs preservam o contexto das decisões.

A utilização de IA não elimina a necessidade de revisão independente e validação dos resultados.

---

## 9. Segurança e qualidade

O projeto utiliza mecanismos de segurança e quality gates como parte do processo de engenharia.

Os controles contemplam, conforme sua implementação e cobertura:

- Análise preventiva de segredos.

- Validação do escopo de publicação.

- Verificação de referências e caminhos.

- Integridade documental.

- Validação dos contratos de agentes e skills.

- Detecção de violações arquiteturais.

- Testes positivos, negativos e adversariais.

- Verificações executáveis pela integração contínua.

Os verificadores devem apresentar resultados rastreáveis e distinguir falhas reais de verificações não aplicáveis.

**A aprovação dos testes automatizados não equivale a uma garantia completa de segurança ou correção.**

A segurança também depende de revisão técnica, controle de acesso, gestão adequada de credenciais e avaliação contínua dos riscos.

---

## 10. Analytics e privacidade

O F1Atlas prevê a utilização de **Google Analytics 4** para compreender o uso da plataforma e orientar melhorias na experiência.

A estratégia de instrumentação considera:

- Catálogo documentado de eventos.

- Separação entre eventos de produto e detalhes do provedor.

- Validação de nomes e parâmetros.

- Prevenção do envio indevido de informações pessoais.

- Controles de consentimento quando aplicáveis.

- Testes de instrumentação.

- Tratamento de falhas e eventos duplicados.

A instrumentação deverá preservar a privacidade dos visitantes e observar os requisitos legais pertinentes.

A existência dos contratos de analytics não significa que a integração esteja ativa.

---

## 11. Integridade esportiva e propriedade intelectual

O F1Atlas é independente e não possui afiliação oficial com a Fórmula 1, FIA, equipes ou organizações esportivas.

A utilização de resultados, imagens, marcas e demais materiais de terceiros depende das condições legais e contratuais aplicáveis.

As integrações com provedores externos deverão ser avaliadas antes da utilização e redistribuição de dados.

Durante o desenvolvimento, cenários sintéticos poderão ser utilizados para testar regras, classificações e simulações sem depender de serviços externos.

O sistema deverá diferenciar claramente:

- Fatos esportivos verificados.

- Dados provisórios ou sujeitos a revisão.

- Resultados derivados por cálculo.

- Cenários hipotéticos ou simulados.

- Interpretações editoriais.

**A integridade histórica é parte essencial da proposta do produto.**

---

## 12. Documentação

A documentação está organizada para preservar a rastreabilidade entre objetivos, decisões e implementações.

| Referência | Finalidade |
| --- | --- |
| `docs/product/vision.md` | Visão do produto |
| `docs/product/roadmap.md` | Evolução funcional |
| `ARCHITECTURE.md` | Direção arquitetural |
| `DESIGN.md` | Identidade e experiência |
| `AGENTS.md` | Governança global |
| `docs/specs/` | Requisitos e critérios verificáveis |
| `docs/development/` | Políticas de engenharia |
| `docs/architecture/adr/` | Decisões arquiteturais |

As implementações deverão permanecer consistentes com os contratos e decisões aprovados.

---

## 13. Princípios de evolução

O F1Atlas é desenvolvido com foco em aprendizagem, experimentação e aprimoramento contínuo da engenharia.

As decisões devem considerar:

 1. Compreender o problema antes de implementar.

 2. Priorizar o domínio e suas regras.

 3. Avaliar alternativas e trade-offs.

 4. Preservar responsabilidades claras.

 5. Evitar abstrações prematuras.

 6. Automatizar atividades repetitivas quando houver benefício verificável.

 7. Testar cenários válidos e inválidos.

 8. Documentar decisões relevantes.

 9. Revisar escolhas conforme novas evidências.

10. Manter responsabilidade humana sobre o desenvolvimento assistido por IA.

O objetivo não é alcançar uma arquitetura definitiva, mas construir um sistema capaz de evoluir sem perder clareza, segurança e integridade.

---

**F1Atlas — Engenharia para compreender a competição, os dados e as histórias por trás do automobilismo.**