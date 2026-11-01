# Governança de segurança

**Modelo:** confiar minimamente nas entradas, usar escopo e privilégio mínimo, separar artefatos públicos e privados. Proteger credenciais, endpoints administrativos, contexto pessoal, logs e dados de terceiros.

**Defesas públicas:** scanner de padrões de segredos, arquivos sensíveis versionáveis, escopo de publicação, auditoria de dependências quando houver lockfile.

**Defesas locais:** `/.local/security/` verifica caminhos absolutos internos, staging, symlinks e arquivos confidenciais adicionais. **Não substituir segurança pública pela local.**

**Limitações:** scanners estáticos não detectam todas as credenciais, não verificam permissão real nem eliminam necessidade de revisão. Não executar ações destrutivas, push ou deploy sem autorização. Dependências de dados da F1 exigem checagem de licença antes de publicar.
