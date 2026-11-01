# ARCHITECTURE — F1Atlas

**Estado:** proposta arquitetural inicial, sujeita a ADRs e experimentos. **Horizonte:** 2025 → 2026 → 2027.

## 1. Propósito e contexto

A plataforma reúne dados esportivos históricos e de temporada, estatísticas, comparações, simulações determinísticas e narrativas interativas. A independência editorial e o licenciamento condicionam quais informações podem ser coletadas e publicadas. O frontend exibe e explora conhecimento; o backend protege a interpretação esportiva.

## 2. Filosofia Backend First

**Ordem de raciocínio:** necessidades → regras e invariantes do domínio → casos de uso → contratos → persistência/integrações → apresentação.

- Os dados recebidos de fornecedores **não são entidades de domínio confiáveis por definição**: passam por validação, normalização, identificação histórica e controle de revisão.
- O frontend não calcula regras oficiais de campeonato como fonte de verdade. Pode fazer projeções de exibição sobre contratos definidos, mas o mecanismo determinístico de cálculo fica testável e independente de UI.
- Backend First **não significa construir todo o backend antes do frontend**: permite protótipos UX paralelos e fatias verticais completas.
- Modelos de domínio e casos de uso não devem importar Next.js, NestJS, ORM, clientes HTTP ou SDKs de fornecedores.
- Separações Clean Architecture/DDD/SOLID devem corresponder a necessidades reais; evitar classes, ports e abstrações sem dependências que justifiquem sua existência.

## 3. Características arquiteturais e prioridades

1. **Integridade e rastreabilidade:** números e histórias têm fonte, data e situação claramente definidas.
2. **Corretude temporal:** identidade, vínculos, resultados e regulamentos são contextualizados por temporada, sessão e vigência.
3. **Testabilidade e determinismo:** regras de pontuação e simulação reproduzíveis por fixtures históricas licenciadas ou sintéticas.
4. **Segurança e privacidade:** proteção contra vazamentos, permissões mínimas, isolamento de configurações privadas.
5. **Evolutividade:** adicionar temporadas sem duplicar tabelas, APIs ou lógica.
6. **Desempenho e acessibilidade:** páginas úteis em mobile e dados fornecidos com custos previsíveis.

Conflitos entre propriedades devem gerar ADR, não escolha por preferência de framework.

## 4. Arquitetura lógica candidata

```text
Usuário / robôs de busca
        |
Next.js (web, SSR/SSG conforme página)
        | contratos versionados
NestJS (API, monólito modular)
        |                    Casos de uso / domínio       Adapters de dados externos
        |                    |
Repositórios (ports)       Ingestão/validação/proveniência
        |                    |
PostgreSQL <-----------------+
```

**Estado:** apenas alvo conceitual. Ainda não existem aplicações, banco, filas, cache ou infraestrutura configurados.

## 5. Limites de responsabilidade

- **Identity/Participants:** pilotos, equipes e história da identidade; não assume identidade de equipes igual ao nome comercial da temporada.
- **Competition:** temporada, GP, circuito, sessão, inscrições e participação.
- **Results:** resultados, penalidades aplicáveis, pontuação e classificações por contexto.
- **Simulation:** resultados hipotéticos imutáveis em relação aos registros reais; versões e regulamentos explícitos.
- **Editorial:** histórias, capítulos, acontecimentos, fontes, revisões e estados de publicação.
- **Data Integration:** provedores, chaves externas, importações, validação, revisão e registros de proveniência.

Separações inicialmente lógicas; dividir em pacotes só quando os contratos forem verificáveis. Nenhum módulo pode acessar diretamente dados persistidos internos de outro sem um contrato declarado.

## 6. Camadas e direção das dependências

- **Domain:** entidades, invariantes, políticas de pontuação, conceitos de elegibilidade e tempo; lógica pura.
- **Application:** casos de uso, coordenação e contratos de repositórios / integração necessários.
- **Infrastructure:** ORM, PostgreSQL, HTTP, schedulers, provedores e adapters de cache.
- **Presentation:** controllers API, DTOs, componentes de interface e transporte.

Regra de dependência: Infrastructure/Presentation → Application → Domain. Dependências entre módulos devem ser explícitas e protegidas por testes de arquitetura quando os diretórios existirem.

## 7. Modelo temporal e integridade

- Vínculo piloto/equipe está associado a período ou inscrição, nunca exclusivamente ao cadastro do piloto.
- Uma equipe esportiva pode mudar de nome ou propriedade: distinguir identidade, participação e denominação histórica.
- Uma sessão pode ter inscrição sem resultado final; status provisório, confirmado, corrigido e desconhecido não são equivalentes.
- Regras de pontuação aplicam-se a contextos temporais e condições (tipo de sessão, corrida encurtada, desempate) e exigem testes.
- Classificações podem ser derivadas de resultados, mas snapshots históricos devem preservar contexto, origem e momento quando necessários.

Detalhar antes das migrations em `docs/specs/domain/` e `docs/architecture/domain-model.md`.

## 8. Integração e propriedade intelectual

O fluxo candidato é: obter dados com permissão → validar esquema → normalizar → resolver identidades → persistir registros/revisões → derivar classificações → expor contratos. Cada fase deve gerar erro rastreável sem converter dados incertos em fatos. Capacidade de atualização ao vivo só será implementada após avaliação jurídica e operacional documentada.

Nunca presumir que uma API pública permite republicação comercial. Não copiar imagens, vídeos, logotipos ou marcas sem direitos aplicáveis.

## 9. Persistência e distribuição

PostgreSQL é candidato por integridade relacional; Prisma/Drizzle permanecem em avaliação. **Um banco relacional e um monólito modular** são a hipótese inicial. Redis, mensageria, CQRS, microsserviços, múltiplos bancos e streams não são requisitos iniciais. Introduzir conforme medições e dependências reais.

## 10. API e contratos

Contratos devem distinguir dados reais de cenários simulados, incluir identificadores estáveis, unidade, data UTC (com apresentação no fuso do visitante), proveniência e estados de atualização. Mudanças incompatíveis devem ser versionadas; erros devem ter códigos definidos e testes de contrato.

## 11. Qualidade e segurança

- Quality gates em `docs/development/quality-gates.md` e `scripts/`.
- Scanner de segredos e auditorias locais são controles preventivos, não prova de inexistência de exposição.
- Comandos destrutivos, deploy e operações externas exigem autorização específica; aplicação do menor privilégio.
- Testes automáticos: domínio e pontuação, transformação de dados, contratos, integração, regressão, segurança, acessibilidade e desempenho conforme o produto evoluir.
- Observabilidade prevista: logs sem segredos, métricas de atualização, falhas por provedor, duração de jobs e estado de dados exibido ao visitante.

## 12. Roadmap arquitetural

- **2025/MVP:** fundação, modelo mínimo correto, ingestão histórica autorizada, cálculo testado e história interativa completa.
- **2026/Consolidação:** coexistência de temporadas e regulamentos, comparações, simulação inicial, tuning e mais narrativas.
- **2027/Produto:** acompanhamento e alertas conforme licença, observabilidade de atualização, escalabilidade baseada em medidas, experiências editoriais completas.

## 13. Decisões pendentes e risco

Direitos de dados/imagens; escopo de resultados; ORM; hospedagem; estratégia de cache; dados ao vivo; editorial/publishing; analytics/privacy; métricas e orçamento. ADR-0001 ainda é uma proposta; nenhuma tecnologia é irrevogável.

## 14. Documentos associados

- `DESIGN.md`: interface e conteúdo.
- `docs/architecture/adr/`: decisões e alternativas.
- `docs/specs/`: requisitos verificáveis.
- `docs/development/`: contratos de engenharia.
