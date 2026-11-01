#!/usr/bin/env node
/**
 * @fileoverview Verificador de Segurança de Links Simbólicos — F1Atlas
 *
 * Inspeciona todos os links simbólicos presentes no workspace para garantir que:
 * 1. Nenhum link aponte para fora do diretório raiz do projeto (Path Traversal / Escape).
 * 2. Links quebrados ou com falhas de leitura sejam devidamente identificados.
 *
 * Conformidade com a SPEC-GOV-003:
 * - Execução somente leitura por padrão.
 * - Resolução segura de caminhos via `isWithinRoot`.
 * - Não expõe caminhos absolutos do sistema operacional do operador nos relatórios.
 *
 * @module scripts/security/check-symlinks
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, listWorkspaceFiles, report, isWithinRoot } from '../lib/workspace.mjs';

/**
 * Inspeciona a integridade e segurança de todos os links simbólicos no workspace.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @param {string[]} [candidateFiles=listWorkspaceFiles(workspaceRoot)] - Arquivos a verificar.
 * @returns {string[]} Lista de violações identificadas (vazia se nenhum problema for encontrado).
 */
export function checkWorkspaceSymlinks(workspaceRoot = PROJECT_ROOT, candidateFiles = listWorkspaceFiles(workspaceRoot)) {
  const securityIssues = [];

  for (const relativeFilePath of candidateFiles) {
    const absoluteFilePath = path.join(workspaceRoot, relativeFilePath);
    let linkStat;

    try {
      // lstatSync obtém metadados do próprio link, sem seguir o alvo apontado
      linkStat = fs.lstatSync(absoluteFilePath);
    } catch (readError) {
      // Se o arquivo deixou de existir entre a listagem e a checagem, ou se houver erro de permissão
      if (readError.code !== 'ENOENT') {
        securityIssues.push(`${relativeFilePath}: falha de E/S ao inspecionar metadados (${readError.code || readError.message})`);
      }
      continue;
    }

    if (!linkStat.isSymbolicLink()) {
      continue;
    }

    try {
      const rawTarget = fs.readlinkSync(absoluteFilePath);
      const enclosingDirectory = path.dirname(absoluteFilePath);
      const resolvedTarget = path.resolve(enclosingDirectory, rawTarget);

      // Validação estrita de fronteira: o alvo resolvido deve residir dentro da raiz
      if (!isWithinRoot(workspaceRoot, resolvedTarget)) {
        securityIssues.push(`${relativeFilePath}: link simbólico escapa da raiz do workspace (${rawTarget})`);
      }
    } catch (readlinkError) {
      securityIssues.push(`${relativeFilePath}: falha ao inspecionar link simbólico (${readlinkError.message})`);
    }
  }

  return securityIssues;
}

if (isMain(import.meta.url)) {
  const issues = checkWorkspaceSymlinks(PROJECT_ROOT);
  report('Segurança de links simbólicos no workspace', issues);
}
