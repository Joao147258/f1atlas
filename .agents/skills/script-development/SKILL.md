---
name: script-development
description: Projetar, implementar e testar ferramentas CLI e verificadores determinísticos em Node.js com contratos padronizados pela SPEC-GOV-003.
---

# script-development

## Ativação e propósito
Criar, refatorar e homologar scripts de automação, ferramentas de linha de comando e verificadores determinísticos no repositório.
- **Quando acionar:** Sempre que uma verificação manual repetitiva puder ser automatizada, ou quando um novo contrato de engenharia (segurança, integridade, arquitetura) exigir enforcement mecânico.
- **Quando NÃO acionar:** Para lógicas de negócio esportivas ou casos de uso da plataforma (devem residir em `packages/domain` ou `apps/api`).

## Pré-condições
- Consultar `docs/specs/governance/SPEC-GOV-003.md`, `docs/development/script-governance.md` e `scripts/lib/workspace.mjs`.
- Reutilizar a infraestrutura de `scripts/lib/workspace.mjs` (`PROJECT_ROOT`, `STATUS`, `reportResult`, `isWithinRoot`).
- Confirmar ausência de dependências externas em `node_modules` (usar exclusivamente runtime nativo Node.js).

## Procedimento
1. **Preparação:** Definir responsabilidade única e nome descritivo do script sob `scripts/<categoria>/` ou `.local/<categoria>/`.
2. **Investigação:** Avaliar se a verificação pode ser atendida por scripts existentes antes de criar novo arquivo.
3. **Decisão:** Definir os contratos de entrada, modo de operação (somente leitura por padrão; mutação via `--write`) e saídas padronizadas.
4. **Execução:**
   - Implementar a função lógica pura exportada, separada da execução de linha de comando (`if (isMain(import.meta.url))`).
   - Adotar convenção de códigos de saída: `0` para PASS/SKIP, `1` para FAIL, `2` para ERROR.
   - Proibir terminantemente a impressão de valores reais de segredos, chaves ou caminhos privados.
5. **Validação:**
   - Criar testes automatizados positivos e adversariais em `scripts/tests/`, utilizando diretórios temporários (`os.tmpdir()`).
   - Executar `npm run test:harness` e comprovar tanto aprovação quanto rejeição esperada.
6. **Entrega:** Integrar o script no orquestrador `run-all.mjs` ou no `package.json`, quando aplicável, e documentar seu uso.

## Validação
- Executar o script diretamente (`node scripts/<categoria>/<nome>.mjs`) verificando código de saída e formato de mensagem.
- Executar `npm run test:harness` para validar testes unitários e de regressão.

## Falhas e limites
- Scripts não devem presumir o diretório de execução atual; devem sempre resolver caminhos relativos à raiz (`PROJECT_ROOT`).
- Nunca usar flags de bypass sem justificativa explícita.
- Respeitar limites de privilégio: não executar comandos com efeitos externos sem autorização.

## Entregáveis
- Arquivo do script executável em `scripts/` ou `.local/`, testes automatizados correspondentes em `scripts/tests/` e registro no `package.json` quando aplicável.
