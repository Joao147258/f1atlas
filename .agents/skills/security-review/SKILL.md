---
name: security-review
description: Investigar riscos de exposição de segredos, arquivos privados, vulnerabilidades de dependências, symlinks e integridade de publicação.
---

# security-review — Auditoria de Segurança e Prevenção de Vazamento

## Ativação e propósito

Executar varredura estática, auditoria de credenciais, inspeção de links simbólicos e análise de superfície de ataque no repositório do F1Atlas, garantindo que nenhum segredo, arquivo privado ou vulnerabilidade conhecida seja publicado em repositório aberto.

- **Quando acionar:** Antes de qualquer commit ou push, ao alterar variáveis de ambiente, ao introduzir pacotes externos em `package.json` ou ao conectar serviços da Hostinger.
- **Quando NÃO acionar:** Para validação de contratos de API ou regras puras de pontuação sem risco de vazamento ou execução de código não confiável.

## Pré-condições

- Consultar `AGENTS.md` (Seção 12 — Segurança e Limites Públicos de Operação) e `docs/specs/engineering/SPEC-SEC-001.md`.
- Conhecimento da proibição absoluta de versionar credenciais reais, arquivos `.env*` privados ou diretórios `.local/`.
- Operação em modo **somente leitura**: a auditoria diagnostica e reporta sem alterar arquivos de produção sem autorização.

## Procedimento

1. **Varredura de Arquivos Potencialmente Sensíveis**:
   - Inspecionar a árvore do projeto e o Git staging contra arquivos confidenciais:
     - `.env`, `.env.local`, `.env.production`
     - Certificados e chaves (`.pem`, `.key`, `.p12`)
     - Dumps de banco de dados (`.sql` brutos contendo dados de produção)
     - Arquivos e relatórios de ambiente local (`.local/`, `GEMINI.md`)
   - Executar: `node scripts/security/check-sensitive-files.mjs`.
2. **Scanner de Segredos e Padrões de Alta Precisão**:
   - Varrer o código contra expressões de entropia e assinaturas de segredos conhecidos (tokens GitHub, credenciais AWS, senhas de conexão MySQL, chaves de API).
   - Executar: `node scripts/security/check-secrets.mjs`.
3. **Auditoria de Links Simbólicos (Anti-Path Traversal)**:
   - Inspecionar todos os symlinks no workspace garantindo que seus alvos residam estritamente dentro da raiz do projeto (`isWithinRoot`).
   - Executar: `node scripts/security/check-symlinks.mjs`.
4. **Governança de Variáveis de Ambiente e Publicação**:
   - Auditar o arquivo `.env.example`: deve conter apenas chaves públicas com valores em branco ou fictícios.
   - Auditar variáveis com prefixo `NEXT_PUBLIC_`: confirmar que nenhuma credencial confidencial é exposta no bundle do cliente.
   - Executar: `node scripts/security/validate-env.mjs` e `node scripts/security/verify-publication-scope.mjs`.
5. **Auditoria de Dependências de Terceiros**:
   - Analisar o manifesto de dependências em `package.json` contra vulnerabilidades conhecidas: `node scripts/security/verify-dependencies.mjs`.
6. **Sanitização Obrigatória de Relatórios**:
   - Em caso de achado de credencial, mascarar o valor (`***`) e reportar apenas o caminho relativo do arquivo, número da linha e severidade.

## Validação

- Executar a suíte completa de segurança: `npm run verify:security`.
- Em ambiente de desenvolvimento local, executar: `npm run verify:local`.
- Comprovar que todos os verificadores retornam código `0` com status `OK`.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Arquivo `.env` real detectado no staging | `git add .` acidental incluindo arquivo privado | Executar `git restore --staged <arquivo>` e adicionar ao `.gitignore` |
| Scanner de segredos detectando falso positivo | String aleatória em teste assemelhando-se a token | Substituir o valor sintético por padrão neutro explícito (ex.: `dummy-token-for-test`) |
| Symlink malicioso escapando da raiz | Link relativo apontando para fora do workspace (`../`) | Remover o symlink ou apontar para destino estritamente interno ao projeto |
| Variável secreta com prefixo `NEXT_PUBLIC_` | Erro de nomenclatura expondo credencial na web | Renomear a variável removendo o prefixo `NEXT_PUBLIC_` para uso restrito ao servidor |

### Limitações
- Scanners estáticos identificam padrões conhecidos; a auditoria não substitui práticas seguras de desenvolvimento e rotação periódica de chaves.

## Entregáveis

- Laudo de Auditoria de Segurança com código de saída do gate `verify:security`.
- Lista de verificadores executados e achados sanitizados (com valores ocultados).
- Estado: `SECURITY VERIFIED` ou `VULNERABILITY DETECTED`.
