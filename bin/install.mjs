#!/usr/bin/env node
/**
 * vps-hybrid-networking — skill installer
 *
 * Copies the bundled skill folder (skills/vps-hybrid-networking) into the
 * skills directory of your agentic CLI(s). Nothing more.
 *
 * Security properties, by design:
 *   - Zero dependencies: Node.js standard library only.
 *   - No network access and no child processes: this script never downloads
 *     or executes anything. It only copies files that ship inside this
 *     package.
 *   - No install hooks: package.json defines no lifecycle scripts, so
 *     `npm install` / `npx` run nothing implicitly — this file runs only
 *     when you invoke it.
 *   - Destinations are a fixed allow-list of well-known agent folders
 *     (below). The skill name is a constant, and every destination is
 *     verified to stay inside its allow-listed folder before copying.
 *
 * Usage:
 *   npx vps-hybrid-networking                 auto-detect installed agents
 *   npx vps-hybrid-networking --all           install for every known agent
 *   npx vps-hybrid-networking --agent claude-code,antigravity
 *   npx vps-hybrid-networking --list          list known agents and paths
 *   npx vps-hybrid-networking --dry-run       show what would happen
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_NAME = 'vps-hybrid-networking';
if (SKILL_NAME.includes('/') || SKILL_NAME.includes('\\') || SKILL_NAME.includes('..')) {
  throw new Error('Invalid skill name constant.');
}

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(pkgRoot, 'skills', SKILL_NAME);
if (!existsSync(join(source, 'SKILL.md'))) {
  console.error(`Bundled skill not found at ${source}. Aborting, nothing was copied.`);
  process.exit(1);
}

const home = homedir();
// Hermes Agent keeps its home in ~/.hermes on POSIX, but a native Windows
// install lives in %LOCALAPPDATA%\hermes — resolve per platform.
const hermesHome = process.platform === 'win32'
  ? join(process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local'), 'hermes')
  : join(home, '.hermes');

const TARGETS = {
  'claude-code': { label: 'Claude Code', skillsDir: join(home, '.claude', 'skills'), detectDir: join(home, '.claude') },
  'antigravity': { label: 'Antigravity', skillsDir: join(home, '.gemini', 'config', 'skills'), detectDir: join(home, '.gemini') },
  'codex': { label: 'Codex / agents standard', skillsDir: join(home, '.agents', 'skills'), detectDir: join(home, '.agents') },
  'gemini-cli': { label: 'Gemini CLI', skillsDir: join(home, '.gemini', 'skills'), detectDir: join(home, '.gemini') },
  'opencode': { label: 'OpenCode', skillsDir: join(home, '.config', 'opencode', 'skills'), detectDir: join(home, '.config', 'opencode') },
  'cursor': { label: 'Cursor', skillsDir: join(home, '.cursor', 'skills'), detectDir: join(home, '.cursor') },
  'hermes': { label: 'Hermes Agent', skillsDir: join(hermesHome, 'skills'), detectDir: hermesHome },
  'cline': { label: 'Cline', skillsDir: join(home, '.agents', 'skills'), detectDir: join(home, '.cline') },
  'roo': { label: 'Roo Code', skillsDir: join(home, '.roo', 'skills'), detectDir: join(home, '.roo') },
  'goose': { label: 'Goose', skillsDir: join(home, '.config', 'goose', 'skills'), detectDir: join(home, '.config', 'goose') },
  'amp': { label: 'Amp', skillsDir: join(home, '.config', 'agents', 'skills'), detectDir: join(home, '.config', 'amp') },
  'windsurf': { label: 'Windsurf', skillsDir: join(home, '.codeium', 'windsurf', 'skills'), detectDir: join(home, '.codeium') },
  'kiro-cli': { label: 'Kiro CLI', skillsDir: join(home, '.kiro', 'skills'), detectDir: join(home, '.kiro') },
  'qwen-code': { label: 'Qwen Code', skillsDir: join(home, '.qwen', 'skills'), detectDir: join(home, '.qwen') },
  'github-copilot': { label: 'GitHub Copilot', skillsDir: join(home, '.copilot', 'skills'), detectDir: join(home, '.copilot') },
  'trae': { label: 'Trae', skillsDir: join(home, '.trae', 'skills'), detectDir: join(home, '.trae') },
  'continue': { label: 'Continue', skillsDir: join(home, '.continue', 'skills'), detectDir: join(home, '.continue') },
};

function parseArgs(argv) {
  const opts = { agents: [], all: false, list: false, dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') opts.all = true;
    else if (a === '--list') opts.list = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--agent' || a === '-a') {
      const v = argv[++i];
      if (!v) throw new Error('--agent needs a value, e.g. --agent claude-code');
      opts.agents.push(...v.split(',').map((s) => s.trim()).filter(Boolean));
    } else if (a.startsWith('--agent=')) {
      opts.agents.push(...a.slice('--agent='.length).split(',').map((s) => s.trim()).filter(Boolean));
    } else {
      throw new Error(`Unknown argument: ${a} (try --help)`);
    }
  }
  return opts;
}

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countFiles(join(dir, entry.name));
    else if (entry.isFile()) n += 1;
  }
  return n;
}

function installInto(id, target, dryRun) {
  const dest = resolve(join(target.skillsDir, SKILL_NAME));
  // Containment check: the destination must stay inside the allow-listed folder.
  if (!dest.startsWith(resolve(target.skillsDir) + sep)) {
    throw new Error(`Refusing to copy outside the skills folder: ${dest}`);
  }
  const existed = existsSync(dest);
  if (dryRun) {
    console.log(`  [dry-run] ${target.label}: would copy -> ${dest}`);
    return;
  }
  mkdirSync(target.skillsDir, { recursive: true });
  // dereference: false — never follow symlinks out of the bundled package.
  cpSync(source, dest, { recursive: true, dereference: false });
  console.log(`  ${target.label}: ${existed ? 'updated' : 'installed'} -> ${dest} (${countFiles(dest)} files)`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    console.log('Usage: npx vps-hybrid-networking [--all] [--agent <ids>] [--list] [--dry-run]');
    console.log(`Known agents: ${Object.keys(TARGETS).join(', ')}`);
    return;
  }
  if (opts.list) {
    for (const [id, t] of Object.entries(TARGETS)) {
      console.log(`${id.padEnd(12)} ${t.label.padEnd(24)} ${join(t.skillsDir, SKILL_NAME)}`);
    }
    return;
  }

  let ids;
  if (opts.all) {
    ids = Object.keys(TARGETS);
  } else if (opts.agents.length > 0) {
    const unknown = opts.agents.filter((a) => !TARGETS[a]);
    if (unknown.length > 0) {
      console.error(`Unknown agent(s): ${unknown.join(', ')}. Known: ${Object.keys(TARGETS).join(', ')}`);
      process.exit(1);
    }
    ids = [...new Set(opts.agents)];
  } else {
    ids = Object.keys(TARGETS).filter((id) => existsSync(TARGETS[id].detectDir));
    if (ids.length === 0) {
      ids = ['codex'];
      console.log('No known agent folder detected; installing to the shared agents location (~/.agents/skills).');
    } else {
      console.log(`Detected: ${ids.map((id) => TARGETS[id].label).join(', ')}`);
    }
  }

  // De-duplicate destinations (several agents can share one skills folder).
  const seen = new Set();
  console.log(`${opts.dryRun ? 'Would install' : 'Installing'} ${SKILL_NAME} from ${source}`);
  for (const id of ids) {
    const target = TARGETS[id];
    if (seen.has(target.skillsDir)) {
      console.log(`  ${target.label}: same folder as an earlier target, skipped`);
      continue;
    }
    seen.add(target.skillsDir);
    installInto(id, target, opts.dryRun);
  }
  console.log('Done. Nothing was downloaded and nothing was executed — files were only copied.');
}

main();
