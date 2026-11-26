import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const OUT = path.join(ROOT, 'site', 'assets', 'content.js');

/* 站点导航用的六个篇章（按小白认知顺序，不用阶段词） */
const LAYERS = [
  { no: '1', key: '大模型与调用', name: '模型与调用', desc: '下一个词预测、请求五块、超时重试、输出三层契约', entry: '01-how-llm-works' },
  { no: '2', key: 'Agent 原理', name: 'Agent 循环', desc: '唯一判据、循环状态、四个终止条件、检查点回放', entry: '04-what-is-agent' },
  { no: '3', key: '工具与上下文', name: '工具与上下文', desc: '工具 Schema、权限矩阵、幂等键、上下文预算与压缩', entry: '06-tool-calling' },
  { no: '4', key: '检索、记忆与框架', name: '检索、记忆与框架', desc: '切分与双路检索、溯源拒答、三层记忆、框架六大件', entry: '08-rag' },
  { no: '5', key: '评测与可靠性', name: '评测与可靠性', desc: '用例集、性质断言、回归门禁、注入防护、幂等降级', entry: '11-eval' },
  { no: '6', key: '项目与面试', name: '项目与表达', desc: '三个项目的约束与权衡、数字口径、四层追问链', entry: '14-projects' }
];

/* 首页「必看系列」核心入口卡片 */
const SERIES = [
  { no: '01', t: '学习路线', d: '岗位每天在干什么、知识点按什么顺序吃下来、从零开始的完整一条龙', n: '总纲', to: '00-start-here', icon: 'road' },
  { no: '02', t: '图解主线', d: '从「模型在猜什么」一路踩到「能独立交付」，每篇都有自绘图与可运行代码', n: '16 篇', to: '01-how-llm-works', icon: 'book' },
  { no: '03', t: '手写 Agent 循环', d: '不装任何第三方包，200 行跑通多步任务、终止条件、检查点与轨迹回放', n: '必看', to: '05-agent-loop', icon: 'loop' },
  { no: '04', t: '工具与上下文', d: '让循环安全碰到真实世界，且长对话不越聊越贵、越聊越笨', n: '2 篇', to: '06-tool-calling', icon: 'tool' },
  { no: '05', t: '面试八股', d: '10 道高频题，每题给 30 秒回答、工程做法与四层追问', n: '🔥 热门', to: '16-interview-qa', icon: 'chat' },
  { no: '06', t: '项目与表达', d: '三个能写进简历的项目，附架构、评测口径与追问预判', n: '3 篇', to: '14-projects', icon: 'case' }
];

/* 首页「精选文章」分组：每组一句导读 + 一串站内链接 */
const PICKS = [
  { t: '第一次上手，先看这一组', d: '不知道第一步该敲什么时，从「模型在干什么」和「一次请求拆成五块」开始。', slugs: ['00-start-here', '01-how-llm-works', '02-first-call', '03-structured-output'] },
  { t: '搞懂 Agent 到底特别在哪', d: '把「谁决定下一步」这条线划清，再亲手写一遍循环，框架就不再是黑盒。', slugs: ['04-what-is-agent', '05-agent-loop', '06-tool-calling', '07-context'] },
  { t: '让答案有依据、有边界', d: '私域资料怎么查、出处怎么带、材料不足时怎么拒答、哪些东西绝不能记。', slugs: ['08-rag', '09-memory', '10-framework'] },
  { t: '能跑之后，怎么证明它靠谱', d: '用例集、回归门禁、注入防护、四重预算、灰度回滚——这一层区分 Demo 与系统。', slugs: ['11-eval', '12-safety', '13-production', '17-production-checklist'] },
  { t: '做成作品，并讲清楚', d: '把知识点串成三个项目，再练到随便从哪一层追问都能答到第四层。', slugs: ['14-projects', '15-interview', '16-interview-qa'] }
];

/* 知识点索引：整理自公开技术资料的通用术语，全部链到本站正文 */
const GROUPS = [
  { g: '模型与调用', items: [
    ['Token 与分词', '模型读写的基本单位，输入与输出都按它计费，也是上下文长度上限的度量。', '01-how-llm-works'],
    ['上下文窗口', '一次调用里模型「这一眼能看到」的全部文字，超了会被截断或报错。', '01-how-llm-works'],
    ['下一个词预测', '模型只在做一件事：根据已有文字猜下一个最可能的 token，循环到该停为止。', '01-how-llm-works'],
    ['幻觉', '不是模型坏了，是它把话接得太像真的；真实性必须由系统外部补上。', '01-how-llm-works'],
    ['温度与随机性', '控制采样随机程度；调到 0 也不保证完全确定，因此不能用确定性断言去测。', '01-how-llm-works'],
    ['系统提示', '常驻在每轮上下文最前面，声明身份、能力边界与禁止事项。', '02-first-call'],
    ['请求五块', '地址、鉴权、消息体、参数、返回；一次调用拆成这五块才好逐项排查。', '02-first-call'],
    ['超时与指数退避', '下游抽风时程序不能崩，也不能无限重试；每次失败后间隔翻倍并设上限。', '02-first-call'],
    ['流式输出', '边生成边返回，降低首字等待；要注意半截内容与中断处理。', '02-first-call'],
    ['Token 成本统计', '按任务与按用户记录输入/输出用量，是成本优化与账单告警的前提。', '02-first-call'],
    ['结构化输出', '要求模型返回可解析的 JSON；但「请只输出 JSON」只是请求，不是保证。', '03-structured-output'],
    ['三层输出契约', '语法（能解析）、结构（字段齐全）、语义（值合法）三层校验，由代码而非模型执行。', '03-structured-output'],
    ['自动纠正与降级', '不合法时把错误信息回传给模型纠正，超过次数就果断降级返回，不能死循环。', '03-structured-output'],
    ['JSON Schema', '用机器可读的结构描述约束输出，比自然语言要求可靠得多。', '03-structured-output'],
    ['少样本与思维链', '给几个示例或引导分步推理，改善复杂任务稳定性，但不改变输出的非确定性。', '01-how-llm-works']
  ]},
  { g: 'Agent 循环', items: [
    ['Agent 的唯一判据', '下一步做什么由模型在运行时决定，还是事先写死在代码里。', '04-what-is-agent'],
    ['工作流（Workflow）', '路径由代码预先固定的流程；能用它解决的，不该上 Agent。', '04-what-is-agent'],
    ['决策—行动—观察闭环', '选动作、执行、拿结果、再决策，直到达标、失败、超限或人工接管。', '04-what-is-agent'],
    ['ReAct', '推理与行动交替：用外部工具拿新信息，再据此决定下一步。', '05-agent-loop'],
    ['Plan-and-Execute', '先统筹出任务清单与完成标准，再逐项执行，适合长任务与跨系统操作。', '16-interview-qa'],
    ['Self-Refine / 反思', '按评价标准回看并修改已有产物；弱点是可能重复自身偏见，需外部验证器。', '16-interview-qa'],
    ['循环状态', '真正的核心不是 while，是「目标、历史、观察、轮数、预算」这份状态怎么存。', '05-agent-loop'],
    ['四个终止条件', '完成、超预算、重复动作、不可恢复错误，缺一个就可能跑飞。', '05-agent-loop'],
    ['错误回传', '工具报错不是抛异常结束，而是变成下一轮的观察交给模型决策。', '05-agent-loop'],
    ['检查点与轨迹回放', '每一步状态与观察落盘，出事后能复现当时到底发生了什么。', '05-agent-loop'],
    ['多智能体', '只有在职责、上下文、验证或并行收益真实存在时才拆；否则只是把问题放大。', '16-interview-qa'],
    ['Handoff / 交接', '把任务与必要上下文移交给另一个决策主体，需显式定义消息契约。', '16-interview-qa']
  ]},
  { g: '工具与上下文', items: [
    ['Function Calling', '模型只声明「调哪个工具、传什么参数」，真正执行在宿主程序。', '06-tool-calling'],
    ['工具 Schema 与参数校验', '模型给的参数必须先过校验再执行；参数有效不等于业务合法。', '06-tool-calling'],
    ['ACI（工具接口设计）', '工具的描述、参数、返回格式要像设计给人用的 API 一样用心。', '06-tool-calling'],
    ['权限矩阵与最小权限', '读、写、危险动作分级；危险动作二次确认，绝不因一个合法 JSON 就放行。', '06-tool-calling'],
    ['工具协议 / MCP', '标准化发现与接入外部能力；解决接入层问题，不解决模型侧的调用表达。', '10-framework'],
    ['Tools / Resources / Prompts', '工具协议常见的三类能力原语；服务端同样属于权限边界。', '10-framework'],
    ['工具清单减肥与分层路由', '工具太多时先做轻量判断，只把本轮相关的几个带进上下文。', '06-tool-calling'],
    ['幂等键', '为每个有副作用的动作分配稳定标识，重试前先查执行状态，避免重复下单。', '05-agent-loop'],
    ['副作用防重', '超时不代表动作没发生；要先对账再决定是否允许重试。', '06-tool-calling'],
    ['上下文预算表', '系统提示、历史、工具结果、检索片段各占多少，先算账再写代码。', '07-context'],
    ['四层上下文结构', '哪些常驻、哪些按需、哪些用完即弃，避免把整个历史无脑塞进去。', '07-context'],
    ['三种压缩策略', '摘要、裁剪、外置，分别对应不同长度与保真要求。', '07-context'],
    ['前缀缓存与预检路由', '复用稳定前缀降成本；用轻量判断决定本轮该走哪条路径。', '07-context'],
    ['上下文膨胀', '每轮都累加观察，成本与延迟复合增长，注意力被摊薄，越长越笨。', '07-context']
  ]},
  { g: '检索、记忆与框架', items: [
    ['RAG 检索增强', '先从资料里取回相关片段再作答，让答案能带出处、可控可更新。', '08-rag'],
    ['文档切片', '按自然边界切块并保留来源、页码等元数据；固定、语义、层级三种策略各有取舍。', '08-rag'],
    ['稠密与稀疏检索', '前者靠语义向量，后者靠关键词加权；单用一路都有盲区。', '08-rag'],
    ['混合检索与融合', '两路召回后按倒数排名融合，兼顾语义与专有名词的精准命中。', '08-rag'],
    ['粗排 + 精排', '先快速召回较多候选，再用更重的重排模型筛出最相关的少数片段。', '08-rag'],
    ['查询改写', '指代补全、复合问题拆分、口语转书面、多语言归一，提升命中率。', '08-rag'],
    ['溯源与拒答阈值', '答案必须能指回材料；材料不足时系统必须有权说「我不知道」。', '08-rag'],
    ['零召回兜底', '改写重查、多路兜底、明确降级回答，并记录零召回率做告警。', '08-rag'],
    ['Agentic RAG', '检索不是一次性动作：不够就反思、改写、再查，直到信心足够或触顶。', '16-interview-qa'],
    ['三层记忆', '工作记忆、情景记忆、语义记忆；「全存下来」叫日志不叫记忆。', '09-memory'],
    ['写入判定与冲突消解', '先决定该不该记，再用代码判定新旧版本冲突，而不是让模型自由发挥。', '09-memory'],
    ['召回与遗忘', '按相关性与时效取回，并给过期、错误、敏感信息明确的退出机制。', '09-memory'],
    ['框架六大件', '状态、循环、工具分发、追踪、重试、持久化——框架替你接管的那几件事。', '10-framework'],
    ['解耦适配层', '把业务代码与框架 API 隔开，换框架时不重写业务逻辑。', '10-framework']
  ]},
  { g: '评测与可靠性', items: [
    ['三层评测', '单步、任务级、系统级各看不同指标，别只盯一个通过率。', '11-eval'],
    ['评测用例集', '正常、边界、注入、历史回归按配比从 30 条起步，持续积累坏例。', '11-eval'],
    ['性质断言', '测「有没有引用出处」「有没有越权」这类性质，而不是答案一字不差。', '11-eval'],
    ['回归门禁', '新版通过率不得低于基线，卡住发布，避免「感觉好像好一点」。', '11-eval'],
    ['轨迹评测与结果评测', '前者看路径是否合理，后者看目标是否达成，还要算成本。', '16-interview-qa'],
    ['LLM-as-Judge', '用模型给开放式输出打分，需配合人工抽检与评分标准固化。', '11-eval'],
    ['可观测性 / 追踪', '每一步消息、输出、工具调用、耗时、用量、成本结构化落盘。', '17-production-checklist'],
    ['四重预算', '钱、轮数、时间、工具次数都要有上限，且每轮决策前检查。', '12-safety'],
    ['间接提示注入', '网页、文件、检索片段里夹带指令，试图劫持下一轮决策；提示词挡不住。', '12-safety'],
    ['输出扫描与人在回路', '对外内容做扫描；高风险、不可逆动作强制人工确认。', '12-safety'],
    ['代码沙箱', '执行代码或命令的工具必须与宿主文件、网络、凭证隔离。', '12-safety'],
    ['幂等落盘与结构化日志', '动作与状态持久化，日志可检索、可回放、可归因。', '13-production'],
    ['超时降级与健康检查', '下游异常时给出确定性的兜底结果，并让外部能探知服务状态。', '13-production'],
    ['灰度与回滚', '小流量验证新版本，出问题按版本号快速退回，评测门禁卡住发布。', '13-production'],
    ['成本优化', '前缀缓存、模型分级调度、循环上限、长历史摘要、批量接口。', '17-production-checklist']
  ]},
  { g: '项目与表达', items: [
    ['约束、权衡与可验证结果', '简历不写「基于大模型开发了智能助手」，写清边界、取舍与量化结果。', '14-projects'],
    ['完成标志', '每个阶段用可交付物验收：带重试的调用、带引用的检索、可追踪可恢复的循环。', '14-projects'],
    ['数字口径', '只写真实可核对的数字，说明统计范围与时间窗，不编数据。', '14-projects'],
    ['追问链', '面试官追的是决策链：为什么这么做、不选另一条路、怎么证明没变差。', '15-interview'],
    ['转行者三问', '凭什么信你做过、和只会调接口差在哪、出问题你怎么定位。', '15-interview'],
    ['15 分钟讲项目', '背景与约束 → 架构与关键取舍 → 评测与故障 → 复盘，节奏预先练过。', '15-interview'],
    ['高频面试十题', '从概念边界到工具链路、检索、评测，每题都能答到第四层。', '16-interview-qa']
  ]}
];

/* 热门篇（对标站的 🔥 标记） */
const HOT = new Set(['01-how-llm-works', '05-agent-loop', '07-context', '08-rag', '12-safety', '14-projects', '16-interview-qa']);

function parseFrontMatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([a-zA-Z_]+):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: src.slice(m[0].length) };
}

function slugify(s) {
  return String(s).replace(/[^\w\u4e00-\u9fa5-]/g, '').replace(/\s+/g, '-').slice(0, 40);
}

/* 抽取 h2/h3 作为页内目录与索引锚点；跳过代码块与自定义容器 */
function extractSections(md) {
  const out = [];
  let inFence = false, inBox = false;
  const seen = {};
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^:::\s*\S/.test(line)) { inBox = true; continue; }
    if (/^:::\s*$/.test(line)) { inBox = false; continue; }
    if (inBox) continue;
    const hm = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!hm) continue;
    const text = hm[2].trim().replace(/[*`]/g, '');
    let id = slugify(text);
    if (seen[id]) { seen[id] += 1; id = id + '-' + seen[id]; } else seen[id] = 1;
    out.push({ id, text, lvl: hm[1].length });
  }
  return out;
}

const files = fs.readdirSync(DOCS).filter(f => f.endsWith('.md')).sort();
const docs = files.map(f => {
  const full = path.join(DOCS, f);
  const raw = fs.readFileSync(full, 'utf8');
  const { meta, body } = parseFrontMatter(raw);
  // 开头的 H1 由站点渲染（让摘要落在标题下方）
  const md = body.trim().replace(/^#\s+.+\r?\n+/, '');
  const stat = fs.statSync(full);
  const d = new Date(stat.mtime);
  const updated = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const slug = f.replace(/\.md$/, '');
  return {
    slug,
    title: meta.title || f,
    category: meta.category || '其他',
    order: Number.isFinite(+meta.order) ? +meta.order : 999,
    summary: meta.summary || '',
    minutes: Number.isFinite(+meta.minutes) ? +meta.minutes : 8,
    no: String(meta.order == null ? 0 : meta.order).padStart(2, '0'),
    updated,
    chars: md.replace(/[#*`>|\[\]()]/g, '').replace(/\s/g, '').length,
    figures: (md.match(/^:::\s*figure/gm) || []).length,
    codes: Math.floor((md.match(/^\s*```/gm) || []).length / 2),
    hot: HOT.has(slug),
    sections: extractSections(md),
    md
  };
});
docs.sort((a, b) => a.order - b.order);

const cats = [...new Set(docs.map(d => d.category))];
const totalChars = docs.reduce((n, d) => n + d.chars, 0);
const totalFigures = docs.reduce((n, d) => n + d.figures, 0);
const totalCodes = docs.reduce((n, d) => n + d.codes, 0);
const glossaryCount = GROUPS.reduce((n, g) => n + g.items.length, 0);

const payload = {
  meta: {
    title: 'AgentOffer',
    subtitle: 'Agent 开发岗上岸指南',
    site: 'https://agent.meetoffer.cn',
    repo: 'https://github.com/bimianwangzhe/agent-offer',
    built: new Date().toISOString().slice(0, 10),
    total: docs.length,
    categories: cats,
    totalChars,
    totalFigures,
    totalCodes,
    glossaryCount
  },
  layers: LAYERS,
  series: SERIES,
  picks: PICKS,
  glossary: GROUPS,
  docs
};

const js = '/* Generated by scripts/build-content.mjs. Do not edit by hand. */\n' +
  'window.AGENT_CONTENT = ' + JSON.stringify(payload, null, 2) + ';\n';
fs.writeFileSync(OUT, js, 'utf8');

console.log(`built ${OUT}`);
console.log(`  ${docs.length} docs | ${totalChars.toLocaleString()} chars | ${totalFigures} figures | ${totalCodes} code blocks | ${glossaryCount} glossary entries`);
console.log(`  categories: ${cats.join(' / ')}`);
