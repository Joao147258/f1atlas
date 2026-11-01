# F1Atlas — Contexto local do Gemini CLI

@./AGENTS.md
@./ARCHITECTURE.md
@./DESIGN.md

## Uso do executor

- Consulte as especificações em `docs/specs/` e as políticas em `docs/development/` antes de executar alterações.
- Especialistas canônicos: `.gemini/agents/`. Skills em `.agents/skills/`.
- Antes de modificar ferramentas de governança, execute `npm run verify`; depois, execute novamente e documente a diferença.
- Não registre aqui segredos ou dados de trabalho. Configurações específicas e credenciais só podem existir nos arquivos locais adequados.
- Scripts locais e hooks são complementares; gates públicos devem funcionar em clone limpo.
- Ajustes do ambiente podem ser incluídos aqui, mas `GEMINI.md` não pode ser enviado ao Git.
