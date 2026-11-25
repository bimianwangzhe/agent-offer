<div align="center">

# AgentOffer

### Agent 开发岗上岸指南

**把散落在 GitHub、官方文档站和社区里的 Agent 教程重新拆一遍，整理成一份能照着做、能拿去面试的知识库。**

[![stars](https://img.shields.io/github/stars/bimianwangzhe/agent-offer?style=flat-square&label=Stars)](https://github.com/bimianwangzhe/agent-offer/stargazers)
[![forks](https://img.shields.io/github/forks/bimianwangzhe/agent-offer?style=flat-square&label=Forks)](https://github.com/bimianwangzhe/agent-offer/network/members)
[![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
[![issues](https://img.shields.io/github/issues/bimianwangzhe/agent-offer?style=flat-square)](https://github.com/bimianwangzhe/agent-offer/issues)
[![prs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/bimianwangzhe/agent-offer/pulls)
[![docs](https://img.shields.io/badge/在线阅读-agent.meetoffer.cn-blue?style=flat-square)](https://agent.meetoffer.cn)

**在线阅读（体验更好）**：[agent.meetoffer.cn](https://agent.meetoffer.cn) · [GitHub 仓库](https://github.com/bimianwangzhe/agent-offer) · [资料包目录](./docs/15-resources.md)

</div>

---

## 为什么做这个

Java 后端这条赛道，已经被 JavaGuide、小林 coding 和各路知识星球把「教程 → 八股 → 面试 → 训练营」铺满了。**Agent 开发岗还没有一个按岗位组织的中文知识库。**

现在能搜到的资料是散的：框架官方文档各说各话，教程停在「调通一个 ReAct」就结束，公众号路线图讲得热闹但落不到代码。而面试官问的是——上下文爆了怎么办、工具重复调用怎么防、你怎么证明改了一版没变差。

所以我们把高星仓库、官方一手文档、在线书和社区文章全找出来，**重新拆、按岗位能力模型重排、写成自己的一套**。不是翻译，不是洗稿，是重新组织。

**定位一句话**：不是「教你什么是 Agent」，是「让你能去面 Agent 开发岗」。

## 和现有资料有什么不一样

| | 框架官方文档 | 通用 Agent 教程 | 面试八股站 | **AgentOffer** |
|---|---|---|---|---|
| 组织方式 | 按 API | 按知识点 | 按题目 | **按岗位能力模型 + 五阶段路线** |
| 视角 | 某个框架怎么用 | 从零跑通 Demo | 背题 | 出问题怎么办 |
| 内容深度 | 说明 | 概念 | 问答 | **可运行代码 + 故障注入 + 评测口径** |
| 出处 | — | 多为转述 | — | **每篇附一手资料链接，可核验** |
| 停止在 | 能跑 | 能跑 | 能背 | **能上线、能答辩、能复盘** |
| 岗位情报 | 无 | 无 | 少量 | **JD 拆解 + 追问链 + 笔试情报** |

三条内容原则：

1. **原理优先于 API** — 框架每季度换，Agent = 模型 + Harness 的结构不会换。
2. **可验证优先于可讲** — 每篇都有验收点，答不上来就别往下走。
3. **岗位优先于炫技** — 不追多 Agent、不追新名词，先回答「上线要哪些东西」。

## 快速开始

| 想做什么 | 去哪里 |
|---|---|
| 直接读 | [agent.meetoffer.cn](https://agent.meetoffer.cn)（在线站，左侧目录 + 页内 TOC + 全文搜索） |
| 按顺序学 | [00 学习路线](./docs/00-roadmap.md) |
| 找资料 | [15 一手资料地图](./docs/15-resources.md) |
| 准备面试 | [09 面试考点与追问链](./docs/09-interview.md) · [10 岗位 JD 拆解](./docs/10-jd-analysis.md) |
| 了解我们怎么对标 | [16 他们怎么做 GitHub 与网站](./docs/16-benchmark.md) |

**本地跑网站**（零依赖，不需要 npm install，不需要联网）：

```bash
cd agent-offer
node scripts/build-content.mjs      # docs/*.md -> site/assets/content.js
node site/server.js                 # http://127.0.0.1:8899
```

站点参考了 xiaolincoding.com / JavaGuide 一类文档站的信息架构，但做了重新设计：亮/暗主题、阅读进度、卡片式路线图、全文搜索、响应式移动端。同一份 `docs/` 同时驱动 GitHub 与网站，改一次两边同步。

### 你将收获什么

- 一条 **10~13 周** 可执行、每阶段带验收点的路线，而不是一张知识点清单
- 从零手写 Agent 循环的能力，之后再看任何框架都知道它替你做了什么
- 三个**带工程约束**的简历项目，以及每个数字该怎么说口径
- 四条面试追问链，能连续答到第四层
- 一份可按图索骥的一手资料索引，全部链接可核验

## 内容导航

### 路线

| 文档 | 你会得到什么 |
|---|---|
| [00 学习路线：从调 API 到能上岗](./docs/00-roadmap.md) | 五阶段、时间预算、岗位能力模型、三个简历项目与验收点 |

### 基础

| 文档 | 你会得到什么 |
|---|---|
| [01 什么是 Agent：先划清边界](./docs/01-agent-basics.md) | Agent / Workflow / Chatbot 的判据，20:80 定律 |
| [11 LLM 调用与结构化输出](./docs/11-llm-basics.md) | 一次调用的完整组成、流式、三层 JSON 契约、成本核算，附可运行代码 |

### 核心

| 文档 | 你会得到什么 |
|---|---|
| [02 Agent 循环：ReAct 与三种范式](./docs/02-agent-loop.md) | 手写循环伪代码、终止条件、状态与检查点 |
| [03 工具调用与结构化输出](./docs/03-tool-calling.md) | Schema 收窄、幂等、权限、错误回传 |
| [04 上下文工程](./docs/04-context-engineering.md) | Token 预算、四层结构、压缩、预检路由 |
| [05 RAG 与记忆](./docs/05-rag-memory.md) | 排查顺序、混合检索、重排、溯源、三层记忆 |

### 工程

| 文档 | 你会得到什么 |
|---|---|
| [06 MCP 与协议生态](./docs/06-mcp-protocol.md) | MCP / A2A / Skills 的边界与接入坑 |
| [07 框架选型](./docs/07-frameworks.md) | 五类方案对比、决策图、解耦原则 |
| [12 多智能体：什么时候真的需要拆](./docs/12-multagent.md) | 三个该拆的信号、三种拓扑、交接状态对象 |
| [08 评测与生产化](./docs/08-eval-production.md) | 三层评测、追踪、护栏、成本、部署清单 |
| [13 安全与护栏](./docs/13-security.md) | 间接提示注入、最小权限、输入输出过滤、上线自检 |

### 上岗

| 文档 | 你会得到什么 |
|---|---|
| [14 三个能写进简历的项目](./docs/14-projects.md) | 架构 + 代码骨架 + 评测口径 + 五段式讲法 |
| [09 Agent 开发岗面试考点与追问链](./docs/09-interview.md) | 高频考点、四条追问链、项目讲法与反直觉加分点 |
| [10 岗位 JD 拆解](./docs/10-jd-analysis.md) | 三类岗位画像、能力矩阵自评、简历对照表 |

### 资料与对标

| 文档 | 你会得到什么 |
|---|---|
| [15 一手资料地图](./docs/15-resources.md) | 全部教程 / 官方文档 / 实战项目 / 路线图文章的可核验清单 |
| [16 对标拆解：他们怎么做 GitHub 与网站](./docs/16-benchmark.md) | 六家标杆的仓库与站点打法、共同模式、我们的超越点 |

## 五阶段路线（速览）

| 阶段 | 目标 | 关键产物 |
|---|---|---|
| ① 打底 | LLM 调用、Prompt、结构化输出 | 一个会调工具的最小程序 |
| ② 核心 | 手写循环、工具调用、上下文工程 | 不依赖框架的 200 行 Agent |
| ③ 扩展 | RAG、记忆、MCP、框架选型 | 能接真实数据、可溯源的应用 |
| ④ 上线 | 评测、追踪、护栏、成本、部署 | 能演示、能回归的项目 |
| ⑤ 上岗 | 岗位画像、追问链、简历口径 | 15 分钟讲明白自己的系统 |

> 别从框架开始。先用纯 API 手写一个能跑通的循环，再上 LangGraph，你会知道框架到底替你做了什么。完整时间预算与验收点见 [00 学习路线](./docs/00-roadmap.md)。

## 资料包与求职情报

这份知识库**免费且持续更新**。[15 一手资料地图](./docs/15-resources.md) 就是公开的目录，完整资料包包含：

- 系统教程的 PDF / 离线打包与阅读顺序
- 按公司 / 岗位分类的笔面情报与网申时间线
- 北森、智鼎、牛客等笔试平台的题型与规则差异
- 面经追问链合集与项目讲法模板

公众号回复关键词 **`Agent`** 领取完整版；1v1 笔面辅导与情报咨询走微信 `offer630`，成交走闲鱼担保。

> 平台上只做情报与辅导，不做任何违规承诺。资料持续更新，仓库与 `agent.meetoffer.cn` 同步。

## 如何贡献

发现写错了、某个框架更新了、有更好的实践，欢迎提 Issue 或 PR。规范很简单：

- 内容写进 `docs/`，头部保留 `title / category / order / summary / minutes` 五个字段
- 不整段搬运他人文章，用自己的话重新组织；引用给出原始链接
- 跑一次 `node scripts/build-content.mjs` 确认站点能渲染
- 涉及数据与战绩只写真实口径，不编数字

## 致谢

内容梳理参考了 Datawhale Hello-Agents、微软 AI Agents for Beginners、Hugging Face Agents Course、OpenAI Cookbook 与官方文档，以及社区多篇路线图文章——**全部原始出处保留在 [15 一手资料地图](./docs/15-resources.md)**。信息架构与获客结构对标了 JavaGuide、小林 coding 等开源知识库，拆解见 [16 篇](./docs/16-benchmark.md)。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=bimianwangzhe/agent-offer&type=Date)](https://star-history.com/#bimianwangzhe/agent-offer&Date)

## 引用

如果本项目对你的学习或项目有帮助，欢迎在文档或简历项目说明中注明出处：

```
AgentOffer — Agent 开发岗上岸指南, https://github.com/bimianwangzhe/agent-offer
```

## 开源协议

[MIT](./LICENSE) · 内容可自由使用，请保留出处。

---

<div align="center">

**AgentOffer** · 笔面王者 · [agent.meetoffer.cn](https://agent.meetoffer.cn)

琼ICP备2025054949号-1

</div>
