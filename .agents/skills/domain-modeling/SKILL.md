---
name: domain-modeling
description: Modelar entidades, invariantes temporais, participações e integridade de resultados esportivos independentes de persistência.
---

# domain-modeling

## Ativação e propósito
Especificar e estruturar as entidades fundamentais do automobilismo, suas relações ao longo do tempo e seus invariantes desportivos.
- **Quando acionar:** Durante a modelagem de participantes, temporadas, etapas, sessões, inscrições e vínculos históricos entre pilotos e equipes.
- **Quando NÃO acionar:** Para mapeamento de esquemas relacionais de banco (ORM) ou desenho de DTOs de transporte HTTP (utilizar `api-contracts`).

## Pré-condições
- Consultar `docs/specs/domain/SPEC-DOM-001.md`, `docs/specs/domain/SPEC-DOM-002.md`, `docs/architecture/domain-model.md` e `AGENTS.md` (Seção 4).
- Compreender a regra da temporalidade: vínculos piloto-equipe pertencem a temporadas/períodos, nunca a cadastros permanentes.

## Procedimento
1. **Preparação:** Definir os agregados e entidades puras em `packages/domain` (TypeScript puro sem bibliotecas externas).
2. **Investigação:**
   - Separar identidade histórica de equipe de nomes comerciais circunstanciais de temporada.
   - Tratar a hierarquia desportiva: `Temporada → Grande Prêmio (Etapa) → Sessão → Inscrição → Resultado`.
3. **Decisão:** Aplicar invariantes essenciais:
   - Um resultado esportivo não pode existir sem referência a uma inscrição válida.
   - Sessões sem resultado devem ser distinguidas de abandono (DNF) e de pontuação zero.
   - Estados de resultados (`provisório`, `oficial`, `corrigido`, `desconhecido`) são explícitos e não intercambiáveis.
4. **Execução:** Escrever entidades, value objects e interfaces de repositório (ports) sem acoplamento a banco de dados.
5. **Validação:** Criar testes unitários puros com fixtures sintéticas validando criação, mutação de estado e invariantes.
6. **Entrega:** Pacote de domínio testado e documentado, pronto para ser consumido por casos de uso na camada de aplicação.

## Validação
- Executar os testes unitários do domínio via Node.js test runner (`npm run test:harness`).
- Executar `npm run verify:architecture` para assegurar que nenhuma dependência externa vazou para o domínio.

## Falhas e limites
- O domínio não deve conter SQL, decorators de ORM ou bibliotecas web.
- Não inventar regras de campeonato sem suporte nos regulamentos oficiais da temporada aplicável.

## Entregáveis
- Definição de entidades e value objects em `packages/domain`, invariantes codificados e testes unitários comprobatórios.
