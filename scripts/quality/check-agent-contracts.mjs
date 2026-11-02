#!/usr/bin/env node
/**
 * @fileoverview Verificador de Contratos e Integridade de Agentes e Skills — F1Atlas
 *
 * Assegura conformidade com a SPEC-GOV-001 (Agentes) e SPEC-GOV-002 (Skills):
 * 1. Fonte Canônica Única: Agentes residem exclusivamente em `.gemini/agents/`. Reprova
 *    qualquer tentativa de reintroduzir o diretório de espelhos descontinuado `.agents/agents/`.
 * 2. Perfil dos 11 Agentes Especializados: Valida existência, nomenclatura em kebab-case,
 *    frontmatter YAML (`name`, `description >= 30`, `kind: local`), ausência de symlinks e
 *    presença das 5 seções mandatórias.
 * 3. Integridade de Referências: Assegura que skills referenciadas pelos agentes existam.
 * 4. Padrão de Skills (.agents/skills): Valida `SKILL.md`, frontmatter com nome correspondente ao diretório,
 *    descrição contextual (mínimo 40 caracteres, sem boilerplate genérico proibido), presença das 6 seções
 *    mandatórias e validação de existência de todos os scripts e documentos citados no corpo.
 *
 * @module scripts/quality/check-agent-contracts
 */

import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain, report } from '../lib/workspace.mjs';

/**
 * Relação dos 12 agentes especializados canônicos do F1Atlas.
 * @type {ReadonlyArray<string>}
 */
export const EXPECTED_AGENTS = Object.freeze([
  'developer',
  'backend-engineer',
  'frontend-engineer',
  'test-engineer',
  'code-reviewer',
  'script-developer',
  'security-auditor',
  'documentation-engineer',
  'editorial-engineer',
  'seo-engineer',
  'analytics-engineer',
  'prisma-engineer'
]);

/**
 * Seções obrigatórias no corpo de cada arquivo de agente (.gemini/agents/*.md).
 * @type {ReadonlyArray<string>}
 */
export const MANDATORY_AGENT_SECTIONS = Object.freeze([
  '## Quando acionar',
  '## Limites',
  '## Procedimento',
  '## Skills',
  '## Entregáveis'
]);

/**
 * Seções obrigatórias no corpo de cada arquivo de skill (.agents/skills/*\/SKILL.md).
 * @type {ReadonlyArray<string>}
 */
export const MANDATORY_SKILL_SECTIONS = Object.freeze([
  '## Ativação e propósito',
  '## Pré-condições',
  '## Procedimento',
  '## Validação',
  '## Falhas e limites',
  '## Entregáveis'
]);

/**
 * Expressão regular para validação do identificador de agentes e skills em kebab-case.
 * @type {RegExp}
 */
const KEBAB_CASE_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Texto de boilerplate genérico proibido na descrição de skills.
 * @type {string}
 */
const FORBIDDEN_SKILL_BOILERPLATE = 'Use esta skill quando a tarefa corresponder a esta responsabilidade';

/**
 * Realiza o parsing de cabeçalho YAML frontmatter em documentos Markdown.
 *
 * @param {string} rawContent - Conteúdo bruto do arquivo Markdown.
 * @returns {{ fields: Record<string, string>, body: string } | null}
 * Retorna os campos analisados e o corpo restante, ou null se não houver frontmatter válido.
 */
export function parseFrontmatter(rawContent) {
  if (!rawContent.startsWith('---\n')) {
    return null;
  }

  const delimiterEndIndex = rawContent.indexOf('\n---\n', 4);
  if (delimiterEndIndex < 0) {
    return null;
  }

  const yamlBlock = rawContent.slice(4, delimiterEndIndex);
  const fields = {};

  for (const line of yamlBlock.split('\n')) {
    const match = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.+)$/);
    if (match) {
      fields[match[1]] = match[2].trim();
    }
  }

  const bodyContent = rawContent.slice(delimiterEndIndex + 5);
  return { fields, body: bodyContent };
}

/**
 * Executa a auditoria completa de conformidade dos agentes e skills do harness.
 *
 * @param {string} [workspaceRoot=PROJECT_ROOT] - Diretório raiz do projeto.
 * @returns {string[]} Lista de violações identificadas.
 */
export function checkAgentContracts(workspaceRoot = PROJECT_ROOT) {
  const issues = [];
  const obsoleteAgentDir = path.join(workspaceRoot, '.agents/agents');
  const canonicalAgentDir = path.join(workspaceRoot, '.gemini/agents');
  const canonicalSkillDir = path.join(workspaceRoot, '.agents/skills');

  // 1. Verificação contra reintrodução do diretório legado de cópias
  if (fs.existsSync(obsoleteAgentDir)) {
    issues.push('Diretório descontinuado .agents/agents detectado; agentes devem residir exclusivamente em .gemini/agents');
  }

  // 2. Validação da fonte única e canônica dos agentes (.gemini/agents)
  if (!fs.existsSync(canonicalAgentDir)) {
    return [...issues, 'Diretório canônico de agentes .gemini/agents ausente'];
  }

  const agentFiles = fs.readdirSync(canonicalAgentDir).filter(fileName => fileName.endsWith('.md'));
  const registeredAgentNames = new Set();

  for (const expectedAgentName of EXPECTED_AGENTS) {
    if (!agentFiles.includes(expectedAgentName + '.md')) {
      issues.push(`Agente esperado ausente: ${expectedAgentName}`);
    }
  }

  for (const agentFileName of agentFiles) {
    const absoluteAgentPath = path.join(canonicalAgentDir, agentFileName);

    if (fs.lstatSync(absoluteAgentPath).isSymbolicLink()) {
      issues.push(`${agentFileName}: symlink não permitido para agentes`);
      continue;
    }

    const rawContent = fs.readFileSync(absoluteAgentPath, 'utf8');
    const parsed = parseFrontmatter(rawContent);

    if (!parsed) {
      issues.push(`${agentFileName}: frontmatter YAML inválido`);
      continue;
    }

    const { name, description, kind } = parsed.fields;

    if (!name || !KEBAB_CASE_REGEX.test(name) || agentFileName !== `${name}.md`) {
      issues.push(`${agentFileName}: name inválido ou diferente do arquivo`);
    }

    if (!description || description.length < 30) {
      issues.push(`${agentFileName}: description ausente ou insuficiente (mínimo 30 caracteres)`);
    }

    if (kind !== 'local') {
      issues.push(`${agentFileName}: kind deve ser local`);
    }

    if (registeredAgentNames.has(name)) {
      issues.push(`${agentFileName}: nome duplicado`);
    }
    registeredAgentNames.add(name);

    for (const mandatorySection of MANDATORY_AGENT_SECTIONS) {
      if (!parsed.body.includes(mandatorySection)) {
        issues.push(`${agentFileName}: seção obrigatória ausente: ${mandatorySection}`);
      }
    }

    // Validação de skills referenciadas pelo agente no corpo
    for (const match of parsed.body.matchAll(/\.agents\/skills\/([a-z0-9-]+)\/SKILL\.md/g)) {
      const referencedSkillName = match[1];
      const referencedSkillPath = path.join(canonicalSkillDir, referencedSkillName, 'SKILL.md');
      if (!fs.existsSync(referencedSkillPath)) {
        issues.push(`${agentFileName}: skill referenciada ausente: ${referencedSkillName}`);
      }
    }
  }

  // 3. Validação das skills em .agents/skills
  if (!fs.existsSync(canonicalSkillDir)) {
    return [...issues, 'Diretório de skills ausente'];
  }

  const registeredSkillNames = new Set();
  const skillFolders = fs.readdirSync(canonicalSkillDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  for (const skillFolderName of skillFolders) {
    const skillFilePath = path.join(canonicalSkillDir, skillFolderName, 'SKILL.md');

    if (!fs.existsSync(skillFilePath)) {
      issues.push(`Skill ${skillFolderName} sem SKILL.md`);
      continue;
    }

    const rawSkillContent = fs.readFileSync(skillFilePath, 'utf8');
    const parsedSkill = parseFrontmatter(rawSkillContent);

    if (!parsedSkill) {
      issues.push(`Skill ${skillFolderName}: frontmatter inválido`);
      continue;
    }

    if (parsedSkill.fields.name !== skillFolderName) {
      issues.push(`Skill ${skillFolderName}: name divergente do diretório`);
    }

    if (!parsedSkill.fields.description || parsedSkill.fields.description.length < 40) {
      issues.push(`Skill ${skillFolderName}: descrição insuficiente (mínimo 40 caracteres)`);
    }

    if (parsedSkill.fields.description && parsedSkill.fields.description.includes(FORBIDDEN_SKILL_BOILERPLATE)) {
      issues.push(`Skill ${skillFolderName}: boilerplate genérico proibido na descrição`);
    }

    if (registeredSkillNames.has(parsedSkill.fields.name)) {
      issues.push(`Skill ${skillFolderName}: nome duplicado`);
    }
    registeredSkillNames.add(parsedSkill.fields.name);

    for (const mandatorySection of MANDATORY_SKILL_SECTIONS) {
      if (!parsedSkill.body.includes(mandatorySection)) {
        issues.push(`Skill ${skillFolderName}: seção obrigatória ausente: ${mandatorySection}`);
      }
    }

    // Validação de scripts citados no corpo da skill
    for (const match of parsedSkill.body.matchAll(/`((?:node\s+)?scripts\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\.mjs)`/g)) {
      const scriptRelativePath = match[1].replace(/^node\s+/, '');
      if (!fs.existsSync(path.join(workspaceRoot, scriptRelativePath))) {
        issues.push(`Skill ${skillFolderName}: script referenciado inexistente: ${scriptRelativePath}`);
      }
    }

    // Validação de documentos em docs/ citados no corpo da skill
    for (const match of parsedSkill.body.matchAll(/`docs\/([a-zA-Z0-9_./-]+\.(?:md|json))`(?:\s*\(Seção[^\)]*\))?/g)) {
      const docRelativePath = path.join('docs', match[1]);
      if (!fs.existsSync(path.join(workspaceRoot, docRelativePath))) {
        issues.push(`Skill ${skillFolderName}: documento referenciado inexistente: ${docRelativePath}`);
      }
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  const issues = checkAgentContracts(PROJECT_ROOT);
  report('Agentes canônicos (.gemini/agents) e skills', issues);
}
