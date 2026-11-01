# Quality gates

| Gate | Validação | Estado inicial |
|---|---|---|
| QG-01 | Documentação/referências/SPECs | Ativo |
| QG-02 | Agentes, skills e sincronização | Ativo |
| QG-03 | Scripts e testes de governança | Ativo |
| QG-04 | Segredos, arquivos e publicação | Ativo |
| QG-05 | Dependências e limites arquiteturais | Parcial: sem apps |
| QG-06 | Typecheck e lint da aplicação | N/A até existir aplicação |
| QG-07 | Testes da aplicação | N/A até existir aplicação |
| QG-08 | Build e contratos da aplicação | N/A até existir aplicação |
| QG-09 | SEO técnico | Parcial: contrato inicial |
| QG-10 | Analytics | Parcial: contrato inicial |

**Política:** para cada gate, comando reproduzível, responsável, artefato verificável e condições de falha. `npm run verify` executa a parte pública existente; etapas não aplicáveis devem declarar tal condição em vez de dizer que foram aprovadas.
