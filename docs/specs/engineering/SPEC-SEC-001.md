# SPEC-SEC-001 — Segurança do desenvolvimento

**Estado:** proposed
**Tipo:** especificação verificável

## Motivação

Prevenir vazamentos de arquivos, credenciais e ações destrutivas.

## Escopo e regras

- Segredos e arquivos locais não entram no repositório.
- Scanners versionados e defesa local complementar.
- Comandos com efeitos externos requerem autorização.

## Critérios de aceitação

- Fixture sintética com credencial gera falha sem imprimir o valor.
- Arquivo .env não aparece no conjunto versionável; commit indevido é detectado.

## Falhas, dependências e riscos

Nenhum scanner garante ausência de todos os segredos.

## Evidências requeridas

Testes de casos positivos, negativos e limites quando a implementação existir; registrar versão de fonte normativa e qualquer restrição de uso.
