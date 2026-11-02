---
name: technical-seo
description: Validar arquitetura de SEO técnico em rotas públicas, metadados semânticos, canonicals HTTPS, sitemaps e structured data.
---

# technical-seo — Engenharia de SEO Técnico e Indexação de Conteúdo

## Ativação e propósito

Validar, auditar e certificar a infraestrutura técnica de SEO e descoberta pública no F1Atlas, garantindo que páginas de Grandes Prêmios, perfis de pilotos, equipes e crônicas editoriais emitam metadados semânticos válidos, URLs canônicas seguras e dados estruturados compatíveis com Schema.org.

- **Quando acionar:** Antes da publicação de novas rotas públicas, na alteração de esquemas JSON-LD, na reestruturação de URLs canônicas ou durante a execução de auditorias da esteira `verify:seo`.
- **Quando NÃO acionar:** Para redação de copys editoriais (utilizar `editorial-research`) ou para otimizações de ranking artificiais não respaldadas em conteúdo real.

## Pré-condições

- Consultar `AGENTS.md` (Seção 6 — Design, Acessibilidade, Editorial, SEO e Analytics) e os verificadores em `scripts/seo/`.
- Conhecimento da proibição estrita de *Black Hat* ou promessas infundadas de posicionamento (#1 no Google).
- O site público deve utilizar estritamente o protocolo **HTTPS** para todas as referências canônicas.

## Procedimento

1. **Auditoria de Metadados Semânticos de Página**:
   - Inspecionar a tag `<title>`: deve ter entre 30 e 60 caracteres, ser única e descritiva.
   - Inspecionar a meta tag `description`: deve ter entre 70 e 160 caracteres, comunicando o resumo da página sem truncagem.
   - Conferir tags OpenGraph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`) e Twitter Cards (`twitter:card`).
   - Executar: `node scripts/seo/validate-metadata.mjs`.
2. **Auditoria de Canonicidade de URLs**:
   - Garantir que cada rota pública declare tag `<link rel="canonical" href="https://...">`.
   - Rejeitar URLs canônicas com protocolo HTTP ou domínio incorreto.
   - Aplicar padrão determinístico e consistente de trailing slash (com ou sem barra final, sem duplicidade).
   - Executar: `node scripts/seo/validate-canonical.mjs`.
3. **Auditoria de Dados Estruturados (Schema.org / JSON-LD)**:
   - Validar sintaxe e propriedades obrigatórias de cada schema injetado via `<script type="application/ld+json">`:
     - `SportsEvent`: etapas de Grande Prêmio com data UTC, local e participantes.
     - `SportsTeam`: construtores e equipes históricas com nome e fundação.
     - `Person`: pilotos com nome, nacionalidade e histórico.
     - `Article`: capítulos de crônicas editoriais com autor, data e fontes.
     - `BreadcrumbList`: trilha de navegação contextual.
   - Executar: `node scripts/seo/validate-structured-data.mjs`.
4. **Auditoria de Rastreabilidade e Sitemaps**:
   - Conferir a integridade de `sitemap.xml`, garantindo que todas as páginas públicas canônicas estejam listadas.
   - Auditar `robots.txt` garantindo que rotas administrativas ou privadas recebam diretiva `Disallow`.
   - Executar: `node scripts/seo/validate-sitemap.mjs`.
5. **Execução Consolidada do Gate de SEO**:
   - Rodar a esteira completa: `npm run verify:seo`.

## Validação

- Executar `npm run verify:seo` e comprovar aprovação unânime de todos os verificadores com código `0`.
- Validar conformidade estrutural dos schemas JSON-LD contra as especificações oficiais do Schema.org.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| URL canônica sem HTTPS rejeitada | Tag gerada com `http://` em ambiente de build | Forçar protocolo seguro `https://` na montagem da URL base |
| Título da página muito curto (< 30 chars) | Título genérico (ex.: "F1Atlas") | Enriquecer o título com contexto: "GP de São Paulo 2025 — Resultados e Histórico \| F1Atlas" |
| Schema JSON-LD com sintaxe inválida | Chave JSON faltando vírgula ou objeto malformado | Validar com `JSON.parse()` e alinhar aos tipos do schema.org |
| Página privada incluída no sitemap | Rota interna de desenvolvimento exportada no sitemap | Filtrar rotas privadas e manter apenas URLs públicas e homologadas |

### Limitações
- A conformidade técnica de SEO garante indexabilidade impecável por motores de busca; não garante posição ou tráfego.

## Entregáveis

- Configuração de metadados semânticos e dados estruturados JSON-LD integrados.
- Arquivos `sitemap.xml` e `robots.txt` validados.
- Relatório de Auditoria Técnica de SEO com código de saída do gate `verify:seo`.
