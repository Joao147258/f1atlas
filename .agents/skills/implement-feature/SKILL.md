---
name: implement-feature
description: Executar a implementação incremental de fatias verticais delimitadas por SPEC, com ordem Backend First, contratos e testes de ponta a ponta.
---

# implement-feature — Implementação Incremental de Fatias Verticais

## Ativação e propósito

Conduzir a implementação técnica completa e verificável de uma fatia vertical de funcionalidade aprovada no roadmap do F1Atlas, respeitando a ordem de raciocínio Backend First, contratos estáveis e testes automatizados.

- **Quando acionar:** Sempre que uma SPEC funcional (domínio, produto ou engenharia) com status `approved` estiver pronta para construção.
- **Quando NÃO acionar:** Para prototipagem exploratória não especificada ou tarefas puramente de manutenção de governança do harness.

## Pré-condições

- Consultar a SPEC correspondente em `docs/specs/`, `AGENTS.md` (Seção 3 — Backend First) e `ARCHITECTURE.md`.
- Seguir a ordem mandatória de raciocínio:
  ```text
  Problema ──> Invariantes/Domínio ──> Casos de Uso/Portas ──> Contratos ──> Adaptadores ──> Apresentação
  ```
- O workspace deve estar limpo e sem conflitos de merge prévios (`git status`).

## Procedimento

1. **Delimitação da Menor Fatia Vertical Verificável**:
   - Isolar o menor incremento completo que entrega valor comprovado (ex.: cálculo e listagem de classificação de uma temporada específica).
   - Rejeitar abordagens horizontais maciças (criar todas as tabelas e DTOs do sistema sem nenhuma rota funcional).
2. **Implementação de Regras de Domínio Puras**:
   - Codificar entidades e regras desportivas em `packages/domain/` sem imports de frameworks.
   - Criar testes unitários demonstrando o comportamento correto das regras e exceções esportivas.
3. **Implementação de Casos de Uso e Portas**:
   - Criar serviços de aplicação orquestrando o fluxo do caso de uso.
   - Definir interfaces de portas (`ports`) para repositórios e clientes externos.
4. **Implementação de Contratos Públicos e DTOs**:
   - Estruturar os esquemas de entrada e saída em `packages/contracts/`.
   - Garantir tipagem forte e validação de schema.
5. **Implementação de Adaptadores de Infraestrutura**:
   - Implementar os repositórios Prisma em `apps/api/` conectando as portas da aplicação ao banco de dados MySQL.
   - Construir controllers HTTP expondo os endpoints da API.
6. **Integração com Apresentação (Frontend)**:
   - Construir ou estender componentes no frontend consumindo os endpoints tipados da API.
   - Tratar os 4 estados de UI (loading, success, empty state e error boundary).
7. **Validação Mecânica Ponta a Ponta**:
   - Executar os testes automatizados da fatia: `npm run test:harness`.
   - Executar a checagem de limites: `npm run verify:architecture`.
   - Executar todos os quality gates: `npm run verify`.

## Validação

- Executar a esteira completa: `npm run verify`.
- Todos os critérios de aceitação listados na SPEC devem possuir testes automatizados comprovando conformidade.
- Submeter a entrega para revisão independente do `code-reviewer`.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Interface definindo regra de negócio | Código React calculando classificação | Migrar o cálculo para o domínio e expor resultado via contrato de API |
| Domínio acoplado ao Prisma | Entidade importando client do banco | Definir interface de repositório na aplicação e mover Prisma para adaptador |
| Fatia incompleta com tela sem dados | Entrega parcial de apresentação sem API | Completar o backend da fatia antes de considerar a funcionalidade entregue |
| Testes quebrando após integração | Conflito de versão ou dependência circular | Isolar contratos em `packages/contracts/` e resolver importações |

### Limitações
- Uma entrega vertical só pode ser marcada como `COMPLETED` se todos os critérios obrigatórios da SPEC estiverem comprovadamente verificados.

## Entregáveis

- Código-fonte da fatia vertical implementado nas camadas corretas (`packages/domain`, `apps/api`, `packages/contracts`, UI).
- Suíte completa de testes automatizados associados à fatia.
- Relatório de Entrega de Funcionalidade conforme `AGENTS.md` (Seção 14).
