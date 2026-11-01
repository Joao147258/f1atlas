---
name: implement-feature
description: Executar a implementação incremental de fatias verticais delimitadas por SPEC, com ordem Backend First, contratos e testes de ponta a ponta.
---

# implement-feature

## Ativação e propósito
Conduzir a implementação técnica completa de uma fatia vertical de funcionalidade aprovada no roadmap do produto.
- **Quando acionar:** Sempre que uma SPEC de funcionalidade (produto, domínio ou engenharia) for aprovada para construção.
- **Quando NÃO acionar:** Para prototipagem exploratória sem limites definidos ou para tarefas puramente operacionais de governança do harness.

## Pré-condições
- Consultar a SPEC aplicável (ex.: `docs/specs/product/SPEC-PROD-001.md`), `AGENTS.md` (Seção 3 e 9) e `ARCHITECTURE.md`.
- Seguir a ordem de raciocínio obrigatória: **Problema → Regras/Invariantes → Casos de Uso → Contratos → Persistência/Adapters → Apresentação**.

## Procedimento
1. **Preparação:** Isolar a menor fatia vertical verificável (ex.: `temporada 2025 → etapa → resultado → classificação → narrativa`).
2. **Investigação:** Conferir arquivos existentes, dependências e ausência de acoplamento indevido.
3. **Decisão:** Planejar as alterações sem antecipar abstrações desnecessárias; reutilizar contratos e skills existentes.
4. **Execução:**
   - Implementar regras de domínio puras em `packages/domain` com testes unitários.
   - Implementar contratos de API em `packages/contracts` ou casos de uso na camada de aplicação.
   - Implementar adaptadores de persistência ou integração desacoplados.
   - Integrar componentes de apresentação consumindo os contratos.
5. **Validação:**
   - Executar os testes automatizados da fatia (`npm run test:harness`).
   - Executar o conjunto completo de quality gates (`npm run verify`).
   - Inspecionar o diff Git garantindo ausência de arquivos privados e segredos.
6. **Entrega:** Submeter a fatia implementada para revisão independente do agente `code-reviewer`.

## Validação
- Executar `npm run verify` e comprovar aprovação de todos os gates aplicáveis sem quebra de integridade.
- Todos os critérios de aceitação descritos na SPEC devem possuir evidências verificáveis de conclusão.

## Falhas e limites
- Não declarar entrega como concluída (`COMPLETED`) caso critérios obrigatórios permaneçam sem verificação.
- Não introduzir microsserviços, múltiplos bancos ou bibliotecas não justificadas na SPEC.

## Entregáveis
- Código-fonte da fatia vertical integrado, suíte de testes correspondente, documentação atualizada e relatório de entrega conforme `AGENTS.md` (Seção 14).
