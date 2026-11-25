#!/usr/bin/env node
/* Push this folder to GitHub via Contents API (works when git push is blocked).
 * Usage: GITHUB_TOKEN=ghp_xxx node scripts/push-github.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = process.env.GH_OWNER || 'bimianwangzhe';
const REPO = process.env.GH_REPO || 'agent-offer';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const API = 'https://api.github.com';
if (!TOKEN) { console.error('GITHUB_TOKEN is required'); process.exit(1); }

const SKIP_DIRS = new Set(['node_modules', '.git', 'site/.cache']);
const SKIP_FILE = /^(?:\.preview-|\.tmp_|.*\.log$)/;

function walk(dir, rel = '') {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const r = rel ? rel + '/' + name : name;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name) || SKIP_DIRS.has(r)) continue;
      out.push(...walk(abs, r));
    } else {
      if (SKIP_FILE.test(name)) continue;
      out.push(r);
    }
  }
  return out;
}

const headers = {
  Authorization: 'Bearer ' + TOKEN,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'User-Agent': 'agent-offer-deploy'
};

async function getSha(p) {
  const r = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(p).replace(/%2F/g, '/')}`, { headers });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET ${p} -> ${r.status}`);
  return (await r.json()).sha;
}

async function put(p, buf) {
  const sha = await getSha(p);
  const body = {
    message: `docs: sync ${p}`,
    content: buf.toString('base64'),
    ...(sha ? { sha } : {})
  };
  const r = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(p).replace(/%2F/g, '/')}`, {
    method: 'PUT', headers, body: JSON.stringify(body)
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`PUT ${p} -> ${r.status} ${txt.slice(0, 200)}`);
  }
  return (await r.json()).content.sha.slice(0, 8);
}

const files = walk(ROOT).sort((a, b) => {
  if (a === 'README.md') return -1;
  if (b === 'README.md') return 1;
  return a.localeCompare(b);
});

console.log(`pushing ${files.length} files to ${OWNER}/${REPO}`);
let ok = 0;
for (const f of files) {
  const buf = fs.readFileSync(path.join(ROOT, f));
  const sha = await put(f, buf);
  ok++;
  console.log(`  [${String(ok).padStart(2)}/${files.length}] ${f} (${buf.length}B) -> ${sha}`);
  await new Promise(r => setTimeout(r, 180));
}
const repo = await (await fetch(`${API}/repos/${OWNER}/${REPO}`, { headers })).json();
console.log(`done. ${repo.html_url} | default_branch=${repo.default_branch} | size=${repo.size}KB`);
