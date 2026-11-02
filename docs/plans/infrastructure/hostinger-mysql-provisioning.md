# F1Atlas — Provisionamento MySQL na Hostinger

**Status: proposta de execução futura — não executada nesta tarefa.**

## Missão

Provisionar um banco MySQL exclusivo do F1Atlas na Hostinger, associado ao site:

`f1.joaovitordantas.com.br`

Configurar credenciais e variáveis privadas da aplicação, preparar Prisma 7 e materializar o schema por migrations controladas.

**Hostinger e GitHub são destinos diferentes.**

Publicar configuração na Hostinger não significa versioná-la no GitHub.

## Referências

- https://www.hostinger.com/br/support/1583542-como-criar-um-novo-banco-de-dados-mysql-na-hostinger/
- https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/
- https://www.hostinger.com/support/how-to-add-environment-variables-during-node-js-application-deployment/
- https://www.hostinger.com/support/how-to-edit-or-add-environment-variables-after-deployment/
- https://www.prisma.io/docs/v7/prisma-orm/quickstart/mysql

## Reconhecimento

Verificar:

- Domínio e aplicação corretos.
- Plano de hospedagem.
- Bancos existentes.
- Limitações.
- Versão do servidor MySQL.
- Permissões.
- Acesso remoto.
- Configuração Node.js.
- Schema e migrations Prisma.

Não alterar bancos de outros projetos.

## Banco

Criar banco lógico `f1atlas` e usuário lógico `f1atlas_app`, respeitando prefixos obrigatórios.

Gerar senha forte e exclusiva.

Não registrar senha em relatório ou repositório.

Confirmar banco criado e vazio.

## Ambiente

Criar configuração local privada com as variáveis exigidas.

Possíveis nomes:

- `DATABASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_CONNECTION_LIMIT`

Não duplicar variáveis sem necessidade.

Não sobrescrever configurações existentes inadvertidamente.

Não utilizar credenciais de produção no ambiente comum de desenvolvimento.

## Hostinger

Preferir variáveis de ambiente gerenciadas no painel Node.js.

Não enviar `.env` para diretórios públicos, GitHub ou arquivos estáticos.

Não presumir que arquivos locais estarão disponíveis remotamente.

## Conexão

Distinguir conexão local e conexão da aplicação hospedada.

`127.0.0.1` no servidor não é o mesmo `127.0.0.1` do computador local.

Acesso remoto deve ser controlado e restrito.

## Schema

Validar Prisma 7, schema, generator, adapter, modelos, índices e constraints.

## Migration inicial

Se existir, revisar e testar em MySQL isolado.

Se não existir, preparar migration em desenvolvimento, revisar e testar.

Não utilizar `migrate dev` em produção.

Não utilizar `db push` para substituir migrations.

## Aplicação

Executar `prisma migrate deploy` somente contra o banco F1Atlas novo, comprovadamente vazio e autorizado.

Não aplicar operações destrutivas.

Não executar seeds reais sem autorização.

## Pós-validação

Confirmar:

- Banco correto.
- Tabelas.
- Tipos.
- FKs.
- Índices.
- Histórico de migrations.
- Conexão.
- Credenciais privadas.
- Ausência de alterações em outros bancos.

Se a API não estiver implantada, declarar a validação de runtime remoto como pendente.

## GitHub

Não executar:

- `git add`
- `git commit`
- `git push`

Não versionar `.env`.

Schema e migrations poderão ser versionados posteriormente por procedimento separado.

## Segurança

Não criar endpoints públicos de diagnóstico.

Não liberar acesso irrestrito ao MySQL.

Não expor secrets ou executar reset destrutivo.

## Relatório

Informar infraestrutura selecionada, banco, usuário sem senha, variáveis configuradas sem valores, Prisma, migrations, verificações e pendências.

Estados:

- `HOSTINGER MYSQL PROVISIONED AND VERIFIED`
- `HOSTINGER MYSQL PARTIALLY PROVISIONED`
- `HOSTINGER MYSQL PROVISIONING BLOCKED`
