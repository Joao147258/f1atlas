# Especificações

**Propósito:** descrever um comportamento verificável, não uma intenção genérica. Toda SPEC deve conter identificação, estado (`proposed|approved|implemented|deprecated`), motivação, escopo, regras, critérios de aceite, cenários de erro, dependências, segurança, testes e referências.

**Regras:** nenhum comportamento declarado como implementado sem evidências; mudanças incompatíveis exigem revisão; cada critério de aceite deve poder ser demonstrado por teste ou inspeção objetiva; se uma dependência externa não tem autorização, marcar como bloqueada.

**Template:** `.agents/templates/spec.template.md`. **Verificação:** `scripts/documentation/validate-specs.mjs`.
