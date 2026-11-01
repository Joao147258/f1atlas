#!/usr/bin/env node
/**
 * @fileoverview Verificador de Integridade e Vulnerabilidades de Dependências — F1Atlas
 *
 * Inspeciona os manifests de dependências (`package.json`) do projeto para:
 * 1. Identificar se existem pacotes externos declarados em `dependencies` ou `devDependencies`.
 * 2. Caso não haja dependências externas (estado de fundação v0.2), relata como NÃO APLICÁVEL (SKIP).
 * 3. Caso existam dependências, executa auditoria de vulnerabilidades (`npm audit --audit-level=high`),
 *    distinguindo falhas de vulnerabilidade de falhas de rede ou indisponibilidade do registry.
 *
 * @module scripts/security/verify-dependencies
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT, isMain, STATUS, reportResult } from '../lib/workspace.mjs';

/**
 * Lê e analisa o manifest `package.json` a partir do diretório raiz informado.
 *
 * @param {string} workspaceRoot - Raiz do projeto.
 * @returns {{ exists: boolean, manifest: Object|null, error: string|null }}
 */
function readPackageManifest(workspaceRoot) {
  const manifestPath = path.join(workspaceRoot, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    return { exists: false, manifest: null, error: `Arquivo manifest não encontrado: ${manifestPath}` };
  }

  try {
    const rawContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(rawContent);
    return { exists: true, manifest, error: null };
  } catch (parseError) {
    return { exists: true, manifest: null, error: `Erro ao processar JSON do package.json: ${parseError.message}` };
  }
}

/**
 * Executa a auditoria de dependências no workspace.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz a inspecionar.
 * @param {Object} [options={}] - Opções de execução.
 * @param {Function} [options.spawn=spawnSync] - Função de execução de processo (injetável para testes).
 * @returns {{ status: STATUS, issues: string[], message: string }} Resultado estruturado da verificação.
 */
export function verifyDependencies(workspaceRoot = PROJECT_ROOT, { spawn = spawnSync } = {}) {
  const { exists, manifest, error } = readPackageManifest(workspaceRoot);

  if (!exists || error) {
    return {
      status: STATUS.FAIL,
      issues: [error || 'Manifest package.json inexistente'],
      message: 'Falha de manifest'
    };
  }

  const prodDependencies = Object.keys(manifest.dependencies ?? {});
  const devDependencies = Object.keys(manifest.devDependencies ?? {});
  const totalDependencies = prodDependencies.length + devDependencies.length;

  // No estado de fundação atual, não há dependências de terceiros instaladas
  if (totalDependencies === 0) {
    return {
      status: STATUS.SKIP,
      issues: [],
      message: 'nenhum pacote de terceiros declarado; reavaliar após iniciar apps.'
    };
  }

  // Executa auditoria nativa via npm audit
  const auditResult = spawn('npm', ['audit', '--audit-level=high'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (auditResult.error) {
    return {
      status: STATUS.ERROR,
      issues: [`npm audit não pôde ser executado: ${auditResult.error.message}`],
      message: 'Erro ao invocar npm audit'
    };
  }

  if (auditResult.status !== 0) {
    const output = (auditResult.stdout || '') + (auditResult.stderr || '');
    return {
      status: STATUS.FAIL,
      issues: [
        `Vulnerabilidades detectadas pelo npm audit (código ${auditResult.status}).`,
        ...(output.trim() ? [output.trim().split('\n').slice(0, 5).join('\n')] : [])
      ],
      message: 'Vulnerabilidades encontradas'
    };
  }

  return {
    status: STATUS.PASS,
    issues: [],
    message: 'Nenhuma vulnerabilidade crítica ou alta detectada'
  };
}

if (isMain(import.meta.url)) {
  const result = verifyDependencies(PROJECT_ROOT);
  reportResult({
    title: 'Dependências',
    status: result.status,
    issues: result.issues,
    message: result.message
  });
}
