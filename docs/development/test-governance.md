# Governança de Testes Automatizados e Quality Gates

> **Arquivo:** `docs/development/test-governance.md`  
> **Escopo:** Diretrizes normativas para testes automatizados, medição de cobertura, mutation testing e qualidade de testes no F1Atlas.  
> **Status:** Ativo  
> **Verificadores:** `scripts/quality/verify-test-quality.mjs`, `scripts/quality/verify-test-coverage.mjs`, `scripts/quality/verify-mutation-quality.mjs`.

---

## 1. Princípio Fundamental

> **Um teste só possui valor quando verifica um comportamento relevante e consegue identificar violações desse comportamento.**

No F1Atlas, testes automatizados não são meras formalidades para inflar números de cobertura. A existência de testes superficiais, artificiais ou frágeis é tratada como débito técnico e violação de qualidade.

A aprovação de qualquer código novo ou refatorado exige:
1. Comportamento claramente especificado.
2. Testes cobrindo fluxos felizes, cenários de exceção, valores de borda e invariantes de domínio.
3. Assertividade verificável (capacidade comprovada de falhar quando um defeito for introduzido).
4. Determinismo e isolamento completo sem efeitos colaterais.

---

## 2. Níveis de Teste e Pirâmide de Qualidade

```text
       ▲
      / \     E2E / Fluxos Críticos
     /---\    (Apps Web & API, contratos ponta a ponta)
    /     \   Testes de Integração
   /-------\  (Persistência, adapters externos, controllers)
  /         \ Testes Unitários de Domínio
 /-----------\ (packages/domain — 100% isolados de I/O e frameworks)
```

| Nível | Localização | Foco | Restrições |
|---|---|---|---|
| **Unitário de Domínio** | `packages/domain/test/` | Regras de negócio, agregados, invariantes, tipos de erro, cálculos e entidades esportivas. | Proibido I/O de rede, banco de dados ou frameworks externos. Execução ultrarrápida em memória. |
| **Integração de Infraestrutura** | `apps/api/test/integration/` ou `scripts/tests/` | Adapters Prisma/MariaDB, serializadores, webhooks, validações e mensageria. | Banco isolado ou transacional; limpeza após cada execução. |
| **Contratos e Governança** | `scripts/tests/` | Scripts de build, verificadores de segurança, analisadores estáticos e contratos de SPECs. | Determinísticos, com cenários de aceitação e rejeição de dados hostis. |
| **Ponta a Ponta (E2E)** | `apps/web/test/e2e/`, `apps/api/test/e2e/` | Jornadas críticas do usuário, navegação, respostas HTTP e integrações de funil. | Ambientes isolados com dados sintéticos reproduzíveis. |

---

## 3. Matriz Obrigatória de Cenários por Componente

Todo componente implementado na camada Domain (`packages/domain`) deve cobrir obrigatoriamente:

| Categoria | Descrição | Exemplo em `DomainError` |
|---|---|---|
| **Cenários Positivos (Happy Path)** | Execução esperada com entradas válidas. | Instanciação com código e mensagem válidos, anexação de contexto esportivo. |
| **Cenários Negativos (Unhappy Path)** | Tratamento adequado e previsível de entradas inválidas ou falhas de invariantes. | Entrada de valores nulos, objetos incompletos ou erros genéricos do runtime no `isDomainError`. |
| **Cenários de Borda (Boundary Conditions)** | Valores extremos, strings vazias, caracteres especiais, coleções vazias. | Objeto de erro com sufixo ou formato ligeiramente fora da convenção. |
| **Invariantes e Imutabilidade** | Salvaguardas estruturais contra mutação indevida de estado compartilhado. | Congelamento de instância (`Object.isFrozen`), isolamento de contexto contra mutações retroativas. |
| **Determinismo e Idempotência** | Execuções repetidas devem gerar idênticos resultados sem degradação. | Verificação de tipo e serialização consistentes em múltiplas chamadas consecutivas. |

---

## 4. Thresholds de Cobertura de Código

A medição de cobertura de código do F1Atlas é executada nativamente pelo Node.js (`node --experimental-test-coverage`).

Para código novo na camada Domain (`packages/domain`), os thresholds mínimos mandatórios são:

| Métrica | Limite Mínimo | Script Verificador |
|---|---|---|
| **Linhas (`lines`)** | **>= 90.0%** | `scripts/quality/verify-test-coverage.mjs` |
| **Branches (`branches`)** | **>= 85.0%** | `scripts/quality/verify-test-coverage.mjs` |
| **Funções (`functions`)** | **>= 90.0%** | `scripts/quality/verify-test-coverage.mjs` |

> [!WARNING]
> Cobertura quantitativa alta é uma **condição necessária, mas não suficiente**. Uma suíte pode ter 100% de cobertura de linhas e ainda assim ser inútil se não contiver asserções rigorosas ou não detectar alterações de comportamento.

---

## 5. Eficácia de Detecção de Defeitos (Mutation Testing)

Para certificar que os testes realmente testam o código e não apenas o executam, o F1Atlas utiliza testes de mutação semântica (*mutation testing*).

### Regra do Mutation Score
- **Mínimo exigido:** **>= 80.0%** de mutantes eliminados (*killed*).
- **Meta recomendada para o Domínio:** **100.0%**.

### Operadores de Mutação Auditados:
1. **Inversão de Lógica Condicional:** Inversão de operadores relacionais (`===`, `!==`, `>`, `<`) e condicionais (`if (cond)` -> `if (!cond)`).
2. **Predicados de Tipo (Type Guards):** Inversão de retornos booleanos de detecção estrutural.
3. **Quebra de Imutabilidade:** Remoção de `Object.freeze` e salvaguardas de isolamento defensivo.
4. **Corrupção de Retorno:** Alteração de argumentos em factories ou valores de saída de funções puras.
5. **Preservação de Herança:** Subsituição forçada de classes filhas por genéricas.

---

## 6. Antifrágilidade e Verificação de Qualidade dos Testes

O script `scripts/quality/verify-test-quality.mjs` inspeciona estaticamente todas as suítes de teste para detectar práticas nocivas:

1. **Suítes Vazias:** Arquivos de teste com 0 bytes ou apenas comentários são reprovados.
2. **Ausência de Blocos Executáveis:** Arquivos sem chamadas a `test(...)` ou `it(...)` são bloqueados.
3. **Testes Sem Asserções:** Testes que não invocam `assert.*` ou `expect(` são sumariamente reprovados como testes superficiais.
4. **Skips Não Justificados:** O uso de `test.skip` ou `test.todo` exige comentário explicativo imediato apontando o motivo ou issue/milestone de desbloqueio.
5. **Mascaramento de Falhas:** Blocos `catch {}` vazios que capturam exceções sem validá-las são bloqueados.

---

## 7. Comandos Oficiais da Governança de Testes

| Comando | Descrição |
|---|---|
| `npm run test:domain` | Executa todos os testes unitários da camada Domain (`packages/domain/test/**/*.test.ts`). |
| `npm run test:coverage` | Executa testes do domínio com cobertura e validação dos thresholds mínimos. |
| `npm run test:quality` | Audita integridade estrutural, asserções e ausência de práticas frágeis nos testes. |
| `npm run test:mutation` | Executa a esteira de mutation testing nos componentes de produção críticos. |
| `npm run verify:tests` | Executa o trio completo de quality gates de testes (`quality` + `coverage` + `mutation`). |
| `npm run test:harness` | Executa testes automatizados das ferramentas de governança em `scripts/tests/`. |
| `npm run verify` | Orquestrador central que engloba todos os gates públicos, incluindo testes e cobertura. |

---

## 8. Regras Contra Adulteração e Burla de Gates (Anti-Tampering)

1. **Imutabilidade de Thresholds:** É terminantemente proibido reduzir os percentuais de cobertura ou mutation score no código dos verificadores para fazer um teste insuficiente passar.
2. **Proibição de Alteração Oportunista de Produção:** É proibido modificar código de produção exclusivamente para acomodar uma deficiência de teste ou silenciar um mutant legítimo sem justificativa esportiva/arquitetural.
3. **Isolamento de Mutação:** O motor de testes de mutação deve restaurar incondicionalmente o arquivo de produção em bloco `finally`, garantindo que nenhuma alteração permaneça em caso de erro.
4. **Transparência de SKIP:** Verificadores não aplicáveis devem relatar explicitamente o estado `SKIP`, nunca reportar falso `PASS`.

---

## 9. Papéis dos Agentes Especializados

| Agente | Responsabilidade na Governança de Testes |
|---|---|
| **Developer (`@f1atlas-developer`)** | Implementa funcionalidades acompanhadas de testes unitários que respeitem os thresholds de cobertura e cenários de borda. |
| **Test Engineer (`@f1atlas-test-engineer`)** | Projeta planos de teste, cataloga cenários positivos/negativos/fronteira, projeta operadores de mutação e audita estabilidade. |
| **Code Reviewer (`@f1atlas-code-reviewer`)** | Audita se a entrega possui testes reais com asserções válidas, executa `npm run verify:tests` e reprova testes frágeis. |
| **Documentation Engineer (`@f1atlas-documentation-engineer`)** | Mantém atualizados os painéis de status de teste, a rastreabilidade entre requisitos esportivos e as evidências de teste. |
