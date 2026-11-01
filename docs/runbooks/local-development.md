# Desenvolvimento local

**Pré-requisito:** Node.js 20+ e npm; o código da aplicação ainda não foi iniciado.

1. Extraia o pacote e execute `npm run verify`.
2. Para configurar variáveis de ambiente locais, copie `.env.example` para `.env` ou `.env.local` (`cp .env.example .env.local`). Consulte `docs/development/environment-variables.md`.
3. Se editar agentes (`.gemini/agents/`) ou skills (`.agents/skills/`), execute `npm run agents:check`.
4. Use `npm run verify:local` para verificações complementares no seu computador.
5. Crie aplicações somente após aprovar SPECs e ADRs pertinentes.

Não coloque credenciais em arquivos públicos nem assuma que o sandbox do Gemini está ativo automaticamente.
