---
name: data-integration
description: Integrar fontes de dados externas autorizadas com normalização, proveniência, resolução de identidades e isolamento via adaptadores.
---

# data-integration

## Ativação e propósito
Conduzir a ingestão, validação de esquemas externos, normalização e resolução de identidade de dados provenientes de APIs de terceiros.
- **Quando acionar:** Ao desenhar ou implementar adaptadores de integração com provedores de dados esportivos (ex.: OpenF1, Jolpica).
- **Quando NÃO acionar:** Antes da aprovação formal de licenciamento e direitos de uso da fonte externa (ver `SPEC-DATA-001.md`).

## Pré-condições
- Consultar `docs/specs/product/SPEC-DATA-001.md`, `docs/architecture/integration-strategy.md` e `AGENTS.md` (Seção 5).
- Confirmar que a fonte possui licença comercial/redistribuição compatível com o produto.
- Tratar dados externos como **entradas não confiáveis por padrão**.

## Procedimento
1. **Preparação:** Isolar a integração na camada `Infrastructure` através de portas e adaptadores (`ports & adapters`).
2. **Investigação:**
   - Analisar o formato de payload do provedor externo.
   - Avaliar limites de taxa de requisições (`rate limits`), latência e custos operacionais.
3. **Decisão:** Mapear identificadores externos (IDs de fornecedores) para identidades internas do domínio em tabela de mapeamento temporal.
4. **Execução:**
   - Implementar validação estrita de esquema na recepção do payload.
   - Normalizar nomes, datas UTC e unidades desportivas.
   - Registrar proveniência (origem, data de coleta e versão da revisão).
5. **Validação:**
   - Testar adaptadores com fixtures sintéticas reproduzindo payloads reais, payloads incompletos e erros de rede.
   - Assegurar que uma falha de importação nunca corrompa dados existentes nem transforme dados provisórios em oficiais.
6. **Entrega:** Adaptador de integração testado e encapsulado, expondo interfaces internas limpas para a camada de aplicação.

## Validação
- Executar testes de integração com fixtures sintéticas offline via `npm run test:harness`.
- Validar que credenciais de API externas nunca sejam expostas em código, commits ou logs (`npm run verify:security`).

## Falhas e limites
- Não conectar APIs reais em ambiente de CI público.
- Não assumir que uma API pública gratuita concede autorização para republicação comercial de dados.

## Entregáveis
- Adaptador de integração em camada de infraestrutura, rotinas de normalização e resolução de identidade, e testes de resiliência.
