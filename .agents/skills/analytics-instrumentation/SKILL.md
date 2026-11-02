---
name: analytics-instrumentation
description: Projetar, instrumentar e validar eventos analíticos com catálogo tipado, minimização de dados e privacidade estrita (sem PII).
---

# analytics-instrumentation — Engenharia de Telemetria e Catálogo de Analytics

## Ativação e propósito

Projetar, instrumentar e auditar os eventos de telemetria de produto no F1Atlas, garantindo um catálogo tipado, esquemas validados e conformidade inegociável com leis de privacidade (LGPD/GDPR) através de políticas estritas anti-PII e Consent Mode.

- **Quando acionar:** Na criação de novos eventos de telemetria de navegação, funis de conversão, exploração de estatísticas ou ao auditar a privacidade dos disparos analíticos.
- **Quando NÃO acionar:** Para telemetria veicular física de carros de Fórmula 1 (utilizar `data-integration`) ou logs técnicos de infraestrutura de servidor.

## Pré-condições

- Consultar `AGENTS.md` (Seção 6 — Design, Acessibilidade, Editorial, SEO e Analytics), `docs/specs/engineering/SPEC-AN-001.md` e `docs/analytics/events.catalog.json`.
- **Princípio da Minimização de Dados**: Nunca coletar nem transmitir dados pessoais identificáveis (PII) — proibir envio de e-mails, nomes de usuários, senhas, endereços IP completos ou chaves privadas.
- O Consent Mode deve inicializar obrigatoriamente no estado `denied`.

## Procedimento

1. **Modelagem de Evento no Catálogo Centralizado**:
   - Inspecionar o catálogo oficial `docs/analytics/events.catalog.json`.
   - Adicionar o novo evento definindo:
     - `name`: identificador único em `snake_case` (ex.: `driver_career_compared`).
     - `category`: `essential` (necessário para funcionamento) ou `analytics` (mensuração agregada).
     - `purpose`: justificativa clara e objetiva do valor da métrica para o produto.
     - `allowedProperties`: lista fechada de parâmetros tipados permitidos (`string`, `number`, `boolean`).
2. **Auditoria Preventiva Anti-PII**:
   - Executar o scanner de propriedades proibidas contra termos como `email`, `user`, `ip`, `token`, `password`, `cpf`, `phone`.
   - Executar: `node scripts/analytics/validate-privacy.mjs`.
3. **Validação Estrutural do Catálogo**:
   - Validar sintaxe, versionamento do schema e ausência de nomes duplicados.
   - Executar: `node scripts/analytics/validate-events.mjs`.
4. **Instrumentação Tipada no Código da Aplicação**:
   - Exportar tipos TypeScript a partir do catálogo para consumo no frontend e backend.
   - Integrar com o gerenciador de consentimento: o despacho só ocorre se `consentState === 'granted'`.
5. **Execução da Bateria Automatizada de Testes**:
   - Executar a suíte de testes do contrato de analytics: `npm run test:harness`.
   - Validar que chamadas sem consentimento são sumariamente bloqueadas.
6. **Entrega**:
   - Catálogo atualizado e validado pelo quality gate `verify:analytics`.

## Validação

- Executar a esteira de analytics: `npm run verify:analytics`.
- Executar os testes automatizados do contrato em `scripts/tests/contracts.test.mjs`.
- Comprovar que todo evento novo possui teste cobrindo despacho com consentimento e bloqueio sem consentimento.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Evento disparado sem consentimento | Chamada direta do SDK sem consultar o Consent Manager | Encapsular o despacho na função `trackEvent` que checa o consentimento |
| Scanner reprovando por propriedade sensível | Parâmetro nomeado com termo proibido (ex.: `user_email`) | Remover a propriedade e substituí-la por metadado impessoal (ex.: `account_tier`) |
| Evento rejeitado por ausência de propósito | Campo `purpose` omitido no catálogo JSON | Documentar a utilidade técnica ou analítica do evento no catálogo |
| Nome de evento repetido | Conflito de nomenclatura entre dois fluxos | Utilizar nomes descritivos com prefixo de contexto (ex.: `season_table_filtered`) |

### Limitações
- A validação de catálogo assegura conformidade estática; a verificação em runtime exige testes integrados de eventos.

## Entregáveis

- Catálogo `docs/analytics/events.catalog.json` atualizado e versionado.
- Tipagens geradas para a aplicação.
- Relatório de Auditoria de Telemetria com resultado do gate `verify:analytics`.
