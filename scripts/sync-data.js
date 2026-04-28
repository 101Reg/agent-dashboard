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
const TOOL_CALL_LOG = join(MEMORY_DIR, 'logs/os-performance-tool-calls.jsonl');
const DIGEST_LOG = join(MEMORY_DIR, 'logs/session-digests.jsonl');
const SETTINGS = join(CLAUDE_DIR, 'settings.json');
const LEDGER = join(CLAUDE_DIR, 'night-shift/proposal-ledger.jsonl');
const PATTERN_REPORT = join(CLAUDE_DIR, 'pattern-report.md');
const CONSOLIDATION_REPORT = join(CLAUDE_DIR, 'consolidation-report.md');
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

// escalationPaths removed — Agent Map tab was retired; no renderer references this data

// ─── Memory ──────────────────────────────────────────────────────────────────

async function getMemory() {
  const files = await safeReaddir(MEMORY_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'MEMORY.md');
  const byType = { feedback: 0, project: 0, user: 0, reference: 0, other: 0 };
  // memory.labels removed — Memory Brain graph was retired; no renderer references this data

  for (const f of mdFiles) {
    const content = await safeReadFile(join(MEMORY_DIR, f));
    const fm = content ? parseFrontmatter(content) : {};
    const type = fm.type || 'other';
    if (byType[type] !== undefined) {
      byType[type]++;
    } else {
      byType.other++;
    }
  }

  return { total: mdFiles.length + 1, byType };
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

  // Slice to 15 most recent — log is 216+ entries, noise beyond this
  return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
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
// Auto-populated from two sources:
//   1. Sprint history parsed from ~/.claude/projects/-Users-reggie/memory/project_agent_os.md (### Sprint history section)
//   2. Session digests from session-digests.jsonl (fills in any date gaps)
// Static hardcoded milestones removed — timeline now self-updates on each sync.

const SPRINT_HISTORY_FILE = join(MEMORY_DIR, 'project_agent_os.md');

async function getTimeline() {
  const milestones = [];

  // Static pre-sprint milestones (pre-Apr-19 work, not in sprint history)
  const staticMilestones = [
    { date: 'Apr 4-5, 2026', title: 'Security Hardening', desc: 'Auth flow fixes, feedback system, Webflow security audit', sortDate: '2026-04-05' },
    { date: 'Mar 31 – Apr 3, 2026', title: 'Mirror Build 3.0', desc: 'Full app shipped in 4 parallel sessions — check-ins, budgets, insights, onboarding', sortDate: '2026-04-03' },
    { date: 'Mar 30, 2026', title: 'Mirror JS Migration', desc: 'Embeds moved to Cloudflare Pages, eliminated Webflow inline script limits', sortDate: '2026-03-30' },
    { date: 'Mar 29, 2026', title: 'Agent OS v2.0', desc: 'Harness alignment — 22 fixes across 3 tiers, all agents on official spec', sortDate: '2026-03-29' },
    { date: 'Mar 25-28, 2026', title: 'Edge MVP', desc: 'Multi-agent trading intelligence PWA — 5,000 lines, 70 files, 8 sprints', sortDate: '2026-03-28' },
    { date: 'Mar 22-24, 2026', title: '38twelve Agency Launch', desc: 'AI agency brand, intake chatbot, email system — shipped in 3 days', sortDate: '2026-03-24' },
    { date: 'Mar 21, 2026', title: 'Orchard Terminal', desc: 'Frosted glass Electron terminal — built and packaged as .app in one day', sortDate: '2026-03-21' },
    { date: 'Mar 20, 2026', title: 'Mirror Research Phase', desc: 'Deep behavioral research — 8 sources, 29-page strategy doc', sortDate: '2026-03-20' },
  ];
  milestones.push(...staticMilestones);

  // Parse sprint history from project_agent_os.md (### Sprint history section)
  const sprintContent = await safeReadFile(SPRINT_HISTORY_FILE);
  if (sprintContent) {
    const match = sprintContent.match(/### Sprint history\n([\s\S]*?)(?=\n###|\n##|$)/);
    if (match) {
      const lines = match[1].split('\n').filter(l => l.trim().startsWith('- **Sprint'));
      for (const line of lines) {
        // Format: - **Sprint N** (YYYY-MM-DD): Title. Description
        const sprintMatch = line.match(/\*\*Sprint (\d+)\*\*\s*\(([^)]+)\):\s*([^.]+)\.\s*(.*)/);
        if (!sprintMatch) continue;
        const [, num, rawDate, title, desc] = sprintMatch;
        // rawDate is like "2026-04-19" or "2026-04-20"
        const d = new Date(rawDate + 'T12:00:00');
        const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        milestones.push({
          date: formatted,
          title: 'Sprint ' + num + ' — ' + title.trim(),
          desc: desc.trim().replace(/\s+/g, ' ').slice(0, 200),
          sortDate: rawDate,
        });
      }
    }
  }

  const existingSortDates = new Set(milestones.map(m => m.sortDate));

  // Fill remaining gaps from session digests
  const digestContent = await safeReadFile(DIGEST_LOG);
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

// ─── Consolidation (Layer 5) ─────────────────────────────────────────────────

async function getConsolidation() {
  const content = await safeReadFile(CONSOLIDATION_REPORT);
  if (!content) return { hasData: false, findings: [], generated: null };

  const generated = (content.match(/# Consolidation Report — generated (.+)/) || [])[1] || null;
  const findings = [];
  const sections = content.split(/^### /m).slice(1);
  for (const sec of sections) {
    const lines = sec.split('\n');
    const heading = lines[0].trim();
    const bullets = lines.filter(l => l.startsWith('- ')).map(l => l.slice(2));
    const ratio = (bullets.find(b => b.startsWith('Overlap ratio:')) || bullets.find(b => b.startsWith('Similarity:')) || '').replace(/^[^:]+:\s*/, '').trim();
    const merge = (bullets.find(b => b.startsWith('Merge safety:')) || '').replace('Merge safety:', '').trim();
    const action = (bullets.find(b => b.startsWith('Suggested action:')) || '').replace('Suggested action:', '').trim();
    findings.push({ heading, ratio, merge, action });
  }
  return { hasData: true, findings: findings.slice(0, 10), generated };
}

// ─── Project Scorecards (Phase 4) ───────────────────────────────────────────

async function getProjects() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  // Signal log: capability_gap / fix_attempt / friction_resolved / code_shape / template_used
  // Tool-call log: every PostToolUse event (where universal-logger tags project most reliably)
  const [signalRaw, toolCallRaw] = await Promise.all([
    safeReadFile(PERF_LOG),
    safeReadFile(TOOL_CALL_LOG),
  ]);

  const parseLines = raw => raw && raw.trim()
    ? raw.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    : [];

  const signalEvents = parseLines(signalRaw);
  const toolCallEvents = parseLines(toolCallRaw);

  // Project ID set: union of both logs, last 30 days, excluding "none"/"unknown"
  // and obvious test fixtures (any id ending in -test, starting with test-, or matching common throwaway names).
  const TEST_FIXTURE_PATTERNS = [/-test$/, /^test-/, /^injection-/, /^inject-/, /-canary$/, /^final-check$/, /^happy-path$/, /^review-test$/, /^log-test$/, /^kin-replay$/];
  const isRealProject = id => {
    if (!id || typeof id !== 'string') return false;
    if (id === 'none' || id === 'unknown' || id === '') return false;
    return !TEST_FIXTURE_PATTERNS.some(re => re.test(id));
  };

  const projectIds = new Set();
  for (const e of signalEvents) {
    if (isRealProject(e.project) && e.date >= thirtyDaysAgo) projectIds.add(e.project);
  }
  for (const e of toolCallEvents) {
    if (isRealProject(e.project) && e.date >= thirtyDaysAgo) projectIds.add(e.project);
  }
  if (projectIds.size === 0) return [];

  // Resolution key set from signal log (friction_resolved + friction_acknowledged)
  const resolvedKeys = new Set();
  for (const e of signalEvents) {
    if (e.event === 'friction_resolved' || e.event === 'friction_acknowledged') {
      if (e.target_session && e.target_event && e.target_detail != null) {
        resolvedKeys.add(`${e.target_session}::${e.target_event}::${e.target_detail}`);
      }
    }
  }

  const FRICTION_EVENTS = new Set(['fix_attempt', 'capability_gap', 'escalation']);

  return Array.from(projectIds).sort().map(id => {
    let friction_today = 0;
    let tool_calls_30d = 0;
    const capGaps = [];
    const templates = new Set();

    for (const e of signalEvents) {
      if (e.project !== id) continue;
      if (FRICTION_EVENTS.has(e.event) && e.date === today) friction_today++;
      if (e.event === 'capability_gap') capGaps.push({ session: e.session || '', detail: e.detail || '' });
      if ((e.event === 'code_shape' || e.event === 'template_used') && e.template) templates.add(e.template);
    }

    for (const e of toolCallEvents) {
      if (e.project !== id) continue;
      if (e.date >= thirtyDaysAgo) tool_calls_30d++;
    }

    const unresolved_gaps = capGaps.filter(
      g => !resolvedKeys.has(`${g.session}::capability_gap::${g.detail}`)
    ).length;

    return { id, friction_today, unresolved_gaps, templates_used: templates.size, tool_calls_30d };
  });
}

// ─── Rolling Window Helper ───────────────────────────────────────────────────

function rollingWindow(days, anchorDate = new Date()) {
  const ms = days * 24 * 60 * 60 * 1000;
  // Shift thisEnd forward by 1 day so date-string strict-less-than (`e.date < thisEnd`)
  // properly INCLUDES events dated on anchorDate's calendar day. Without this shift,
  // today's events fall through both windows when comparing yyyy-mm-dd strings.
  const thisEnd = new Date(anchorDate.getTime() + 86400000);
  const thisStart = new Date(thisEnd.getTime() - ms);
  const prevStart = new Date(thisStart.getTime() - ms);
  return { thisStart, thisEnd, prevStart, prevEnd: thisStart };
}

// ─── Verb 1: Failure → Prevention ───────────────────────────────────────────

async function getFailureToPrevention() {
  const raw = await safeReadFile(PERF_LOG);
  const events = raw && raw.trim()
    ? raw.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    : [];

  const now = new Date();
  const win7 = rollingWindow(7, now);
  const win14 = rollingWindow(14, now);

  const isFailure = e =>
    ['capability_gap', 'fix_attempt', 'escalation'].includes(e.event) ||
    (e.event === 'hook_catch' && e.valid === true);

  const isPrevention = e => e.event === 'auto_install';

  const inWindow = (e, start, end) => e.date >= start.toISOString().slice(0, 10) && e.date < end.toISOString().slice(0, 10);

  // This week and last week counts
  const thisWeekEvents = events.filter(e => inWindow(e, win7.thisStart, win7.thisEnd));
  const lastWeekEvents = events.filter(e => inWindow(e, win7.prevStart, win7.prevEnd));

  const countWeek = (evs) => {
    const failures = evs.filter(isFailure).length;
    const preventions = evs.filter(isPrevention).length;
    const autoInstalls = evs.filter(e => e.event === 'auto_install').length;
    const conversionPct = failures === 0 ? 0 : Math.round(100 * preventions / failures);
    return { failures, preventions, autoInstalls, conversionPct };
  };

  // Daily breakdown for last 14 days
  const daily = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const dayEvents = events.filter(e => e.date === d);
    daily.push({
      date: d,
      failures: dayEvents.filter(isFailure).length,
      preventions: dayEvents.filter(isPrevention).length,
    });
  }

  // Stuck failures: capability_gap events with no matching friction_resolved,
  // friction_acknowledged, or auto_install. Top 5 by age desc.
  // friction_acknowledged counts as not-stuck because it represents a known/deferred
  // limitation that's been triaged — not actionable as a stuck failure.
  const resolvedDetails = new Set(
    events
      .filter(e => e.event === 'friction_resolved' && e.target_detail)
      .map(e => e.target_detail)
  );
  const acknowledgedDetails = new Set(
    events
      .filter(e => e.event === 'friction_acknowledged' && e.target_detail)
      .map(e => e.target_detail)
  );
  const autoInstallDetails = new Set(
    events
      .filter(e => e.event === 'auto_install' && e.detail)
      .map(e => e.detail)
  );

  const capGaps = events.filter(e => e.event === 'capability_gap');
  const today = now.toISOString().slice(0, 10);

  const stuckFailures = capGaps
    .filter(e => {
      // Check if any friction event's target_detail is a substring match (either direction)
      const detail = e.detail || '';
      const isResolved = [...resolvedDetails].some(rd => rd.includes(detail) || detail.includes(rd));
      const isAcknowledged = [...acknowledgedDetails].some(ad => ad.includes(detail) || detail.includes(ad));
      const isAutoInstalled = [...autoInstallDetails].some(ad => ad.includes(detail) || detail.includes(ad));
      return !isResolved && !isAcknowledged && !isAutoInstalled;
    })
    .map(e => {
      const age_days = Math.floor((new Date(today) - new Date(e.date)) / 86400000);
      return { session: e.session || 'unknown', detail: (e.detail || '').slice(0, 140), age_days };
    })
    .sort((a, b) => b.age_days - a.age_days)
    .slice(0, 5);

  return {
    thisWeek: countWeek(thisWeekEvents),
    lastWeek: countWeek(lastWeekEvents),
    daily,
    stuckFailures,
  };
}

// ─── Verb 2: Pattern → Template ─────────────────────────────────────────────

async function getPatternToTemplate(parsedPatterns) {
  const raw = await safeReadFile(PERF_LOG);
  const events = raw && raw.trim()
    ? raw.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    : [];

  const now = new Date();
  const win7 = rollingWindow(7, now);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

  const inWindow = (e, start, end) => e.date >= start.toISOString().slice(0, 10) && e.date < end.toISOString().slice(0, 10);

  // Denominator fix (2026-04-28): pattern_detected events are dominated by 3 noise classes
  // (scanner-output similarity clusters, friction-volume hook fires, manual session narrative)
  // — none convert to scaffolding templates. Restrict to "extractable" patterns:
  // cross-session findings from pattern-report.md, similarity clusters excluded.
  // pattern-report.md regenerates each Bruce run with last-14-day window, so no time-filter needed here.
  const extractablePatterns = (parsedPatterns || []).filter(p => {
    const heading = (p.heading || '').toLowerCase();
    if (heading.startsWith('similarity cluster')) return false;  // scanner duplicate-detection noise
    if (heading.startsWith('unused-agent')) return false;        // utilization signal, not extractable
    return true;
  });
  const extractablePatternCount = extractablePatterns.length;

  const countWindow = (start, end) => {
    const evs = events.filter(e => inWindow(e, start, end));
    const patternsDetected = evs.filter(e => e.event === 'pattern_detected').length;  // raw count, kept for back-compat
    const templateExtractedEvents = evs.filter(e => e.event === 'template_extracted');
    const templatesExtracted = templateExtractedEvents.length;  // raw count, kept for back-compat
    // Numerator fix: dedupe by template name. 6 events for "next-cloudflare-d1" in one day = 1 distinct extraction.
    const distinctTemplatesExtracted = new Set(templateExtractedEvents.map(e => e.template).filter(Boolean)).size;
    const templatesInstantiated = evs.filter(e => e.event === 'template_used').length;
    // Honest extraction rate: distinct templates extracted ÷ extractable patterns from report.
    // Note: extractablePatternCount is from current pattern-report.md (14-day window), not the 7-day window —
    // safe approximation since template extraction is a slower cadence than the window comparison anyway.
    const extractionRate = extractablePatternCount === 0 ? 0 : Math.round(100 * distinctTemplatesExtracted / extractablePatternCount);
    return { patternsDetected, templatesExtracted, distinctTemplatesExtracted, templatesInstantiated, extractionRate, extractablePatternCount };
  };

  // Active templates: group template_used events by template field
  const templateMap = new Map();
  for (const e of events) {
    if (e.event !== 'template_used' || !e.template) continue;
    if (!templateMap.has(e.template)) {
      templateMap.set(e.template, { name: e.template, instantiations: 0, lastUsed: e.date, projects: new Set() });
    }
    const entry = templateMap.get(e.template);
    entry.instantiations++;
    if (e.date > entry.lastUsed) entry.lastUsed = e.date;
    if (e.project) entry.projects.add(e.project);
  }

  const activeTemplates = Array.from(templateMap.values())
    .sort((a, b) => b.instantiations - a.instantiations)
    .slice(0, 3)
    .map(t => ({ name: t.name, instantiations: t.instantiations, lastUsed: t.lastUsed, projects: [...t.projects] }));

  // Stuck patterns: pattern signatures from pattern-report.md that have no matching
  // template_extracted event within 14 days. Text-based join on signature field —
  // NOTE: this is a fuzzy substring match with no pattern_id link on events;
  // false negatives are possible when the template name differs from the pattern signature.
  const recentTemplateNames = new Set(
    events
      .filter(e => e.event === 'template_extracted' && e.date >= fourteenDaysAgo && e.template)
      .map(e => e.template)
  );

  const stuckPatterns = (parsedPatterns || [])
    .filter(p => {
      const sig = (p.signature || p.heading || '').toLowerCase();
      // Check if any recently extracted template name partially matches the pattern signature
      return ![...recentTemplateNames].some(tn => sig.includes(tn.toLowerCase()) || tn.toLowerCase().includes(sig));
    })
    .map(p => {
      // Age is unknown without a date on pattern entries — use a sentinel
      return { heading: p.heading, age_days: null };
    })
    .slice(0, 5);

  return {
    thisWeek: countWindow(win7.thisStart, win7.thisEnd),
    lastWeek: countWindow(win7.prevStart, win7.prevEnd),
    activeTemplates,
    stuckPatterns,
  };
}

// ─── Verb 3: Prevention Efficacy ─────────────────────────────────────────────

async function getPreventionEfficacy() {
  const raw = await safeReadFile(PERF_LOG);
  const events = raw && raw.trim()
    ? raw.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    : [];

  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  // Excluded rule slugs per performance-logging.md
  const EXCLUDED_SLUGS = new Set(['code-accuracy', 'pre-tool-use-same-file-symbol']);

  // Group hook_catch events over 30 days by rule, skipping undefined valid and excluded slugs
  const ruleMap = new Map();
  for (const e of events) {
    if (e.event !== 'hook_catch') continue;
    if (e.date < thirtyDaysAgo) continue;
    if (e.valid === undefined || e.valid === null) continue; // skip legacy entries without valid field
    const rule = e.rule || 'unknown';
    if (EXCLUDED_SLUGS.has(rule)) continue;
    if (!ruleMap.has(rule)) {
      ruleMap.set(rule, { rule, valid: 0, invalid: 0, dailyMap: new Map() });
    }
    const entry = ruleMap.get(rule);
    if (e.valid === true) entry.valid++;
    else entry.invalid++;
    // Track daily for sparkline
    if (!entry.dailyMap.has(e.date)) entry.dailyMap.set(e.date, { valid: 0, invalid: 0 });
    const day = entry.dailyMap.get(e.date);
    if (e.valid === true) day.valid++;
    else day.invalid++;
  }

  // Build sparkline: 30-element array, today-29 to today
  const sparklineDates = [];
  for (let i = 29; i >= 0; i--) {
    sparklineDates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }

  const perRule = Array.from(ruleMap.values()).map(entry => {
    const fires30d = entry.valid + entry.invalid;
    const efficacy = fires30d === 0 ? 0 : entry.valid / fires30d;
    const sparkline = sparklineDates.map(d => {
      const day = entry.dailyMap.get(d);
      if (!day) return null;
      const total = day.valid + day.invalid;
      return total === 0 ? null : day.valid / total;
    });
    // Find last fire date
    const firedDates = [...entry.dailyMap.keys()].sort();
    const last_fire_date = firedDates.length > 0 ? firedDates[firedDates.length - 1] : null;
    return { rule: entry.rule, efficacy, fires30d, valid: entry.valid, invalid: entry.invalid, sparkline, last_fire_date };
  });

  // Retirement candidates: efficacy === 0 && fires30d >= 3
  const retirementCandidates = perRule
    .filter(r => r.efficacy === 0 && r.fires30d >= 3)
    .map(({ rule, efficacy, fires30d, last_fire_date }) => ({ rule, efficacy, fires30d, last_fire_date }));

  // Active preventions = distinct rules NOT in retirement candidates
  const retirementSet = new Set(retirementCandidates.map(r => r.rule));
  const activePreventions = perRule.filter(r => !retirementSet.has(r.rule)).length;

  // Weighted average efficacy
  const totalFires = perRule.reduce((s, r) => s + r.fires30d, 0);
  const avgEfficacy = totalFires === 0
    ? 0
    : perRule.reduce((s, r) => s + r.efficacy * r.fires30d, 0) / totalFires;

  // Retirements this week and net active
  const retirementsThisWeek = events.filter(e => e.event === 'retirement' && e.date >= sevenDaysAgo).length;
  const autoInstalls30d = events.filter(e => e.event === 'auto_install' && e.date >= thirtyDaysAgo).length;
  const retirements30d = events.filter(e => e.event === 'retirement' && e.date >= thirtyDaysAgo).length;
  const netActive30d = autoInstalls30d - retirements30d;

  return {
    activePreventions,
    avgEfficacy,
    retirementCandidates,
    retirementsThisWeek,
    netActive30d,
    perRule,
  };
}

// ─── What to Watch — derived weekly attention list ──────────────────────────

function getWatchItems({ failureToPrevention, patternToTemplate, preventionEfficacy }) {
  const items = [];

  // 1. First auto_install fires this week
  const autoInstalls = failureToPrevention?.thisWeek?.autoInstalls ?? 0;
  items.push({
    id: 'first-auto-install',
    title: 'Auto-install fires this week',
    current: `${autoInstalls}/week`,
    target: '≥1 this week',
    status: autoInstalls >= 1 ? 'green' : 'red',
    why: 'Threshold lowered to 2 sessions. First fire flips Verb 1 from stalled to converting.',
  });

  // 2. Canary rule — worst-performing rule with ≥3 fires
  const perRule = preventionEfficacy?.perRule ?? [];
  const canaries = perRule
    .filter(r => r.fires30d >= 3 && r.rule !== 'unknown')
    .sort((a, b) => a.efficacy - b.efficacy);
  const canary = canaries[0];
  if (canary) {
    const pct = Math.round(canary.efficacy * 100);
    let status = 'green';
    if (canary.efficacy < 0.3) status = 'red';
    else if (canary.efficacy < 0.5) status = 'yellow';
    items.push({
      id: 'canary-rule',
      title: `${canary.rule} efficacy`,
      current: `${pct}% (${canary.fires30d} fires/30d)`,
      target: 'stays ≥50%',
      status,
      why: 'Worst-performing rule with real fire volume. Drift below 30% = retirement candidate.',
    });
  }

  // 3. Net active preventions
  const netActive = preventionEfficacy?.netActive30d ?? 0;
  items.push({
    id: 'net-active',
    title: 'Net active preventions (30d)',
    current: `${netActive >= 0 ? '+' : ''}${netActive}`,
    target: '≥0',
    status: netActive < 0 ? 'red' : netActive === 0 ? 'yellow' : 'green',
    why: 'Preventions installed minus retired. Sustained negative = system losing coverage.',
  });

  // 4. Stuck failures count
  const stuckCount = (failureToPrevention?.stuckFailures ?? []).length;
  let stuckStatus = 'green';
  if (stuckCount >= 4) stuckStatus = 'red';
  else if (stuckCount >= 1) stuckStatus = 'yellow';
  items.push({
    id: 'stuck-failures',
    title: 'Stuck failures resolved',
    current: `${stuckCount} stuck`,
    target: 'reduce by ≥1 this week',
    status: stuckStatus,
    why: 'Failures aged ≥7 days without prevention or resolution. Check Verb 1 carousel.',
  });

  // 5. Pattern detection velocity
  const thisPatterns = patternToTemplate?.thisWeek?.patternsDetected ?? 0;
  const lastPatterns = patternToTemplate?.lastWeek?.patternsDetected ?? 0;
  const velocityRatio = lastPatterns === 0 ? 1 : thisPatterns / lastPatterns;
  let velStatus = 'green';
  if (velocityRatio < 0.5) velStatus = 'red';
  else if (velocityRatio < 0.9) velStatus = 'yellow';
  items.push({
    id: 'pattern-velocity',
    title: 'Pattern detection velocity',
    current: `${thisPatterns} this week (${lastPatterns} last)`,
    target: 'stay near or above last week',
    status: velStatus,
    why: 'Detection volume = system visibility. Drop signals scanners stalling, not problems vanishing.',
  });

  return items;
}

// ─── Main ────────────────────────────────────────────────────────────────────

// Parse b7 efficacy report from cached file — written nightly by Bruce, manually via `bash ~/.claude/night-shift/phases/b7-agent-efficacy.sh > ~/.claude/agent-efficacy-report.md` if stale
async function getAgentEfficacy() {
  const reportPath = join(CLAUDE_DIR, 'agent-efficacy-report.md');
  const out = await safeReadFile(reportPath);
  if (!out) return [];
  const scores = [];
  // Match lines like: "1. **agent-name** — score 1.00, 8 deployments, last used 2026-04-22"
  const re = /\*\*[^*]+\*\*\s+—\s+score\s+([\d.]+)/g;
  let m;
  while ((m = re.exec(out)) !== null) {
    scores.push(parseFloat(m[1]));
  }
  return scores;
}

// 7-Layer Spine — synthesized from project_agent_os.md "Layer status" table
function getSevenLayerSpine() {
  return [
    { num: 1, name: 'Universal Telemetry', status: 'Shipped', purpose: 'Every tool call logs' },
    { num: 2, name: 'Pattern Detection', status: 'Partial', purpose: 'Daemon watches telemetry for repeats' },
    { num: 3, name: 'Auto-Install Preventions', status: 'Shipped', purpose: 'Low-risk patterns install same-session' },
    { num: 4, name: 'Efficacy Tracking', status: 'Shipped', purpose: 'Hooks + agents measured; retire if unused' },
    { num: 5, name: 'Consolidation Daemon', status: 'Shipped', purpose: 'Merges duplicates, flags stale preventions' },
    { num: 6, name: 'Intent Preservation', status: 'Shipped', purpose: 'Session records what was meant' },
    { num: 7, name: 'Template Extraction', status: 'Shipped', purpose: 'Recurring projects auto-extract' },
  ];
}

async function main() {
  console.log('Syncing Agent OS data...');

  const [agents, memory, metrics, selfImprovement, system, nightShift, timeline, patterns, consolidation, projects] = await Promise.all([
    getAgents(),
    getMemory(),
    getMetrics(),
    getSelfImprovement(),
    getSystemCounts(),
    getNightShift(),
    getTimeline(),
    getPatterns(),
    getConsolidation(),
    getProjects(),
  ]);

  const agentEfficacy = await getAgentEfficacy();
  const sevenLayerSpine = getSevenLayerSpine();

  // New 3-verb loop aggregations — Chunk 1 of dashboard redesign
  // getPatternToTemplate receives already-parsed patterns to avoid re-reading pattern-report.md
  const [failureToPrevention, patternToTemplate, preventionEfficacy] = await Promise.all([
    getFailureToPrevention(),
    getPatternToTemplate(patterns.findings),
    getPreventionEfficacy(),
  ]);

  // Watch items derived from the 3 verbs above — the "what to watch this week" panel
  const watchItems = getWatchItems({ failureToPrevention, patternToTemplate, preventionEfficacy });

  const data = {
    agents,
    agentCount: agents.length,
    agentEfficacy,
    sevenLayerSpine,
    metrics,
    memory,
    system,
    timeline,
    selfImprovement,
    nightShift,
    patterns,
    consolidation,
    projects,
    failureToPrevention,
    patternToTemplate,
    preventionEfficacy,
    watchItems,
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
  console.log(`  Consolidation: ${consolidation.hasData ? consolidation.findings.length + ' candidate(s)' : 'no report yet'}`);
  console.log(`  Agent efficacy: ${agentEfficacy.length} healthy agent(s) scored`);
  console.log(`  Projects: ${projects.length} active project(s) with scorecards`);;
}

main().catch(err => { console.error(err); process.exit(1); });
