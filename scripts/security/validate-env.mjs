#!/usr/bin/env node
/**
 * @fileoverview Verificador e Validador de Governança de Variáveis de Ambiente — F1Atlas
 *
 * Implementa validação estática de arquivos de configuração de ambiente (.env.example, .env, .env.local):
 * 1. Validação Sintática: Formato CHAVE=VALOR, UPPER_SNAKE_CASE, ausência de espaços na chave e detecção de chaves duplicadas.
 * 2. Blindagem de Segredos: Proíbe estritamente expor credenciais, tokens ou segredos sob o prefixo público NEXT_PUBLIC_.
 * 3. Validação de Telemetria (GA4): Assegura consistência entre NEXT_PUBLIC_ANALYTICS_ENABLED e NEXT_PUBLIC_GA_MEASUREMENT_ID (G-XXXXXXXXXX).
 * 4. Validação de Execução: Garante formato de NODE_ENV (development|test|production) e porta inteira (1-65535).
 * 5. Proteção de Exemplos: Valida que .env.example não contenha segredos sintéticos reais via `scanText`.
 *
 * @module scripts/security/validate-env
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';
import { scanText } from './check-secrets.mjs';

/**
 * Padrões de palavras sensíveis proibidas sob o prefixo público NEXT_PUBLIC_.
 * @type {RegExp}
 */
const FORBIDDEN_PUBLIC_TERMS = /(?:SECRET|PASSWORD|PASSWD|TOKEN|PRIVATE|CREDENTIAL|AUTH_KEY|PRIVATE_KEY)/i;

/**
 * Expressão regular para validação do identificador de fluxo do Google Analytics 4 (G-XXXXXXXXXX).
 * @type {RegExp}
 */
const GA_MEASUREMENT_REGEX = /^G-[A-Z0-9]{4,15}$/;

/**
 * Ambientes de execução de Node.js autorizados.
 * @type {ReadonlySet<string>}
 */
const VALID_NODE_ENVS = new Set(['development', 'test', 'production']);

/**
 * Realiza o parsing de texto de um arquivo .env, validando sintaxe e unicidade de chaves.
 *
 * @param {string} rawContent - Conteúdo de texto bruto do arquivo .env.
 * @returns {{ entries: Array<{ key: string, value: string, line: number }>, issues: string[] }}
 * Retorna as entradas analisadas e a lista de problemas sintáticos encontrados.
 */
export function parseEnvText(rawContent) {
  const issues = [];
  const entries = [];
  const seenKeys = new Map();

  const lines = rawContent.split(/\r?\n/);
  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const trimmedLine = rawLine.trim();

    // Ignora linhas vazias e comentários
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmedLine.indexOf('=');
    if (equalsIndex === -1) {
      issues.push(`Linha ${lineNumber}: formato inválido (esperado CHAVE=VALOR): "${trimmedLine}"`);
      continue;
    }

    const key = trimmedLine.slice(0, equalsIndex);
    const value = trimmedLine.slice(equalsIndex + 1);

    if (/\s/.test(key)) {
      issues.push(`Linha ${lineNumber}: chave contém espaços inválidos: "${key}"`);
      continue;
    }

    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      issues.push(`Linha ${lineNumber}: chave "${key}" deve estar em UPPER_SNAKE_CASE`);
    }

    if (seenKeys.has(key)) {
      const firstLine = seenKeys.get(key);
      issues.push(`Linha ${lineNumber}: chave duplicada detectada: "${key}" (primeira ocorrência na linha ${firstLine})`);
    } else {
      seenKeys.set(key, lineNumber);
    }

    entries.push({ key, value, line: lineNumber });
  }

  return { entries, issues };
}

/**
 * Valida regras semânticas e políticas de segurança sobre as entradas analisadas de um arquivo .env.
 *
 * @param {Array<{ key: string, value: string, line: number }>} entries - Lista de entradas CHAVE=VALOR.
 * @param {Object} [options={}] - Opções de validação.
 * @param {boolean} [options.isExample=false] - Indica se o arquivo é um template de exemplo (.env.example).
 * @returns {string[]} Lista de problemas de conformidade identificados.
 */
export function validateEnvConfig(entries, { isExample = false } = {}) {
  const issues = [];
  const valuesMap = new Map(entries.map(e => [e.key, e.value]));

  for (const { key, value, line } of entries) {
    // 1. Proibição de credenciais ou segredos expostos como públicos (Next.js client-side bundle)
    if (key.startsWith('NEXT_PUBLIC_')) {
      if (FORBIDDEN_PUBLIC_TERMS.test(key)) {
        issues.push(`Linha ${line}: "${key}" não pode ser exposta com NEXT_PUBLIC_ pois sugere credencial/segredo`);
      }
    }

    // 2. Verificação de valores em arquivos de exemplo (garante que não vazem segredos reais no template)
    if (isExample && value) {
      const detectedSecrets = scanText(value);
      if (detectedSecrets.length > 0) {
        issues.push(`Linha ${line}: arquivo de exemplo contém padrão de segredo em "${key}" (${detectedSecrets.join(', ')})`);
      }
    }
  }

  // 3. Validação do Analytics (Google Analytics 4)
  const gaEnabled = valuesMap.get('NEXT_PUBLIC_ANALYTICS_ENABLED');
  const gaId = valuesMap.get('NEXT_PUBLIC_GA_MEASUREMENT_ID');

  if (gaEnabled !== undefined) {
    if (gaEnabled !== 'true' && gaEnabled !== 'false') {
      issues.push(`NEXT_PUBLIC_ANALYTICS_ENABLED deve ser "true" ou "false" (recebido: "${gaEnabled}")`);
    }
  }

  if (gaEnabled === 'true') {
    if (!gaId || !gaId.trim()) {
      issues.push('NEXT_PUBLIC_ANALYTICS_ENABLED está ativo, mas NEXT_PUBLIC_GA_MEASUREMENT_ID não foi informado');
    } else if (!GA_MEASUREMENT_REGEX.test(gaId.trim())) {
      issues.push('NEXT_PUBLIC_GA_MEASUREMENT_ID possui formato inválido (esperado: G-XXXXXXXXXX)');
    }
  } else if (gaId && gaId.trim() && !isExample) {
    // Se estiver desabilitado, mas ID foi preenchido em arquivo .env real, validar formato do ID
    if (!GA_MEASUREMENT_REGEX.test(gaId.trim())) {
      issues.push('NEXT_PUBLIC_GA_MEASUREMENT_ID possui formato inválido (esperado: G-XXXXXXXXXX)');
    }
  }

  // 4. Validação de NODE_ENV
  const nodeEnv = valuesMap.get('NODE_ENV');
  if (nodeEnv && !VALID_NODE_ENVS.has(nodeEnv)) {
    issues.push(`NODE_ENV inválido: "${nodeEnv}" (permitidos: development, test, production)`);
  }

  // 5. Validação de PORT
  const portString = valuesMap.get('PORT');
  if (portString) {
    const portNumber = Number(portString);
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      issues.push(`PORT inválida: "${portString}" (esperado inteiro entre 1 e 65535)`);
    }
  }

  return issues;
}

/**
 * Executa a verificação completa de governança nos arquivos .env do workspace.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {string[]} Lista de violações encontradas nos arquivos de ambiente.
 */
export function checkEnvFiles(workspaceRoot = PROJECT_ROOT) {
  const issues = [];
  const examplePath = path.join(workspaceRoot, '.env.example');

  // 1. Validar .env.example (obrigatório para clone limpo e baseline de configuração)
  if (!fs.existsSync(examplePath)) {
    return ['Arquivo obrigatório ausente: .env.example'];
  }

  const exampleRaw = fs.readFileSync(examplePath, 'utf8');
  const { entries: exampleEntries, issues: exampleParseIssues } = parseEnvText(exampleRaw);
  issues.push(...exampleParseIssues.map(i => `.env.example: ${i}`));

  const exampleValidationIssues = validateEnvConfig(exampleEntries, { isExample: true });
  issues.push(...exampleValidationIssues.map(i => `.env.example: ${i}`));

  // 2. Validar arquivos locais de desenvolvimento se existirem (.env, .env.local)
  for (const envFile of ['.env', '.env.local']) {
    const fullPath = path.join(workspaceRoot, envFile);
    if (!fs.existsSync(fullPath)) continue;

    const raw = fs.readFileSync(fullPath, 'utf8');
    const { entries, issues: parseIssues } = parseEnvText(raw);
    issues.push(...parseIssues.map(i => `${envFile}: ${i}`));

    const validationIssues = validateEnvConfig(entries, { isExample: false });
    issues.push(...validationIssues.map(i => `${envFile}: ${i}`));
  }

  return issues;
}

if (isMain(import.meta.url)) {
  report('Governança de variáveis de ambiente', checkEnvFiles(PROJECT_ROOT));
}
