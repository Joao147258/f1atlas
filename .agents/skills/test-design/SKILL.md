---
name: test-design
description: Projetar matrizes de testes determinísticos cobrindo cenários positivos, negativos, bordas de regulamento e regressões com fixtures sintéticas.
---

# test-design

## Ativação e propósito
Conceber estratégias de testes automatizados, desenhar casos de borda e preparar fixtures sintéticas determinísticas para validação de regras de domínio e automações.
- **Quando acionar:** Antes ou durante a implementação de novas regras desportivas, contratos de API, verificadores de harness ou correções de bugs.
- **Quando NÃO acionar:** Para testes de interface manuais ad-hoc sem metodologia ou para benchmarking de infraestrutura prematura.

## Pré-condições
- Consultar `AGENTS.md` (Seção 10), `docs/development/script-governance.md`, `SPEC-GOV-003.md` e as SPECs da funcionalidade sob teste.
- Isolar fixtures sintéticas em diretórios temporários (`os.tmpdir()`) com limpeza automática em bloco `finally`.

## Procedimento
1. **Preparação:** Mapear a especificação do componente sob teste e elencar os invariantes obrigatórios.
2. **Investigação:**
   - **Casos Positivos (Happy Path):** Entradas válidas que produzem os resultados esperados.
   - **Casos Negativos (Error Handling):** Entradas inválidas, corrompidas ou incompletas que devem falhar com erros claros.
   - **Casos de Borda (Edge Cases):** Empates em pontuação, provas canceladas, bandeira vermelha, abandono duplo, limites de array e symlinks.
   - **Casos Adversariais:** Inserção de credenciais sintéticas, path traversal (`../`), payloads de tamanho excessivo.
3. **Decisão:** Determinar o nível do teste (unitário puro no domínio, integração de contrato ou teste de script CLI).
4. **Execução:**
   - Escrever os testes utilizando o runner nativo do Node.js (`node:test` e `node:assert/strict`).
   - Gerar strings sintéticas sensíveis dinamicamente para evitar falsos positivos nos scanners do workspace.
5. **Validação:**
   - Executar os testes via `npm run test:harness`.
   - Garantir que o teste comprove tanto o sucesso nominal quanto a reprovação de violações.
6. **Entrega:** Suíte de testes integrada e executável de forma reprodutiva em clone limpo ou CI.

## Validação
- Executar `npm run test:harness` e conferir que todos os testes passem com 100% de sucesso sem timeouts ou dependências de rede.

## Falhas e limites
- Não criar mocks tautológicos que apenas confirmem a implementação interna sem testar o comportamento real.
- Não alterar as asserções de um teste para forçar aprovação sem corrigir o defeito raiz.

## Entregáveis
- Arquivo de testes em `scripts/tests/*.test.mjs` ou no pacote correspondente, fixtures sintéticas e relatório de cobertura de cenários.
