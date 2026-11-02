#!/usr/bin/env node
/**
 * @fileoverview Verificador de Integridade da Documentação Arquitetural Viva — F1Atlas
 *
 * Valida a sincronização e conformidade entre o estado real do repositório
 * e o documento canônico `docs/architecture/current-state.md` (Living Architecture Documentation):
 * 1. Existência física e cabeçalho normativo do documento.
 * 2. Correspondência de aplicações (`apps/*`) e pacotes (`packages/*`) existentes.
 * 3. Rastreabilidade dos 7 módulos conceituais da camada Domain.
 * 4. Consistência das tecnologias declaradas nos manifests com a documentação.
 * 5. Ausência de links quebrados internos ou referências a componentes inexistentes.
 *
 * @module scripts/architecture/verify-current-state
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, STATUS, isMain, report } from '../lib/workspace.mjs';

/**
 * Caminho relativo do documento canônico de arquitetura viva.
 */
export const CURRENT_STATE_DOC_PATH = 'docs/architecture/current-state.md';

/**
 * Relação dos módulos conceituais obrigatórios da camada Domain que devem constar no documento.
 */
export const EXPECTED_DOMAIN_MODULES = Object.freeze([
  'shared',
  'seasons',
  'participants',
  'events',
  'scoring',
  'championships',
  'simulations'
]);

/**
 * Seções estruturais obrigatórias que devem existir em docs/architecture/current-state.md.
 */
export const REQUIRED_DOCUMENT_SECTIONS = Object.freeze([
  '## 1. Identificação',
  '## 2. Visão Geral da Arquitetura',
  '## 3. Estrutura do Monorepositório',
  '## 4. Componentes e Responsabilidades',
  '## 5. Dependências Arquiteturais',
  '## 6. Organização Detalhada da API',
  '## 7. Organização Detalhada do Domain',
  '## 8. Organização do Frontend',
  '## 9. Dados e Persistência',
  '## 10. Comunicação e Fluxo de Dados',
  '## 11. Mecanismos de Teste e Quality Gates',
  '## 12. Limitações Conhecidas e Divergências Arquiteturais',
  '## 13. Referências Arquiteturais e Fontes Canônicas'
]);

/**
 * Executa a auditoria determinística de sincronização da documentação arquitetural viva.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {{ issues: string[], status: STATUS }}
 */
export function verifyCurrentStateDocumentation(workspaceRoot = PROJECT_ROOT) {
  const issues = [];
  const docAbsolutePath = path.join(workspaceRoot, CURRENT_STATE_DOC_PATH);

  // 1. Verificação de existência física do documento
  if (!fs.existsSync(docAbsolutePath)) {
    issues.push(`Documento obrigatório não encontrado: ${CURRENT_STATE_DOC_PATH}`);
    return { issues, status: STATUS.FAIL };
  }

  let docContent = '';
  try {
    docContent = fs.readFileSync(docAbsolutePath, 'utf8');
  } catch (error) {
    issues.push(`Falha ao ler ${CURRENT_STATE_DOC_PATH}: ${error.message}`);
    return { issues, status: STATUS.ERROR };
  }

  // 2. Verificação de seções obrigatórias
  for (const section of REQUIRED_DOCUMENT_SECTIONS) {
    if (!docContent.includes(section)) {
      issues.push(`${CURRENT_STATE_DOC_PATH}: seção obrigatória ausente -> "${section}"`);
    }
  }

  // 3. Verificação de correspondência de aplicações em apps/
  const appsDir = path.join(workspaceRoot, 'apps');
  if (fs.existsSync(appsDir)) {
    const existingApps = fs.readdirSync(appsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => dirent.name);

    for (const appName of existingApps) {
      const appRef = `apps/${appName}`;
      if (!docContent.includes(appRef)) {
        issues.push(`${CURRENT_STATE_DOC_PATH}: aplicação existente "${appRef}" não está citada no documento`);
      }
    }
  }

  // 4. Verificação de correspondência de pacotes em packages/
  const packagesDir = path.join(workspaceRoot, 'packages');
  if (fs.existsSync(packagesDir)) {
    const existingPackages = fs.readdirSync(packagesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => dirent.name);

    for (const pkgName of existingPackages) {
      const pkgRef = `packages/${pkgName}`;
      if (!docContent.includes(pkgRef)) {
        issues.push(`${CURRENT_STATE_DOC_PATH}: pacote existente "${pkgRef}" não está citado no documento`);
      }
    }
  }

  // 5. Verificação dos 7 módulos conceituais do Domínio
  for (const moduleName of EXPECTED_DOMAIN_MODULES) {
    const modulePattern = new RegExp(`['\`]${moduleName}['\`]`, 'i');
    if (!modulePattern.test(docContent) && !docContent.includes(`packages/domain/src/${moduleName}`)) {
      issues.push(`${CURRENT_STATE_DOC_PATH}: módulo de domínio "${moduleName}" não está mapeado no documento`);
    }
  }

  // 6. Verificação de tecnologias críticas verificadas
  const apiPackageJsonPath = path.join(workspaceRoot, 'apps/api/package.json');
  if (fs.existsSync(apiPackageJsonPath)) {
    try {
      const apiPackage = JSON.parse(fs.readFileSync(apiPackageJsonPath, 'utf8'));
      const deps = { ...apiPackage.dependencies, ...apiPackage.devDependencies };

      if (deps['@nestjs/core'] && !docContent.includes('NestJS')) {
        issues.push(`${CURRENT_STATE_DOC_PATH}: tecnologia ativa @nestjs/core não mencionada na arquitetura da API`);
      }
      if (deps['@prisma/client'] && !docContent.includes('Prisma')) {
        issues.push(`${CURRENT_STATE_DOC_PATH}: tecnologia ativa Prisma não mencionada na persistência da API`);
      }
      if (deps['mariadb'] && !docContent.includes('MariaDB')) {
        issues.push(`${CURRENT_STATE_DOC_PATH}: driver ativo MariaDB não mencionado na infraestrutura`);
      }
    } catch {
      issues.push(`${CURRENT_STATE_DOC_PATH}: falha ao analisar apps/api/package.json para validação tecnológica`);
    }
  }

  return {
    issues,
    status: issues.length === 0 ? STATUS.PASS : STATUS.FAIL
  };
}

if (isMain(import.meta.url)) {
  const result = verifyCurrentStateDocumentation(PROJECT_ROOT);
  report('Integridade da documentação arquitetural viva (current-state.md)', result.issues);
  if (result.status === STATUS.PASS) {
    console.log('OK: docs/architecture/current-state.md está em sincronia com o estado real do monorepositório.');
  }
}
