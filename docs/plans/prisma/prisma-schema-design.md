# F1Atlas — Modelagem completa do schema.prisma

**Status: proposta de implementação futura — não executada nesta tarefa.**

## Missão

Projetar a fundação relacional do F1Atlas utilizando **Prisma ORM 7 + MySQL**.

O schema deverá representar corretamente os conceitos esportivos, históricos e editoriais sem se tornar uma reprodução dos formatos de fornecedores externos.

A modelagem deverá preservar identidades, participações temporais, integridade referencial, regulamentos, classificações, proveniência e rastreabilidade.

## Reconhecimento

Consultar governança, SPECs de domínio, ADRs, Prisma existente, migrations, testes e contratos da API.

Não descartar modelos válidos.

## Referências

- https://www.prisma.io/docs/orm/v7/prisma-schema/overview
- https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/models
- https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/relations
- https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql

## Modelagem conceitual

Antes de escrever o schema, definir para cada model:

- Responsabilidade.
- Identidade.
- Atributos.
- Relacionamentos.
- Cardinalidades.
- Invariantes.
- Unicidade.
- Contexto temporal.
- Índices.
- Rastreabilidade.

## Núcleo esportivo

### Driver

Identidade permanente do piloto, independente de nome, número e equipe.

### Team

Identidade histórica da organização.

### Constructor

Distinguir construtor de equipe quando houver necessidade fundamentada.

### Season

Temporada e regulamento aplicável.

### SeasonEntrant

Participação da equipe ou construtor na temporada.

### Participação temporal

Preservar vínculos reais de pilotos e equipes, inclusive transferências e substituições.

Não presumir participação em todos os eventos.

## Calendário

### Circuit

Identidade do circuito, localidade, país e fuso quando pertinente.

### CircuitLayout

Versões de traçado quando necessárias.

### GrandPrix

Evento associado a temporada e circuito, incluindo datas, rodada e estado.

## Sessões

### Session

Treinos, classificação, Sprint e corrida, com tipo, horário, estado e vínculo ao GP.

Nem todos os eventos possuem Sprint.

## Resultados

### SessionEntry

Inscrição ou participação em uma sessão, associando piloto e competidor correto.

### SessionResult

Posições, voltas, status, pontos e homologação quando pertinentes.

Distinguir classificação, largada e corrida.

### QualifyingResult

Modelagem especializada de Q1/Q2/Q3 quando justificada.

### StartingGrid

Grid efetivo independente da posição de classificação.

Não misturar DNF, DNS, DSQ e classificação oficial em um único estado incompatível.

## Penalidades e revisões

### Penalty

Decisões e efeitos esportivos comprovados.

### ResultRevision

Rastreabilidade das correções, origem, versões e estado vigente.

Não presumir que toda penalidade altera a posição final.

## Regulamentos

### ScoringRuleset

Política de pontuação com vigência e contexto.

### ScoringPosition

Posição e pontos dentro da política.

Separar regras de Sprint e corrida.

Não programar todo o regulamento como metadados genéricos do banco; a lógica pertence ao domínio.

Distinguir pontos oficiais, derivados e simulados.

## Campeonatos

### Championship

Pilotos e construtores.

### ChampionshipStanding

Snapshots oficiais ou derivados, quando justificados.

### StandingEntry

Participantes, posições, pontos, versão e critérios de desempate.

Evitar relacionamentos polimórficos sem chaves estrangeiras reais.

## Estatísticas

Preferir derivar vitórias, pódios, poles, pontos e resultados do núcleo esportivo.

Criar agregações persistidas apenas quando justificadas por consultas e medidas reais.

## Sessões avançadas

Avaliar modelos de voltas, setores, pit stops, stints, pneus, clima e ocorrências.

Não criar uma estrutura extensa de telemetria de alta frequência nesta etapa.

## Integrações

### DataSource

Fonte, identificação, categoria e condições de utilização.

### ExternalReference

Correspondência entre IDs internos e externos.

Evitar mapeamentos polimórficos sem integridade.

### ImportRun

Execução, estado, tempos, quantidades e falhas de importação.

### RecordProvenance

Origem e rastreabilidade de registros relevantes.

Não armazenar cópias externas indiscriminadamente.

## Racing Stories

### Story

Identidade, título, slug, resumo, estado e publicação.

### StoryChapter

Capítulos quando justificados.

### StoryReference

Fontes documentais.

Relacionar histórias a pilotos, equipes, temporadas, eventos e circuitos com integridade referencial.

Antes de armazenar o texto completo no MySQL, confirmar se o fluxo editorial utilizará banco ou arquivos versionados.

## Simulação

Preservar separação conceitual entre resultados reais e cenários simulados.

Não construir antecipadamente um subsistema completo de simulações.

## Convenções

### Identificadores

Escolher estratégia consistente para chaves internas.

Não utilizar IDs externos como chave canônica.

### Números

Utilizar precisão apropriada para pontos e tempos.

Evitar `Float` indiscriminadamente em valores de precisão relevante.

### Datas

Normalizar instantes e preservar fuso IANA quando necessário.

### Strings

Considerar charset, collation, unicidade e tamanho de índices MySQL.

### Enums

Utilizar apenas para conjuntos adequadamente estáveis.

### Campos opcionais

Refletir ausência legítima, não ocultar invariantes.

### JSON

Não utilizar documentos JSON para substituir relações centrais.

### Índices

Justificar pelos padrões de consulta.

### Constraints

Utilizar unicidade e FKs fundamentadas.

Ter atenção ao comportamento de NULL em índices únicos compostos do MySQL.

### Referencial

Preferir integridade por FKs reais quando suportada.

Não utilizar cascatas indiscriminadamente em dados históricos.

## Invariantes

Classificar cada invariante conforme seu mecanismo de proteção:

- Prisma schema.
- MySQL constraint.
- Domínio.
- Aplicação.
- Teste de integração.

Não afirmar que uma FK comprova uma regra esportiva complexa.

## Documentação

Documentar models, relações complexas, contexto histórico, invariantes e decisões não evidentes usando comentários Prisma quando apropriado.

## Validação

- Prisma validate.
- Prisma format.
- Prisma generate.
- Typecheck.
- Verificadores arquiteturais.
- Revisão semântica.

## Cenários de validação

Representar:

1. Piloto em equipe.
2. Troca entre temporadas.
3. Transferência durante a temporada.
4. Substituição de piloto.
5. GP com Sprint.
6. GP sem Sprint.
7. Grid diferente de classificação.
8. Abandono com classificação.
9. Não classificação.
10. Desclassificação.
11. Penalidade posterior.
12. Revisão oficial.
13. Pontuação de Sprint e corrida.
14. Campeonatos.
15. Correção de classificação.
16. IDs externos diferentes.
17. Importação idempotente.
18. História vinculada a GP e piloto.
19. Fontes documentais.
20. Dados provisórios.
21. Regulamentos diferentes.

## Restrições

Não aplicar migrations, executar `db push`, alterar produção, gerar SQL manual, realizar commit, push ou deploy nesta tarefa.

## Entrega

Inventário dos models, diagrama ER, tipos, constraints, matriz de integridade, validações, riscos e pendências.

Estados:

- `SCHEMA VALIDATED`
- `SCHEMA PARTIALLY VALIDATED`
- `SCHEMA BLOCKED`
