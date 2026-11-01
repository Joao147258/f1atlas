#!/usr/bin/env node
/**
 * @fileoverview Verificador de Arquivos Potencialmente Sensíveis — F1Atlas
 *
 * Inspeciona a lista de arquivos rastreados ou elegíveis para publicação no Git,
 * identificando arquivos que nunca devem ser versionados em repositório público:
 * 1. Arquivos reais de variáveis de ambiente (.env, .env.local, .env.production, etc.).
 * 2. Certificados, chaves privadas e keystores (.pem, .p12, .key, .keystore, etc.).
 * 3. Chaves SSH padrão (id_rsa, id_ed25519, etc.).
 * 4. Credenciais de service accounts e OAuth (service-account*.json, client_secret*.json, etc.).
 *
 * @module scripts/security/check-sensitive-files
 */

import path from 'node:path';
import { PROJECT_ROOT, isMain, listWorkspaceFiles, report } from '../lib/workspace.mjs';

/**
 * Modelos de ambiente públicos permitidos no versionamento (templates documentais sem valores reais).
 * @type {ReadonlySet<string>}
 */
const ALLOWED_ENV_TEMPLATES = new Set([
  '.env.example',
  '.env.sample',
  '.env.template'
]);

/**
 * Extensões de arquivos sensíveis que contêm certificados, chaves ou credenciais criptográficas.
 * @type {RegExp}
 */
const SENSITIVE_EXTENSIONS_REGEX = /\.(pem|p12|pfx|key|keystore|jks|kdbx|p8|pkcs12)$/i;

/**
 * Padrões de nomes de arquivos que contêm credenciais de provedores, identidades SSH ou contas de serviço.
 * @type {RegExp}
 */
const SENSITIVE_FILENAMES_REGEX = /^(?:id_rsa|id_ed25519|id_ecdsa|id_dsa|service-account.*\.json|credentials.*\.json|client_secret.*\.json)$/i;

/**
 * Avalia se o caminho de um arquivo corresponde a um padrão de arquivo sensível.
 *
 * @param {string} relativeFilePath - Caminho do arquivo a ser avaliado.
 * @returns {boolean} Retorna true se o arquivo for classificado como sensível e proibido para publicação.
 */
export function isSensitiveFile(relativeFilePath) {
  const normalizedPath = relativeFilePath.replaceAll('\\', '/');
  const baseName = path.posix.basename(normalizedPath).toLowerCase();

  // Modelos e exemplos autorizados são explicitamente permitidos
  if (ALLOWED_ENV_TEMPLATES.has(baseName)) {
    return false;
  }

  // 1. Arquivos de ambiente (.env, .env.local, config.env, etc.)
  if (baseName === '.env' || baseName.startsWith('.env.') || baseName.endsWith('.env')) {
    return true;
  }

  // 2. Chaves criptográficas e keystores
  if (SENSITIVE_EXTENSIONS_REGEX.test(baseName)) {
    return true;
  }

  // 3. Contas de serviço e chaves privadas SSH
  if (SENSITIVE_FILENAMES_REGEX.test(baseName)) {
    return true;
  }

  return false;
}

/**
 * Analisa uma lista de arquivos do workspace e reporta os arquivos classificados como sensíveis.
 *
 * @param {string[]} candidateFiles - Lista de caminhos relativos de arquivos a verificar.
 * @returns {string[]} Mensagens de violação encontradas.
 */
export function checkSensitiveFiles(candidateFiles) {
  return candidateFiles
    .filter(isSensitiveFile)
    .map(filePath => `Arquivo sensível no conjunto versionável: ${filePath}`);
}

if (isMain(import.meta.url)) {
  const candidateFiles = listWorkspaceFiles(PROJECT_ROOT);
  const issues = checkSensitiveFiles(candidateFiles);
  report('Arquivos potencialmente sensíveis', issues);
}
