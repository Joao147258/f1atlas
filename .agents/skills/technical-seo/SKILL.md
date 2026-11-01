---
name: technical-seo
description: Validar arquitetura de SEO técnico em rotas públicas, metadados semânticos, canonicals HTTPS, sitemaps e structured data.
---

# technical-seo

## Ativação e propósito
Projetar e validar a indexabilidade e estrutura semântica das páginas públicas da plataforma sem comprometer a precisão factual ou a acessibilidade.
- **Quando acionar:** Na criação de novas rotas públicas (temporadas, perfis de pilotos, equipes e histórias), definição de metadados e sitemaps.
- **Quando NÃO acionar:** Para páginas internas de administração, pré-visualizações privadas de conteúdo ou dados de simulação hipotética.

## Pré-condições
- Consultar `docs/specs/engineering/SPEC-SEO-001.md`, `docs/seo/README.md` e `AGENTS.md` (Seção 6).
- Não indexar dados sem licença comercial nem páginas em estado de rascunho (`draft`).

## Procedimento
1. **Preparação:** Mapear a árvore de rotas públicas e a especificação em `docs/specs/engineering/SPEC-SEO-001.md`.
2. **Investigação:**
   - **Metadados:** Título único (até 60 caracteres) e descrição concisa e verdadeira (até 160 caracteres).
   - **URL Canônica:** Presença de URL canônica absoluta com protocolo HTTPS explícito.
   - **Open Graph / Twitter Cards:** Imagens de compartilhamento autorizadas e tags semânticas completas.
   - **Dados Estruturados:** Formatação de JSON-LD (`SportsEvent`, `Person`, `SportsTeam`, `Article`) consistente com o conteúdo exibido.
3. **Decisão:** Identificar rotas que devem conter diretiva `noindex` (ex.: simulações não oficiais, páginas de erro).
4. **Execução:**
   - Executar validadores de SEO:
     - `node scripts/seo/validate-metadata.mjs`
     - `node scripts/seo/validate-canonical.mjs`
     - `node scripts/seo/validate-sitemap.mjs`
     - `node scripts/seo/validate-structured-data.mjs`
5. **Validação:** Analisar os códigos de saída dos scripts; registrar `SKIP` se a aplicação frontend ainda não estiver implantada.
6. **Entrega:** Manifesto de páginas validado e estruturado para publicação em produção.

## Validação
- Executar `npm run verify:seo` e verificar aprovação dos contratos determinísticos.
- Testar fixtures em `scripts/tests/contracts.test.mjs` comprovando rejeição de URLs canônicas inválidas.

## Falhas e limites
- Não manipular metadados ou criar páginas duplicadas com o único intuito de manipular mecanismos de busca.
- A aprovação sintática do manifesto de páginas não garante indexação pelos robôs de busca externos.

## Entregáveis
- Manifesto de SEO validado, templates de metadados por tipo de página e laudo de verificação do gate `verify:seo`.
