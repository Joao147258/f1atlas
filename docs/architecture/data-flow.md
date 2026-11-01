# Fluxo de dados

Provedor autorizado → importação → validação de payload → normalização → resolução de IDs → registro de proveniência e revisão → armazenamento → cálculos derivados → contrato API → apresentação.

**Falhas:** não aplicar resultado incompleto como oficial; registrar detalhes sem expor segredos; evitar perda de histórico em correções; possibilitar repetição idempotente quando necessário.

**Simulador:** cenário separado dos dados reais; uma projeção nunca atualiza resultado de sessão.
