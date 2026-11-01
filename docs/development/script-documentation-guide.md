# Guia de Legibilidade e Documentação Inline de Scripts — F1Atlas

> **Documento:** `docs/development/script-documentation-guide.md`  
> **Status:** Ativo / Normativo  
> **Projeto:** F1Atlas — Plataforma Interativa de Automobilismo  
> **Referência:** `docs/development/script-governance.md`, `SPEC-GOV-003.md`  

---

## 1. Propósito do Guia

Este guia normativo estabelece os padrões técnicos de legibilidade, formatação, organização de responsabilidades e documentação inline (JSDoc) para os scripts de automação, segurança e qualidade do F1Atlas.

Seu objetivo é orientar o desenvolvimento de código que seja:
- Imediatamente compreensível por desenvolvedores e agentes autônomos.
- Isento de compactações artificiais ("one-liners" crípticos).
- Autodocumentado quanto a contratos, parâmetros, limites de segurança e efeitos colaterais.
- Determinístico e fácil de manter ao longo da evolução do projeto.

---

## 2. Dez Exemplos Representativos de Padrão Técnico

### Exemplo 1: Código Pouco Legível (Anti-padrão)
*Problemas:* Múltiplas instruções por linha, variáveis de uma letra, regex sem explicação, captura silenciosa de exceções e acoplamento direto com console.

```javascript
// ❌ ANTI-PADRÃO: Compactado, críptico e frágil
import fs from 'node:fs';import path from 'node:path';
export function chk(r,fls){
 const res=[];for(const f of fls){try{const b=fs.readFileSync(path.join(r,f));
 if(!b.includes(0)&&/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(b.toString()))res.push(f+': falha');}catch{}}
 return res;
}
```

---

### Exemplo 2: Código Refatorado (Padrão F1Atlas)
*Melhorias:* Nomes expressivos, fluxo de controle em guard clauses, constantes documentadas, tratamento explícito de erros e separação lógica.

```javascript
// ✅ PADRÃO CANÔNICO F1ATLAS
import fs from 'node:fs';
import path from 'node:path';

const AWS_ACCESS_KEY_REGEX = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g;
const MAX_SCAN_SIZE_BYTES = 1024 * 1024;

export function checkAwsCredentials(workspaceRoot, candidateFiles) {
  const detectedViolations = [];

  for (const relativeFilePath of candidateFiles) {
    const absoluteFilePath = path.join(workspaceRoot, relativeFilePath);
    let fileStat;

    try {
      fileStat = fs.statSync(absoluteFilePath);
    } catch {
      continue; // Arquivo removido concorrentemente durante o escaneamento
    }

    if (!fileStat.isFile() || fileStat.size > MAX_SCAN_SIZE_BYTES) {
      continue;
    }

    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(absoluteFilePath);
    } catch (readError) {
      detectedViolations.push(`${relativeFilePath}: erro de leitura (${readError.code})`);
      continue;
    }

    // Byte nulo (\0) indica arquivo binário (imagens, fontes, zip), ignorado na varredura de texto
    if (fileBuffer.includes(0)) {
      continue;
    }

    AWS_ACCESS_KEY_REGEX.lastIndex = 0;
    if (AWS_ACCESS_KEY_REGEX.test(fileBuffer.toString('utf8'))) {
      detectedViolations.push(`${relativeFilePath}: padrão compatível com AWS access key ID (valor ocultado)`);
    }
  }

  return detectedViolations;
}
```

---

### Exemplo 3: Documentação de Módulo Executável (`@fileoverview`)
*Regra:* O cabeçalho deve comunicar a finalidade, conformidade normativa, contexto e restrições antes do código.

```javascript
#!/usr/bin/env node
/**
 * @fileoverview Verificador de Segurança de Links Simbólicos — F1Atlas
 *
 * Inspeciona todos os links simbólicos presentes no workspace para assegurar que:
 * 1. Nenhum link aponte para fora do diretório raiz do projeto (Path Traversal / Escape).
 * 2. Links quebrados ou com falhas de leitura sejam devidamente identificados.
 *
 * Conformidade com a SPEC-GOV-003:
 * - Execução somente leitura por padrão.
 * - Resolução segura de caminhos via `isWithinRoot`.
 * - Não expõe caminhos absolutos do sistema operacional nos relatórios.
 *
 * @module scripts/security/check-symlinks
 */
```

---

### Exemplo 4: Documentação de Função Exportada (JSDoc Rigoroso)
*Regra:* Documentar tipos, parâmetros padrão, valor de retorno e invariantes. Não prometer o que a função não cumpre.

```javascript
/**
 * Inspeciona arquivos de configuração de ambiente (.env*) para garantir conformidade
 * com a política de segurança, sintaxe UPPER_SNAKE_CASE e telemetria GA4.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @param {Object} [options={}] - Configurações opcionais de auditoria.
 * @param {boolean} [options.strictExamples=true] - Se deve barrar segredos sintéticos em templates.
 * @returns {string[]} Lista de violações identificadas (vazia caso o ambiente esteja em conformidade).
 * @throws {never} Converte falhas de E/S em descrições de erro na lista retornada, sem abortar a execução.
 */
export function checkEnvFiles(workspaceRoot = PROJECT_ROOT, { strictExamples = true } = {}) {
  // ...
}
```

---

### Exemplo 5: Documentação de Regra de Segurança Crítica
*Regra:* Explicar a razão técnica e a ameaça mitigada pela verificação.

```javascript
// SEGURANÇA: No Next.js, variáveis com prefixo `NEXT_PUBLIC_` são injetadas no bundle
// JavaScript entregue ao navegador do cliente. Esta regra bloqueia qualquer tentativa
// de expor senhas, tokens de autenticação ou chaves privadas com este prefixo.
if (key.startsWith('NEXT_PUBLIC_') && FORBIDDEN_SECRET_WORDS_REGEX.test(key)) {
  issues.push(`Linha ${line}: "${key}" não pode ser exposta com NEXT_PUBLIC_ pois sugere credencial/segredo`);
}
```

---

### Exemplo 6: Tratamento Explícito e Seguro de Falhas de E/S
*Regra:* Nunca silenciar erros sem motivo documentado; diferenciar arquivos ausentes de erros inesperados de permissão.

```javascript
let linkStat;
try {
  // lstatSync obtém metadados do próprio link simbólico, sem resolver o arquivo de destino
  linkStat = fs.lstatSync(absolutePath);
} catch (error) {
  // ENOENT pode ocorrer em condições de concorrência se o arquivo for excluído durante o scan
  if (error.code === 'ENOENT') {
    continue;
  }
  // Erros inesperados (EACCES de permissão negada, ELOOP, etc.) devem ser reportados
  issues.push(`${relativeFilePath}: falha de E/S ao ler metadados (${error.code || error.message})`);
  continue;
}
```

---

### Exemplo 7: Contrato de Script CLI com Ponto de Entrada Seguro
*Regra:* Separar a função de validação pura do bloco de execução CLI protegido por `isMain`.

```javascript
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

export function validateFeature(workspaceRoot = PROJECT_ROOT) {
  // Lógica pura de validação...
  return [];
}

// O bloco de execução só é acionado quando o arquivo for invocado diretamente no terminal
if (isMain(import.meta.url)) {
  const detectedIssues = validateFeature(PROJECT_ROOT);
  report('Nome Amigável do Verificador', detectedIssues);
}
```

---

### Exemplo 8: Comentário Redundante (Anti-padrão)
*Problema:* Comentários que apenas parafraseiam a instrução do código sem agregar contexto técnico.

```javascript
// ❌ ANTI-PADRÃO: Comentário óbvio e redundante
// Cria uma array vazia de problemas
const issues = [];

// Lê o arquivo package.json como texto utf8
const raw = fs.readFileSync('package.json', 'utf8');

// Faz o parse do JSON
const json = JSON.parse(raw);
```

---

### Exemplo 9: Comentário Tecnicamente Útil (Padrão F1Atlas)
*Regra:* O comentário explica a premissa de negócio, a decisão de design ou a limitação do ambiente.

```javascript
// ✅ PADRÃO CANÔNICO: Explica premissas de arquitetura e regras de negócio
// No estágio Foundation v0.2, as aplicações web e api ainda não foram codificadas.
// Emitimos SKIP explicativo para não reprovar indevidamente o CI nem aprovar falsamente
// uma funcionalidade que ainda aguarda desenvolvimento na fase de aplicação.
if (!hasApplicationCode(workspaceRoot)) {
  return {
    status: STATUS.SKIP,
    message: 'NÃO APLICÁVEL: aplicações ainda em fundação; compilação aguarda apps/web.'
  };
}
```

---

### Exemplo 10: Teste Positivo, Negativo e Adversarial
*Regra:* Testes automatizados devem comprovar que o verificador aprova entradas íntegras e reprova violações e ataques sintéticos.

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSeoPages } from '../seo/validate-metadata.mjs';

test('seo: contrato de páginas aceita entrada íntegra e rejeita anomalias', () => {
  // Caso Positivo (Happy Path)
  const validPages = [
    {
      path: '/temporada/2025',
      title: 'Temporada 2025 de Fórmula 1 — F1Atlas',
      description: 'Acompanhe a classificação e os resultados da temporada 2025.',
      canonical: 'https://f1atlas.com/temporada/2025'
    }
  ];
  assert.deepEqual(validateSeoPages(validPages), []);

  // Caso Negativo (Violação de Protocolo e Campos Ausentes)
  const invalidPages = [
    {
      path: 'rota-sem-barra', // Deve iniciar com "/"
      title: '',             // Ausente
      description: null,     // Ausente
      canonical: 'http://inseguro.com/rota' // Deve ser https://
    }
  ];
  const issues = validateSeoPages(invalidPages);
  assert.equal(issues.length, 3);
  assert.match(issues[0], /path inválido/);
  assert.match(issues[1], /title\/description ausentes/);
  assert.match(issues[2], /canonical HTTPS ausente/);
});
```
