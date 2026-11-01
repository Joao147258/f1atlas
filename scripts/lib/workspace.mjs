/**
 * @fileoverview Infraestrutura Compartilhada do Workspace — F1Atlas
 *
 * Fornece utilitários fundamentais para descoberta da raiz do repositório,
 * listagem segura de arquivos (sensível a Git e com fallback determinístico),
 * validação de fronteiras de diretórios (prevenção contra path traversal),
 * resolução de symlinks e padronização da saída e códigos de saída da CLI.
 *
 * @module scripts/lib/workspace
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

/**
 * Caminho absoluto canônico da raiz do repositório F1Atlas.
 * Calculado a partir da localização deste módulo em `scripts/lib/`.
 * @type {string}
 */
export const PROJECT_ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

/**
 * Estados padronizados de execução para os verificadores de governança e quality gates.
 * Alinhado com a SPEC-GOV-003.
 * @readonly
 * @enum {string}
 */
export const STATUS = Object.freeze({
  /** Verificação concluída com sucesso sem defeitos */
  PASS: 'PASS',
  /** Verificação não aplicável no estágio atual da fundação (informativo) */
  SKIP: 'SKIP',
  /** Falha determinística por violação de regra ou contrato */
  FAIL: 'FAIL',
  /** Erro fatal de execução, sintaxe ou falha de infraestrutura */
  ERROR: 'ERROR'
});

/**
 * Diretórios que devem ser ignorados por scanners recursivos de arquivos do workspace.
 * Inclui diretórios de versionamento, artefatos gerados, caches e dados locais privados.
 * @type {ReadonlySet<string>}
 */
const SKIP_DIRECTORIES = new Set([
  '.git',
  '.local',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.vercel',
  '.cache'
]);

/**
 * Arquivos locais de configuração privada que não devem ser indexados
 * na listagem padrão do workspace.
 * @type {ReadonlySet<string>}
 */
const SKIP_LOCAL_FILES = new Set([
  'GEMINI.md',
  '.gemini/settings.json'
]);

/**
 * Identifica se um arquivo representa um arquivo de ambiente ou configuração privada
 * durante a varredura de fallback quando o Git não estiver presente.
 *
 * @param {string} relativeFilePath - Caminho relativo com barras normais (/).
 * @returns {boolean} Retorna true se o arquivo for privado e não publicável.
 */
function isPrivateFallback(relativeFilePath) {
  const baseName = path.posix.basename(relativeFilePath);
  if (SKIP_LOCAL_FILES.has(relativeFilePath)) {
    return true;
  }
  // Bloqueia .env e variações (.env.local, .env.production), permitindo templates públicos
  const isEnvFile = baseName === '.env' || baseName.startsWith('.env.');
  const isPublicTemplate = ['.env.example', '.env.sample', '.env.template'].includes(baseName);
  return isEnvFile && !isPublicTemplate;
}

/**
 * Determina se o arquivo ESM que invocou a função é o ponto de entrada da CLI (execução direta).
 *
 * @param {string} metaUrl - A URL de metadados do módulo importador (`import.meta.url`).
 * @returns {boolean} Retorna true se o script estiver sendo executado diretamente via terminal.
 */
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  return fileURLToPath(metaUrl) === path.resolve(process.argv[1]);
}

/**
 * Valida se um determinado caminho de arquivo ou diretório reside estritamente dentro da raiz
 * informada, impedindo vulnerabilidades de travessia de caminho (Path Traversal / "..").
 *
 * @param {string} rootDirectory - Diretório raiz autorizado.
 * @param {string} targetPath - Caminho de destino (relativo ou absoluto) a ser verificado.
 * @returns {boolean} Retorna true se o destino estiver contido na raiz; false se escapar.
 */
export function isWithinRoot(rootDirectory, targetPath) {
  const resolvedTarget = path.resolve(rootDirectory, targetPath);
  const relativeFromRoot = path.relative(rootDirectory, resolvedTarget);
  const escapesViaParent = relativeFromRoot.startsWith('..' + path.sep) || relativeFromRoot === '..';
  const isOutsideDrive = path.isAbsolute(relativeFromRoot);
  return !escapesViaParent && !isOutsideDrive;
}

/**
 * Realiza varredura recursiva no sistema de arquivos para coletar arquivos do repositório.
 * Usado como mecanismo de fallback em ambientes sem repositório Git ou em clones limpos.
 *
 * @param {string} rootDirectory - Raiz do repositório a inspecionar.
 * @param {string} [subDirectory=''] - Subdiretório atual relativo à raiz.
 * @returns {string[]} Lista de caminhos relativos normalizados com barras (/), excluindo ignorados.
 */
function walkDirectory(rootDirectory, subDirectory = '') {
  const collectedFiles = [];
  const currentAbsoluteDir = path.join(rootDirectory, subDirectory);

  if (!fs.existsSync(currentAbsoluteDir)) {
    return collectedFiles;
  }

  const entries = fs.readdirSync(currentAbsoluteDir, { withFileTypes: true });
  for (const entry of entries) {
    const normalizedSubDir = subDirectory ? subDirectory.split(path.sep).join('/') : '';
    const relativePath = normalizedSubDir ? `${normalizedSubDir}/${entry.name}` : entry.name;

    if (entry.isDirectory() && !SKIP_DIRECTORIES.has(entry.name)) {
      collectedFiles.push(...walkDirectory(rootDirectory, relativePath));
    } else if (entry.isFile() && !isPrivateFallback(relativePath)) {
      collectedFiles.push(relativePath);
    } else if (entry.isSymbolicLink() && !SKIP_DIRECTORIES.has(entry.name)) {
      collectedFiles.push(relativePath);
    }
  }

  return collectedFiles;
}

/**
 * Lista todos os arquivos versionáveis do workspace de forma sensível ao Git.
 *
 * Se o diretório `.git` existir, utiliza `git ls-files` com `--cached`, `--others` e
 * `--exclude-standard` para capturar com precisão os arquivos rastreados e não rastreados
 * válidos (respeitando `.gitignore`). Se o Git não estiver disponível, realiza varredura
 * pelo sistema de arquivos respeitando diretórios e arquivos ignorados canônicos.
 *
 * @param {string} [rootDirectory=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {string[]} Lista ordenada e sem duplicatas de caminhos relativos ao rootDirectory.
 * @throws {Error} Caso a execução do comando `git ls-files` falhe de forma inesperada.
 */
export function listWorkspaceFiles(rootDirectory = PROJECT_ROOT) {
  const gitDirectory = path.join(rootDirectory, '.git');

  if (fs.existsSync(gitDirectory)) {
    const gitExecution = spawnSync(
      'git',
      ['-C', rootDirectory, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { encoding: 'utf8' }
    );

    if (gitExecution.status !== 0) {
      throw new Error('Falha ao identificar arquivos versionáveis no Git.');
    }

    const rawFileList = gitExecution.stdout.split('\0').filter(Boolean);
    const uniqueFiles = new Set(rawFileList);

    // Filtra exclusivamente itens que existam fisicamente e sejam arquivos ou symlinks
    return [...uniqueFiles].filter(relativeName => {
      try {
        const fullPath = path.join(rootDirectory, relativeName);
        const fileStat = fs.lstatSync(fullPath);
        return fileStat.isFile() || fileStat.isSymbolicLink();
      } catch {
        return false;
      }
    }).sort();
  }

  return walkDirectory(rootDirectory).sort();
}

/**
 * Inspeciona links simbólicos no workspace para garantir que nenhum deles escape da raiz
 * do projeto, prevenindo riscos de vazamento ou acesso indevido a arquivos externos.
 *
 * @param {string} [rootDirectory=PROJECT_ROOT] - Diretório raiz a validar.
 * @param {string[]} [files=listWorkspaceFiles(rootDirectory)] - Lista de arquivos a checar.
 * @returns {string[]} Lista de problemas detectados (vazia se todos os symlinks forem seguros).
 */
export function checkSymlinks(rootDirectory = PROJECT_ROOT, files = listWorkspaceFiles(rootDirectory)) {
  const detectedIssues = [];

  for (const relativeFilePath of files) {
    const absoluteFilePath = path.join(rootDirectory, relativeFilePath);
    let linkStat;
    try {
      linkStat = fs.lstatSync(absoluteFilePath);
    } catch {
      // Ignora arquivos que não puderem ser lidos (tratados por verificadores específicos)
      continue;
    }

    if (linkStat.isSymbolicLink()) {
      try {
        const linkTarget = fs.readlinkSync(absoluteFilePath);
        const resolvedTarget = path.resolve(path.dirname(absoluteFilePath), linkTarget);
        if (!isWithinRoot(rootDirectory, resolvedTarget)) {
          detectedIssues.push(`${relativeFilePath}: link simbólico aponta para fora do workspace (${linkTarget})`);
        }
      } catch (err) {
        detectedIssues.push(`${relativeFilePath}: falha ao inspecionar link simbólico (${err.message})`);
      }
    }
  }

  return detectedIssues;
}

/**
 * Gera a saída padrão no console para scripts de verificação simples e define o exitCode.
 *
 * @param {string} title - Nome ou título legível da verificação realizada.
 * @param {string[]} [issues=[]] - Lista de problemas encontrados.
 * @param {Object} [options={}] - Opções de controle de saída.
 * @param {boolean} [options.skip=false] - Se a verificação deve ser reportada como NÃO APLICÁVEL.
 * @param {string} [options.skipReason=''] - Justificativa informativa caso o skip seja verdadeiro.
 */
export function report(title, issues = [], options = {}) {
  const { skip = false, skipReason = '' } = options;

  if (skip) {
    console.log(`NÃO APLICÁVEL: ${title}${skipReason ? ' — ' + skipReason : ''}`);
    process.exitCode = 0;
    return;
  }

  if (issues && issues.length > 0) {
    console.error(`FALHA: ${title} (${issues.length} problema(s))`);
    for (const issue of issues) {
      console.error(`  - ${issue}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`OK: ${title}`);
    process.exitCode = 0;
  }
}

/**
 * Reporta o resultado detalhado de um verificador de acordo com a enumeração STATUS.
 * Define o exitCode padronizado: 0 para PASS/SKIP, 1 para FAIL e 2 para ERROR.
 *
 * @param {Object} params - Parâmetros do relatório.
 * @param {string} params.title - Título legível da verificação.
 * @param {STATUS} params.status - Estado de conclusão (PASS, SKIP, FAIL, ERROR).
 * @param {string[]} [params.issues=[]] - Lista de violações encontradas (se FAIL).
 * @param {string} [params.message=''] - Mensagem adicional ou justificativa de skip/erro.
 */
export function reportResult({ title, status, issues = [], message = '' }) {
  switch (status) {
    case STATUS.PASS:
      console.log(`OK: ${title}`);
      process.exitCode = 0;
      break;
    case STATUS.SKIP:
      console.log(`NÃO APLICÁVEL: ${title}${message ? ' — ' + message : ''}`);
      process.exitCode = 0;
      break;
    case STATUS.FAIL:
      console.error(`FALHA: ${title} (${issues.length} problema(s))`);
      for (const issue of issues) {
        console.error(`  - ${issue}`);
      }
      process.exitCode = 1;
      break;
    case STATUS.ERROR:
      console.error(`ERRO DE EXECUÇÃO: ${title}${message ? ' — ' + message : ''}`);
      process.exitCode = 2;
      break;
    default:
      console.error(`FALHA: ${title} (estado desconhecido: ${status})`);
      process.exitCode = 1;
  }
}

/**
 * Converte um caminho de arquivo em uma URL do tipo file:// válida.
 *
 * @param {string} filePath - Caminho do arquivo a ser convertido.
 * @returns {string} String contendo a URL com esquema file://.
 */
export function toFileUrl(filePath) {
  return pathToFileURL(filePath).href;
}
