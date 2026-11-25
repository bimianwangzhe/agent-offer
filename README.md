<div align="center">

# AgentOffer

### Agent 开发岗上岸指南

**一份从零写给转行者的原创教程：不堆链接，只给能读、能跑、能拿去面试的内容。**

[![stars](https://img.shields.io/github/stars/bimianwangzhe/agent-offer?style=flat-square&label=Stars)](https://github.com/bimianwangzhe/agent-offer/stargazers)
[![forks](https://img.shields.io/github/forks/bimianwangzhe/agent-offer?style=flat-square&label=Forks)](https://github.com/bimianwangzhe/agent-offer/network/members)
[![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
[![issues](https://img.shields.io/github/issues/bimianwangzhe/agent-offer?style=flat-square)](https://github.com/bimianwangzhe/agent-offer/issues)
[![docs](https://img.shields.io/badge/在线阅读-agent.meetoffer.cn-blue?style=flat-square)](https://agent.meetoffer.cn)

**在线阅读（推荐）**：[agent.meetoffer.cn](https://agent.meetoffer.cn) · [GitHub 仓库](https://github.com/bimianwangzhe/agent-offer)

</div>

---

## 这是一份什么样的教程

如果你正在从后端、前端、测试、运维，或者完全零基础，转去做 Agent 开发，你大概率已经收藏了一堆「学习路线」，却还是不知道第一步该敲什么。

这份教程就是为这件事写的。它和一张知识点清单的区别在于：

- **给正文，不给链接**。16 篇全部是原创讲解，每篇 3000~6000 字，把一个概念从「为什么会这样」推到「代码该怎么写」，读一篇就少一个困惑。
- **配图，不是配表格**。每篇有 2~5 张自绘示意图，把循环、分层、链路画出来，抽象概念先看图再读字。
- **代码复制就能跑**。所有示例只用 Python 标准库，不申请账号、不装依赖、不联网；接真实服务只改两行环境变量。
- **按「能交出什么」排顺序**。不按知识点排，按五阶段产物排，每阶段有验收点。
- **面向小白，但不哄小白**。该讲清的坑一个不省：幻觉为什么必然发生、循环为什么会死、重试为什么会下两单、上下文为什么越聊越贵。

一句话定位：**不是「教你什么是 Agent」，是「让你能独立交付并讲清一个 Agent 系统」**。

## 你会得到什么

- 一条 **10 周**可执行路线，每周有明确产物，而不是一张收藏夹清单
- 一个**不依赖任何框架**、200 行手写完整的 Agent 循环（状态 / 工具 / 终止条件 / 检查点 / 轨迹回放）
- 一整套工程能力：输出契约、工具权限与幂等、上下文预算、检索溯源、记忆、评测、护栏、上线降级
- **三个能写进简历的项目**，各带架构、代码骨架、评测口径与追问预判
- 四条面试追问链，能连续答到第四层

## 内容目录

### 路线

| 文档 | 你会得到什么 |
|---|---|
| [00 写给想转 Agent 开发的你](./docs/00-start-here.md) | 岗位到底在干什么、你的经验折算成多少、10 周时间表 |

### 打底

| 文档 | 你会得到什么 |
|---|---|
| [01 大模型到底在干什么](./docs/01-how-llm-works.md) | 从「猜下一个词」推出幻觉、上下文、计费、随机性 |
| [02 第一次调用：把请求拆成五块](./docs/02-first-call.md) | 带超时、退避、成本打印的调用骨架，零依赖可跑 |
| [03 让输出稳定下来](./docs/03-structured-output.md) | 语法 / 结构 / 语义三层契约、自动纠正、结构化降级 |

### 核心

| 文档 | 你会得到什么 |
|---|---|
| [04 什么是 Agent：一条线划清边界](./docs/04-what-is-agent.md) | 唯一判据、以及什么时候坚决不该用 Agent |
| [05 手写第一个 Agent 循环](./docs/05-agent-loop.md) | 200 行完整实现，含错误回传、幂等、检查点、轨迹回放 |
| [06 工具调用：让文字安全碰到真实世界](./docs/06-tool-calling.md) | Schema 校验、权限矩阵、幂等落盘、危险动作确认 |
| [07 上下文工程：Agent 真正的命门](./docs/07-context.md) | 预算表、四层结构、三种压缩策略、预检路由 |

### 扩展

| 文档 | 你会得到什么 |
|---|---|
| [08 检索增强：让答案带得出出处](./docs/08-rag.md) | 切分、双路检索、业务重排、溯源校验、拒答阈值 |
| [09 记忆系统：以及什么时候坚决不该记](./docs/09-memory.md) | 三层记忆、写入判定、冲突消解、遗忘权 |
| [10 框架与工具协议：它们到底替你做了什么](./docs/10-framework.md) | 六大件对照、协议边界、解耦适配层、选型自检 |

### 上线

| 文档 | 你会得到什么 |
|---|---|
| [11 评测：怎么证明改了一版没变差](./docs/11-eval.md) | 三层评测、性质断言、30 条用例集、回归门禁 |
| [12 安全与护栏：让系统敢开给别人用](./docs/12-safety.md) | 间接注入、最小权限、输出扫描、四重预算 |
| [13 从 Demo 到上线：差的不是部署](./docs/13-production.md) | 幂等落盘、结构化降级、可观测、灰度与回滚 |

### 上岗

| 文档 | 你会得到什么 |
|---|---|
| [14 三个能写进简历的项目](./docs/14-projects.md) | 五段式讲法、完整设计、数字口径、简历改写对照 |
| [15 面试追问链：把项目答到第四层](./docs/15-interview.md) | 四条追问链、反直觉加分点、转行者三问、15 分钟节奏 |

## 五阶段路线（速览）

| 阶段 | 目标 | 关键产物 |
|---|---|---|
| ① 打底 | 稳定调用、拿到可信的结构化结果 | 带重试与校验的调用脚本 |
| ② 核心 | 不用任何框架跑通闭环 | 200 行手写 Agent 循环 |
| ③ 扩展 | 接真实资料、记住对话、看懂框架 | 带溯源与记忆的应用 |
| ④ 上线 | 能回归、能兜底、能观察 | 评测集 + 护栏 + 上线骨架 |
| ⑤ 上岗 | 能演示、能答辩、能复盘 | 三个项目 + 四层追问链 |

> 别从框架开始。先用纯标准库手写一个能跑通的循环，之后再看任何框架，你都会知道它到底替你做了什么。完整时间预算见 [00 学习路线](./docs/00-start-here.md)。

## 每一篇是怎么写的

为了让小白真能读下去，16 篇采用同一套讲解结构：

> 开篇一个真实场景提问 → 先破一个常见误解 → 用生活类比讲机制 → 自绘示意图 → 层层追问 → 一段可运行代码并逐行解释 → 踩坑与边界 → 自检清单 → 三句话小结

站点会把其中的示意图渲染成 SVG、把要点与自检渲染成讲解卡片；`docs/` 是唯一内容源，一份文件同时驱动 GitHub 与网站。

## 本地跑网站

零第三方依赖，不需要 `npm install`，不需要联网：

```bash
cd agent-offer
node scripts/build-content.mjs      # docs/*.md -> site/assets/content.js
node site/server.js                 # http://127.0.0.1:8899
```

站点自带亮 / 暗主题、左侧目录树、页内目录滚动高亮、`Ctrl+K` 全文搜索、阅读进度、代码复制、响应式移动端。

## 跑文中的代码

每篇的代码段都是完整可运行脚本，复制保存即可：

```bash
python docs/../check.py      # 或把篇内代码块存成对应文件名
python loop.py               # 第 05 篇：手写 Agent 循环 + 轨迹回放
python rag.py                # 第 08 篇：检索、重排、溯源、拒答
python eval.py               # 第 11 篇：评测集与回归门禁
```

全部只用标准库。想接真实模型服务时，只需设置 `MODEL_BASE_URL` / `MODEL_API_KEY` / `MODEL_NAME` 三个环境变量（见[第一次调用](./docs/02-first-call.md)），业务逻辑一行不用改。

## 资料包与求职情报

这份知识库**免费且持续更新**。完整资料包包含按公司 / 岗位分类的笔面情报与网申时间线、主流笔试平台的题型与规则差异、面经追问链合集与项目讲法模板。

公众号回复关键词 **`Agent`** 领取；1v1 笔面辅导与情报咨询走微信 `offer630`，成交走闲鱼担保。

> 平台上只做情报与辅导，不做任何违规承诺。仓库与 `agent.meetoffer.cn` 内容同步。

## 如何贡献

发现写错了、某个实践该更新了、有更好的图，欢迎提 Issue 或 PR。规范：

- 内容写进 `docs/`，头部保留 `title / category / order / summary / minutes` 五个字段
- 用自己的话写，配一张图、一段可运行代码、一份自检清单
- 跑一次 `node scripts/build-content.mjs` 确认站点渲染正常
- 涉及数据与战绩只写真实口径，不编数字

## 引用

如果这份教程对你的学习或项目有帮助，欢迎在文档或简历项目说明中注明：

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
