# F1Atlas — Auditoria dos agentes e skills Prisma ORM 7

**Status: proposta de execução futura — não executada nesta tarefa.**

## Missão

Auditar todos os agentes, skills e instruções de governança relacionadas ao Prisma, identificando incompatibilidades técnicas, duplicações, lacunas, referências incorretas e procedimentos inseguros.

Decisão canônica: **Prisma ORM 7 + NestJS + MySQL**.

## Inventário

Inspecionar:

- `.gemini/agents/`
- `.agents/skills/`
- SPECs.
- ADRs.
- Scripts.
- Verificadores.
- Testes.
- `apps/api/`.

Priorizar Prisma Engineer, Backend Engineer, Developer, Test Engineer, Script Developer, Security Auditor, Code Reviewer e Documentation Engineer.

Verificar se as skills especializadas existem antes de utilizá-las.

## Auditoria Prisma 7

Avaliar:

- Dependências.
- Generator.
- Output.
- Datasource.
- Prisma Config.
- Driver adapter.
- NestJS.
- ESM.
- MySQL.
- Migrations.
- Seeding.
- Geração do Client.
- Testes.
- Segurança.
- Documentação.

## Responsabilidades

### Prisma Engineer

Especialista principal em schema, migrations, client, adapter, integração NestJS, constraints, índices e persistência.

### Backend Engineer

Define domínio, invariantes, casos de uso e necessidades de persistência.

### Developer

Coordena implementação funcional integrada.

### Test Engineer

Testa configuração, persistência, migrations e restrições reais.

### Script Developer

Desenvolve e mantém validadores e automações.

### Security Auditor

Verifica segredos, acessos, permissões e operações destrutivas.

### Code Reviewer

Analisa defeitos, regressões, compatibilidade e riscos.

### Documentation Engineer

Preserva contratos e fontes normativas.

## Auditoria das skills

Para cada skill, avaliar:

1. Finalidade.
2. Ativação.
3. Limites.
4. Procedimento.
5. Compatibilidade Prisma 7.
6. Contratos.
7. Segurança.
8. Testabilidade.
9. Documentação.
10. Integração.
11. Redundância.
12. Manutenção.

Não considerar uma skill adequada apenas pela existência de seu arquivo.

## Separação de responsabilidades

- Agentes: especialização e decisão.
- Skills: procedimentos.
- Scripts: validações objetivas.
- SPECs: políticas.
- ADRs: decisões.

Consolidar duplicações mantendo fontes canônicas.

## Testes de instruções

Considerar cenários:

- Configuração Prisma 7.
- Client gerado.
- Adapter MySQL.
- Migration de desenvolvimento.
- Banco indisponível.
- Regressão para Prisma 6.
- Alteração de domínio.
- Operação destrutiva.
- Integração MySQL.
- Referência documental desatualizada.
- Caminhos de monorepo.

Distinguir verificação estática de avaliação prática.

## Refatoração

Preservar conhecimento válido, eliminar inconsistências, melhorar precisão e reduzir redundância.

Não criar agentes adicionais desnecessários.

## Validação

Consultar comandos existentes e executar verificadores pertinentes:

- `npm run agents:check`
- `npm run verify:docs`
- `npm run test:harness`
- `npm run verify:architecture`
- `npm run verify`

Não assumir existência ou resultado dos comandos.

## Restrições

A auditoria de instruções não autoriza modificar a API, schema, dependências, banco, migrations, GitHub ou Hostinger.

## Entrega

Inventário, inconsistências, correções, matriz de responsabilidades, testes, quality gates e pendências.

Estados:

- `PRISMA GOVERNANCE VERIFIED`
- `PRISMA GOVERNANCE PARTIALLY VERIFIED`
- `PRISMA GOVERNANCE FAILED`
