# SPEC-ARCH-001 — Backend First e limites

**Estado:** proposed
**Tipo:** especificação verificável

## Motivação

Proteger regras do domínio de detalhes de interface, persistência e terceiros.

## Escopo e regras

- Domain não importa frameworks/infra.
- Application coordena casos de uso; Infrastructure implementa adaptações; Presentation consome contratos.

## Critérios de aceitação

- Uma violação concreta de importação externa ao domínio faz o gate falhar quando o código existir.
- Uma aplicação sem tais violações passa nos testes verificáveis.

## Falhas, dependências e riscos

Checker estático inicial é deliberadamente limitado; não valida dependências dinâmicas.

## Evidências requeridas

Testes de casos positivos, negativos e limites quando a implementação existir; registrar versão de fonte normativa e qualquer restrição de uso.
