import { readdir, readFile, stat } from 'fs/promises';
import { writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { homedir } from 'os';

const HOME = homedir();
const CLAUDE_DIR = join(HOME, '.claude');
const MEMORY_DIR = join(HOME, '.claude/projects/-Users-reggie/memory');
const AGENTS_DIR = join(CLAUDE_DIR, 'agents');
const SKILLS_DIR = join(CLAUDE_DIR, 'skills');
const RULES_DIR = join(CLAUDE_DIR, 'rules');
const PERF_LOG = join(MEMORY_DIR, 'logs/os-performance.jsonl');
const SETTINGS = join(CLAUDE_DIR, 'settings.json');
const OUTPUT = join(import.meta.dirname, '..', 'public', 'data.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      fm[key] = val;
    }
  }
  return fm;
}

async function safeReadFile(path) {
  try { return await readFile(path, 'utf-8'); } catch { return null; }
}

async function safeReaddir(path) {
  try { return await readdir(path); } catch { return []; }
}

async function countDirs(path, filter) {
  const entries = await safeReaddir(path);
  let count = 0;
  for (const entry of entries) {
    try {
      const s = await stat(join(path, entry));
      if (s.isDirectory() && (!filter || filter(entry))) {
        const skillFile = join(path, entry, 'SKILL.md');
        try { await stat(skillFile); count++; } catch {}
      }
    } catch {}
  }
  return count;
}

// ─── Agents ──────────────────────────────────────────────────────────────────

const AGENT_META = {
  'chief-of-staff': { alias: 'Hero', icon: '🎯', type: 'Strategic' },
  'developer': { alias: 'Tony', icon: '⚡', type: 'Implementation' },
  'debug': { alias: 'Gil', icon: '🔍', type: 'Diagnostic' },
  'product': { alias: 'Ye', icon: '🧭', type: 'Strategy' },
  'data': { alias: 'Elon', icon: '📊', type: 'Analytical' },
  'marketer': { alias: 'Sky', icon: '📣', type: 'Marketing' },
  'finance': { alias: 'Warren', icon: '💰', type: 'Strategy' },
  'legal': { alias: 'Johnny', icon: '⚖️', type: 'Compliance' },
  'customer-success': { alias: 'Taylor', icon: '💬', type: 'Operations' },
  'research': { alias: null, icon: '🧬', type: 'Intelligence' },
  'fact-checker': { alias: 'Tucker', icon: '✅', type: 'Quality' },
  'reviewer': { alias: null, icon: '🔎', type: 'Quality' },
  'night-shift': { alias: 'Bruce', icon: '🌙', type: 'Autonomous' },
};

async function getAgents() {
  const files = await safeReaddir(AGENTS_DIR);
  const agents = [];
  for (const f of files) {
    if (!f.endsWith('.md') || f === 'shared-context.md') continue;
    const name = f.replace('.md', '');
    const content = await safeReadFile(join(AGENTS_DIR, f));
    const fm = content ? parseFrontmatter(content) : {};
    const meta = AGENT_META[name] || { alias: null, icon: '🤖', type: 'General' };
    agents.push({
      name: meta.alias || fm.name || name,
      file: name,
      role: fm.description || name,
      icon: meta.icon,
      type: meta.type,
      status: 'active',
    });
  }
  return agents;
}

// ─── Escalation Paths (stable, derived from agent analysis) ──────────────────

const ESCALATION_PATHS = [
  { from: 'developer', to: 'debug', label: 'After 3 failed fixes', freq: 'high' },
  { from: 'debug', to: 'developer', label: 'Diagnosis → fix handback', freq: 'high' },
  { from: 'debug', to: 'chief-of-staff', label: 'Unresolved issues', freq: 'medium' },
  { from: 'product', to: 'data', label: 'Needs quantitative validation', freq: 'medium' },
  { from: 'product', to: 'customer-success', label: 'Needs user feedback', freq: 'medium' },
  { from: 'product', to: 'research', label: 'Needs market data', freq: 'low' },
  { from: 'customer-success', to: 'chief-of-staff', label: 'Churn threats', freq: 'medium' },
  { from: 'reviewer', to: 'chief-of-staff', label: 'After 3 fail cycles', freq: 'low' },
  { from: 'finance', to: 'legal', label: 'Compliance implications', freq: 'low' },
  { from: 'legal', to: 'developer', label: 'Implementation needs', freq: 'low' },
  { from: 'marketer', to: 'research', label: 'Market intelligence', freq: 'medium' },
  { from: 'data', to: 'product', label: 'Pattern implications', freq: 'medium' },
];

// ─── Memory ──────────────────────────────────────────────────────────────────

async function getMemory() {
  const files = await safeReaddir(MEMORY_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'MEMORY.md');
  const byType = { feedback: 0, project: 0, user: 0, reference: 0, other: 0 };
  const labels = { feedback: [], project: [], user: [], reference: [] };

  for (const f of mdFiles) {
    const content = await safeReadFile(join(MEMORY_DIR, f));
    const fm = content ? parseFrontmatter(content) : {};
    const type = fm.type || 'other';
    if (byType[type] !== undefined) {
      byType[type]++;
      if (labels[type]) labels[type].push(f.replace('.md', ''));
    } else {
      byType.other++;
    }
  }

  return { total: mdFiles.length + 1, byType, labels };
}

// ─── Performance Metrics ─────────────────────────────────────────────────────

async function getMetrics() {
  const content = await safeReadFile(PERF_LOG);
  if (!content || !content.trim()) {
    return { sessions: [], hasData: false };
  }

  const events = content.trim().split('\n').map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  // Group by session
  const sessionMap = new Map();
  for (const e of events) {
    const s = e.session || 'unknown';
    if (!sessionMap.has(s)) sessionMap.set(s, []);
    sessionMap.get(s).push(e);
  }

  const sessions = [];
  for (const [name, evts] of sessionMap) {
    sessions.push({
      name,
      date: evts[0]?.date || null,
      fixAttempts: evts.filter(e => e.event === 'fix_attempt').length,
      escalations: evts.filter(e => e.event === 'escalation').length,
      reExplanations: evts.filter(e => e.event === 're_explanation').length,
      capabilityGaps: evts.filter(e => e.event === 'capability_gap').length,
      toilEvents: evts.filter(e => e.event === 'toil').length,
    });
  }

  return { sessions, hasData: sessions.length > 0 };
}

// ─── Self-Improvement Log ────────────────────────────────────────────────────

async function getSelfImprovement() {
  const content = await safeReadFile(PERF_LOG);
  const entries = [];

  // Pull from performance log
  if (content && content.trim()) {
    const events = content.trim().split('\n').map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    for (const e of events) {
      if (e.event === 'pattern_detected' || e.event === 'capability_gap') {
        entries.push({ date: e.date, text: e.detail, context: e.context, high: e.event === 'pattern_detected' });
      }
    }
  }

  // Always include verified system milestones
  const milestones = [
    { date: '2026-03-29', text: 'Agent OS harness alignment — 22 fixes across 3 tiers, all agents aligned to official spec', high: true },
    { date: '2026-03-29', text: 'Detected recurring debug loops across sessions → built dedicated Debug agent (Gil)', high: true },
    { date: '2026-03-22', text: 'Setup audit revealed trigger conflicts and stale tester counts → comprehensive system fix', high: true },
    { date: '2026-03-30', text: 'Mirror JS migration eliminated inline script limits → moved to Cloudflare Pages', high: false },
    { date: '2026-04-03', text: 'Build 3.0 audit caught subscription filter bug → fixed before tester exposure', high: false },
  ];

  return [...entries, ...milestones].sort((a, b) => b.date.localeCompare(a.date));
}

// ─── System Counts ───────────────────────────────────────────────────────────

async function getSystemCounts() {
  const skillCount = await countDirs(SKILLS_DIR);
  const ruleFiles = (await safeReaddir(RULES_DIR)).filter(f => f.endsWith('.md'));
  const settingsContent = await safeReadFile(SETTINGS);
  let hookCount = 0;
  if (settingsContent) {
    try {
      const settings = JSON.parse(settingsContent);
      const hooks = settings.hooks || {};
      for (const trigger of Object.values(hooks)) {
        if (Array.isArray(trigger)) hookCount += trigger.length;
      }
    } catch {}
  }

  return {
    skills: skillCount,
    rules: ruleFiles.length,
    hooks: hookCount,
    mcpServers: 2, // Tavily + Context7 (verified working)
  };
}

// ─── Night Shift ─────────────────────────────────────────────────────────────

const NIGHT_SHIFT_DIR = join(CLAUDE_DIR, 'night-shift');

async function getNightShift() {
  const entries = await safeReaddir(NIGHT_SHIFT_DIR);
  const dateDirs = entries.filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e)).sort().reverse();
  if (dateDirs.length === 0) return null;

  const latestDir = join(NIGHT_SHIFT_DIR, dateDirs[0]);
  const briefing = await safeReadFile(join(latestDir, 'briefing.md'));
  const evalResults = await safeReadFile(join(latestDir, 'eval-results.json'));
  const logAnalysis = await safeReadFile(join(latestDir, 'log-analysis.json'));
  if (!briefing) return null;

  const statusMatch = briefing.match(/## Status:\s*(GREEN|YELLOW|RED)/);
  const status = statusMatch ? statusMatch[1] : 'GREEN';
  const actionRequired = /Action Required:\s*YES/.test(briefing);

  const findings = [];
  const findingsMatch = briefing.match(/## Key Findings\n([\s\S]*?)(?=\n## )/);
  if (findingsMatch) {
    for (const line of findingsMatch[1].split('\n')) {
      const trimmed = line.replace(/^- /, '').trim();
      if (trimmed) findings.push(trimmed);
    }
  }

  const evalCanaries = [];
  if (evalResults) {
    for (const line of evalResults.trim().split('\n')) {
      try {
        const entry = JSON.parse(line);
        evalCanaries.push({
          agent: entry.agent, score: entry.score || null,
          baseline: entry.baseline || null, delta: entry.delta || 0,
          status: entry.error ? 'error' : (entry.delta < -1.0 ? 'DEGRADED' : entry.delta < -0.5 ? 'watch' : 'ok'),
          error: entry.error || null,
        });
      } catch {}
    }
  }

  let frictionTrends = null;
  if (logAnalysis) {
    try {
      const analysis = JSON.parse(logAnalysis);
      if (analysis.seven_day) {
        frictionTrends = {
          fix_attempts: analysis.seven_day.fix_attempts || 0,
          escalations: analysis.seven_day.escalations || 0,
          hook_catches: analysis.seven_day.hook_catches || 0,
        };
      }
    } catch {}
  }

  const proposals = await safeReadFile(join(latestDir, 'proposals.md'));
  let proposalCount = 0;
  if (proposals && !/No proposals needed/.test(proposals)) {
    proposalCount = (proposals.match(/^## Proposal|^### Proposal|^[0-9]+\./gm) || []).length;
  }

  // Parse new learning data
  let domainFrequency = [];
  let agentUsage = [];
  let skillGaps = [];
  let memoryHealth = null;
  let proposalTrackRecord = null;

  if (logAnalysis) {
    try {
      const analysis = JSON.parse(logAnalysis);
      domainFrequency = (analysis.domain_frequency_7d || []).slice(0, 8);
      agentUsage = (analysis.agent_usage_7d || []).slice(0, 8);
    } catch {}
  }

  const skillGapsFile = await safeReadFile(join(latestDir, 'skill-gaps.json'));
  if (skillGapsFile) {
    try { skillGaps = JSON.parse(skillGapsFile).gaps || []; } catch {}
  }

  const memoryTrendsFile = await safeReadFile(join(latestDir, 'memory-trends.json'));
  if (memoryTrendsFile) {
    try {
      const mt = JSON.parse(memoryTrendsFile);
      const consolidation = (mt.clusters || []).filter(c => c.flag === 'consolidation_candidate');
      memoryHealth = { total: mt.total_memories || 0, consolidationCandidates: consolidation };
    } catch {}
  }

  const ledgerFile = await safeReadFile(join(NIGHT_SHIFT_DIR, 'proposal-ledger.jsonl'));
  if (ledgerFile && ledgerFile.trim()) {
    const lines = ledgerFile.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const accepted = lines.filter(l => l.status?.startsWith('accepted')).length;
    const pending = lines.filter(l => l.status === 'pending').length;
    proposalTrackRecord = { total: lines.length, accepted, pending, rejected: lines.filter(l => l.status === 'rejected').length };
  }

  // Parse benchmarks from briefing
  let benchmarks = null;
  const benchmarkMatch = briefing.match(/## Benchmarks\n\|[^\n]+\n\|[^\n]+\n([\s\S]*?)(?=\n## )/);
  if (benchmarkMatch) {
    benchmarks = [];
    for (const line of benchmarkMatch[1].split('\n')) {
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 3 && cols[0] !== '---') {
        benchmarks.push({ name: cols[0], status: cols[1], detail: cols[2] });
      }
    }
  }

  return {
    status, lastRun: dateDirs[0], findings, evalCanaries,
    frictionTrends, proposalCount, actionRequired, briefingContent: briefing,
    domainFrequency, agentUsage, skillGaps, memoryHealth, proposalTrackRecord, benchmarks,
  };
}

// ─── Timeline ────────────────────────────────────────────────────────────────

const TIMELINE = [
  { date: 'Apr 4-5, 2026', title: 'Security Hardening', desc: 'Auth flow fixes, feedback system, Webflow security audit', active: true },
  { date: 'Mar 31 – Apr 3, 2026', title: 'Mirror Build 3.0', desc: 'Full app shipped in 4 parallel sessions — check-ins, budgets, insights, onboarding' },
  { date: 'Mar 30, 2026', title: 'Mirror JS Migration', desc: 'Embeds moved to Cloudflare Pages, eliminated Webflow inline script limits' },
  { date: 'Mar 29, 2026', title: 'Agent OS v2.0', desc: 'Harness alignment — 22 fixes across 3 tiers, all agents on official spec' },
  { date: 'Mar 25-28, 2026', title: 'Edge MVP', desc: 'Multi-agent trading intelligence PWA — 5,000 lines, 70 files, 8 sprints' },
  { date: 'Mar 22-24, 2026', title: '38twelve Agency Launch', desc: 'AI agency brand, intake chatbot, email system — shipped in 3 days' },
  { date: 'Mar 21, 2026', title: 'Orchard Terminal', desc: 'Frosted glass Electron terminal — built and packaged as .app in one day' },
  { date: 'Mar 20, 2026', title: 'Mirror Research Phase', desc: 'Deep behavioral research — 8 sources, 29-page strategy doc' },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Syncing Agent OS data...');

  const [agents, memory, metrics, selfImprovement, system, nightShift] = await Promise.all([
    getAgents(),
    getMemory(),
    getMetrics(),
    getSelfImprovement(),
    getSystemCounts(),
    getNightShift(),
  ]);

  const data = {
    agents,
    agentCount: agents.length,
    escalationPaths: ESCALATION_PATHS,
    metrics,
    memory,
    system,
    timeline: TIMELINE,
    selfImprovement,
    nightShift,
    lastUpdated: new Date().toISOString(),
  };

  await writeFile(OUTPUT, JSON.stringify(data, null, 2));
  console.log(`Written to ${OUTPUT}`);
  console.log(`  Agents: ${agents.length}`);
  console.log(`  Memory: ${memory.total} files (${Object.entries(memory.byType).map(([k,v]) => `${v} ${k}`).join(', ')})`);
  console.log(`  Skills: ${system.skills}, Rules: ${system.rules}, Hooks: ${system.hooks}, MCPs: ${system.mcpServers}`);
  console.log(`  Metrics: ${metrics.hasData ? metrics.sessions.length + ' sessions' : 'no data yet'}`);
  console.log(`  Self-improvement entries: ${selfImprovement.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
