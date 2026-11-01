---
name: analytics-instrumentation
description: Projetar, instrumentar e validar eventos analíticos com catálogo tipado, minimização de dados e privacidade estrita (sem PII).
---

# analytics-instrumentation

## Ativação e propósito
Definir o catálogo de eventos de produto, especificar propriedades permitidas e auditar a instrumentação analítica quanto à privacidade e conformidade técnica.
- **Quando acionar:** Ao desenhar novos eventos de navegação, funil de exploração, interações com o simulador ou ao alterar a política de telemetria.
- **Quando NÃO acionar:** Para telemetria de carros de corrida (F1) ou para logs de depuração técnica de infraestrutura.

## Pré-condições
- Consultar `docs/specs/engineering/SPEC-AN-001.md`, `docs/analytics/events.catalog.json` e `AGENTS.md` (Seção 6).
- Respeitar o princípio de minimização de dados: proibir envio de e-mails, senhas, IPs explícitos, tokens ou dados pessoais identificáveis (PII).

## Procedimento
1. **Preparação:** Inspecionar o catálogo oficial `docs/analytics/events.catalog.json`.
2. **Investigação:**
   - Conferir se o evento proposto já existe ou se pode ser atendido por evento genérico existente.
   - Analisar o propósito (`purpose`) do evento (deve ter descrição clara de utilidade para o produto).
   - Verificar a categoria de consentimento aplicável: `essential` (estritamente necessário para o funcionamento) ou `analytics` (mensuração de uso agregada).
3. **Decisão:** Avaliar as propriedades do evento contra a lista de termos proibidos (PII, tokens, chaves, dados sensíveis).
4. **Execução:**
   - Adicionar o evento ao catálogo JSON versionado.
   - Implementar o disparo tipado no código de frontend ou backend.
5. **Validação:**
   - Executar o validador estático de catálogo: `node scripts/analytics/validate-events.mjs`.
   - Executar a checagem de privacidade: `node scripts/analytics/validate-privacy.mjs`.
   - Executar os testes automatizados via `npm run test:harness`.
6. **Entrega:** Catálogo de eventos atualizado e aprovado no gate `verify:analytics`.

## Validação
- Executar `npm run verify:analytics` com código de saída `0`.
- Comprovar que o catálogo rejeita nomes duplicados, propriedades sensíveis e eventos sem propósito claro.

## Falhas e limites
- Um catálogo válido atesta conformidade do esquema, mas não comprova que os eventos estão sendo disparados corretamente em produção (requer testes de integração futuros).
- Nunca coletar dados que violem legislações de privacidade (LGPD/GDPR).

## Entregáveis
- Catálogo `events.catalog.json` atualizado, tipagem de eventos para a aplicação e laudo de conformidade de privacidade.
