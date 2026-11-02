import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkAgentContracts, parseFrontmatter, EXPECTED_AGENTS } from '../quality/check-agent-contracts.mjs';
import { validateSpecs } from '../documentation/validate-specs.mjs';
import { validateImports } from '../documentation/validate-references.mjs';
import { checkPublicationScope } from '../security/verify-publication-scope.mjs';
import { checkBoundaryFiles, checkArchitecture } from '../architecture/verify-boundaries.mjs';
import { validateEventCatalog } from '../analytics/validate-events.mjs';
import { validateSeoPages } from '../seo/validate-metadata.mjs';
import { PROJECT_ROOT } from '../lib/workspace.mjs';

function temp(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'f1atlas-contract-'));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function put(root, file, body) {
  const p = path.join(root, file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
}

test('agentes: 12 perfis canônicos válidos em .gemini/agents', () => {
  assert.equal(EXPECTED_AGENTS.length, 12);
  assert.deepEqual(checkAgentContracts(), []);
});

test('agents: ausência de frontmatter é detectada', () => {
  assert.equal(parseFrontmatter('# heading'), null);
});

test('agentes: reprova se diretório descontinuado .agents/agents existir', () => temp(root => {
  for (const ag of EXPECTED_AGENTS) {
    put(root, `.gemini/agents/${ag}.md`, `---\nname: ${ag}\ndescription: Descrição do agente para testes\nkind: local\n---\n## Quando acionar\n## Limites\n## Procedimento\n## Skills\n## Entregáveis\n`);
  }
  put(root, '.agents/skills/dummy/SKILL.md', '---\nname: dummy\ndescription: Descrição detalhada da skill para passar na validação mínima\n---\n## Ativação e propósito\n## Pré-condições\n## Procedimento\n## Validação\n## Falhas e limites\n## Entregáveis\n');
  put(root, '.agents/agents/developer.md', 'arquivo legado');

  const issues = checkAgentContracts(root);
  assert.ok(issues.some(i => i.includes('Diretório descontinuado .agents/agents detectado')));
}));

test('agentes: ausência de agente esperado em .gemini/agents é reprovada', () => temp(root => {
  // Cria apenas 1 agente
  put(root, '.gemini/agents/developer.md', `---\nname: developer\ndescription: Descrição do agente para testes\nkind: local\n---\n## Quando acionar\n## Limites\n## Procedimento\n## Skills\n## Entregáveis\n`);
  put(root, '.agents/skills/dummy/SKILL.md', '---\nname: dummy\ndescription: Descrição detalhada da skill para passar na validação mínima\n---\n## Ativação e propósito\n## Pré-condições\n## Procedimento\n## Validação\n## Falhas e limites\n## Entregáveis\n');

  const issues = checkAgentContracts(root);
  assert.ok(issues.some(i => i.includes('Agente esperado ausente: backend-engineer')));
}));

test('agentes: nome inválido ou divergente do arquivo é reprovado', () => temp(root => {
  for (const ag of EXPECTED_AGENTS) {
    put(root, `.gemini/agents/${ag}.md`, `---\nname: ${ag}\ndescription: Descrição do agente para testes\nkind: local\n---\n## Quando acionar\n## Limites\n## Procedimento\n## Skills\n## Entregáveis\n`);
  }
  put(root, '.agents/skills/dummy/SKILL.md', '---\nname: dummy\ndescription: Descrição detalhada da skill para passar na validação mínima\n---\n## Ativação e propósito\n## Pré-condições\n## Procedimento\n## Validação\n## Falhas e limites\n## Entregáveis\n');
  // Sobrescreve um com name divergente
  put(root, '.gemini/agents/developer.md', `---\nname: outro-nome\ndescription: Descrição do agente para testes\nkind: local\n---\n## Quando acionar\n## Limites\n## Procedimento\n## Skills\n## Entregáveis\n`);

  const issues = checkAgentContracts(root);
  assert.ok(issues.some(i => i.includes('developer.md: name inválido ou diferente do arquivo')));
}));

test('skills: boilerplate genérico na descrição é reprovado', () => temp(root => {
  for (const ag of EXPECTED_AGENTS) {
    put(root, `.gemini/agents/${ag}.md`, `---\nname: ${ag}\ndescription: Descrição do agente para testes\nkind: local\n---\n## Quando acionar\n## Limites\n## Procedimento\n## Skills\n## Entregáveis\n`);
  }
  put(root, '.agents/skills/test-skill/SKILL.md', '---\nname: test-skill\ndescription: Use esta skill quando a tarefa corresponder a esta responsabilidade.\n---\n## Ativação e propósito\n## Pré-condições\n## Procedimento\n## Validação\n## Falhas e limites\n## Entregáveis\n');
  const issues = checkAgentContracts(root);
  assert.ok(issues.some(i => i.includes('boilerplate genérico proibido')));
}));

test('skills: seção obrigatória ausente é reprovada', () => temp(root => {
  for (const ag of EXPECTED_AGENTS) {
    put(root, `.gemini/agents/${ag}.md`, `---\nname: ${ag}\ndescription: Descrição do agente para testes\nkind: local\n---\n## Quando acionar\n## Limites\n## Procedimento\n## Skills\n## Entregáveis\n`);
  }
  put(root, '.agents/skills/incomplete-skill/SKILL.md', '---\nname: incomplete-skill\ndescription: Capacidade especializada e auditável para teste de contrato\n---\n## Pré-condições\n## Procedimento\n## Validação\n## Entregáveis\n');
  const issues = checkAgentContracts(root);
  assert.ok(issues.some(i => i.includes('seção obrigatória ausente: ## Ativação e propósito')));
}));

test('skills: script inexistente referenciado provoca falha', () => temp(root => {
  for (const ag of EXPECTED_AGENTS) {
    put(root, `.gemini/agents/${ag}.md`, `---\nname: ${ag}\ndescription: Descrição do agente para testes\nkind: local\n---\n## Quando acionar\n## Limites\n## Procedimento\n## Skills\n## Entregáveis\n`);
  }
  put(root, '.agents/skills/bad-ref/SKILL.md', '---\nname: bad-ref\ndescription: Capacidade especializada e auditável para teste de contrato\n---\n## Ativação e propósito\n## Pré-condições\n## Procedimento\nExecute `node scripts/quality/script-fantasma.mjs`.\n## Validação\n## Falhas e limites\n## Entregáveis\n');
  const issues = checkAgentContracts(root);
  assert.ok(issues.some(i => i.includes('script referenciado inexistente')));
}));

test('specs: estrutura e cabeçalhos válidos', () => assert.deepEqual(validateSpecs(), []));

test('specs: estado ausente é reprovado', () => temp(root => {
  put(root, 'docs/specs/domain/SPEC-TEST-001.md', '# SPEC-TEST-001 — teste\n');
  assert.ok(validateSpecs(root).some(s => s.includes('Estado')));
}));

test('contexto Gemini: importações existentes', () => assert.deepEqual(validateImports(), []));

test('publicação: ignora nada no staging explicitamente confidencial', () => {
  assert.equal(checkPublicationScope(['.local/security/foo.mjs', 'GEMINI.md', '.env']).length, 3);
  assert.deepEqual(checkPublicationScope(['AGENTS.md', '.gemini/agents/developer.md']), []);
});

test('arquitetura: importações de framework no domínio falham', () => temp(root => {
  put(root, 'packages/domain/src/example.ts', "import {Injectable} from '@nestjs/common';");
  assert.equal(checkBoundaryFiles(root, ['packages/domain/src/example.ts']).length, 1);
  assert.equal(checkArchitecture(root).applicable, true);
}));

test('arquitetura: ORM e caminhos de infraestrutura no domínio são bloqueados', () => temp(root => {
  put(root, 'packages/domain/src/orm.ts', "import { PrismaClient } from '@prisma/client';");
  put(root, 'packages/domain/src/infra.ts', "import { repo } from '../infrastructure/repo';");
  assert.equal(checkBoundaryFiles(root, ['packages/domain/src/orm.ts', 'packages/domain/src/infra.ts']).length, 2);
}));

test('arquitetura: função pura no domínio passa', () => temp(root => {
  put(root, 'packages/domain/index.ts', 'export const points = (a,b) => a+b;');
  assert.deepEqual(checkBoundaryFiles(root, ['packages/domain/index.ts']), []);
}));

test('analytics: catálogo oficial da fundação passa', () => {
  const cat = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'docs/analytics/events.catalog.json'), 'utf8'));
  assert.deepEqual(validateEventCatalog(cat), []);
});

test('analytics: bloqueia propriedade PII e nome repetido', () => {
  const invalid = { schemaVersion: 1, events: [{ name: 'open', purpose: 'Acompanhar visitas na página', properties: ['user_email'], consentCategory: 'analytics' }, { name: 'open', purpose: 'Acompanhar uso do widget', properties: [], consentCategory: 'analytics' }] };
  assert.equal(validateEventCatalog(invalid).length, 2);
});

test('analytics: rejeita consentCategory inválida e ausência de schemaVersion', () => {
  const badConsent = { schemaVersion: 1, events: [{ name: 'click', purpose: 'Medir clique em botão', properties: [], consentCategory: 'ad_tracking' }] };
  assert.ok(validateEventCatalog(badConsent).some(msg => msg.includes('consentCategory')));
  assert.ok(validateEventCatalog({}).some(msg => msg.includes('Catálogo inválido')));
});

test('seo: metadados ausentes reprovados', () => assert.ok(validateSeoPages([{ path: '/pilotos' }]).length > 0));

test('seo: canonical não HTTPS e path sem barra são reprovados', () => {
  const badPages = [
    { path: 'pilotos', title: 'Pilotos', description: 'Desc', canonical: 'https://example.org/pilotos' },
    { path: '/circuitos', title: 'Circuitos', description: 'Desc', canonical: 'http://insecure.org/circuitos' },
    { path: '/equipes', title: 'Equipes', description: 'Desc', canonical: '/relativo' }
  ];
  const issues = validateSeoPages(badPages);
  assert.equal(issues.length, 3);
});

test('seo: contrato válido passa', () => assert.deepEqual(validateSeoPages([{ path: '/pilotos', title: 'Pilotos', description: 'Lista da temporada', canonical: 'https://example.org/pilotos' }]), []));
