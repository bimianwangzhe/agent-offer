(function () {
  'use strict';
  var C = window.AGENT_CONTENT || { meta: {}, docs: [], layers: [], series: [], picks: [], glossary: [] };
  var docs = (C.docs || []).slice().sort(function (a, b) { return a.order - b.order; });
  var layers = C.layers || [], series = C.series || [], picks = C.picks || [], glossary = C.glossary || [];
  var goals = C.goals || [], hotRank = C.hotRank || [];
  var meta = C.meta || {};
  var bySlug = {};
  docs.forEach(function (d) { bySlug[d.slug] = d; });
  var app = document.getElementById('app');
  var sidebar = document.getElementById('sidebar');
  var CATS = layers.map(function (l) { return l.key; });

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
      if (word && /^(print|len|range|json|client|llm|run|execute|answer|build_messages|rerank|hybrid_search|main|State|ToolResult)$/.test(word)) return '<span class="tok-f">' + word + '</span>';
      return all;
    });
  }

  /* ---------- 自绘 SVG 示意图 ---------- */
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
  function renderMarkdown(md, slug) {
    var lines = String(md).replace(/\r\n/g, '\n').split('\n');
    var out = [], heads = [], seen = {};
    var i = 0;
    while (i < lines.length) {
      var L = lines[i];
      if (/^:::\s*\S/.test(L)) {
        var buf = [];
        i++;
        while (i < lines.length && !/^:::\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push(renderContainer([L].concat(buf).join('\n')));
        continue;
      }
      if (/^\s*```/.test(L)) {
        var lang = L.replace(/^\s*```/, '').trim() || 'text';
        var cbuf = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { cbuf.push(lines[i]); i++; }
        i++;
        var code = cbuf.join('\n');
        out.push('<div class="codeblock"><div class="code-head"><span class="code-lang">' + esc(lang) + '</span><button class="copy-btn" type="button">复制</button></div><pre><code>' + highlight(code) + '</code></pre></div>');
        continue;
      }
      var hm = /^(#{1,4})\s+(.+)$/.exec(L);
      if (hm) {
        var lvl = hm[1].length, txt = hm[2].trim();
        var id = slugify(txt);
        if (seen[id]) { seen[id] += 1; id = id + '-' + seen[id]; } else seen[id] = 1;
        out.push('<h' + lvl + ' id="' + id + '">' + inline(txt) +
          (lvl >= 2 ? '<a class="h-anchor" href="#' + id + '" data-anchor="' + id + '" aria-label="锚点">#</a>' : '') + '</h' + lvl + '>');
        if (lvl === 2 || lvl === 3) heads.push({ id: id, text: txt.replace(/[*`]/g, ''), lvl: lvl });
        i++; continue;
      }
      if (/^\s*(---|\*\*\*|___)\s*$/.test(L)) { out.push('<hr>'); i++; continue; }
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
      if (/^\s*>/.test(L)) {
        var q = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push('<blockquote>' + q.map(function (x) { return '<p>' + inline(x) + '</p>'; }).join('') + '</blockquote>');
        continue;
      }
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
      if (L.trim() === '') { i++; continue; }
      var para = [];
      while (i < lines.length && lines[i].trim() !== '' &&
             !/^\s*```/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) &&
             !/^\s*\|/.test(lines[i]) && !/^\s*>/.test(lines[i]) &&
             !/^\s*(?:[-*] |\d+\. |\[[ x]\] )/.test(lines[i]) &&
             !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i]) && !/^:::\s*\S/.test(lines[i])) {
        para.push(lines[i].trim()); i++;
      }
      if (para.length) out.push('<p>' + inline(para.join(' ')) + '</p>');
      else i++;
    }
    return { html: out.join('\n'), heads: heads };
  }

  /* ---------- icons ---------- */
  var ICONS = {
    road: '<path d="M5 19h3l3-13 3 9 2-5h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    book: '<path d="M4 5h7a3 3 0 0 1 3 3v12a3 3 0 0 0-3-3H4zM20 5h-3a3 3 0 0 0-3 3v12a3 3 0 0 1 3-3h3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    loop: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    tool: '<path d="M14 6a4 4 0 0 0-5.2 5.2L4 16v4h4l4.8-4.8A4 4 0 0 0 18 10l-3 3-2-2 3-3a4 4 0 0 0-2-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 9h8M8 12h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    case: '<path d="M4 7h16v12H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 7V5h6v2M4 12h16M9 15h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>',
    home: '<path d="m4 11 8-7 8 7v9H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 20v-6h6v6" fill="none" stroke="currentColor" stroke-width="2"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  function icon(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[k] || ICONS.book) + '</svg>'; }

  /* ---------- 左侧常驻目录树 ---------- */
  var NAVS = [
    { h: '#/', t: '首页', i: 'home', key: 'home' },
    { h: '#/roadmap', t: '学习路线', i: 'road', key: 'roadmap' },
    { h: '#/all', t: '全部文章', i: 'grid', key: 'all' },
    { h: '#/index', t: '知识点索引', i: 'search', key: 'index' },
    { h: '#/about', t: '关于本站', i: 'info', key: 'about' }
  ];
  function collapsedKey(k) { return 'ao-collapse-' + k; }
  function isCollapsed(k) {
    try { return localStorage.getItem(collapsedKey(k)) === '1'; } catch (e) { return false; }
  }
  function sidebarHtml(activeSlug, activeNav) {
    var s = '<div class="side-scroll">';
    s += '<div class="side-block"><div class="side-cap">站点导航</div>';
    NAVS.forEach(function (n) {
      s += '<a class="side-link nav-link' + (activeNav === n.key && !activeSlug ? ' active' : '') + '" href="' + n.h + '">' + icon(n.i) + '<span>' + n.t + '</span></a>';
    });
    s += '</div>';
    layers.forEach(function (l) {
      var list = docs.filter(function (d) { return d.category === l.key; });
      if (!list.length) return;
      var open = isCollapsed(l.key) || false;
      var hasActive = list.some(function (d) { return d.slug === activeSlug; });
      s += '<div class="side-block' + (open && !hasActive ? ' collapsed' : '') + '" data-group="' + esc(l.key) + '">';
      s += '<button class="side-cap side-toggle" type="button" aria-expanded="' + (!open) + '"><span class="side-cap-no">' + l.no + '</span><span>' + esc(l.name) + '</span><span class="side-cap-count">' + list.length + '</span><svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      s += '<div class="side-items">';
      list.forEach(function (d) {
        s += '<a class="side-link' + (d.slug === activeSlug ? ' active' : '') + '" href="#/doc/' + d.slug + '"><span class="side-no">' + d.no + '</span><span class="side-title">' + esc(d.title) + '</span>' + (d.hot ? '<span class="hot-dot" title="热门">热</span>' : '') + '</a>';
      });
      s += '</div></div>';
    });
    s += '<div class="side-foot"><b>' + docs.length + ' 篇</b> 原创图解长文<br><b>' + (meta.totalFigures || 0) + ' 张</b> 自绘示意图 · <b>' + (meta.totalCodes || 0) + ' 段</b> 可运行代码<br><a href="' + (meta.repo || '#/') + '" target="_blank" rel="noopener">在 GitHub 上查看 →</a></div>';
    s += '</div>';
    return s;
  }
  function bindSidebar() {
    sidebar.querySelectorAll('.side-toggle').forEach(function (b) {
      b.addEventListener('click', function () {
        var block = b.closest('.side-block');
        var k = block.getAttribute('data-group');
        var now = block.classList.toggle('collapsed');
        b.setAttribute('aria-expanded', String(!now));
        try { localStorage.setItem(collapsedKey(k), now ? '1' : '0'); } catch (e) {}
      });
    });
  }

  /* ---------- 通用零件 ---------- */
  function kfmt(n) { return n >= 10000 ? (n / 10000).toFixed(1) + ' 万' : String(n); }
  function docLine(d, withSummary) {
    return '<a class="doc-line" href="#/doc/' + d.slug + '">' +
      '<span class="dl-no">' + d.no + '</span>' +
      '<span class="dl-main"><b>' + esc(d.title) + '</b>' + (d.hot ? '<span class="hot-tag">热</span>' : '') +
      (withSummary ? '<span class="dl-sum">' + esc(d.summary) + '</span>' : '') + '</span>' +
      '<span class="dl-meta">' + kfmt(d.chars || 0) + '字 · ' + d.minutes + 'min</span></a>';
  }
  function sectionHead(kicker, h2, p) {
    return '<div class="section-head"><div class="section-kicker">' + esc(kicker) + '</div><h2 id="' + slugify(h2) + '">' + inline(h2) + '</h2>' + (p ? '<p>' + esc(p) + '</p>' : '') + '</div>';
  }
  function ctaBlock() {
    return '<div class="cta"><div><h2>笔面情报与资料包，回复关键词领取</h2><p>按公司 / 岗位分类的笔面情报与网申时间线、主流笔试平台题型与规则差异、面经追问链合集与项目讲法模板。教程本身全部免费公开，这里只是额外的求职资料。</p><span class="cta-key">公众号回复：Agent</span></div><div class="cta-side"><a class="btn btn-primary" href="#/roadmap">从学习路线开始</a><div class="cta-note">1v1 咨询：微信 offer630</div></div></div>';
  }

  /* ---------- 首页：按对标站共同结构重排 ---------- */
  function renderHome() {
    var s = '<div class="page fade home">';
    var arrow = '<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var chev = '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

    /* 2. Hero：一句话定位 + 覆盖范围 + 双按钮 + 数据背书 */
    s += '<section class="hero"><div class="hero-inner">' +
      '<div class="hero-copy"><div class="eyebrow"><i></i> 免费 · 原创 · 持续更新</div>' +
      '<h1>从零基础到<br><em>能独立交付</em>的<br>Agent 开发指南</h1>' +
      '<p class="hero-lead">把 ' + (meta.pointCount || 0) + ' 个知识点按依赖关系分成 ' + (meta.chapterCount || 0) + ' 组，每一条都单独写成一篇完整正文：从「为什么会这样」推到「代码该怎么写」，配自绘图、可运行代码、踩坑边界与自检清单。示例只用标准库，复制即跑。</p>' +
      '<div class="hero-btns"><a class="btn btn-primary" href="#/roadmap">开始学习 ' + arrow + '</a>' +
      '<a class="btn btn-ghost" href="#/all">查看全部文章</a></div>' +
      '<div class="hero-stats"><span><b>' + docs.length + ' 篇</b>原创长文</span><span><b>' + kfmt(meta.totalChars || 0) + '</b>字正文</span><span><b>' + (meta.totalFigures || 0) + ' 张</b>自绘图</span><span><b>' + (meta.totalCodes || 0) + ' 段</b>可运行代码</span></div>' +
      '</div>' +
      '<div class="hero-side"><div class="hero-side-cap">三步开始</div>' +
      '<a class="hero-step" href="#/roadmap"><span>1</span><b>读总纲，看清全部知识点</b>' + chev + '</a>' +
      '<a class="hero-step" href="#/all"><span>2</span><b>按分组挑一篇读到底</b>' + chev + '</a>' +
      '<a class="hero-step" href="#/index"><span>3</span><b>用索引查漏，跑一遍代码</b>' + chev + '</a>' +
      '<div class="hero-side-foot">内容更新至 ' + esc(meta.built || '') + ' · 正文全部免费公开</div>' +
      '</div></div></section>';

    /* 亮点：二级篇章导航，12 组一行铺开 */
    s += '<div class="chapter-bar"><span class="cb-label">' + (meta.chapterCount || 0) + ' 组知识点</span><div class="cb-links">' +
      layers.slice(1).map(function (l) { return '<a href="#/doc/' + l.entry + '" title="' + esc(l.goal || '') + '">' + esc(l.name) + '</a>'; }).join('') +
      '</div></div>';

    /* 3. 按用户目标分组，而不是按技术栈分组 */
    s += '<section class="section" id="goals">' + sectionHead('新手路径', '你想做什么？先选一个目标', '不问你学过什么，只问你现在要解决的问题。每条路径给一组按顺序排好的正文，点开就能开始读。') +
      '<div class="goal-grid">' + goals.map(function (g) {
        var links = g.slugs.map(function (sl) { return bySlug[sl] ? '<a href="#/doc/' + sl + '">' + esc(bySlug[sl].title) + '</a>' : ''; }).filter(Boolean).join('');
        return '<div class="goal-card"><div class="gc-top"><span class="gc-icon">' + icon(g.icon) + '</span><h3>' + esc(g.t) + '</h3></div><p>' + esc(g.d) + '</p><div class="gc-links">' + links + '</div></div>';
      }).join('') + '</div></section>';

    /* 4. 核心内容矩阵：12 组，每组一句说明 + 篇数 + 图数 */
    s += '<section class="section">' + sectionHead('全部知识点', '按 ' + (meta.chapterCount || 0) + ' 组铺开，共 ' + (meta.pointCount || 0) + ' 条', '每组先说清「学完能做什么」，再逐条点开正文。篇数与图数由目录实时统计，不是写死的宣传数字。') +
      '<div class="matrix-grid">' + layers.slice(1).map(function (l) {
        var list = docs.filter(function (d) { return d.category === l.key; });
        var figs = list.reduce(function (n, d) { return n + (d.figures || 0); }, 0);
        return '<a class="matrix-card" href="#/doc/' + l.entry + '"><div class="mc-top"><span class="mc-no">' + l.no + '</span><span class="mc-count">' + list.length + ' 篇 · ' + figs + ' 图</span></div><h3>' + esc(l.name) + '</h3><p>' + esc(l.desc) + '</p><div class="mc-goal">学完能：' + esc(l.goal || '') + '</div></a>';
      }).join('') + '</div></section>';

    /* 5. 热门榜 + 精选两层卡片 */
    s += '<section class="section">' + sectionHead('精选与热门', '不知道看哪篇，就看这两组', '左边是问得最多的一组，按顺序列出并标出字数与更新时间；右边是编辑按主题排的必读顺序。每条都点开完整正文。') +
      '<div class="hot-layout"><div class="hot-rank"><div class="hr-head">🔥 高频先读 <span>Top ' + Math.min(hotRank.length, 10) + '</span></div>' +
      hotRank.slice(0, 10).map(function (sl, i) {
        var d = bySlug[sl]; if (!d) return '';
        return '<a class="hr-item" href="#/doc/' + sl + '"><span class="hr-no">' + (i + 1) + '</span><span class="hr-main"><b>' + esc(d.title) + '</b><span>' + kfmt(d.chars || 0) + ' 字 · 更新 ' + esc(d.updated || '') + '</span></span></a>';
      }).join('') + '</div>' +
      '<div class="picks">' + picks.map(function (g) {
        return '<div class="pick-group"><div class="pg-head"><h3>' + esc(g.t) + '</h3><p>' + esc(g.d) + '</p></div><div class="pg-links">' +
          g.slugs.map(function (sl) { var d = bySlug[sl]; return d ? '<a href="#/doc/' + sl + '">' + esc(d.title) + '</a>' : ''; }).join('') +
          '</div></div>';
      }).join('') + '</div></div></section>';

    /* 6. 实战 / 案例：讲完概念还要能跑起来 */
    var cases = [
      { t: '手写一个能停下来的循环', d: '不用任何框架，把决策、终止条件、错误回传、检查点写成一段能跑的程序。', sl: '05-agent-loop', tag: '动手' },
      { t: '给答案接上出处与拒答', d: '切分、双路召回、融合重排、溯源引用、材料不足时如实说不知道。', sl: '08-rag', tag: '工程' },
      { t: '高频面试题的完整答法', d: '从第一层定义答到第四层追问，附能被继续追问的项目讲法。', sl: '16-interview-qa', tag: '面试' },
      { t: '开给别人用之前的清单', d: '幂等、退避、护栏、灰度回滚、成本与轨迹，逐项落到代码里。', sl: '17-production-checklist', tag: '清单' },
      { t: '把知识点串成作品', d: '每个项目带架构、代码骨架、评测口径与追问预判。', sl: '14-projects', tag: '作品' },
      { t: '注入与越权怎么防', d: '直接注入、间接注入、最小权限、输出护栏，用本地样例跑一遍。', sl: '12-safety', tag: '安全' }
    ];
    s += '<section class="section">' + sectionHead('能落地的部分', '讲完概念，还要能跑起来', '教程站最容易停在「讲清楚是什么」。这一组把可运行的实现、可照着勾的清单、能讲给面试官听的项目收在一起。') +
      '<div class="case-grid">' + cases.filter(function (c) { return bySlug[c.sl]; }).map(function (c) {
        var d = bySlug[c.sl];
        return '<a class="case-card" href="#/doc/' + c.sl + '"><span class="case-tag">' + esc(c.tag) + '</span><h3>' + esc(c.t) + '</h3><p>' + esc(c.d) + '</p><div class="case-foot"><span>' + kfmt(d.chars || 0) + ' 字 · ' + d.figures + ' 图 · ' + d.codes + ' 段代码</span>' + arrow + '</div></a>';
      }).join('') + '</div></section>';

    /* 7. 数据与信任：全部数字由 docs 实时统计 */
    s += '<section class="section">' + sectionHead('内容规模', '用数字说明这套教程有多厚', '下面每个数字都由 docs 目录实时统计生成，不是写死的宣传语。') +
      '<div class="trust-strip">' +
      '<div class="trust-cell"><b>' + docs.length + '</b><span>篇原创正文</span></div>' +
      '<div class="trust-cell"><b>' + kfmt(meta.totalChars || 0) + '</b><span>字中文正文</span></div>' +
      '<div class="trust-cell"><b>' + (meta.totalFigures || 0) + '</b><span>张自绘示意图</span></div>' +
      '<div class="trust-cell"><b>' + (meta.totalCodes || 0) + '</b><span>段可运行代码</span></div>' +
      '<div class="trust-cell"><b>' + (meta.glossaryCount || 0) + '</b><span>条知识点索引</span></div>' +
      '</div><div class="trust-note">内容更新至 <b>' + esc(meta.built || '') + '</b> · 全部示例只用 Python 标准库，零账号、零联网、零第三方依赖</div></section>';

    /* 8. 快捷工具入口 + 转化 CTA */
    var tools = [
      { t: '学习路线', h: '#/roadmap', i: 'road' }, { t: '知识点索引', h: '#/index', i: 'search' },
      { t: '全部文章', h: '#/all', i: 'grid' }, { t: '路线总纲', h: '#/doc/00-start-here', i: 'book' },
      { t: '面试八股', h: '#/doc/16-interview-qa', i: 'chat' }, { t: '落地清单', h: '#/doc/17-production-checklist', i: 'shield' },
      { t: '关于本站', h: '#/about', i: 'info' }, { t: '源码仓库', h: (meta.repo || '#/'), i: 'case' }
    ];
    s += '<section class="section">' + sectionHead('快捷入口', '不读书的时候，也能直接去用', '查一个术语、挑一个专题、翻一份清单，或者去仓库看源文件，都不用绕目录。') +
      '<div class="tool-grid">' + tools.map(function (t) {
        var ext = /^https?:/.test(t.h) ? ' target="_blank" rel="noopener"' : '';
        return '<a class="tool-cell" href="' + t.h + '"' + ext + '><span class="tc-icon">' + icon(t.i) + '</span><b>' + esc(t.t) + '</b></a>';
      }).join('') + '</div></section>';
    s += ctaBlock();

    /* 9. 关于与贡献 */
    s += '<section class="section">' + sectionHead('关于与贡献', '这套内容是怎么写出来的', '目标读者是完全没做过 Agent、想转行的人。所以每一篇都从「为什么会发生」讲起，先破一个常见误解，再给类比、自绘图、层层追问、能跑的代码、踩坑边界与自检清单，最后用三句话收口。') +
      '<div class="about-strip"><div class="as-col"><h3>不做什么</h3><p>不给资料索引，不堆名词清单，不写「一看就会」的提纲。每篇都是能独立读完的正文，配自绘的示意图与零依赖代码。</p></div>' +
      '<div class="as-col"><h3>怎么核对</h3><p>docs 目录是唯一内容源，站点与仓库由同一份构建脚本生成。改动一处，目录、索引、字数与更新时间一起变化，不会出现「目录里有、正文没有」。</p></div>' +
      '<div class="as-col"><h3>怎么参与</h3><p>发现写错、某个实践该更新、有更好的图，都欢迎到仓库提 Issue 或 PR。数据与结论只写能核对的口径，不编数字。</p><a class="as-link" href="' + (meta.repo || '#/') + '" target="_blank" rel="noopener">前往源码仓库 ' + arrow + '</a></div></div></section>';

    return s + '</div>';
  }

  /* ---------- 全部文章页 ---------- */
  function renderAll() {
    var s = '<div class="page fade narrow"><div class="crumb"><a href="#/">首页</a><span>/</span><span>全部文章</span></div>';
    s += '<div class="page-head"><div class="section-kicker">Contents</div><h1>全部文章</h1><p>共 ' + docs.length + ' 篇原创正文，按 ' + (meta.chapterCount || 0) + ' 组知识点分组。每篇都有自绘图、可运行代码、自检清单与三句话小结；点标题直接读正文。</p></div>';
    s += '<div class="all-groups page-groups">' + layers.map(function (l) {
      var list = docs.filter(function (d) { return d.category === l.key; });
      if (!list.length) return '';
      return '<div class="all-group"><div class="ag-head"><span class="ag-no">' + l.no + '</span><div><h3>' + esc(l.name) + '</h3><p>' + esc(l.desc) + '</p></div><span class="ag-count">' + list.length + ' 篇</span></div><div class="ag-list">' + list.map(function (d) { return docLine(d, true); }).join('') + '</div></div>';
    }).join('') + '</div>';
    s += '<div class="page-foot">另有 <a href="#/index">知识点索引</a>（' + (meta.glossaryCount || 0) + ' 条术语速查）与 <a href="#/roadmap">学习路线</a>。</div>';
    return s + '</div>';
  }

  /* ---------- 知识点索引页 ---------- */
  function renderIndex() {
    var s = '<div class="page fade narrow"><div class="crumb"><a href="#/">首页</a><span>/</span><span>知识点索引</span></div>';
    s += '<div class="page-head"><div class="section-kicker">Index</div><h1>知识点索引</h1><p>' + (meta.glossaryCount || 0) + ' 条术语速查，按 ' + (meta.chapterCount || 0) + ' 组知识点分组。每条一句话讲清是什么，点「看正文」跳到对应文章；遇到具体问题时也可以按关键词查。</p></div>';
    s += '<div class="glossary-tools"><div class="gt-search">' + icon('search') + '<input id="glossaryInput" type="text" placeholder="筛选知识点，例如：幂等 / 注入 / 检索…" autocomplete="off"><span id="glossaryCount" class="gt-count"></span></div></div>';
    s += '<div id="glossaryBody">' + glossary.map(function (g, gi) {
      return '<section class="gl-group" data-gi="' + gi + '"><div class="gl-head"><span class="gl-no">' + String(gi + 1).padStart(2, '0') + '</span><h2>' + esc(g.g) + '</h2><span class="gl-count">' + g.items.length + ' 条</span></div><div class="gl-grid">' +
        g.items.map(function (it) {
          var d = bySlug[it[2]];
          return '<div class="gl-item" data-text="' + esc((it[0] + ' ' + it[1] + ' ' + (d ? d.title : '')).toLowerCase()) + '"><h3>' + esc(it[0]) + '</h3><p>' + esc(it[1]) + '</p>' + (d ? '<a href="#/doc/' + it[2] + '">看正文：' + esc(d.title) + ' →</a>' : '') + '</div>';
        }).join('') + '</div></section>';
    }).join('') + '</div>';
    s += '<div id="glossaryEmpty" class="gl-empty" hidden>没有匹配的知识点，换个关键词试试。</div>';
    s += '<div class="page-foot">索引只做速查，完整推导、图解与代码都在正文里。建议配合 <a href="#/roadmap">学习路线</a> 按顺序读。</div>';
    return s + '</div>';
  }
  function bindGlossary() {
    var input = document.getElementById('glossaryInput');
    if (!input) return;
    var count = document.getElementById('glossaryCount');
    function run() {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      document.querySelectorAll('#glossaryBody .gl-item').forEach(function (el) {
        var hit = !q || (el.getAttribute('data-text') || '').indexOf(q) >= 0;
        el.hidden = !hit;
        if (hit) shown++;
      });
      document.querySelectorAll('#glossaryBody .gl-group').forEach(function (g) {
        var any = g.querySelectorAll('.gl-item:not([hidden])').length;
        g.hidden = any === 0;
      });
      if (count) count.textContent = q ? shown + ' 条匹配' : (meta.glossaryCount || 0) + ' 条';
      var empty = document.getElementById('glossaryEmpty');
      if (empty) empty.hidden = shown !== 0;
    }
    input.addEventListener('input', run);
    run();
  }

  /* ---------- 学习路线页 ---------- */
  function ROADMAP_STEPS() {
    return [
      { c: '大模型与调用', pts: ['下一个词预测、Token 与上下文窗口', '一次请求五块、超时与指数退避', '「请只输出 JSON」为什么没用', '语法 / 结构 / 语义三层契约与自动纠正'] },
      { c: 'Agent 原理', pts: ['唯一判据：下一步谁决定', '什么时候坚决不该用 Agent', '循环状态与四个终止条件', '错误回传、幂等去重、检查点回放'] },
      { c: '工具与上下文', pts: ['工具是一份契约，不是函数列表', '参数 Schema、权限矩阵、最小权限', '幂等落盘与副作用防重', '上下文预算表与三种压缩策略'] },
      { c: '检索、记忆与框架', pts: ['切分、双路检索与融合、重排', '溯源校验与拒答阈值', '三层记忆、写入判定与遗忘', '框架六大件与解耦适配层'] },
      { c: '评测与可靠性', pts: ['三层评测与从 30 条起步的用例集', '性质断言、回归门禁', '间接提示注入与四重预算', '幂等降级、轨迹、灰度与回滚'] },
      { c: '项目与面试', pts: ['三个项目的约束、权衡与可验证结果', '数字口径与简历改写对照', '面试官追的是决策链不是知识点', '四层追问链与 15 分钟讲项目'] }
    ];
  }
  function renderRoadmap() {
    var steps = ROADMAP_STEPS();
    var s = '<div class="page fade narrow"><div class="crumb"><a href="#/">首页</a><span>/</span><span>学习路线</span></div>';
    s += '<div class="page-head"><div class="section-kicker">Roadmap</div><h1>一条从不会到会的线</h1><p>不是贴标签，而是按依赖关系排知识点：后一层一定要用到前一层。每一条点开都是网站上的完整正文，读完对照自检清单，过了再往下一层。</p></div>';
    s += '<div class="rm-flow">' + layers.map(function (l, i) {
      return '<div class="rm-step"><div class="rm-dot">' + l.no + '</div><div class="rm-body"><h3>' + esc(l.name) + '</h3><p>' + esc(l.desc) + '</p></div></div>' + (i < layers.length - 1 ? '<div class="rm-arrow">↓ 有了上一层，才谈得上这一层</div>' : '');
    }).join('') + '</div>';
    s += '<section class="section">' + sectionHead('逐层知识点清单', '每一层具体要掌握什么', '逐条点链接读正文；知识点是概括，推导、自绘图与可运行代码全在链接里。');
    s += layers.map(function (l, i) {
      var list = docs.filter(function (d) { return d.category === l.key; });
      return '<div class="rm-layer"><div class="rl-head"><span class="rl-no">' + l.no + '</span><h3>' + esc(l.name) + '</h3><span class="rl-count">' + list.length + ' 篇</span></div><div class="rl-grid"><div class="rl-pts"><h4>要掌握的知识点</h4><ul>' + steps[i].pts.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div><div class="rl-docs"><h4>对应正文</h4>' + list.map(function (d) { return '<a href="#/doc/' + d.slug + '"><span>' + d.no + '</span>' + esc(d.title) + '</a>'; }).join('') + '</div></div></div>';
    }).join('') + '</section>';
    s += '<div class="page-foot">全部 ' + docs.length + ' 篇见 <a href="#/all">完整目录</a>，术语速查见 <a href="#/index">知识点索引</a>。</div>';
    return s + ctaBlock() + '</div>';
  }

  /* ---------- 关于页 ---------- */
  function renderAbout() {
    var s = '<div class="page fade narrow"><div class="crumb"><a href="#/">首页</a><span>/</span><span>关于本站</span></div>';
    s += '<div class="page-head"><div class="section-kicker">About</div><h1>关于本站</h1><p>如果你打开招聘软件搜「Agent 开发」，看到那串要求的第一反应是「完了，我得先把大模型学一遍」——然后收藏一张密密麻麻的名词清单，第二天再打开还是不知道第一步该敲什么：这份指南就是为你写的。</p></div>';
    s += '<div class="md about-md"><h2>它和名词清单的区别只有一条</h2><p>按小白的认知顺序，把「要掌握的知识点」按依赖关系一层层排好，后一层必须踩在前一层上。每一条知识点后面都有一个链接，点开就是网站上的一篇完整正文：有推导、有自绘图、有可运行代码，不是让你再去别处搜。</p>';
    s += '<h2>每一篇是怎么写的</h2><p>路线总纲把 ' + (meta.pointCount || 0) + ' 个知识点逐条罗列，每个知识点再单独写成一篇完整正文；全部采用同一套讲解结构，目标是让零基础的人真能读下去：</p>';
    s += '<blockquote><p>开篇一个真实场景提问 → 先破一个常见误解 → 用生活类比讲机制 → 自绘示意图 → 层层追问 → 一段可运行代码并逐行解释 → 踩坑与边界 → 自检清单 → 三句话小结</p></blockquote>';
    s += '<p>站点会把示意图渲染成 SVG、把要点与自检渲染成讲解卡片。文档源文件是唯一内容源，一份文件同时驱动 GitHub 与网站。</p>';
    s += '<h2>代码可以真的跑起来</h2><p>文中所有示例只用 Python 标准库，零账号、零联网，复制保存即可运行。想接真实模型服务时，只需改三个环境变量，业务逻辑一行不用改。</p>';
    s += '<div class="codeblock"><div class="code-head"><span class="code-lang">bash</span><button class="copy-btn" type="button">复制</button></div><pre><code>python check.py    <span class="tok-c"># 环境自检</span>\npython loop.py     <span class="tok-c"># 手写 Agent 循环 + 轨迹回放</span>\npython rag.py      <span class="tok-c"># 检索、重排、溯源、拒答</span>\npython eval.py     <span class="tok-c"># 评测集与回归门禁</span></code></pre></div>';
    s += '<h2>数字背书</h2><div class="about-stats"><div><b>' + docs.length + ' 篇</b><span>原创长文</span></div><div><b>' + kfmt(meta.totalChars || 0) + '</b><span>字正文</span></div><div><b>' + (meta.totalFigures || 0) + ' 张</b><span>自绘示意图</span></div><div><b>' + (meta.totalCodes || 0) + ' 段</b><span>可运行代码</span></div><div><b>' + (meta.glossaryCount || 0) + ' 条</b><span>知识点速查</span></div><div><b>零依赖</b><span>复制即跑</span></div></div>';
    s += '<h2>免费且持续更新</h2><p>教程全部免费公开。完整资料包包含按公司 / 岗位分类的笔面情报与网申时间线、主流笔试平台的题型与规则差异、面经追问链合集与项目讲法模板：公众号回复关键词 <strong>Agent</strong> 领取；1v1 笔面辅导与情报咨询走微信 <strong>offer630</strong>，成交走闲鱼担保。</p>';
    s += '<h2>怎么在本地跑</h2><p>零第三方依赖，不需要安装、不需要联网：</p><div class="codeblock"><div class="code-head"><span class="code-lang">bash</span><button class="copy-btn" type="button">复制</button></div><pre><code>node scripts/build-content.mjs   <span class="tok-c"># 文档 -&gt; 站点数据</span>\nnode site/server.js              <span class="tok-c"># http://127.0.0.1:8899</span></code></pre></div>';
    s += '</div>';
    return s + ctaBlock() + '</div>';
  }

  /* ---------- 文档页 ---------- */
  function renderDoc(d) {
    var r = renderMarkdown(d.md, d.slug);
    var idx = docs.findIndex(function (x) { return x.slug === d.slug; });
    var prev = docs[idx - 1], next = docs[idx + 1];
    var layer = layers.filter(function (l) { return l.key === d.category; })[0];
    var related = docs.filter(function (x) { return x.category === d.category && x.slug !== d.slug; }).slice(0, 4);
    var toc = r.heads.map(function (h) {
      return '<a class="' + (h.lvl === 3 ? 'lvl3' : '') + '" href="#' + h.id + '" data-toc="' + h.id + '">' + esc(h.text) + '</a>';
    }).join('');

    var s = '<div class="doc-shell fade"><div class="doc-main">';
    s += '<div class="crumb"><a href="#/">首页</a><span>/</span><a href="#/roadmap">学习路线</a><span>/</span><span>' + esc(d.category) + '</span><span>/</span><span>' + esc(d.title) + '</span></div>';
    s += '<div class="doc-meta"><span class="tag">' + esc(d.category) + '</span>' +
      (d.no === '00' ? '<span class="tag muted">总纲</span>' : '<span class="tag muted">第 ' + (layer ? layer.no : '') + ' 层</span>') +
      (d.hot ? '<span class="tag hot">热门</span>' : '') +
      '<span class="meta-plain">' + kfmt(d.chars || 0) + ' 字</span><span class="meta-plain">约 ' + d.minutes + ' 分钟</span><span class="meta-plain">上次更新 ' + esc(d.updated || meta.built) + '</span></div>';
    s += '<article class="md" id="mdBody"><h1>' + esc(d.title) + '</h1>';
    if (d.summary) s += '<div class="doc-summary">' + esc(d.summary) + '</div>';
    s += r.html + '</article>';
    if (related.length) {
      s += '<div class="related"><h3>同层相关阅读</h3><div class="related-grid">' + related.map(function (x) {
        return '<a href="#/doc/' + x.slug + '"><span>' + x.no + '</span><b>' + esc(x.title) + '</b><small>' + esc(x.summary) + '</small></a>';
      }).join('') + '</div></div>';
    }
    s += '<div class="pager">' +
      (prev ? '<a href="#/doc/' + prev.slug + '"><small>← 上一篇</small><span>' + esc(prev.title) + '</span></a>' : '<span></span>') +
      (next ? '<a class="next" href="#/doc/' + next.slug + '"><small>下一篇 →</small><span>' + esc(next.title) + '</span></a>' : '<span></span>') +
      '</div>';
    s += '<div class="edit-line"><span>发现写错了？欢迎提 Issue 或 PR。</span><a href="' + (meta.repo || '#/') + '/blob/main/docs/' + d.slug + '.md" target="_blank" rel="noopener">在 GitHub 上编辑此页 →</a></div>';
    s += '</div>';
    s += '<aside class="toc"><div class="toc-inner"><h4>本页目录</h4><div id="tocList">' + (toc || '<span class="toc-empty">暂无小节</span>') + '</div>' +
      '<div class="toc-note">' + (d.sections || []).length + ' 个小节 · ' + (d.figures || 0) + ' 张图 · ' + (d.codes || 0) + ' 段代码</div></div></aside>';
    return s + '</div>';
  }

  /* ---------- router ---------- */
  var current = { nav: 'home', slug: null, hash: '' };
  function route() {
    var bu = document.getElementById('brandUpdate');
    if (bu && meta.built) bu.textContent = '内容更新至 ' + meta.built;
    var hash = location.hash || '#/';
    var m = /^#\/doc\/([\w-]+)$/.exec(hash);
    var d = m && bySlug[m[1]];
    var nav = 'home';
    if (/^#\/roadmap/.test(hash)) nav = 'roadmap';
    else if (/^#\/all/.test(hash)) nav = 'all';
    else if (/^#\/index/.test(hash)) nav = 'index';
    else if (/^#\/about/.test(hash)) nav = 'about';
    else if (d && d.slug === '16-interview-qa') nav = 'interview';
    else if (d) nav = 'doc';

    if (d) { app.innerHTML = renderDoc(d); document.title = d.title + ' · AgentOffer'; bindDoc(); }
    else if (nav === 'all') { app.innerHTML = renderAll(); document.title = '全部文章 · AgentOffer'; }
    else if (nav === 'index') { app.innerHTML = renderIndex(); document.title = '知识点索引 · AgentOffer'; bindGlossary(); }
    else if (nav === 'roadmap') { app.innerHTML = renderRoadmap(); document.title = '学习路线 · AgentOffer'; }
    else if (nav === 'about') { app.innerHTML = renderAbout(); document.title = '关于本站 · AgentOffer'; bindCodeCopy(); }
    else { app.innerHTML = renderHome(); document.title = 'AgentOffer · Agent 开发岗上岸指南'; }

    sidebar.innerHTML = sidebarHtml(d ? d.slug : null, nav);
    bindSidebar();
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === nav);
    });
    current = { nav: nav, slug: d ? d.slug : null, hash: hash };
    closeMobileSidebar();
    window.scrollTo(0, 0);
    updateProgress();
  }
  function bindCodeCopy() {
    document.querySelectorAll('.copy-btn').forEach(function (b) {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', function () {
        var code = b.closest('.codeblock').querySelector('code').innerText;
        if (navigator.clipboard) navigator.clipboard.writeText(code);
        b.textContent = '已复制'; b.classList.add('ok');
        setTimeout(function () { b.textContent = '复制'; b.classList.remove('ok'); }, 1600);
      });
    });
  }
  function bindDoc() {
    bindCodeCopy();
    document.querySelectorAll('#tocList a, .h-anchor').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var el = document.getElementById(a.getAttribute('data-toc') || a.getAttribute('data-anchor'));
        if (el) { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' }); }
      });
    });
  }

  /* ---------- 搜索：全文 + 小节 + 知识点 ---------- */
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
      hits = docs.slice(0, 8).map(function (d) { return { label: d.title, cat: d.category, snip: d.summary, url: '#/doc/' + d.slug }; });
    } else {
      var ql = q.toLowerCase();
      hits = [];
      // 知识点词条
      glossary.forEach(function (g) {
        g.items.forEach(function (it) {
          if ((it[0] + ' ' + it[1]).toLowerCase().indexOf(ql) >= 0) {
            hits.push({ label: it[0], cat: '知识点 · ' + g.g, snip: it[1], url: '#/doc/' + it[2], score: 0 });
          }
        });
      });
      // 文章与小节
      docs.forEach(function (d) {
        var pos = (d.md || '').toLowerCase().indexOf(ql);
        var titleHit = d.title.toLowerCase().indexOf(ql) >= 0 || (d.summary || '').toLowerCase().indexOf(ql) >= 0;
        (d.sections || []).forEach(function (h) {
          if (h.text.toLowerCase().indexOf(ql) >= 0) {
            hits.push({ label: h.text, cat: '小节 · ' + d.title, snip: d.summary, url: '#/doc/' + d.slug, score: 1 });
          }
        });
        if (pos < 0 && !titleHit) return;
        var snip = titleHit ? d.summary : d.md.slice(Math.max(0, pos - 40), pos + 90).replace(/\n/g, ' ').replace(/[#*`>|]/g, '');
        hits.push({ label: d.title, cat: d.category, snip: snip, url: '#/doc/' + d.slug, score: titleHit ? 1 : 2 });
      });
      hits.sort(function (a, b) { return a.score - b.score; });
      hits = hits.slice(0, 14);
    }
    sel = 0;
    if (!hits.length) { results.innerHTML = '<div class="sr-empty">没有找到相关内容，换个关键词试试</div>'; return; }
    results.innerHTML = hits.map(function (h, i) {
      return '<a class="sr-item' + (i === 0 ? ' sel' : '') + '" data-i="' + i + '" href="' + h.url + '"><b>' + esc(h.cat) + ' · ' + mark(h.label, q) + '</b><span>' + mark(h.snip || '', q) + '</span></a>';
    }).join('');
  }
  function openSearch() { modal.hidden = false; input.value = ''; doSearch(''); setTimeout(function () { input.focus(); }, 30); }
  function closeSearch() { modal.hidden = true; }
  document.getElementById('searchOpen').addEventListener('click', openSearch);
  modal.querySelector('[data-close]').addEventListener('click', closeSearch);
  input.addEventListener('input', function () { doSearch(input.value); });
  results.addEventListener('click', function (e) { if (e.target.closest('.sr-item')) closeSearch(); });
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
      if (e.key === 'Enter' && hits[sel]) { location.hash = hits[sel].url; closeSearch(); return; }
    }
  });

  /* ---------- 主题 ---------- */
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

  /* ---------- 进度 / 回顶 / 抽屉 / TOC 高亮 ---------- */
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
  function closeMobileSidebar() {
    sidebar.classList.remove('open');
    document.getElementById('mobileMask').classList.remove('show');
  }
  document.getElementById('menuToggle').addEventListener('click', function () {
    sidebar.classList.toggle('open');
    document.getElementById('mobileMask').classList.toggle('show', sidebar.classList.contains('open'));
  });
  document.getElementById('mobileMask').addEventListener('click', closeMobileSidebar);
  document.addEventListener('click', function (e) {
    if (e.target.closest('#sidebar a')) closeMobileSidebar();
  });
  window.addEventListener('hashchange', route);
  route();
})();
