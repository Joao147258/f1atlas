# SEO — Contratos de validação

Até existir `apps/web`, checkers de canonical, sitemap e structured data informam **NÃO APLICÁVEL**. O `scripts/seo/validate-metadata.mjs` suporta um futuro `pages.manifest.json` em `docs/seo` (array `pages` com `path`, `title`, `description`, `canonical`). Validar o manifesto não prova que o HTML real foi emitido corretamente; adicionar testes de integração quando as páginas existirem.
