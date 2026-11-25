#!/usr/bin/env node
/* Deploy AgentOffer static site to agent.meetoffer.cn
 * Usage:  SRV_PASS='<password>' node deploy/deploy-remote.cjs
 * Requires: ssh2 (already available in the workspace node_modules)
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOST = process.env.SRV_HOST || '123.207.11.185';
const USER = process.env.SRV_USER || 'ubuntu';
const PASS = process.env.SRV_PASS;

if (!PASS) { console.error('SRV_PASS is required'); process.exit(1); }

const FILES = [
  ['site/index.html', '/opt/agent-offer/site/index.html'],
  ['site/assets/style.css', '/opt/agent-offer/site/assets/style.css'],
  ['site/assets/app.js', '/opt/agent-offer/site/assets/app.js'],
  ['site/assets/content.js', '/opt/agent-offer/site/assets/content.js'],
  ['deploy/agent.meetoffer.cn.conf', '/tmp/agent.meetoffer.cn.conf']
];

function run(c, cmd) {
  return new Promise((resolve, reject) => {
    c.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => { out += d.toString(); });
      stream.stderr.on('data', d => { out += d.toString(); });
      stream.on('close', () => resolve(out.trim()));
    });
  });
}

(async () => {
  const c = new Client();
  await new Promise((resolve, reject) => {
    c.on('ready', resolve).on('error', reject)
      .connect({ host: HOST, username: USER, password: PASS, readyTimeout: 20000 });
  });
  console.log('[1/4] connected to', HOST);

  const prep = await run(c, 'sudo mkdir -p /opt/agent-offer/site/assets && sudo chown -R ' + USER + ':' + USER + ' /opt/agent-offer && echo PREP_OK');
  console.log('[2/4]', prep.replace(/\n/g, ' '));

  const sftp = await new Promise((resolve, reject) => c.sftp((e, s) => e ? reject(e) : resolve(s)));
  for (const [local, remote] of FILES) {
    const abs = path.join(ROOT, local);
    if (!fs.existsSync(abs)) throw new Error('missing local file: ' + local);
    await new Promise((resolve, reject) => sftp.fastPut(abs, remote, e => e ? reject(e) : resolve()));
    console.log('      upload', local, '->', remote);
  }
  sftp.end();

  const reload = await run(c,
    'sudo cp /tmp/agent.meetoffer.cn.conf /etc/nginx/sites-enabled/agent.meetoffer.cn.conf && ' +
    'sudo nginx -t 2>&1 && sudo systemctl reload nginx && echo RELOADED');
  console.log('[3/4]', reload.replace(/\n/g, ' | '));

  const verify = await run(c,
    'curl -k -s -o /dev/null -w "https:%{http_code} " -H "Host: agent.meetoffer.cn" https://127.0.0.1/ ; ' +
    'curl -s -o /dev/null -w "http:%{http_code}\n" -H "Host: agent.meetoffer.cn" http://127.0.0.1/ ; ' +
    'curl -k -s -H "Host: agent.meetoffer.cn" https://127.0.0.1/assets/content.js | head -c 60; echo; ' +
    'du -sh /opt/agent-offer/site');
  console.log('[4/4]', verify.replace(/\n/g, '\n      '));

  c.end();
  console.log('DONE -> https://agent.meetoffer.cn (需要 DNS A 记录指向 ' + HOST + ')');
})().catch(e => { console.error('DEPLOY FAILED:', e.message); process.exit(1); });
