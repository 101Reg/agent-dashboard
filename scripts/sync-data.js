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
const DIGEST_LOG = join(MEMORY_DIR, 'logs/session-digests.jsonl');
const SETTINGS = join(CLAUDE_DIR, 'settings.json');
const LEDGER = join(CLAUDE_DIR, 'night-shift/proposal-ledger.jsonl');
const PATTERN_REPORT = join(CLAUDE_DIR, 'pattern-report.md');
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
  // Start with every session from digests (includes clean sessions)
  const digestContent = await safeReadFile(DIGEST_LOG);
  const sessionMap = new Map();

  if (digestContent && digestContent.trim()) {
    const digests = digestContent.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    for (const d of digests) {
      sessionMap.set(d.session, {
        name: d.session,
        date: d.date,
        fixAttempts: 0, escalations: 0, reExplanations: 0, capabilityGaps: 0, toilEvents: 0, hookCatches: 0,
      });
    }
  }

  // Overlay friction counts from performance log (skipping resolved events)
  const perfContent = await safeReadFile(PERF_LOG);
  if (perfContent && perfContent.trim()) {
    const events = perfContent.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

    // Build resolved-key set from friction_resolved events.
    // Key = `${target_session}::${target_event}::${target_detail}` — exact match required.
    const resolved = new Set();
    for (const e of events) {
      if (e.event === 'friction_resolved' && e.target_session && e.target_event && e.target_detail) {
        resolved.add(`${e.target_session}::${e.target_event}::${e.target_detail}`);
      }
    }

    // Lane-renderable event types — skip noise like attribution/agent_deployment
    // pattern_detected is cross-session by design (fires on recurrence across sessions) —
    // surfaced in Bruce briefing, not in per-session lanes.
    const LANE_EVENTS = new Set(['fix_attempt', 'escalation', 're_explanation', 'capability_gap', 'toil', 'hook_catch']);

    for (const e of events) {
      if (e.event === 'friction_resolved') continue;
      const s = e.session || 'unknown';
      // Skip if this specific event has been marked resolved
      if (resolved.has(`${s}::${e.event}::${e.detail || ''}`)) continue;
      if (!sessionMap.has(s)) sessionMap.set(s, { name: s, date: e.date, fixAttempts: 0, escalations: 0, reExplanations: 0, capabilityGaps: 0, toilEvents: 0, hookCatches: 0, events: [] });
      const entry = sessionMap.get(s);
      if (!entry.events) entry.events = [];
      if (e.event === 'fix_attempt') entry.fixAttempts++;
      else if (e.event === 'escalation') entry.escalations++;
      else if (e.event === 're_explanation') entry.reExplanations++;
      else if (e.event === 'capability_gap') entry.capabilityGaps++;
      else if (e.event === 'toil') entry.toilEvents++;
      else if (e.event === 'hook_catch') entry.hookCatches++;
      if (LANE_EVENTS.has(e.event)) {
        entry.events.push({ event: e.event, agent: e.agent || null, detail: (e.detail || '').slice(0, 140) });
      }
    }
  }

  // Ensure every session has an events array (digest-only sessions have none)
  for (const s of sessionMap.values()) { if (!s.events) s.events = []; }

  const sessions = Array.from(sessionMap.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return { sessions, hasData: sessions.length > 0 };
}

// ─── Self-Improvement Log ────────────────────────────────────────────────────

async function getSelfImprovement() {
  const entries = [];

  // Pull pattern detections and capability gaps from performance log
  const perfContent = await safeReadFile(PERF_LOG);
  if (perfContent && perfContent.trim()) {
    const events = perfContent.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    for (const e of events) {
      if (e.event === 'pattern_detected' || e.event === 'capability_gap') {
        entries.push({ date: e.date, text: e.detail, context: e.context, high: e.event === 'pattern_detected' });
      }
    }
  }

  // Pull lessons learned from session digests
  const digestContent = await safeReadFile(DIGEST_LOG);
  if (digestContent && digestContent.trim()) {
    const digests = digestContent.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    for (const d of digests) {
      if (d.friction_summary && d.friction_summary !== 'None') {
        entries.push({ date: d.date, text: d.friction_summary + ' → ' + (d.lessons_saved?.length || 0) + ' lessons saved', context: d.session, high: false });
      }
    }
  }

  // Pull accepted proposals from Bruce
  const ledgerContent = await safeReadFile(LEDGER);
  if (ledgerContent && ledgerContent.trim()) {
    const lines = ledgerContent.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    for (const l of lines) {
      if (l.status?.startsWith('accepted')) {
        entries.push({ date: l.date, text: l.summary, context: 'Bruce proposal ' + l.id, high: true });
      }
    }
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date));
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
  const logAnalysis = await safeReadFile(join(latestDir, 'log-analysis.json'));
  if (!briefing) return null;

  // Coverage = agents with canary config + baseline score.
  // Walk dated dirs newest→oldest to find the most recent actual run score per agent.
  const configRaw = await safeReadFile(join(NIGHT_SHIFT_DIR, 'config.json'));
  const baselinesRaw = await safeReadFile(join(NIGHT_SHIFT_DIR, 'baselines.json'));
  let canaryConfig = {};
  let baselines = {};
  try { canaryConfig = JSON.parse(configRaw || '{}').canary_evals || {}; } catch {}
  try { baselines = JSON.parse(baselinesRaw || '{}'); } catch {}

  const mostRecentScores = {}; // agent -> { score, baseline, delta, date, stale }
  for (const dir of dateDirs) {
    const evalFile = await safeReadFile(join(NIGHT_SHIFT_DIR, dir, 'eval-results.json'));
    if (!evalFile) continue;
    for (const line of evalFile.trim().split('\n')) {
      try {
        const entry = JSON.parse(line);
        if (entry.score == null || entry.score === 'null') continue;
        if (mostRecentScores[entry.agent]) continue; // already have a newer entry
        mostRecentScores[entry.agent] = {
          score: parseFloat(entry.score),
          baseline: parseFloat(entry.baseline) || null,
          delta: parseFloat(entry.delta) || 0,
          date: dir,
        };
      } catch {}
    }
  }

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

  // Uses canaryConfig (line 262), baselines (line 263), mostRecentScores (line 265) — all defined above.
  // One evalCanary per configured agent. Prefer most recent run score; fall back to baseline.
  const evalCanaries = [];
  const today = new Date();
  const configuredAgents = Object.keys(canaryConfig);
  for (const agent of configuredAgents) {
    const recent = mostRecentScores[agent];
    const promptId = canaryConfig[agent].prompt_id || 'TC1';
    const baselineEntry = baselines[agent] && baselines[agent][promptId];
    const baselineScore = baselineEntry ? baselineEntry.score : null;

    if (recent) {
      const ageDays = Math.floor((today - new Date(recent.date)) / 86400000);
      evalCanaries.push({
        agent,
        score: recent.score,
        baseline: recent.baseline != null ? recent.baseline : baselineScore,
        delta: recent.delta,
        status: recent.delta < -1.0 ? 'DEGRADED' : recent.delta < -0.5 ? 'watch' : 'ok',
        lastRun: recent.date,
        stale: ageDays > 14,
        source: 'run',
      });
    } else if (baselineScore != null) {
      evalCanaries.push({
        agent,
        score: baselineScore,
        baseline: baselineScore,
        delta: 0,
        status: 'baseline',
        lastRun: baselineEntry.date || null,
        stale: true,
        source: 'baseline',
      });
    } else {
      evalCanaries.push({
        agent, score: null, baseline: null, delta: 0,
        status: 'unscored', stale: true, source: 'none',
      });
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

  const proposalsMd = await safeReadFile(join(latestDir, 'proposals.md'));

  // Parse proposals.md — split on Bruce's P-YYYY-MM-DD-NNN IDs
  const parsedProposals = [];
  if (proposalsMd && !/No proposals needed|failed to generate/i.test(proposalsMd)) {
    const sections = proposalsMd.split(/(?=\bP-\d{4}-\d{2}-\d{2}-\d+\b)/);
    for (const section of sections) {
      const idMatch = section.match(/\bP-\d{4}-\d{2}-\d{2}-\d+\b/);
      if (!idMatch) continue;
      const id = idMatch[0];
      const cat = (section.match(/\*{0,2}Category:\*{0,2}\s*(.+)/i) || [])[1];
      const prob = (section.match(/\*{0,2}Problem:\*{0,2}\s*(.+)/i) || [])[1];
      const sol = (section.match(/\*{0,2}Solution:\*{0,2}\s*(.+)/i) || [])[1];
      const clean = s => s ? s.trim().replace(/^[`*]+|[`*]+$/g, '').trim() : '';
      parsedProposals.push({
        id,
        category: clean(cat) || 'unknown',
        problem: clean(prob),
        solution: clean(sol),
      });
    }
  }
  const proposalCount = parsedProposals.length;

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
    const rawLines = ledgerFile.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    // Dedupe by id — latest line per id wins (ledger is append-only; newer status supersedes older)
    const latestById = new Map();
    for (const l of rawLines) { if (l.id) latestById.set(l.id, l); }
    const lines = Array.from(latestById.values());
    const accepted = lines.filter(l => l.status?.startsWith('accepted')).length;
    const pending = lines.filter(l => l.status === 'pending').length;
    proposalTrackRecord = { total: lines.length, accepted, pending, rejected: lines.filter(l => l.status === 'rejected').length };
    // Filter out accepted/rejected proposals from display — only show pending
    const pendingIds = new Set(lines.filter(l => l.status === 'pending').map(l => l.id));
    if (parsedProposals.length > 0) {
      const filtered = parsedProposals.filter(p => pendingIds.has(p.id));
      parsedProposals.length = 0;
      filtered.forEach(p => parsedProposals.push(p));
    }
    // Fall back to pending ledger entries if proposals.md had nothing
    if (parsedProposals.length === 0) {
      lines.filter(l => l.status === 'pending').forEach(l => {
        parsedProposals.push({ id: l.id || '', category: l.category || 'unknown', problem: l.summary || '', solution: '' });
      });
    }
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
    frictionTrends, proposalCount, proposals: parsedProposals, actionRequired, briefingContent: briefing,
    domainFrequency, agentUsage, skillGaps, memoryHealth, proposalTrackRecord, benchmarks,
  };
}

// ─── Timeline ────────────────────────────────────────────────────────────────

async function getTimeline() {
  const milestones = [
    { date: 'Apr 4-5, 2026', title: 'Security Hardening', desc: 'Auth flow fixes, feedback system, Webflow security audit', sortDate: '2026-04-05' },
    { date: 'Mar 31 – Apr 3, 2026', title: 'Mirror Build 3.0', desc: 'Full app shipped in 4 parallel sessions — check-ins, budgets, insights, onboarding', sortDate: '2026-04-03' },
    { date: 'Mar 30, 2026', title: 'Mirror JS Migration', desc: 'Embeds moved to Cloudflare Pages, eliminated Webflow inline script limits', sortDate: '2026-03-30' },
    { date: 'Mar 29, 2026', title: 'Agent OS v2.0', desc: 'Harness alignment — 22 fixes across 3 tiers, all agents on official spec', sortDate: '2026-03-29' },
    { date: 'Mar 25-28, 2026', title: 'Edge MVP', desc: 'Multi-agent trading intelligence PWA — 5,000 lines, 70 files, 8 sprints', sortDate: '2026-03-28' },
    { date: 'Mar 22-24, 2026', title: '38twelve Agency Launch', desc: 'AI agency brand, intake chatbot, email system — shipped in 3 days', sortDate: '2026-03-24' },
    { date: 'Mar 21, 2026', title: 'Orchard Terminal', desc: 'Frosted glass Electron terminal — built and packaged as .app in one day', sortDate: '2026-03-21' },
    { date: 'Mar 20, 2026', title: 'Mirror Research Phase', desc: 'Deep behavioral research — 8 sources, 29-page strategy doc', sortDate: '2026-03-20' },
  ];
  const digestContent = await safeReadFile(DIGEST_LOG);
  const existingSortDates = new Set(milestones.map(m => m.sortDate));
  if (digestContent && digestContent.trim()) {
    const digests = digestContent.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const byDate = new Map();
    for (const d of digests) {
      if (!byDate.has(d.date)) byDate.set(d.date, []);
      byDate.get(d.date).push(d);
    }
    for (const [date, sessions] of byDate) {
      if (existingSortDates.has(date)) continue;
      const allTasks = sessions.flatMap(s => s.tasks || []);
      const title = sessions.length === 1
        ? sessions[0].session.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : sessions.length + ' sessions';
      const desc = allTasks.slice(0, 3).join(', ');
      const d = new Date(date + 'T12:00:00');
      const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      milestones.push({ date: formatted, title, desc, sortDate: date });
    }
  }
  milestones.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
  if (milestones.length > 0) { milestones.forEach(m => { m.active = false; }); milestones[0].active = true; }
  return milestones.map(({ sortDate, ...rest }) => rest);
}

// ─── Patterns (Layer 2) ──────────────────────────────────────────────────────

async function getPatterns() {
  const content = await safeReadFile(PATTERN_REPORT);
  if (!content) return { hasData: false, findings: [], generated: null };

  const generated = (content.match(/# Pattern Report — generated (.+)/) || [])[1] || null;
  const findings = [];
  const sections = content.split(/^### /m).slice(1);
  for (const sec of sections) {
    const lines = sec.split('\n');
    const heading = lines[0].trim();
    const bullets = lines.filter(l => l.startsWith('- ')).map(l => l.slice(2));
    const observed = (bullets.find(b => b.startsWith('Observed:')) || '').replace('Observed:', '').trim();
    const signature = (bullets.find(b => b.startsWith('Signature:')) || '').replace('Signature:', '').trim();
    const suggested = (bullets.find(b => b.startsWith('Suggested fix:')) || '').replace('Suggested fix:', '').trim();
    findings.push({ heading, observed, signature, suggested });
  }
  return { hasData: true, findings: findings.slice(0, 10), generated };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Syncing Agent OS data...');

  // getTimeline defined at line 394 of this file
  const [agents, memory, metrics, selfImprovement, system, nightShift, timeline, patterns] = await Promise.all([
    getAgents(),
    getMemory(),
    getMetrics(),
    getSelfImprovement(),
    getSystemCounts(),
    getNightShift(),
    getTimeline(),
    getPatterns(),
  ]);

  const data = {
    agents,
    agentCount: agents.length,
    escalationPaths: ESCALATION_PATHS,
    metrics,
    memory,
    system,
    timeline,
    selfImprovement,
    nightShift,
    patterns,
    lastUpdated: new Date().toISOString(),
  };

  await writeFile(OUTPUT, JSON.stringify(data, null, 2));
  console.log(`Written to ${OUTPUT}`);
  console.log(`  Agents: ${agents.length}`);
  console.log(`  Memory: ${memory.total} files (${Object.entries(memory.byType).map(([k,v]) => `${v} ${k}`).join(', ')})`);
  console.log(`  Skills: ${system.skills}, Rules: ${system.rules}, Hooks: ${system.hooks}, MCPs: ${system.mcpServers}`);
  console.log(`  Metrics: ${metrics.hasData ? metrics.sessions.length + ' sessions' : 'no data yet'}`);
  console.log(`  Self-improvement entries: ${selfImprovement.length}`);
  console.log(`  Patterns: ${patterns.hasData ? patterns.findings.length + ' finding(s)' : 'no report yet'}`);
}

main().catch(err => { console.error(err); process.exit(1); });
