(function () {
  'use strict';
  var C = window.AGENT_CONTENT || { meta: {}, docs: [] };
  var docs = (C.docs || []).slice().sort(function (a, b) { return a.order - b.order; });
  var bySlug = {};
  docs.forEach(function (d) { bySlug[d.slug] = d; });
  var CATS = ['大模型与调用', 'Agent 原理', '工具与上下文', '检索、记忆与框架', '评测与可靠性', '项目与面试'];
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
  var figSeq = 0;
  function wrapCn(s, per) {
    var out = [], cur = '';
    for (var i = 0; i < s.length; i++) {
      cur += s.charAt(i);
      if (cur.length >= per) { out.push(cur); cur = ''; }
    }
    if (cur) out.push(cur);
    return out;
  }
  function svgLines(x, y, lines, cls) {
    return lines.map(function (t, i) {
      return '<text x="' + x + '" y="' + (y + i * 18) + '" text-anchor="middle" class="' + cls + '">' + esc(t) + '</text>';
    }).join('');
  }
  function figFlow(items, cyclic) {
    var id = 'fa' + (++figSeq), n = items.length, W = 720, pad = 22, gap = 28;
    var bw = (W - pad * 2 - gap * (n - 1)) / n, bh = 78, top = 26;
    var H = top + bh + (cyclic ? 58 : 14);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="fig-svg" role="img">';
    s += '<defs><marker id="' + id + '" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" class="fig-arrow"/></marker></defs>';
    items.forEach(function (it, i) {
      var x = pad + i * (bw + gap);
      s += '<rect x="' + x + '" y="' + top + '" width="' + bw + '" height="' + bh + '" rx="11" class="fig-node' + (i === 0 || i === n - 1 ? ' hi' : '') + '"/>';
      var lines = wrapCn(it, Math.max(3, Math.floor(bw / 15)));
      s += svgLines(x + bw / 2, top + bh / 2 - (lines.length - 1) * 9 + 6, lines, 'fig-label');
      if (i < n - 1) {
        s += '<line x1="' + (x + bw + 3) + '" y1="' + (top + bh / 2) + '" x2="' + (x + bw + gap - 7) + '" y2="' + (top + bh / 2) + '" class="fig-line" marker-end="url(#' + id + ')"/>';
      }
    });
    if (cyclic) {
      var y2 = top + bh + 34;
      s += '<path d="M ' + (W - pad - bw / 2) + ' ' + (top + bh) + ' L ' + (W - pad - bw / 2) + ' ' + y2 + ' L ' + (pad + bw / 2) + ' ' + y2 + ' L ' + (pad + bw / 2) + ' ' + (top + bh) + '" class="fig-line fig-back" marker-end="url(#' + id + ')"/>';
      s += '<text x="' + (W / 2) + '" y="' + (y2 - 8) + '" text-anchor="middle" class="fig-note">结果回流，进入下一轮</text>';
    }
    return s + '</svg>';
  }
  function figStack(rows) {
    var W = 720, pad = 22, rowH = 64, gap = 12, top = 16;
    var H = top + rows.length * (rowH + gap) - gap + 16;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="fig-svg" role="img">';
    rows.forEach(function (r, i) {
      var p = r.split('::'), t = p[0] || '', d = p.slice(1).join('::') || '';
      var y = top + i * (rowH + gap);
      s += '<rect x="' + pad + '" y="' + y + '" width="' + (W - pad * 2) + '" height="' + rowH + '" rx="11" class="fig-node' + (i === 0 ? ' hi' : '') + '"/>';
      s += '<rect x="' + pad + '" y="' + y + '" width="6" height="' + rowH + '" rx="3" class="fig-bar"/>';
      s += '<text x="' + (pad + 24) + '" y="' + (y + 27) + '" class="fig-title">' + esc(t) + '</text>';
      var ls = wrapCn(d, 46);
      ls.slice(0, 2).forEach(function (t2, k) {
        s += '<text x="' + (pad + 24) + '" y="' + (y + 48 + k * 15) + '" class="fig-sub">' + esc(t2) + '</text>';
      });
    });
    return s + '</svg>';
  }
  function figCompare(rows) {
    var W = 720, pad = 22, gap = 18, bw = (W - pad * 2 - gap) / 2, H = 196;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="fig-svg" role="img">';
    rows.slice(0, 2).forEach(function (r, i) {
      var p = r.split('::'), t = p[0] || '', pts = (p[1] || '').split('|');
      var x = pad + i * (bw + gap);
      s += '<rect x="' + x + '" y="16" width="' + bw + '" height="' + (H - 32) + '" rx="13" class="fig-node' + (i === 0 ? ' hi' : '') + '"/>';
      s += '<text x="' + (x + bw / 2) + '" y="48" text-anchor="middle" class="fig-title">' + esc(t) + '</text>';
      s += '<line x1="' + (x + 24) + '" y1="62" x2="' + (x + bw - 24) + '" y2="62" class="fig-line"/>';
      pts.forEach(function (q, k) {
        var ls = wrapCn(q, 22);
        ls.slice(0, 2).forEach(function (t2, j) {
          s += '<text x="' + (x + 24) + '" y="' + (90 + k * 40 + j * 17) + '" class="fig-sub">· ' + esc(t2) + '</text>';
        });
      });
    });
    return s + '</svg>';
  }
  function renderFigure(title, body) {
    var lines = body.trim().split('\n'), kind = 'flow', data = [];
    lines.forEach(function (l) {
      var t = l.trim();
      if (!t) return;
      if (t.charAt(0) === '@') { kind = t.slice(1).trim(); return; }
      data.push(t);
    });
    var svg = '';
    if (kind === 'stack') svg = figStack(data);
    else if (kind === 'compare') svg = figCompare(data);
    else svg = figFlow(data[0] ? data.join('|').split('|') : [], kind === 'cycle');
    return '<figure class="figure"><div class="fig-head"><span class="fig-badge">图</span><span>' + inline(title) + '</span></div><div class="fig-body">' + svg + '</div></figure>';
  }
  var BOX = {
    tip: ['tip', '要点'],
    warn: ['warn', '注意'],
    ask: ['ask', '停下来想一想'],
    quote: ['quote', ''],
    steps: ['steps', '跟着做'],
    check: ['check', '自检清单']
  };
  function renderBox(kind, title, body) {
    var cfg = BOX[kind] || BOX.tip;
    var inner = renderMarkdown(body).html;
    return '<div class="mdbox mdbox-' + cfg[0] + '">' +
      (cfg[1] || title ? '<div class="mdbox-head"><span class="mdbox-tag">' + inline(title || cfg[1]) + '</span></div>' : '') +
      '<div class="mdbox-body">' + inner + '</div></div>';
  }
  function renderContainer(raw) {
    var lines = raw.split('\n');
    var open = (lines.shift() || '').replace(/^:::\s*/, '').trim();
    var sp = open.indexOf(' ');
    var kind = (sp < 0 ? open : open.slice(0, sp)).trim();
    var title = sp < 0 ? '' : open.slice(sp + 1).trim();
    var body = lines.join('\n').replace(/\n\s*$/, '');
    if (kind === 'figure') return renderFigure(title, body);
    return renderBox(kind, title, body);
  }
  function renderMarkdown(md) {
    var lines = String(md).replace(/\r\n/g, '\n').split('\n');
    var out = [], heads = [];
    var i = 0;
    while (i < lines.length) {
      var L = lines[i];
      // custom container :::kind title ... :::
      if (/^:::\s*\S/.test(L)) {
        var buf = [];
        i++;
        while (i < lines.length && !/^:::\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push(renderContainer([L].concat(buf).join('\n')));
        continue;
      }
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
    '大模型与调用': '<path d="M7 8h10M7 12h7M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="17.5" cy="12" r="1.6" fill="currentColor"/>',
    'Agent 原理': '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    '工具与上下文': '<path d="M14 6a4 4 0 0 0-5.2 5.2L4 16v4h4l4.8-4.8A4 4 0 0 0 18 10l-3 3-2-2 3-3a4 4 0 0 0-2-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    '检索、记忆与框架': '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 10.5h5M10.5 8v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    '评测与可靠性': '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    '项目与面试': '<path d="M4 7h16v12H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 7V5h6v2M4 12h16M9 15h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  function icon(c) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[c] || ICONS['大模型与调用']) + '</svg>'; }

  // ---------- home ----------
  var STAGES = [
    { no: '01', t: '模型与调用', d: 'Token 与幻觉、请求五块、超时退避、输出三层契约', time: '4 篇 · 第 1~2 周', to: '01-how-llm-works' },
    { no: '02', t: 'Agent 循环', d: '唯一判据、循环状态、四个终止条件、错误回传、检查点', time: '2 篇 · 第 3~5 周', to: '04-what-is-agent' },
    { no: '03', t: '工具与上下文', d: '工具 Schema、权限矩阵、幂等键、上下文预算与压缩', time: '2 篇 · 第 6~7 周', to: '06-tool-calling' },
    { no: '04', t: '检索、记忆与框架', d: '切分与双路检索、溯源拒答、三层记忆、框架六大件', time: '3 篇 · 第 8~9 周', to: '08-rag' },
    { no: '05', t: '评测与可靠性', d: '用例集、性质断言、回归门禁、注入防护、幂等降级', time: '3 篇 · 第 9~10 周', to: '11-eval' },
    { no: '06', t: '项目与表达', d: '三个项目的约束与权衡、数字口径、四层追问链', time: '2 篇 · 第 10 周', to: '14-projects' }
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
        '<div class="eyebrow"><i></i> 免费 · 原创 · 持续更新</div>' +
        '<h1>从零基础到<br><em>能独立交付</em>的<br>Agent 开发指南</h1>' +
        '<p>按小白的认知顺序，把要掌握的知识点一层层排好：' + total + ' 篇原创图解长文，每篇从「为什么会这样」推到「代码该怎么写」。所有示例只用标准库，复制粘贴就能跑。</p>' +
        '<div class="hero-btns"><a class="btn btn-primary" href="#/doc/00-start-here">看完整学习路线 <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>' +
        '<a class="btn btn-ghost" href="#/doc/05-agent-loop">直接看手写循环</a></div>' +
      '</div><div class="hero-terminal"><div class="term-bar"><i></i><i></i><i></i><span>agent_loop.py</span></div>' +
      '<div class="term-body"><span class="k">def</span> <span class="f">run</span>(goal, tools, budget):\n  state = <span class="f">State</span>(goal)\n  <span class="k">while</span> <span class="k">True</span>:\n    <span class="c"># 1 组装上下文</span>\n    msg = <span class="f">build_messages</span>(state)\n    <span class="c"># 2 模型决策</span>\n    d = llm.<span class="f">call</span>(msg, tools)\n    <span class="k">if</span> d.is_final: <span class="k">return</span> d.answer\n    <span class="k">if</span> state.rounds &gt;= budget.max:\n      <span class="k">return</span> <span class="f">fallback</span>(<span class="s">"超出预算"</span>)\n    <span class="c"># 3 执行 + 4 记录轨迹</span>\n    obs = tools.<span class="f">execute</span>(d.name, d.args)\n    state.trace.<span class="f">append</span>(obs)\n    state.rounds += <span class="n">1</span></div></div></div></section>' +
      '<div class="stats"><div class="stat"><b>' + total + ' 篇</b><span>原创长文，不是链接清单</span></div><div class="stat"><b>50+ 张</b><span>自绘示意图</span></div><div class="stat"><b>零依赖</b><span>代码复制即可运行</span></div><div class="stat"><b>3 项目</b><span>能写进简历并答到第四层</span></div></div>' +
      '<section class="section"><div class="section-head"><div class="section-kicker">Roadmap</div><h2>从不会到会：六层知识点，一层层往上踩</h2><p>不是贴「入门 / 进阶 / 实战」的标签，而是按依赖关系排知识点：后一层一定要用到前一层。点开任意一层，就是那几篇完整正文。</p></div><div class="roadmap-grid">' + stageHtml + '</div></section>' +
      '<section class="section"><div class="section-head"><div class="section-kicker">Knowledge base</div><h2>按知识点域浏览全部 16 篇</h2><p>每篇都是「提问 → 破误解 → 图解 → 层层追问 → 可运行代码 → 自检 → 小结」，读完一篇就少一个困惑。</p></div><div class="cat-grid">' + catHtml + '</div></section>' +
      '<section class="section"><div class="section-head"><div class="section-kicker">How we write</div><h2>这份教程是怎么写的</h2><p>目标读者是完全没做过 Agent、想转行的人。所以每一篇都从「为什么会发生」讲起，而不是先甩一个概念。</p></div>' +
      '<table class="compare"><thead><tr><th>维度</th><th>知识点清单</th><th>提纲式教程</th><th class="us">AgentOffer</th></tr></thead><tbody>' +
      '<tr><td>内容形态</td><td>链接与目录</td><td>概念与表格</td><td class="us">原创正文 + 自绘示意图</td></tr>' +
      '<tr><td>代码</td><td>无</td><td>零散片段</td><td class="us">完整可运行，零第三方依赖</td></tr>' +
      '<tr><td>讲解方式</td><td>给结论</td><td>给结论</td><td class="us">从机制推导到工程取舍</td></tr>' +
      '<tr><td>失败与坑</td><td>不提</td><td>很少提</td><td class="us">每篇都有踩坑与边界</td></tr>' +
      '<tr><td>适合谁</td><td>已入门</td><td>已入门</td><td class="us">零基础转行</td></tr>' +
      '<tr><td>收尾</td><td>—</td><td>无</td><td class="us">自检清单 + 三句话小结</td></tr>' +
      '</tbody></table></section>' +
      '<div class="cta"><div><h2>笔面情报与资料包，回复关键词领取</h2><p>按公司 / 岗位分类的笔面情报与网申时间线、主流笔试平台题型与规则差异、面经追问链合集与项目讲法模板。教程本身全部免费公开，这里只是额外的求职资料。</p><span class="cta-key">公众号回复：Agent</span></div><div class="cta-side"><a class="btn btn-primary" href="#/doc/00-start-here">从学习路线开始</a><div style="font-size:12px;color:var(--text-3)">1v1 咨询：微信 offer630</div></div></div>' +
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
      '<div class="side-foot">16 篇原创正文 · 一份源同时驱动 GitHub 与本站<br><a href="https://github.com/bimianwangzhe/agent-offer" target="_blank" rel="noopener">在 GitHub 上查看 →</a></div></aside>';
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
    var NAV_SLUG = { roadmap: '00-start-here', loop: '05-agent-loop',
                     context: '06-tool-calling', career: '14-projects' };
    document.querySelectorAll('.nav a').forEach(function (a) {
      var key = a.getAttribute('data-nav');
      a.classList.toggle('active', key === 'home' ? !d : (d && d.slug === NAV_SLUG[key]));
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
