(function () {
  'use strict';
  var C = window.AGENT_CONTENT || { meta: {}, docs: [] };
  var docs = (C.docs || []).slice().sort(function (a, b) { return a.order - b.order; });
  var bySlug = {};
  docs.forEach(function (d) { bySlug[d.slug] = d; });
  var CATS = ['路线', '基础', '核心', '工程', '上岗', '资料'];
  var app = document.getElementById('app');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function slugify(s) {
    return String(s).replace(/[^\w\u4e00-\u9fa5-]/g, '').replace(/\s+/g, '-').slice(0, 40);
  }
  function internalUrl(href) {
    var m = /^\.\/([^)#]+)\.md(?:#.*)?$/.exec(href);
    if (m) return '#/doc/' + m[1];
    return null;
  }
  function inline(text) {
    var codes = [];
    var s = String(text).replace(/`([^`]+)`/g, function (_, c) {
      codes.push('<code>' + esc(c) + '</code>');
      return '\u0001' + (codes.length - 1) + '\u0001';
    });
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
      var local = internalUrl(href);
      if (local) return '<a href="' + local + '">' + label + '</a>';
      return '<a href="' + href + '" target="_blank" rel="noopener">' + label + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/\u0001(\d+)\u0001/g, function (_, i) { return codes[+i]; });
    return s;
  }
  var KW = /\b(?:def|class|return|if|elif|else|for|while|in|not|and|or|try|except|finally|with|as|import|from|yield|None|True|False|async|await|lambda|raise|pass|break|continue|global|const|let|var|function|new|throw|catch|public|private|static|void|true|false|null|self|this|interface|type|struct|SELECT|FROM|WHERE)\b/;
  function highlight(src) {
    var s = esc(src);
    var re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#[^\n]*|\/\/[^\n]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;
    return s.replace(re, function (all, str, comment, num, word) {
      if (str) return '<span class="tok-s">' + str + '</span>';
      if (comment) return '<span class="tok-c">' + comment + '</span>';
      if (num) return '<span class="tok-n">' + num + '</span>';
      if (word && KW.test(word)) return '<span class="tok-k">' + word + '</span>';
      if (word && /^(print|len|range|json|client|llm|run|execute|answer|build_messages|rerank|hybrid_search)$/.test(word)) return '<span class="tok-f">' + word + '</span>';
      return all;
    });
  }
  function renderMarkdown(md) {
    var lines = String(md).replace(/\r\n/g, '\n').split('\n');
    var out = [], heads = [];
    var i = 0;
    while (i < lines.length) {
      var L = lines[i];
      // fenced code
      if (/^\s*```/.test(L)) {
        var lang = L.replace(/^\s*```/, '').trim() || 'text';
        var buf = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        var code = buf.join('\n');
        out.push('<div class="codeblock"><div class="code-head"><span class="code-lang">' + esc(lang) + '</span><button class="copy-btn" type="button">复制</button></div><pre><code>' + highlight(code) + '</code></pre></div>');
        continue;
      }
      // headings
      var hm = /^(#{1,4})\s+(.+)$/.exec(L);
      if (hm) {
        var lvl = hm[1].length, txt = hm[2].trim();
        var id = slugify(txt);
        out.push('<h' + lvl + ' id="' + id + '">' + inline(txt) + '</h' + lvl + '>');
        if (lvl === 2 || lvl === 3) heads.push({ id: id, text: txt.replace(/[*`]/g, ''), lvl: lvl });
        i++; continue;
      }
      // hr
      if (/^\s*(---|\*\*\*|___)\s*$/.test(L)) { out.push('<hr>'); i++; continue; }
      // table
      if (/^\s*\|/.test(L) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        var rows = [];
        var headCells = L.trim().replace(/^\||\|$/g, '').split('|').map(function (x) { return x.trim(); });
        i += 2;
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(function (x) { return x.trim(); }));
          i++;
        }
        var t = '<div class="md-table-wrap"><table><thead><tr>';
        headCells.forEach(function (c) { t += '<th>' + inline(c) + '</th>'; });
        t += '</tr></thead><tbody>';
        rows.forEach(function (r) {
          t += '<tr>';
          r.forEach(function (c) { t += '<td>' + inline(c) + '</td>'; });
          t += '</tr>';
        });
        t += '</tbody></table></div>';
        out.push(t); continue;
      }
      // blockquote
      if (/^\s*>/.test(L)) {
        var q = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push('<blockquote>' + q.map(function (x) { return '<p>' + inline(x) + '</p>'; }).join('') + '</blockquote>');
        continue;
      }
      // lists
      if (/^\s*(?:[-*] |\d+\. |\[[ x]\] )/.test(L)) {
        var items = [], ordered = /^\s*\d+\. /.test(L), checks = /^\s*\[[ x]\] /.test(L);
        while (i < lines.length && /^\s*(?:[-*] |\d+\. |\[[ x]\] )/.test(lines[i])) {
          var raw = lines[i].replace(/^\s*(?:[-*] |\d+\. )/, '');
          var cm = /^\[([ x])\]\s*(.*)$/.exec(raw);
          if (cm) items.push('<li class="checkbox-item ' + (cm[1] === 'x' ? 'done' : '') + '">' + inline(cm[2]) + '</li>');
          else items.push('<li>' + inline(raw) + '</li>');
          i++;
        }
        var tag = ordered ? 'ol' : 'ul';
        out.push('<' + tag + (checks ? ' class="checkbox"' : '') + '>' + items.join('') + '</' + tag + '>');
        continue;
      }
      // paragraph
      if (L.trim() === '') { i++; continue; }
      var para = [];
      while (i < lines.length && lines[i].trim() !== '' &&
             !/^\s*```/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) &&
             !/^\s*\|/.test(lines[i]) && !/^\s*>/.test(lines[i]) &&
             !/^\s*(?:[-*] |\d+\. |\[[ x]\] )/.test(lines[i]) &&
             !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i])) {
        para.push(lines[i].trim()); i++;
      }
      if (para.length) out.push('<p>' + inline(para.join(' ')) + '</p>');
      else i++;
    }
    return { html: out.join('\n'), heads: heads };
  }

  // ---------- icons ----------
  var ICONS = {
    '路线': '<path d="M4 18h6M4 12h10M4 6h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="19" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/>',
    '基础': '<rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    '核心': '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    '工程': '<path d="M4 7h16v10H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 11h3M8 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    '上岗': '<path d="M4 20V9l8-5 8 5v11" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 20v-6h6v6" fill="none" stroke="currentColor" stroke-width="2"/>',
    '资料': '<path d="M5 4h11l3 3v13H5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 11h8M8 15h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  function icon(c) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[c] || ICONS['资料']) + '</svg>'; }

  // ---------- home ----------
  var STAGES = [
    { no: '01', t: '打底', d: 'LLM 调用、Prompt、结构化输出，先能稳定拿到合法 JSON', time: '约 1 周', to: '11-llm-basics' },
    { no: '02', t: '核心', d: '手写循环、工具调用、上下文工程，不靠框架跑通闭环', time: '2~3 周', to: '02-agent-loop' },
    { no: '03', t: '扩展', d: 'RAG、记忆、MCP、框架选型，能接真实数据且可溯源', time: '3~4 周', to: '05-rag-memory' },
    { no: '04', t: '上线', d: '评测、追踪、护栏、成本、部署，能演示也能回归', time: '2~3 周', to: '08-eval-production' },
    { no: '05', t: '上岗', d: '岗位画像、追问链、简历口径，15 分钟讲清自己的系统', time: '1~2 周', to: '09-interview' }
  ];
  function renderHome() {
    var total = docs.length;
    var stageHtml = STAGES.map(function (s) {
      return '<a class="stage" href="#/doc/' + s.to + '"><div class="stage-no">' + s.no + '</div><h3>' + s.t + '</h3><p>' + s.d + '</p><div class="stage-time">' + s.time + '</div></a>';
    }).join('');
    var catHtml = CATS.map(function (c) {
      var list = docs.filter(function (d) { return d.category === c; });
      if (!list.length) return '';
      return '<div class="cat-card"><div class="cat-top"><div class="cat-icon">' + icon(c) + '</div><h3>' + c + '</h3><span class="cat-count">' + list.length + ' 篇</span></div><ul class="cat-list">' +
        list.map(function (d) { return '<li><a href="#/doc/' + d.slug + '">' + esc(d.title) + '</a></li>'; }).join('') + '</ul></div>';
    }).join('');
    return '<div class="home fade">' +
      '<section class="hero"><div class="hero-inner"><div>' +
        '<div class="eyebrow"><i></i> 免费 · 开源 · 持续更新</div>' +
        '<h1>从调 API 到<br><em>能上岗</em>的 Agent 开发指南</h1>' +
        '<p>把 GitHub 高星教程、官方一手文档和社区路线图重新拆一遍，按岗位能力模型整理成 ' + total + ' 篇能照着做、能拿去面试的中文知识库。不是洗稿，是重新组织。</p>' +
        '<div class="hero-btns"><a class="btn btn-primary" href="#/doc/00-roadmap">开始学习 <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>' +
        '<a class="btn btn-ghost" href="#/doc/15-resources">查看资料地图</a></div>' +
      '</div><div class="hero-terminal"><div class="term-bar"><i></i><i></i><i></i><span>agent_loop.py</span></div>' +
      '<div class="term-body"><span class="k">def</span> <span class="f">run</span>(goal, tools, budget):\n  state = <span class="f">State</span>(goal)\n  <span class="k">while</span> <span class="k">True</span>:\n    <span class="c"># 1 组装上下文</span>\n    msg = <span class="f">build_messages</span>(state)\n    <span class="c"># 2 模型决策</span>\n    d = llm.<span class="f">call</span>(msg, tools)\n    <span class="k">if</span> d.is_final: <span class="k">return</span> d.answer\n    <span class="k">if</span> state.rounds &gt;= budget.max:\n      <span class="k">return</span> <span class="f">fallback</span>(<span class="s">"超出预算"</span>)\n    <span class="c"># 3 执行 + 4 记录轨迹</span>\n    obs = tools.<span class="f">execute</span>(d.name, d.args)\n    state.trace.<span class="f">append</span>(obs)\n    state.rounds += <span class="n">1</span></div></div></div></section>' +
      '<div class="stats"><div class="stat"><b>' + total + ' 篇</b><span>系统梳理的原创文档</span></div><div class="stat"><b>5 阶段</b><span>每阶段都有验收点</span></div><div class="stat"><b>3 项目</b><span>带工程约束的简历项目</span></div><div class="stat"><b>持续更新</b><span>框架与岗位情报同步</span></div></div>' +
      '<section class="section"><div class="section-head"><div class="section-kicker">Roadmap</div><h2>五阶段路线：按「能交付什么」切分</h2><p>网上大部分路线图按知识点排列，学完「RAG 是什么」并不会让你通过面试。每一阶段都设了验收点，达不到就别往下走。</p></div><div class="roadmap-grid">' + stageHtml + '</div></section>' +
      '<section class="section"><div class="section-head"><div class="section-kicker">Knowledge base</div><h2>按模块浏览</h2><p>每篇都以「验收点 + 面试追问链 + 一手资料出处」收尾，方便自查与核验。</p></div><div class="cat-grid">' + catHtml + '</div></section>' +
      '<section class="section"><div class="section-head"><div class="section-kicker">Why different</div><h2>和现有资料有什么不一样</h2><p>框架官方文档按 API 组织，通用教程停在 Demo，八股站教你背题。我们按岗位能力模型组织，讲「出问题怎么办」。</p></div>' +
      '<table class="compare"><thead><tr><th>维度</th><th>框架文档</th><th>通用教程</th><th>面试八股</th><th class="us">AgentOffer</th></tr></thead><tbody>' +
      '<tr><td>组织方式</td><td>按 API</td><td>按知识点</td><td>按题目</td><td class="us">岗位能力模型 + 五阶段</td></tr>' +
      '<tr><td>内容深度</td><td>说明</td><td>概念</td><td>问答</td><td class="us">可运行代码 + 故障注入 + 评测口径</td></tr>' +
      '<tr><td>出处核验</td><td>—</td><td>多为转述</td><td>—</td><td class="us">每篇附一手资料原始链接</td></tr>' +
      '<tr><td>停止在</td><td>能跑</td><td>能跑</td><td>能背</td><td class="us">能上线、能答辩、能复盘</td></tr>' +
      '<tr><td>岗位情报</td><td>无</td><td>无</td><td>少量</td><td class="us">JD 拆解 + 追问链 + 笔试情报</td></tr>' +
      '</tbody></table></section>' +
      '<div class="cta"><div><h2>资料包目录已公开，完整版回复关键词领取</h2><p>系统教程 PDF 打包、按公司分类的笔面情报与网申时间线、北森 / 智鼎 / 牛客等笔试平台的题型与规则差异、面经追问链合集。仓库里的<a href="#/doc/15-resources">一手资料地图</a>就是目录。</p><span class="cta-key">公众号回复：Agent</span></div><div class="cta-side"><a class="btn btn-primary" href="#/doc/15-resources">查看资料目录</a><div style="font-size:12px;color:var(--text-3)">1v1 咨询：微信 offer630</div></div></div>' +
      '</div>';
  }

  // ---------- doc ----------
  function sidebarHtml(active) {
    var groups = CATS.map(function (c) {
      var list = docs.filter(function (d) { return d.category === c; });
      if (!list.length) return '';
      return '<div class="side-group"><h4>' + c + '</h4>' + list.map(function (d) {
        return '<a class="side-link' + (d.slug === active ? ' active' : '') + '" href="#/doc/' + d.slug + '">' + esc(d.title) + '</a>';
      }).join('') + '</div>';
    }).join('');
    return '<aside class="sidebar" id="sidebar">' + groups +
      '<div class="side-foot">17 篇文档 · 一份源同时驱动 GitHub 与本站<br><a href="https://github.com/bimianwangzhe/agent-offer" target="_blank" rel="noopener">在 GitHub 上查看 →</a></div></aside>';
  }
  function renderDoc(d) {
    var r = renderMarkdown(d.md);
    var idx = docs.findIndex(function (x) { return x.slug === d.slug; });
    var prev = docs[idx - 1], next = docs[idx + 1];
    var toc = r.heads.map(function (h) {
      return '<a class="' + (h.lvl === 3 ? 'lvl3' : '') + '" href="#' + h.id + '" data-toc="' + h.id + '">' + esc(h.text) + '</a>';
    }).join('');
    var pager = '<div class="pager">' +
      (prev ? '<a href="#/doc/' + prev.slug + '"><small>← 上一篇</small><span>' + esc(prev.title) + '</span></a>' : '<span></span>') +
      (next ? '<a class="next" href="#/doc/' + next.slug + '"><small>下一篇 →</small><span>' + esc(next.title) + '</span></a>' : '<span></span>') +
      '</div>';
    return '<div class="doc-shell fade">' + sidebarHtml(d.slug) +
      '<article class="article"><div class="crumb"><a href="#/">首页</a><span>/</span><span>' + esc(d.category) + '</span><span>/</span><span>' + esc(d.title) + '</span></div>' +
      '<div class="doc-meta"><span class="tag">' + esc(d.category) + '</span><span class="tag muted">' + (d.minutes || 8) + ' min</span><span class="tag muted">持续更新</span></div>' +
      '<div class="md" id="mdBody"><h1>' + esc(d.title) + '</h1>' +
      '<div class="doc-summary">' + esc(d.summary || '') + '</div>' +
      r.html + '</div>' + pager + '</article>' +
      '<aside class="toc"><h4>本页目录</h4><div id="tocList">' + (toc || '<span style="font-size:12px;color:var(--text-3)">暂无小节</span>') + '</div>' +
      '<div class="toc-note">在线站点 <a href="https://agent.meetoffer.cn" target="_blank" rel="noopener">agent.meetoffer.cn</a><br>内容开源 · MIT 协议</div></aside></div>';
  }

  // ---------- router ----------
  function route() {
    var hash = location.hash || '#/';
    var m = /^#\/doc\/([\w-]+)$/.exec(hash);
    var d = m && bySlug[m[1]];
    if (d) {
      app.innerHTML = renderDoc(d);
      document.title = d.title + ' · AgentOffer';
      bindDoc(d);
      window.scrollTo(0, 0);
    } else {
      app.innerHTML = renderHome();
      document.title = 'AgentOffer · Agent 开发岗上岸指南';
    }
    document.querySelectorAll('.nav a').forEach(function (a) {
      var key = a.getAttribute('data-nav');
      a.classList.toggle('active', key === 'home' ? !d : (d && d.slug.indexOf(key === 'roadmap' ? 'roadmap' : key === 'interview' ? 'interview' : key === 'resources' ? 'resources' : 'benchmark') === 0));
    });
    updateProgress();
  }
  function bindDoc(d) {
    document.querySelectorAll('.copy-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var code = b.closest('.codeblock').querySelector('code').innerText;
        if (navigator.clipboard) navigator.clipboard.writeText(code);
        b.textContent = '已复制'; b.classList.add('ok');
        setTimeout(function () { b.textContent = '复制'; b.classList.remove('ok'); }, 1600);
      });
    });
    // toc click -> scroll to heading (hash is used for router, so handle manually)
    document.querySelectorAll('#tocList a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var el = document.getElementById(a.getAttribute('data-toc'));
        if (el) { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' }); }
      });
    });
  }

  // ---------- search ----------
  var modal = document.getElementById('searchModal');
  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  var sel = 0, hits = [];
  function mark(text, q) {
    var t = esc(text);
    if (!q) return t;
    try { return t.replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); }
    catch (e) { return t; }
  }
  function doSearch(q) {
    q = q.trim();
    if (!q) {
      hits = docs.slice(0, 8).map(function (d) { return { d: d, snip: d.summary }; });
    } else {
      var ql = q.toLowerCase();
      hits = [];
      docs.forEach(function (d) {
        var body = d.md || '';
        var pos = body.toLowerCase().indexOf(ql);
        var titleHit = d.title.toLowerCase().indexOf(ql) >= 0 || (d.summary || '').toLowerCase().indexOf(ql) >= 0;
        if (pos < 0 && !titleHit) return;
        var snip = titleHit ? d.summary : body.slice(Math.max(0, pos - 40), pos + 90).replace(/\n/g, ' ').replace(/[#*`>|]/g, '');
        hits.push({ d: d, snip: snip, score: titleHit ? 0 : 1 });
      });
      hits.sort(function (a, b) { return a.score - b.score || a.d.order - b.d.order; });
      hits = hits.slice(0, 12);
    }
    sel = 0;
    if (!hits.length) { results.innerHTML = '<div class="sr-empty">没有找到相关内容，换个关键词试试</div>'; return; }
    results.innerHTML = hits.map(function (h, i) {
      return '<a class="sr-item' + (i === 0 ? ' sel' : '') + '" data-i="' + i + '" href="#/doc/' + h.d.slug + '"><b>' + esc(h.d.category) + ' · ' + mark(h.d.title, q) + '</b><span>' + mark(h.snip || '', q) + '</span></a>';
    }).join('');
  }
  function openSearch() { modal.hidden = false; input.value = ''; doSearch(''); setTimeout(function () { input.focus(); }, 30); }
  function closeSearch() { modal.hidden = true; }
  document.getElementById('searchOpen').addEventListener('click', openSearch);
  modal.querySelector('[data-close]').addEventListener('click', closeSearch);
  input.addEventListener('input', function () { doSearch(input.value); });
  results.addEventListener('click', function (e) {
    var a = e.target.closest('.sr-item');
    if (a) closeSearch();
  });
  function moveSel(step) {
    if (!hits.length) return;
    sel = (sel + step + hits.length) % hits.length;
    document.querySelectorAll('.sr-item').forEach(function (a, i) { a.classList.toggle('sel', i === sel); });
    var cur = document.querySelector('.sr-item.sel');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
    if (!modal.hidden) {
      if (e.key === 'Escape') { closeSearch(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); return; }
      if (e.key === 'Enter' && hits[sel]) { location.hash = '#/doc/' + hits[sel].d.slug; closeSearch(); return; }
    }
  });

  // ---------- theme ----------
  var themeBtn = document.getElementById('themeToggle');
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('agentoffer-theme', t); } catch (e) {}
  }
  (function () {
    var saved = null;
    try { saved = localStorage.getItem('agentoffer-theme'); } catch (e) {}
    if (!saved) saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(saved);
  })();
  themeBtn.addEventListener('click', function () {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  // ---------- progress / totop / menu / toc scrollspy ----------
  function updateProgress() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0;
    document.querySelector('.progress span').style.width = pct + '%';
    document.getElementById('toTop').classList.toggle('show', window.scrollY > 400);
    var anchors = document.querySelectorAll('#tocList a');
    if (anchors.length) {
      var best = null;
      anchors.forEach(function (a) {
        var el = document.getElementById(a.getAttribute('data-toc'));
        if (el && el.getBoundingClientRect().top <= 140) best = a;
      });
      anchors.forEach(function (a) { a.classList.toggle('active', a === best); });
    }
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  document.getElementById('toTop').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.getElementById('menuToggle').addEventListener('click', function () {
    var s = document.getElementById('sidebar');
    if (s) s.classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('#sidebar .side-link')) {
      var s = document.getElementById('sidebar');
      if (s) s.classList.remove('open');
    }
  });
  window.addEventListener('hashchange', route);
  route();
})();
