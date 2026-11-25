#!/usr/bin/env node
/* 全量同步当前目录到 GitHub 仓库（Git Data API）。
 * 特点：一次 commit 替换整棵树 —— 本地删掉的文件，远端也会被删掉。
 * 用法：GITHUB_TOKEN=ghp_xxx node scripts/sync-github.mjs
 *
 * 为什么不用 git push：本机到 github.com:443 不通，api.github.com 可用。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = process.env.GH_OWNER || 'bimianwangzhe';
const REPO = process.env.GH_REPO || 'agent-offer';
const BRANCH = process.env.GH_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const API = 'https://api.github.com';
if (!TOKEN) { console.error('GITHUB_TOKEN is required'); process.exit(1); }

const SKIP_DIRS = new Set(['node_modules', '.git', '.tmp_code']);
const SKIP_FILE = /^(?:\.preview-|\.tmp_|.*\.log$)/;

function walk(dir, rel = '') {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const r = rel ? rel + '/' + name : name;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
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
  'User-Agent': 'agent-offer-sync'
};

async function api(p, method = 'GET', body = null) {
  const r = await fetch(API + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

const files = walk(ROOT).sort((a, b) => {
  if (a === 'README.md') return -1;
  if (b === 'README.md') return 1;
  return a.localeCompare(b);
});

const entries = files.map(f => ({
  path: f,
  mode: '100644',
  type: 'blob',
  content: fs.readFileSync(path.join(ROOT, f), 'utf8')
}));

console.log(`syncing ${files.length} files -> ${OWNER}/${REPO}#${BRANCH}`);

const ref = await api(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
const baseCommitSha = ref.object.sha;
const baseCommit = await api(`/repos/${OWNER}/${REPO}/git/commits/${baseCommitSha}`);

const tree = await api(`/repos/${OWNER}/${REPO}/git/trees`, 'POST', { tree: entries });
const msg = `docs: rewrite tutorial content (${files.length} files)`;
const commit = await api(`/repos/${OWNER}/${REPO}/git/commits`, 'POST', {
  message: msg, tree: tree.sha, parents: [baseCommit.sha]
});
await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, 'PATCH', { sha: commit.sha, force: true });

const repo = await api(`/repos/${OWNER}/${REPO}`);
console.log(`done: ${repo.html_url} | commit ${commit.sha.slice(0, 8)} | ${repo.size}KB`);

const dirs = [...new Set(files.map(f => f.includes('/') ? f.split('/')[0] : '')).filter(Boolean)];
console.log('top-level:', dirs.join(', '));
