# SPEC-DOM-003 — Pontuação e classificações

**Estado:** proposed
**Tipo:** especificação verificável

## Motivação

Pontuação e desempates variam por regulamento e contexto.

## Escopo e regras

- Motor determinístico isolado de apresentação, ORM e provedor.
- Regras e contextos separados por temporada/tipo de sessão/condição.

## Critérios de aceitação

- Fixtures demonstram cálculo correto em cenários relevantes.
- Simulação não altera snapshots oficiais.
- Alteração de versão de regra não corrige o passado silenciosamente.

## Falhas, dependências e riscos

Regras 2025–2027 e alterações oficiais ainda serão especificadas com fontes.

## Evidências requeridas

Testes de casos positivos, negativos e limites quando a implementação existir; registrar versão de fonte normativa e qualquer restrição de uso.
