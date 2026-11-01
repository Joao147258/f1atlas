# SPEC-GOV-005 — Quality gates e aprovações

**Estado:** proposed
**Tipo:** especificação verificável

## Motivação

Garantir controle evolutivo sem gates fictícios.

## Escopo e regras

- Gates públicos reproduzíveis no clone limpo.
- Gates de aplicação inexistente devem declarar N/A.

## Critérios de aceitação

- `npm run verify` roda checks e testes com código de saída coerente.
- CI utiliza mesmas verificações públicas do ambiente local.

## Falhas, dependências e riscos

CI não tem acesso a `.local/`; controles críticos não podem depender dela.

## Evidências requeridas

Testes de casos positivos, negativos e limites quando a implementação existir; registrar versão de fonte normativa e qualquer restrição de uso.
