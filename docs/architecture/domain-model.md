# Modelo conceitual do domínio

> **Referência Canônica da Camada Domain:** Consulte a documentação especializada em [`docs/domain/README.md`](../domain/README.md) e o painel de status em [`docs/domain/development-status.md`](../domain/development-status.md).

Identidade de piloto/equipe separada de participação temporal. Temporada contém etapas, etapas contêm sessões; sessões contêm inscrições, resultados referenciam inscrições, classificações têm contexto temporal e regulamento. Não confundir cadastro com participação nem regra vigente com regra histórica.

**Invariantes consolidadas e regras desportivas:**
- A identidade durável de um competidor (`Driver`, `Team`, `Constructor`) é separada da sua inscrição temporal na temporada (`SeasonEntry`).
- Resultados de pista (`SessionResult`) possuem ciclo de homologação estrito (`PROVISIONAL`, `OFFICIAL`, `REVISED`, `SIMULATED`).
- Resultados simulados (`SIMULATED`) nunca alteram, substituem ou são exibidos como resultados oficiais da FIA.
- Detalhamento por módulo:
  - Primitivas e erros: [`docs/domain/shared.md`](../domain/shared.md)
  - Temporadas: [`docs/domain/seasons.md`](../domain/seasons.md)
  - Participantes: [`docs/domain/participants.md`](../domain/participants.md)
  - Eventos e resultados: [`docs/domain/events.md`](../domain/events.md)
  - Motor de pontuação: [`docs/domain/scoring.md`](../domain/scoring.md)
  - Classificação de campeonatos: [`docs/domain/championships.md`](../domain/championships.md)
  - Cenários e simulações: [`docs/domain/simulations.md`](../domain/simulations.md)

**Pendências e evolução:** Acompanhadas via [`docs/domain/development-status.md`](../domain/development-status.md).
