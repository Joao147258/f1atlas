# F1Atlas — DESIGN.md

**Versão:** 1.0 — Direção visual proposta  
**Status:** Proposta para validação por protótipo  
**Projeto:** F1Atlas — Plataforma Interativa de Automobilismo  
**Direção criativa:** Precision Motorsport Editorial  
**Escopo:** MVP 2025, consolidação 2026 e evolução 2027  
**Responsáveis:** Frontend Engineer, Editorial Engineer e responsável humano pelo produto

> Este documento é a fonte canônica de direção visual, experiência e linguagem de interface do F1Atlas. Ele define princípios e critérios de aceitação, não afirma que componentes, telas ou sistemas de design já estejam implementados. Decisões de implementação pertencem às especificações, à arquitetura e aos ADRs aplicáveis.

## 1. Visão de design

O F1Atlas é uma plataforma independente de automobilismo que conecta **dados esportivos, exploração interativa e narrativas históricas**. A experiência deve permitir que qualquer visitante compreenda não apenas o resultado, mas também seu contexto e sua relevância.

A identidade visual proposta combina **a precisão de um painel de engenharia de corrida** com **a profundidade editorial de uma publicação documental**. O nome desta direção é *Precision Motorsport Editorial*.

**Proposição de experiência:** Precisão para analisar. Contexto para compreender. Histórias para descobrir.

### 1.1. Valores visuais

- **Precisão:** informação organizada, números legíveis, estados dos dados explícitos e hierarquia consistente.
- **Contexto:** relações visíveis entre pilotos, equipes, temporadas, resultados e acontecimentos.
- **Descoberta:** navegação contextual que convida à exploração sem esconder informação essencial.
- **Autenticidade:** identidade própria, conteúdo fundamentado e nenhuma aparência de vínculo oficial com campeonatos ou equipes.
- **Sofisticação contida:** refinamento visual sem excesso de movimento, decoração ou densidade.
- **Acessibilidade:** uso independente de dispositivo, percepção de cor ou modalidade de interação.

### 1.2. O que não buscamos

- Clonar a identidade gráfica ou o portal oficial da Fórmula 1.
- Simular dashboards de telemetria complexos apenas como efeito decorativo.
- Usar vermelho como cor institucional obrigatória por associação com automobilismo.
- Transformar todas as páginas em uma experiência escura e densa.
- Sacrificar contexto histórico para obter gráficos visualmente impressionantes.
- Priorizar animações, efeitos de vidro ou parallax em prejuízo de legibilidade e desempenho.

## 2. Público e tarefas centrais

| Perfil | Necessidade principal | Requisito de experiência |
| --- | --- | --- |
| Visitante ocasional | Consultar temporada, calendário e classificação | Resposta imediata, contexto do evento e navegação simples |
| Fã recorrente | Acompanhar evolução de pilotos e equipes | Consistência entre etapas, histórico e indicadores de atualização |
| Entusiasta de dados | Comparar resultados e explorar tendências | Filtros claros, unidades, períodos e metodologia visíveis |
| Leitor de histórias | Descobrir trajetórias e acontecimentos | Leitura confortável e conexões relevantes com os dados |
| Público profissional indireto | Entender a qualidade do produto desenvolvido | Clareza técnica e identidade independente; sem interferência no fluxo esportivo |

## 3. Um sistema visual, duas densidades de experiência

### 3.1. Race Intelligence — exploração analítica

**Aplicação:** página de temporada, classificação, calendário, resultados, estatísticas, comparação e simulador.

Diretrizes:
- Priorizar dados e rótulos, com superfícies escuras e contraste consistente.
- Utilizar alinhamento rigoroso para números, datas, posições e unidades.
- Reduzir ornamentos em áreas de comparação.
- Exibir temporada, sessão, origem e situação dos dados perto dos resultados.
- Permitir aprofundamento progressivo sem sobrecarregar a visão inicial.

### 3.2. Racing Stories — exploração narrativa

**Aplicação:** histórias de pilotos, equipes e acontecimentos históricos.

Diretrizes:
- Priorizar leitura confortável, largura controlada e respiro editorial.
- Usar preferencialmente superfícies claras para capítulos longos.
- Integrar gráficos, linhas do tempo e eventos à narrativa com significado explícito.
- Permitir alternância entre a história e os registros esportivos relacionados.
- Diferenciar fatos documentados, interpretações editoriais e hipóteses.

### 3.3. Continuidade entre modos

Race Intelligence e Racing Stories **não são produtos nem design systems diferentes**. Compartilham tipografia, cores semânticas, componentes, navegação, iconografia e convenções de interação. Variam sobretudo densidade, composição, espaços e preferência de superfície.

Mudanças visuais entre seções devem ser graduais. Não criar duas navegações independentes sem evidência de necessidade.

## 4. Identidade e marca

### 4.1. Nome e assinatura

**F1Atlas é o nome canônico do projeto** (anteriormente identificado como F12027 durante o bootstrap inicial do harness). Domínio, assinatura definitiva e logotipo continuam pendentes de validação.

A assinatura de referência para exploração é: **“A corrida é o começo da história.”** Não é uma marca registrada nem uma decisão comercial definitiva.

### 4.2. Símbolo e linguagem gráfica

Preferir identidade abstrata e geométrica baseada em trajetória, progressão, coordenadas e conexão entre acontecimentos. Elementos utilizáveis: grades modulares, pontos temporais, linhas de evolução, marcações de sessões e diagramas autorais.

Evitar emblemas oficiais, silhuetas copiados de equipes, números estilizados como marcas conhecidas e iconografia que possa sugerir afiliação.

### 4.3. Direitos de uso

Não incorporar logotipos, fotografias, vídeos, fontes proprietárias, ilustrações, telemetria visual ou material editorial sem verificar direitos aplicáveis. Na ausência de autorização, usar componentes originais, textos próprios e ilustrações abstratas não enganosas. Material ilustrativo não pode ser apresentado como registro histórico autêntico.

## 5. Sistema de cores

### 5.1. Paleta-base proposta

| Token de referência | Hex | Finalidade |
| --- | --- | --- |
| Carbon | `#101820` | Fundo analítico, navegação e identidade principal |
| Graphite | `#1D2B35` | Cards escuros, filtros e superfícies secundárias |
| Signal Mint | `#67E3CD` | Ações, foco visual, seleção e séries em destaque |
| Heritage Amber | `#E6AD7A` | Marcos de narrativa e acontecimentos contextualizados |
| Warm Ivory | `#F6F3EC` | Superfícies editoriais e texto de destaque em fundos escuros |
| Slate | `#A5B7C3` | Texto secundário em superfícies escuras |
| Ink | `#101820` | Texto principal em superfícies claras |
| Editorial Muted | `#54616A` | Texto secundário em superfícies claras |

A paleta é proposta inicial. Toda combinação efetivamente usada deverá ser testada em seu estado normal, hover, foco, desabilitado e erro. Não inferir acessibilidade de uma cor isolada.

### 5.2. Tokens semânticos

A implementação deverá utilizar nomes de função, não códigos hexadecimais espalhados pelos componentes:

- `--color-bg-primary`, `--color-bg-elevated`, `--color-bg-editorial`;
- `--color-text-primary`, `--color-text-secondary`, `--color-text-inverse`;
- `--color-border-subtle`, `--color-border-strong`;
- `--color-action`, `--color-action-text`, `--color-focus`;
- `--color-status-info`, `--color-status-warning`, `--color-status-error`, `--color-status-success`;
- `--color-data-series-*`, `--color-event-highlight`.

Mapeamentos iniciais: fundo analítico Carbon; superfície elevada Graphite; fundo editorial Warm Ivory; ação escura Signal Mint; destaque histórico Heritage Amber. Os tokens de estado exigem uma paleta semântica validada antes de entrar em produção.

### 5.3. Regras de cor

- Nunca depender só da cor para expressar posição, pontuação, status ou variação.
- Diferenciar estados com texto, ícones, padrões e/ou tipo de linha.
- Não usar cores de equipes como fundamento da identidade global.
- Quando cores de equipes forem apresentadas, identificar fonte e contexto temporal; não presumir licenças de marca.
- Preservar legibilidade em gráficos com muitas séries e em visualizações para pessoas com daltonismo.
- Verde-água representa interação; âmbar representa conexão editorial, **não** situação oficial dos resultados.

## 6. Tipografia

| Papel | Família preferencial | Uso |
| --- | --- | --- |
| Display | Barlow Condensed | Títulos de destaque, capas de temporada e números editoriais |
| Interface e leitura | Inter | Navegação, parágrafos, filtros e componentes |
| Dados numéricos | IBM Plex Mono | Tempos, diferenças, estatísticas e tabelas técnicas |

As famílias são **candidatas**, sujeitas à verificação de licença, desempenho e suporte aos caracteres necessários. Utilizar fallbacks robustos. Para números alinhados, preferir também `font-variant-numeric: tabular-nums` quando disponível.

### 6.1. Escala tipográfica inicial

- Display: responsivo, aproximadamente 40–72 px conforme contexto e largura.
- Título de página: 32–48 px.
- Título de seção: 24–32 px.
- Título de componente: 18–24 px.
- Corpo: 16–18 px.
- Legendas e metadados: normalmente 14 px ou mais; evitar texto essencial excessivamente reduzido.
- Leitura longa: largura alvo de 60–75 caracteres, altura de linha entre 1,5 e 1,7.

Essas medidas são ponto de partida. Devem ser validadas com conteúdo real e acessibilidade, sem estabelecer alturas fixas que cortem textos ampliados.

### 6.2. Hierarquia e redação

- Uma página deve comunicar rapidamente onde o visitante está e qual contexto está visualizando.
- Evitar títulos inteiros em caixa alta em conteúdos longos.
- Escrever rótulos claros, objetivos e consistentes.
- Descrever unidades, contexto temporal e metodologia perto dos números.
- Não confundir termos estatísticos diferentes, como resultado de corrida, posição de largada e classificação no campeonato.

## 7. Layout, grade e responsividade

### 7.1. Composição

- Escala de espaçamento baseada preferencialmente em incrementos de 4 px.
- Container central com largura máxima contextual: páginas analíticas podem ser mais largas; narrativa deve limitar a coluna de leitura.
- Cards com cantos discretos, bordas ou separações leves; sombra apenas quando necessário à hierarquia.
- Superfícies e áreas clicáveis devem permanecer consistentes entre páginas.
- Painéis densos devem permitir comparação sem perder títulos e unidades.

### 7.2. Larguras de referência para validação

- **Mobile:** 360–639 px, fluxo predominantemente em coluna única.
- **Tablet:** 640–1023 px, adaptações com até duas colunas quando houver espaço.
- **Desktop:** 1024 px ou mais, composição com múltiplos painéis e navegação contextual.

Esses intervalos são hipóteses iniciais, não obrigação de breakpoints rígidos. A quebra deve responder ao conteúdo, ao zoom e às necessidades reais dos componentes.

### 7.3. Regras mobile

- Calendário e etapas: cards resumidos com detalhamento sob demanda.
- Classificações: preferir colunas prioritárias e detalhamento progressivo; não ocultar informação essencial permanentemente.
- Comparações: empilhar perfis ou permitir alternância clara entre participantes.
- Gráficos: preservar eixo, unidades e acesso à tabela de valores.
- Navegação: ações essenciais sempre acessíveis sem depender de hover.
- Histórias: capítulos em sequência com navegação clara para anterior/próximo e índice quando útil.

## 8. Arquitetura da informação

### 8.1. Navegação principal proposta

1. **Temporadas** — calendário, classificação e evolução.
2. **Pilotos** — perfis, participações, estatísticas e histórias.
3. **Equipes** — identidade histórica, participações e narrativas.
4. **Explorar** — comparações, estatísticas e, futuramente, simulações.
5. **Histórias** — experiências narrativas autorais.

Essa organização depende de testes de navegação; no MVP algumas seções podem ser parcialmente indisponíveis ou não exibidas até existir conteúdo útil. Não criar links para páginas vazias apenas para completar o menu.

### 8.2. Páginas prioritárias do MVP 2025

**Página de temporada 2025**
- Identificação da temporada e origem/situação dos dados.
- Próxima referência contextual (no histórico: temporada encerrada; não insinuar evento futuro).
- Classificação de pilotos e construtores disponível.
- Calendário e resultados por etapa.
- Acesso à primeira narrativa relacionada.

**Página de piloto**
- Identificação do participante sem depender de imagem licenciada.
- Temporada e equipe(s) contextualizadas.
- Indicadores essenciais acompanhados de período e fonte.
- Gráfico de evolução da temporada com unidades e tabela alternativa.
- Acontecimentos relacionados e acesso à narrativa.

**Página da primeira história**
- Título, resumo, autoria e referências.
- Capítulos navegáveis e progressão temporal.
- Eventos históricos com datas e contexto.
- Gráficos ou resultados incorporados somente quando agregarem compreensão.
- Ligações para participantes, equipes e etapas pertinentes.

### 8.3. Evolução planejada

- **2026:** comparações entre temporadas, detalhamento estatístico, primeira versão do simulador e maior catálogo editorial.
- **2027:** visualização de dados atualizados durante eventos, sinalização de latência/estados, simulações avançadas e alertas, apenas se houver viabilidade técnica, jurídica e operacional.

## 9. Biblioteca de componentes

| Componente | Responsabilidade | Regras principais |
| --- | --- | --- |
| App Header | Navegação e contexto global | Identidade própria, foco visível e menu mobile acessível |
| Season Selector | Seleção de temporada | Ano explícito; preservar contexto ao navegar |
| Grand Prix Card | Resumo de etapa | Nome, data, circuito, contexto e situação dos dados |
| Session Status | Condição dos dados | Status textual e última atualização quando pertinente |
| Standings Table | Classificação | Cabeçalhos, pontos, posição, unidade, ordenação e fonte |
| Participant Card | Piloto ou equipe | Identidade e contexto temporal, sem vínculos permanentes fictícios |
| Performance Chart | Evolução de desempenho | Eixos, legenda, escala, interações por teclado e tabela alternativa |
| Comparison Panel | Comparação contextual | Temporadas, métricas, regras e limitações visíveis |
| Story Chapter | Conteúdo narrativo | Hierarquia de leitura, fontes e conexões com dados |
| Timeline Event | Marco histórico | Data, evento, relação e referências |
| Source Reference | Proveniência | Fonte, contexto, data e link quando permitido |
| Empty/Error State | Comunicação de indisponibilidade | Explicação objetiva e ação de recuperação aplicável |

Cada componente deverá possuir estados de carregamento, sucesso, ausência, falha e foco quando aplicáveis. Componentes interativos precisam de especificação de teclado e acessibilidade.

## 10. Representação de dados esportivos

### 10.1. Regras transversais

- Sempre fornecer contexto de **temporada, etapa ou sessão**, conforme o dado.
- Exibir unidades e arredondamento de modo consistente, sem simular precisão inexistente.
- Distinguir posição no campeonato de posição na sessão.
- Não tratar comparações entre regulamentos e épocas diferentes como equivalentes sem contextualização.
- Não alterar registros oficiais ao simular cenários.
- Expor origem e recência dos dados quando relevantes.

### 10.2. Estados de informação

Quando aplicável, distinguir visual e textualmente:

| Estado | Mensagem e tratamento |
| --- | --- |
| Histórico/final | Resultado consolidado conforme a fonte identificada |
| Provisório | Resultado sujeito a alteração, com aviso claro |
| Corrigido | Identificar correção e revisão, quando existirem dados suficientes |
| Desatualizado | Informar referência temporal e possível defasagem |
| Indisponível | Não substituir por valores fictícios ou zeros enganosos |
| Simulado | Destacar que o cenário é hipotético, isolado dos dados reais |

O rótulo **“ao vivo”** só poderá ser usado quando fonte, atualização e condições operacionais sustentarem essa afirmação. Exibir “atualizado em” com fuso e precisão adequados; horário de Brasília pode ser padrão inicial, com escolha de fuso quando implementada.

### 10.3. Gráficos e tabelas

- Fornecer título descritivo, intervalo temporal, unidades, legendas e valores acessíveis.
- Não truncar escalas de modo que induzam comparações enganosas.
- Incluir tabela ou resumo textual equivalente quando necessário para acessibilidade.
- Tooltips não podem ser a única maneira de consultar valores.
- Diferenciar séries também por marcas, estilos de linha ou rótulos quando necessário.
- Em visualização de eventos, vincular marcadores apenas a acontecimentos sustentados por fontes.

## 11. Linguagem editorial e narrativa

- Tom informativo, preciso, envolvente e sem dramatização artificial.
- Capítulos devem possuir progressão clara, mas não forçar todas as trajetórias ao mesmo roteiro.
- Cada afirmação histórica relevante precisa de referência apropriada no processo editorial.
- A distinção entre fato, interpretação e hipótese deve ser preservada.
- Eventos podem aparecer em múltiplas narrativas sem duplicar sua identidade factual.
- Navegação contextual deve enriquecer a leitura, não transformar cada parágrafo em uma coleção de links.
- Fotografias ou ilustrações devem possuir texto alternativo apropriado e créditos quando exigidos.

## 12. Interação e movimento

- Preferir interações discretas, curtas e previsíveis.
- Transições simples: referência inicial entre 120 e 300 ms, conforme o componente e a intenção.
- Animação deve indicar mudança de estado, revelar relação ou orientar navegação; nunca ser requisito para compreender um resultado.
- Respeitar `prefers-reduced-motion` e não depender de rolagem animada ou parallax.
- Não introduzir atualizações automáticas que desloquem o foco ou alterem inesperadamente o contexto de leitura.
- Atualizações de resultados não devem interromper digitação, filtros ou simulações.

## 13. Acessibilidade

**Alvo:** WCAG 2.2, nível AA, aplicado progressivamente e validado antes da publicação de cada fluxo.

Requisitos mínimos:
- Contraste de texto comum de **pelo menos 4,5:1**, e de texto grande de **pelo menos 3:1**, consideradas as exceções normativas.
- Contraste não textual suficiente para componentes e indicadores relevantes.
- Navegação integral por teclado, sem armadilhas de foco.
- Foco visível e não encoberto por elementos fixos.
- Estrutura semântica com cabeçalhos coerentes e tabelas reais para dados tabulares.
- Nomes acessíveis em botões, filtros, ícones e controles de gráficos.
- Formulários com rótulos, orientação e mensagens de erro úteis.
- Zoom e aumento de texto sem perda de informação ou funcionalidade nos casos abrangidos pelos critérios aplicáveis.
- Áreas de toque que atendam o requisito WCAG 2.2 AA de tamanho mínimo ou suas exceções; usar **44 × 44 CSS px como preferência de ergonomia**, não como definição obrigatória do critério AA.
- Evitar dependência exclusiva de cor, animação, som ou hover.

Verificar com testes automatizados e inspeção manual: teclado, leitor de tela, zoom, contraste, estados de carregamento e gráficos.

## 14. SEO e metadados de interface

- Utilizar HTML semântico e estrutura de títulos consistente.
- Definir título e descrição específicos para páginas efetivamente publicadas.
- Garantir URLs coerentes e links internos descritivos.
- Evitar páginas indexáveis sem conteúdo útil ou contexto suficiente.
- Usar dados estruturados somente quando representarem corretamente o conteúdo e seguirem os requisitos aplicáveis.
- Imagens de compartilhamento devem seguir a identidade própria e respeitar direitos de uso.
- Não criar metadados que indiquem vínculo oficial inexistente.

SEO não deve alterar o sentido editorial ou introduzir conteúdo artificial para palavras-chave.

## 15. Desempenho e qualidade perceptiva

Metas iniciais para páginas publicadas, avaliadas especialmente no percentil 75 com dados de usuários quando disponíveis:

| Métrica | Meta de boa experiência |
| --- | --- |
| LCP | Até 2,5 s |
| INP | Até 200 ms |
| CLS | Até 0,1 |

Medidas de projeto:
- Evitar carregar bibliotecas de gráficos em páginas que não as utilizam.
- Reservar espaço para imagens, gráficos e superfícies carregadas dinamicamente.
- Preferir carregamento progressivo de visualizações complexas.
- Reduzir payload e fontes desnecessárias.
- Preservar conteúdo principal acessível durante falhas de componentes opcionais.
- Não impor animações contínuas ou vídeos pesados em páginas de consulta.

Essas métricas são metas, não resultados já obtidos. Instrumentação, testes e otimizações serão implementados conforme a evolução do produto.

## 16. Critérios de design e revisão

### 16.1. Antes de implementar um fluxo

1. Identificar a tarefa do visitante.
2. Verificar requisitos e estados dos dados.
3. Definir hierarquia e conteúdo mínimo.
4. Estabelecer requisitos de teclado, foco e mobile.
5. Selecionar componentes existentes ou justificar novos.
6. Determinar critérios verificáveis de aceite.

### 16.2. Antes de aprovar um componente

- [ ] O propósito e o conteúdo estão claros.
- [ ] O comportamento é consistente com componentes equivalentes.
- [ ] Os tokens semânticos são utilizados corretamente.
- [ ] Todos os estados pertinentes estão contemplados.
- [ ] O contraste e a navegação por teclado foram verificados.
- [ ] O componente funciona em mobile e com zoom.
- [ ] Dados, fontes e unidades são identificáveis quando aplicável.
- [ ] Não há dependência exclusiva de cor ou tooltip.
- [ ] O desempenho é proporcional ao benefício.
- [ ] A interface não sugere licença, parceria ou oficialidade inexistente.

### 16.3. Primeira validação de design

Criar e avaliar protótipos de **três experiências essenciais do MVP 2025**:

1. **Home de temporada:** contextualização, calendário e classificação.
2. **Página de piloto:** indicadores e evolução de desempenho contextualizada.
3. **Narrativa interativa:** capítulo, acontecimento e acesso a resultados relacionados.

Critérios de validação: compreensão inicial, facilidade de navegação, legibilidade, confiabilidade percebida, acessibilidade e continuidade entre modo analítico e modo narrativo.

Não converter este documento diretamente em dezenas de componentes sem testar essas experiências.

## 17. Responsabilidades e manutenção

- **Frontend Engineer:** traduz padrões em componentes, estados, estilos, acessibilidade e testes.
- **Editorial Engineer:** valida tom, estrutura narrativa, fontes e clareza do conteúdo.
- **SEO Engineer:** verifica semântica, indexação e apresentação em resultados de busca.
- **Analytics Engineer:** propõe medição da experiência sem comprometer privacidade ou clareza.
- **Test Engineer:** define cenários de interface e regressão.
- **Code Reviewer e Security Auditor:** verificam consistência, riscos e conformidade pertinente.
- **Responsável humano:** aprova identidade, desvios relevantes e decisões de escopo.

Alterações globais da identidade ou do sistema de tokens devem ser avaliadas quanto ao impacto em todas as experiências. Decisões duradouras que envolvam trade-offs significativos podem exigir ADR.

## 18. Pendências antes da adoção definitiva

- [ ] Definir nome público, domínio e logotipo original.
- [ ] Validar licenças das fontes escolhidas e dos recursos visuais.
- [ ] Testar protótipos dos três fluxos iniciais.
- [ ] Validar tokens semânticos e estados em temas claros e escuros.
- [ ] Confirmar regras e nomenclaturas de status com o domínio esportivo.
- [ ] Definir a biblioteca técnica de componentes e gráficos mediante comparação de alternativas.
- [ ] Definir estados e critérios de publicação das narrativas.
- [ ] Converter padrões aprovados em testes de interface e acessibilidade.

## 19. Referências

### Documentos internos

- `AGENTS.md` — políticas globais públicas.
- `ARCHITECTURE.md` — arquitetura, limites e Backend First.
- `docs/specs/` — requisitos verificáveis e escopo por temporada.
- `docs/development/` — padrões de documentação, segurança, qualidade, SEO e analytics.
- `docs/architecture/adr/` — decisões arquiteturais aprovadas.

As referências internas devem ser conciliadas com os caminhos realmente presentes no repositório.

### Padrões externos

- WCAG 2.2 — https://www.w3.org/TR/WCAG22/
- Core Web Vitals — https://developers.google.com/search/docs/appearance/core-web-vitals

---

**Princípio orientador:** o F1Atlas deve parecer preciso quando apresenta números, humano quando conta histórias e confiável em ambas as situações. A identidade visual será considerada adequada quando a mesma linguagem facilitar tanto a leitura de resultados quanto a descoberta do contexto histórico — sem sugerir uma ligação oficial ou comprometer a integridade dos dados.
