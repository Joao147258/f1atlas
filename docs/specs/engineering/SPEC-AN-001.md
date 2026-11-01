# SPEC-AN-001 — Analytics e privacidade

**Estado:** approved
**Tipo:** especificação verificável

## Motivação

O projeto F1Atlas necessita de telemetria analítica de produto para compreender a interação dos usuários com os dados esportivos (*Race Intelligence*) e as narrativas históricas (*Racing Stories*). Essa mensuração deve ser obtida com estrita observância da privacidade, sem coleta ou processamento de dados pessoais (PII), sem rastreamento não autorizado e com total independência de provedores analíticos externos.

A arquitetura deve desacoplar o domínio e a aplicação de SDKs comerciais (como Google Analytics 4), garantindo contratos tipados, validação estática de catálogo, controle estrito de consentimento (*Basic Consent Mode*) e isolamento offline determinístico.

## Escopo e regras

### 1. Separação arquitetural de responsabilidades

A telemetria analítica é estruturada em camadas estritamente isoladas:

1. **Aplicação / Domínio**: Emite intenções de medição sem conhecer SDKs, endpoints HTTP ou APIs de provedores externos.
2. **Contrato Centralizado (`packages/contracts/analytics.mjs`)**: Fornece `createAnalyticsClient()`, responsável por validar eventos contra o catálogo oficial, inspecionar propriedades, barrar termos proibidos e consultar o estado de consentimento.
3. **Catálogo Oficial (`docs/analytics/events.catalog.json`)**: Fonte canônica da especificação dos 11 eventos autorizados, suas finalidades e suas propriedades permitidas.
4. **Consent Mode Controller**: Garante o estado inicial `denied` e autoriza o despacho exclusivamente quando `currentConsent === 'granted'`.
5. **Adaptador de Provedor (Adapter)**: Traduz eventos validados para a infraestrutura de destino. Em ambiente de testes e harness, utiliza exclusivamente adaptadores em memória (`mock`), sem tráfego de rede ou injeção de scripts no DOM.

### 2. Basic Consent Mode e Gestão de Consentimento

- O cliente é inicializado por padrão no estado estrito `CONSENT_STATE.DENIED`.
- Se o usuário não tiver concedido consentimento explícito, nenhuma transmissão é despachada (`status: 'blocked', reason: 'consent_denied'`).
- A transição para `CONSENT_STATE.GRANTED` só pode ocorrer mediante ação deliberada no banner/gerenciador de consentimento.
- A revogação do consentimento (`setConsent('denied')`) bloqueia imediatamente todas as emissões subsequentes.
- Se a flag global `enabled` for falsa, a telemetria é desativada sem erro (`status: 'skipped', reason: 'analytics_disabled'`).

### 3. Diferenciação entre Measurement ID e Segredos Confidenciais

- **GA4 Measurement ID (`G-XXXXXXXXXX`)**: Identificador de fluxo público utilizado no navegador cliente. Seu formato é `^G-[A-Z0-9]{4,15}$`. É legítimo em `.env.example` e em variáveis públicas (`NEXT_PUBLIC_GA_MEASUREMENT_ID`).
- **Segredos do Measurement Protocol (`api_secret`) e Tokens**: Segredos confidenciais de backend ou service accounts. Devem ser terminantemente bloqueados em arquivos públicos, `.env.example`, repositórios Git e pacotes frontend.

### 4. Proibição Estrita de PII (Personally Identifiable Information)

- É proibida a transmissão de dados pessoais diretos ou indiretos.
- O validador rejeita em tempo de execução qualquer parâmetro contendo os termos: `email`, `phone`, `ip_address`, `cpf`, `password`, `token`, `secret`, `api_key`, `access_key`, `birthdate`, ou símbolos indicadores de endereço de email (`@`).
- A inspeção verifica tanto os nomes das propriedades quanto seus valores.

### 5. Catálogo Restritivo de Eventos Autorizados

Somente os 11 eventos previamente catalogados com lista exaustiva de propriedades e finalidade documentada são permitidos:

**Vertente Race Intelligence:**
1. `season_selected`: Seleção de temporada no visualizador esportivo (`season_year`, `entry_point`).
2. `grand_prix_viewed`: Visualização da etapa esportiva (`season_year`, `round_number`, `circuit_id`).
3. `driver_profile_viewed`: Perfil de piloto (`driver_slug`, `season_context`).
4. `team_profile_viewed`: Perfil de equipe/construtor (`team_slug`, `season_context`).
5. `standings_filter_changed`: Filtro de tabela de classificação (`season_year`, `filter_type`).
6. `driver_comparison_started`: Comparador de desempenho entre dois pilotos (`driver_a_slug`, `driver_b_slug`, `comparison_metric`).
7. `simulation_completed`: Execução do simulador de cenários hipotéticos (`season_year`, `scenario_type`).

**Vertente Racing Stories:**
8. `story_opened`: Abertura de narrativa histórica (`story_slug`, `topic_category`).
9. `story_chapter_viewed`: Leitura de capítulo (`story_slug`, `chapter_number`).
10. `historical_event_explored`: Aprofundamento em acontecimento correlacionado (`story_slug`, `event_year`, `event_type`).
11. `story_source_opened`: Consulta de fontes primárias e evidências (`story_slug`, `source_type`).

## Critérios de aceitação

1. O arquivo `docs/analytics/events.catalog.json` deve conter os 11 eventos documentados, cumprindo o schema v1 com `consentCategory` válida e sem termos sensíveis.
2. `packages/contracts/analytics.mjs` deve exportar `createAnalyticsClient`, `CONSENT_STATE` e `FORBIDDEN_PROPERTY_TERMS`.
3. Tentativas de disparar eventos não cadastrados devem retornar `{ status: 'error', reason: 'unrecognized_event' }`.
4. Propriedades não declaradas no catálogo para aquele evento devem retornar `{ status: 'error', reason: 'unauthorized_property' }`.
5. Valores ou chaves contendo termos de PII devem retornar `{ status: 'error', reason: 'sensitive_data_detected' }`.
6. Eventos emitidos com consentimento `denied` devem retornar `{ status: 'blocked', reason: 'consent_denied' }`.
7. O scanner de segredos (`check-secrets.mjs`) deve aceitar `G-XXXXXXXXXX` em `.env.example`, mas rejeitar `api_secret` ou tokens sensíveis.
8. Os testes de analytics e segurança devem executar 100% offline, sem requisições de rede.

## Falhas, dependências e riscos

- **Bypass acidental**: Injeção direta de scripts no DOM contornando o contrato. Mitigação: política de lint e revisão de arquitetura proibindo chamadas globais a `window.gtag`.
- **Vazamento de PII em campos de texto livre**: Mitigação: proibição de campos de texto livre no catálogo de eventos; uso exclusivo de identificadores controlados (ex: `driver_slug`, `story_slug`).
- **Dependência de Frontend**: A emissão real em navegador depende da implementação de `apps/web`. Até sua criação, os quality gates operam em modo de validação estática de contrato.

## Evidências requeridas

1. Execução de `node scripts/analytics/validate-events.mjs` com código de retorno 0.
2. Execução de `node scripts/analytics/validate-privacy.mjs` com código de retorno 0.
3. Execução de suíte de testes de analytics em `scripts/tests/analytics.test.mjs` validando todos os cenários de aceite.
4. Execução de testes de segurança em `scripts/tests/security.test.mjs` comprovando rejeição de `api_secret` e distinção do `Measurement ID`.
5. Validação documental via `node scripts/documentation/validate-specs.mjs` sem inconformidades.
