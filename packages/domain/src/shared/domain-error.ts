/**
 * ============================================================================
 * F1Atlas — Camada Domain | Shared: DomainError
 * ============================================================================
 *
 * Identificação:
 * - Componente: DomainError
 * - Módulo: Shared
 * - Papel Arquitetural: Classe Base e Utilitários para Erros de Domínio
 *
 * Responsabilidade:
 * - Representar falhas de negócio esperadas, violações de regras e invariantes
 *   do automobilismo de forma tipada, semântica e contextualizada.
 * - Diferenciar categoricamente erros de domínio (ex.: "piloto não inscrito na etapa",
 *   "pontuação inválida para regulamento de 2025") de falhas técnicas de infraestrutura
 *   (ex.: "queda de conexão MySQL", "timeout de rede HTTP", "falha de disco").
 *
 * Relacionamentos:
 * - Utilizado por entidades, value objects, serviços de domínio e casos de uso
 *   para sinalizar condições onde uma regra de negócio impediu a operação.
 * - Consumido por mappers de exceção na camada Application/API para traduzir
 *   falhas de negócio em códigos HTTP adequados (ex.: 400 Bad Request, 409 Conflict, 422 Unprocessable Entity).
 * - Não deve conhecer status HTTP (como 400, 404, 500), RFC 7807 ou formatações de transporte web.
 *
 * Comportamento e Estrutura:
 * - Herda nativamente de `Error` do JavaScript/TypeScript para máxima interoperabilidade.
 * - Fornece mensagem compreensível, humana e livre de dados sensíveis ou técnicos.
 * - Carrega código único em string (slug/código semântico, ex.: `DOMAIN.INVALID_STATE`).
 * - Permite inclusão opcional de metadados de contexto esportivo imutáveis (ex.: `{ roundNumber, sessionStatus }`).
 * - Garante imutabilidade pós-instanciação via `Object.freeze`.
 *
 * Restrições e Invariantes:
 * - Erros de domínio nunca devem conter stack traces vazios nem mensagens em branco.
 * - Não possui dependências de NestJS, Prisma, Next.js ou bibliotecas externas.
 * - Não executa operações de I/O, rede ou leitura de variáveis de ambiente.
 *
 * Decisões Arquiteturais e Trade-offs: Exceções vs. Erros como Valores (Result):
 * - Lançar exceções (`throw new DomainError(...)`):
 *   - Vantagens: Aborta imediatamente o fluxo de execução; impede a existência
 *     em memória de agregados inválidos em construtores; padrão nativo do runtime.
 *   - Desvantagens: Rompe a transparência referencial; o compilador TypeScript
 *     não obriga o consumidor a tratar a falha (ausência de checked exceptions);
 *     custo de performance do unwinding de stack para falhas de validação corriqueiras.
 * - Retornar erros como valores (`Result.fail(new DomainError(...))`):
 *   - Vantagens: Torna a possibilidade de erro explícita na assinatura da função
 *     (ex.: `Result<Season, DomainError>`); força tratamento exaustivo em tempo de
 *     compilação; facilita composição pura sem blocos try/catch.
 *   - Desvantagens: Exige desempacotamento explícito pelo chamador; pode adicionar
 *     verborragia se não houver disciplina de composição.
 * - Decisão no F1Atlas:
 *   Adota-se uma estratégia proporcional e compatível com ambos os modelos:
 *   1. `DomainError` é uma classe que herda de `Error`, podendo ser instanciada como
 *      valor puro para ser envelopada em `Result.fail(error)`.
 *   2. Caso uma invariante estrutural inegociável seja violada no construtor de uma
 *      entidade onde a continuação geraria estado corrompido, ela pode ser lançada via `throw`.
 *
 * ============================================================================
 */

/**
 * Contexto arbitrário e imutável de parâmetros associados à falha esportiva ou de negócio.
 */
export type DomainErrorContext = Readonly<Record<string, unknown>>;

/**
 * Códigos semânticos universais recomendados para erros de domínio.
 * Subdomínios específicos podem utilizar códigos adicionais estruturados no formato `DOMAIN.SUBDOMINIO_NOME`.
 */
export const DomainErrorCode = {
  INVALID_STATE: 'DOMAIN.INVALID_STATE',
  INVARIANT_VIOLATION: 'DOMAIN.INVARIANT_VIOLATION',
  INVALID_ARGUMENT: 'DOMAIN.INVALID_ARGUMENT',
  ENTITY_NOT_FOUND: 'DOMAIN.NOT_FOUND',
  OPERATION_NOT_ALLOWED: 'DOMAIN.OPERATION_NOT_ALLOWED',
} as const;

export type DomainErrorCode = (typeof DomainErrorCode)[keyof typeof DomainErrorCode] | string;

/**
 * Classe base representativa de falhas de regras e invariantes de domínio no F1Atlas.
 *
 * Herda nativamente de `Error`, garantindo rastreamento de pilha (stack trace),
 * identificação semântica via código único e suporte a metadados de contexto imutáveis.
 */
export class DomainError extends Error {
  readonly code: string;
  readonly context?: DomainErrorContext;

  constructor(code: string, message: string, context?: DomainErrorContext) {
    super(message);

    this.name = new.target.name || 'DomainError';
    this.code = code;
    this.context = context ? Object.freeze({ ...context }) : undefined;

    // Preserva cadeia de protótipos em subclasses compiladas para ES5/ES6+
    Object.setPrototypeOf(this, new.target.prototype);

    // Captura o stack trace omitindo o construtor interno quando suportado pelo runtime (V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }

    // Congela a instância para assegurar imutabilidade rigorosa dos atributos do erro
    Object.freeze(this);
  }
}

/**
 * Constrói uma instância imutável de DomainError com código semântico, mensagem e contexto opcional.
 *
 * @param code Código semântico identificador da falha (ex.: DomainErrorCode.INVALID_STATE).
 * @param message Descrição clara, humana e livre de dados técnicos sobre a violação.
 * @param context Objeto opcional contendo informações relevantes de contexto esportivo.
 * @returns Instância congelada de DomainError pronta para uso como valor ou exceção.
 */
export function createDomainError(
  code: string,
  message: string,
  context?: DomainErrorContext
): DomainError {
  return new DomainError(code, message, context);
}

/**
 * Predicado de tipo (Type Guard) que valida em runtime se determinado valor desconhecido
 * é uma instância de DomainError ou de uma de suas especializações.
 *
 * @param error Valor desconhecido a ser inspecionado (ex.: capturado em bloco catch ou canal Result).
 * @returns `true` com narrowing de tipo para `DomainError` se o valor for um erro de domínio válido.
 */
export function isDomainError(error: unknown): error is DomainError {
  if (error instanceof DomainError) {
    return true;
  }

  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as Record<string, unknown>;

  return (
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.name === 'string' &&
    candidate.name.endsWith('Error')
  );
}
