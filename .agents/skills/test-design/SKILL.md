---
name: test-design
description: Projetar matrizes de testes determinísticos cobrindo cenários positivos, negativos, bordas de regulamento e regressões com fixtures sintéticas.
---

# test-design — Engenharia e Desenho de Testes Determinísticos

## Ativação e propósito

Projetar e implementar matrizes completas de testes automatizados determinísticos, cobrindo regras esportivas nominais, casos-limite de regulamento, regressões de defeitos e cenários negativos, utilizando fixtures sintéticas isoladas.

- **Quando acionar:** No desenvolvimento de novas funcionalidades, regras de campeonato, adaptadores de integração, mappers de persistência ou na correção de bugs reportados.
- **Quando NÃO acionar:** Para validações manuais exploratórias sem automação ou para testes de carga em infraestrutura de produção.

## Pré-condições

- Consultar `AGENTS.md` (Seção 10 — Política de Código e Testes) e as SPECs funcionais correspondentes.
- **Princípio do Determinismo**: Todo teste deve produzir exatamente o mesmo resultado independentemente da máquina, fuso horário, ordem de execução ou conexão com a internet.
- Utilizar primordialmente o test runner nativo do Node.js (`node:test` e `node:assert`).

## Procedimento

1. **Classificação do Nível de Teste**:
   - *Unitário de Domínio*: testes puros de entidades, agregados e regras de pontuação (execução em milissegundos sem I/O).
   - *Caso de Uso / Aplicação*: testes dos fluxos de aplicação com portas e adaptadores simulados via stubs determinísticos.
   - *Integração de Persistência*: testes de repositórios contra banco MySQL de teste temporário e descartável.
   - *Contrato de Governança*: testes de integridade de agentes, skills, links e segurança do harness.
2. **Desenho da Matriz de Casos de Teste (Cenários)**:
   - **Cenário Nominal (Happy Path)**: fluxo esperado com entradas válidas.
   - **Cenários de Borda (Boundary Conditions)**: limites de regulamento (ex.: corrida com exatamente 75% da distância; 10º colocado na pontuação; empate com mesma quantidade de 1º, 2º e 3º lugares).
   - **Cenários Negativos (Unhappy Path)**: entradas malformadas, payloads nulos, tentativas de injeção e violações de regras esportivas.
   - **Cenários de Regressão**: reprodução exata de defeitos reportados anteriormente para garantir que não voltem a ocorrer.
3. **Construção de Fixtures Sintéticas**:
   - Criar objetos de teste claros e autocontidos sem acoplamento a dados externos.
   - Nunca utilizar dados pessoais reais ou credenciais de produção em fixtures.
4. **Implementação das Asserções com `node:assert`**:
   - Utilizar asserções estritas: `assert.strictEqual()`, `assert.deepStrictEqual()`, `assert.rejects()`.
   - Evitar asserções frágeis ou genéricas (ex.: testar apenas se o objeto não é nulo).
5. **Isolamento de Estado e Ciclo de Vida**:
   - Garantir que cada teste limpe seu estado (`beforeEach`, `afterEach`).
   - Evitar variáveis globais compartilhadas ou ordem de execução presumida.
6. **Execução e Medição de Cobertura**:
   - Executar a suíte de testes do harness: `npm run test:harness`.
   - Verificar ausência de testes intermitentes (*flaky tests*).

## Validação

- Executar todos os testes do projeto: `npm run test:harness` e `npm run test:api` (quando aplicável).
- Comprovar 100% de aprovação e tempo de execução total inferior a 5 segundos no harness de governança.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Teste falha intermitentemente (*flaky*) | Dependência de relógio do sistema ou ordem assíncrona | Mockar timestamps estaticamente e isolar promises com `await` |
| Teste de banco falhando em CI | Dependência de banco de dados rodando em `localhost:3306` | Isolar em banco temporário de teste ou emitir SKIP justificado quando ausente |
| Teste aprovando apesar de bug | Asserção testando propriedade errada | Refatorar a asserção para verificar o estado exato e o valor de retorno |
| Falha por vazamento de estado | Teste A modificando dados que o Teste B consome | Resetar variáveis ou fixtures em hook `beforeEach` |

### Limitações
- Testes automatizados validam o código contra as expectativas especificadas; não substituem a revisão humana de requisitos.

## Entregáveis

- Arquivos de teste `*.test.mjs` ou `*.spec.ts` integrados ao repositório.
- Fixtures sintéticas documentadas.
- Relatório de Cobertura e Estratégia de Testes com cenários de borda validados.
