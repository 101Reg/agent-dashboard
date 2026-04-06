// Career listings sync script
// Run weekly: node scripts/sync-careers.js
// This outputs a report of which job links are still live vs dead.
// The careers.html file should be manually updated based on findings.

import { readFile } from 'fs/promises';
import { join } from 'path';

const CAREERS_HTML = join(import.meta.dirname, '..', 'public', 'careers.html');

async function extractLinks() {
  const html = await readFile(CAREERS_HTML, 'utf-8');
  const linkRegex = /href="(https:\/\/jobs\.apple\.com[^"]+|https:\/\/job-boards\.greenhouse\.io[^"]+|https:\/\/www\.anthropic\.com\/careers[^"]+)"/g;
  const links = new Set();
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    links.add(match[1]);
  }
  return [...links];
}

async function checkLink(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    // Apple returns 200 even for dead postings (shows "no longer available" in body)
    // So for Apple links, we need to do a full GET
    if (url.includes('jobs.apple.com') && url.includes('details')) {
      const fullRes = await fetch(url);
      const body = await fullRes.text();
      if (body.includes('no longer available') || body.includes('does not exist')) {
        return { url, status: 'DEAD', reason: 'Role no longer available' };
      }
    }
    if (res.ok) return { url, status: 'LIVE' };
    return { url, status: 'DEAD', reason: `HTTP ${res.status}` };
  } catch (err) {
    return { url, status: 'ERROR', reason: err.message };
  }
}

async function main() {
  console.log('Checking career links...\n');
  const links = await extractLinks();
  console.log(`Found ${links.length} job links to verify.\n`);

  const results = await Promise.all(links.map(checkLink));

  const live = results.filter(r => r.status === 'LIVE');
  const dead = results.filter(r => r.status !== 'LIVE');

  console.log(`LIVE (${live.length}):`);
  live.forEach(r => console.log(`  ✓ ${r.url}`));

  if (dead.length) {
    console.log(`\nDEAD/ERROR (${dead.length}):`);
    dead.forEach(r => console.log(`  ✗ ${r.url} — ${r.reason}`));
    console.log('\n⚠ Update public/careers.html to remove or replace dead listings.');
  } else {
    console.log('\nAll links verified live.');
  }

  console.log(`\nLast checked: ${new Date().toISOString()}`);
}

main().catch(err => { console.error(err); process.exit(1); });
