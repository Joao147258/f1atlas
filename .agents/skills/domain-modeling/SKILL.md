---
name: domain-modeling
description: Modelar entidades, agregados, invariantes temporais, participações e integridade de resultados esportivos independentes de persistência.
---

# domain-modeling — Modelagem de Domínio Esportivo

## Ativação e propósito

Especificar e estruturar as entidades fundamentais do automobilismo, suas relações temporais e seus invariantes desportivos puros, independentemente de frameworks web ou bancos de dados.

- **Quando acionar:** Durante a modelagem de pilotos, equipes, temporadas, Grandes Prêmios, sessões, inscrições temporais e resultados esportivos.
- **Quando NÃO acionar:** Para mapeamento de esquemas relacionais ORM (utilizar `prisma-schema-modeling`) ou DTOs de transporte HTTP (utilizar `api-contracts`).

## Pré-condições

- Consultar `AGENTS.md` (Seção 4 — Domínio Esportivo: Invariantes Transversais) e `docs/architecture/domain-model.md`.
- Conhecimento da regra da **temporalidade**: vínculos entre piloto e equipe pertencem a uma temporada ou Grande Prêmio específico, nunca a cadastros permanentes.
- O código do domínio deve residir em módulos puros TypeScript sem dependências de NestJS, Next.js ou Prisma.

## Procedimento

1. **Definição de Identidades e Agregados**:
   - Modelar `Driver` e `Team` como identidades duráveis no tempo.
   - Modelar `Season` como a raiz agregadora de um campeonato, contendo `GrandPrix` e regras esportivas daquele ano.
   - Modelar `Session` (Treino Livre, Qualificação, Sprint Shootout, Sprint, Corrida Principal) vinculada a um `GrandPrix`.
2. **Modelagem de Vínculos Temporais (Inscrições)**:
   - Estruturar `DriverParticipation` vinculando piloto, construtor, equipe comercial e número do carro ao contexto de uma etapa/temporada.
   - Tratar substituições de pilotos (ex.: pilotos de reserva correndo etapas avulsas).
3. **Modelagem de Resultados e Estados de Classificação**:
   - Modelar `SessionResult` contendo posição final, tempo total, voltas completadas, grid de largada e status de término.
   - Aplicar enum estrito de status de término:
     - `FINISHED`: completou a distância total de corrida.
     - `DNF` (Did Not Finish): abandonou a corrida (pode ser classificado se completou >= 90% da distância).
     - `DNS` (Did Not Start): participou do fim de semana mas não alinhou no grid de largada.
     - `DSQ` (Disqualified): desclassificado por decisão técnica ou desportiva dos comissários.
     - `NC` (Not Classified): terminou a prova mas não completou 90% das voltas do vencedor.
   - Modelar estados de homologação do resultado: `PROVISIONAL`, `OFFICIAL`, `REVISED`, `SIMULATED`.
4. **Isolamento de Dados Simulados**:
   - Garantir que resultados de cenários hipotéticos ou simulações pertençam à entidade `SimulationScenario`, impedindo contaminação com resultados oficiais.
5. **Implementação de Invariantes em Métodos de Domínio**:
   - Implementar validações na criação de agregados (ex.: proibido cadastrar resultado sem inscrição válida na etapa).
   - Proibir alteração de resultado em estado `OFFICIAL` sem registro explícito de revisão homologada.

## Validação

- Executar os testes unitários do domínio: `npm run test:harness`.
- Executar o quality gate de arquitetura: `npm run verify:architecture` (garante zero imports de infraestrutura em `packages/domain/`).
- Verificar que dados simulados possuem propriedade discriminatória explícita `isSimulation: true`.

## Falhas e limites

### Matriz de Erros e Recuperação

| Sintoma de Falha | Causa Raiz | Procedimento Corretivo |
| :--- | :--- | :--- |
| Piloto pontuado sem classificação | Piloto com DNF < 90% de voltas marcado como pontuado | Aplicar regra de 90% de distância para elegibilidade de classificação |
| Vínculo de equipe vazando entre anos | Entidade `Driver` referenciando `Team` permanentemente | Desacoplar vínculo direto e utilizar objeto de valor `SeasonParticipation` |
| Import de `@prisma/client` no domínio | Acoplamento acidental da camada de persistência | Remover o import e definir interface de repositório pura (`Port`) |
| Resultado oficial alterado silenciosamente | Mutação direta em entidade já homologada | Exigir criação de evento de domínio `ResultRevisionAppended` com justificativa |

### Limitações
- O modelo de domínio não executa I/O de rede ou persistência em disco.
- Regras de temporadas passadas não devem ser sobrescritas por regulamentos recentes.

## Entregáveis

- Entidades puras, Value Objects e interfaces de portas (`ports`) em TypeScript.
- Suíte de testes unitários determinísticos cobrindo regras de negócio e estados de corrida.
- Relatório de Modelagem de Domínio indicando agregados modelados, invariantes protegidos e conformidade arquitetural.
