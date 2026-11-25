<div align="center">

# AgentOffer

### 2026 最新 Agent 开发学习路线 · 零基础到能独立交付一条龙

**从「大模型到底在猜什么」出发，一层层往上踩，走完就能自己做出、并讲清楚一个 Agent 系统。**

[![stars](https://img.shields.io/github/stars/bimianwangzhe/agent-offer?style=flat-square&label=Stars)](https://github.com/bimianwangzhe/agent-offer/stargazers)
[![forks](https://img.shields.io/github/forks/bimianwangzhe/agent-offer?style=flat-square&label=Forks)](https://github.com/bimianwangzhe/agent-offer/network/members)
[![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
[![issues](https://img.shields.io/github/issues/bimianwangzhe/agent-offer?style=flat-square)](https://github.com/bimianwangzhe/agent-offer/issues)
[![docs](https://img.shields.io/badge/在线阅读-agent.meetoffer.cn-blue?style=flat-square)](https://agent.meetoffer.cn)

**在线阅读（推荐）**：[agent.meetoffer.cn](https://agent.meetoffer.cn) · [GitHub 仓库](https://github.com/bimianwangzhe/agent-offer)

</div>

---

## 一、写在前面：这份路线是给谁的

如果你现在打开招聘软件搜「Agent 开发」，看到那串要求的第一反应是「完了，我得先把大模型学一遍」——然后去搜学习路线，收藏一张密密麻麻的名词清单，第二天再打开还是不知道第一步该敲什么——**这份路线就是为你写的**。

它和一张名词清单的区别只有一条：**按小白的认知顺序，把「要掌握的知识点」按依赖关系一层层排好，后一层必须踩在前一层上**。每一条知识点后面都有一个链接，点开就是网站上的一篇完整正文（有推导、有自绘图、有可运行代码），不是让你再去别处搜。

| 你可能关心 | 答案 |
|---|---|
| **适合谁** | 完全零基础想转 Agent 的人；后端 / 前端 / 测试 / 运维 / 算法想补这块能力的人；只会调接口、没做过完整系统的人 |
| **要先会什么** | 会一点 Python（能看懂函数、字典、循环即可），会用命令行。**不需要**数学推导、不需要训练过模型、不需要先啃框架文档 |
| **学完能做什么** | 能独立设计并交付一个带工具、带检索、带评测、带护栏的 Agent 系统；能讲清每个取舍；能拿三个项目去面试 |
| **大概多久** | 10 周，每周 10~12 小时。不是「看完」，是「做完」，每一周都有要交出的东西 |
| **怎么用这份路线** | 从下面「路线总览」开始，按第 1 层 → 第 6 层走。每层列了具体知识点，逐条点链接读正文，读完对照「学到什么程度」自检，**过了再往下一层** |

> 全文所有 `[知识点](https://agent.meetoffer.cn/#/doc/…)` 链接都跳转到自有站点，正文在那里，仓库这里只做路线门面。

## 二、符号说明

路线里用三个标记控制节奏，按自己的时间取舍：

- **【必读】**——不理解它，后面整层都搭不起来，所有人都得过
- **【动手】**——光看懂没用，必须把代码敲一遍，否则只是「以为自己会了」
- **【选读】**——时间紧可以先跳，等真正遇到那个问题再回来查

10 周走完【必读】+【动手】就够；【选读】是给目标更高、或者已经在做真实项目的人准备的。

## 三、路线总览：一条从不会到会的线

```
第 1 层  模型与调用          模型在猜下一个词 → 一次请求五块 → 输出三层契约
                                    ↓ 有了可信的调用，才谈得上 Agent
第 2 层  Agent 循环          唯一判据 → 循环状态 → 四个终止条件 → 检查点回放
                                    ↓ 循环能转了，才能让它碰到真实世界
第 3 层  工具与上下文        工具 Schema → 权限矩阵 → 幂等键 → 上下文预算与压缩
                                    ↓ 能动手了，再补外部知识与框架认知
第 4 层  检索、记忆与框架    切分与双路检索 → 溯源拒答 → 三层记忆 → 框架六大件
                                    ↓ 能跑了，还得证明它靠谱、敢开放
第 5 层  评测与可靠性        用例集 → 性质断言 → 回归门禁 → 注入防护 → 幂等降级
                                    ↓ 技术齐了，最后串成作品并讲清楚
第 6 层  项目与表达          三个项目的约束与权衡 → 数字口径 → 四层追问链
```

| 层 | 这一层要掌握的知识域 | 篇数 | 学完能做什么 | 入口 |
|---|---|---|---|---|
| 1 | 模型与调用 | 4 | 写出带超时、重试、成本、输出校验的调用骨架 | [开始](https://agent.meetoffer.cn/#/doc/01-how-llm-works) |
| 2 | Agent 循环 | 2 | 不装任何第三方包，手写能跑多步任务的循环 | [开始](https://agent.meetoffer.cn/#/doc/04-what-is-agent) |
| 3 | 工具与上下文 | 2 | 让循环安全调用真实工具，且长对话不失控 | [开始](https://agent.meetoffer.cn/#/doc/06-tool-calling) |
| 4 | 检索、记忆与框架 | 3 | 接私域资料、答案带出处、看懂框架替你做了什么 | [开始](https://agent.meetoffer.cn/#/doc/08-rag) |
| 5 | 评测与可靠性 | 3 | 证明每版改动没变差，兜住攻击、超时与账单 | [开始](https://agent.meetoffer.cn/#/doc/11-eval) |
| 6 | 项目与表达 | 2 | 三个能演示的项目，追问到第四层也答得上 | [开始](https://agent.meetoffer.cn/#/doc/14-projects) |

> 先看总纲：[写给想转 Agent 开发的你](https://agent.meetoffer.cn/#/doc/00-start-here)（岗位每天在干什么、你现有经验值多少、完整 10 周表）。

---

## 四、逐层知识点清单

下面每一层都按「**要掌握的知识点 → 学到什么程度 → 常见坑**」三段写。知识点是概括，正文全在链接里。

### 第 1 层 · 模型与调用

先别碰「Agent」这三个字。你得先知道手里这个组件到底是什么脾气。

**要掌握的知识点**

- 【必读】**下一个词预测**：模型只做「根据前文猜下一个 token」这一件事，理解它才能推出后面所有性质 → [大模型到底在干什么](https://agent.meetoffer.cn/#/doc/01-how-llm-works)
- 【必读】**Token 与分词、上下文窗口**：为什么有长度上限、为什么超长会被截断、为什么按 token 计费 → [大模型到底在干什么](https://agent.meetoffer.cn/#/doc/01-how-llm-works)
- 【必读】**幻觉的成因**：不是模型坏了，是它太尽责地把话接得像真的；由此明白「校验必须由代码做」 → [大模型到底在干什么](https://agent.meetoffer.cn/#/doc/01-how-llm-works)
- 【必读】**温度与随机性**：为什么参数调到 0 也照样不完全确定，以及为什么不能用确定性断言去测它 → [大模型到底在干什么](https://agent.meetoffer.cn/#/doc/01-how-llm-works)
- 【动手】**一次请求的五块**：地址、鉴权、消息体、参数、返回，各自放什么 → [第一次调用：把一次请求拆成五块](https://agent.meetoffer.cn/#/doc/02-first-call)
- 【动手】**超时、指数退避、重试上限**：下游抽风时程序不能崩，也不能无限重试 → [第一次调用](https://agent.meetoffer.cn/#/doc/02-first-call)
- 【动手】**成本打印与可替换配置**：接真实服务只改环境变量，业务逻辑一行不动 → [第一次调用](https://agent.meetoffer.cn/#/doc/02-first-call)
- 【必读】**「请只输出 JSON」为什么没用**：提示词不是契约 → [让输出稳定下来](https://agent.meetoffer.cn/#/doc/03-structured-output)
- 【动手】**语法 / 结构 / 语义三层契约**：把校验从模型手里收回来 → [让输出稳定下来](https://agent.meetoffer.cn/#/doc/03-structured-output)
- 【动手】**自动纠正与果断降级**：不合法时纠正几次、几次之后必须降级返回，不能死循环 → [让输出稳定下来](https://agent.meetoffer.cn/#/doc/03-structured-output)

**学到什么程度**：给你任意一个模型服务，能写出带重试、带成本、带输出校验的调用骨架；模型返回乱码、超时、半截 JSON 时，程序都不会崩。

**常见坑**：把模型当普通 RPC（不做输出校验）；只看视频不敲代码；第一周就申请一堆账号、装一堆框架。

---

### 第 2 层 · Agent 循环

有了可信的调用，现在才谈得上 Agent。核心问题只有一个：**谁来决定下一步做什么**。

**要掌握的知识点**

- 【必读】**唯一判据**：流程是运行时由模型决定，还是事先写死在代码里 → [什么是 Agent：一条线划清边界](https://agent.meetoffer.cn/#/doc/04-what-is-agent)
- 【必读】**什么时候坚决不该用 Agent**：能用固定流程解决的，别交给模型，这是最省钱的一条判断 → [什么是 Agent](https://agent.meetoffer.cn/#/doc/04-what-is-agent)
- 【必读】**模型与「外面那层壳」**：决定系统能不能用的是循环、工具、上下文、恢复，不是模型本身 → [什么是 Agent](https://agent.meetoffer.cn/#/doc/04-what-is-agent)
- 【动手】**循环的状态怎么存**：真正的核心不是 `while`，是状态管理 → [手写第一个 Agent 循环](https://agent.meetoffer.cn/#/doc/05-agent-loop)
- 【动手】**四个终止条件**：完成、超预算、重复动作、不可恢复错误，一个都不能漏 → [手写第一个 Agent 循环](https://agent.meetoffer.cn/#/doc/05-agent-loop)
- 【动手】**错误回传给模型**：工具报错不是抛异常结束，而是变成下一轮的观察 → [手写第一个 Agent 循环](https://agent.meetoffer.cn/#/doc/05-agent-loop)
- 【动手】**幂等与去重键**：重试不能下两单；为什么 key 必须落盘而不能只放内存 → [手写第一个 Agent 循环](https://agent.meetoffer.cn/#/doc/05-agent-loop)
- 【动手】**检查点与轨迹回放**：出事后能复现当时到底发生了什么 → [手写第一个 Agent 循环](https://agent.meetoffer.cn/#/doc/05-agent-loop)

> **别从框架开始**：框架会替你把循环、状态、工具分发全包了。先用框架跑通 Demo，你就永远不知道这些环节存在，出问题只能改提示词碰运气。**先用纯标准库手写一遍 200 行循环，之后看任何框架都能一眼看出它替你做了什么。**

**学到什么程度**：不装任何第三方包，程序能自己挑工具、观察结果、再决定下一步，直到把一件多步任务做完；中断后能从检查点恢复。

**常见坑**：把循环写成「反复调模型」；只设一个「轮数上限」当终止条件；把幂等键放内存里（进程一重启就失效）。

---

### 第 3 层 · 工具与上下文

循环能转了，接着解决两件事：让它**真的碰到世界**，以及别让它**越聊越贵、越聊越笨**。

**要掌握的知识点**

- 【必读】**工具是一份契约，不是函数列表**：参数怎么设计才不让模型编 → [工具调用：让文字安全地碰到真实世界](https://agent.meetoffer.cn/#/doc/06-tool-calling)
- 【动手】**参数 Schema 与校验**：模型给的参数必须先校验再执行 → [工具调用](https://agent.meetoffer.cn/#/doc/06-tool-calling)
- 【必读】**权限矩阵与最小权限**：读、写、危险动作分级，危险动作二次确认 → [工具调用](https://agent.meetoffer.cn/#/doc/06-tool-calling)
- 【动手】**幂等落盘与副作用防重**：同一个动作被模型连调两次会怎样 → [工具调用](https://agent.meetoffer.cn/#/doc/06-tool-calling)
- 【选读】**工具清单减肥与分组路由**：工具太多时先做一次轻量判断，只带本轮相关的几个 → [工具调用](https://agent.meetoffer.cn/#/doc/06-tool-calling)
- 【必读】**上下文预算表**：系统提示、历史、工具结果、检索片段各占多少，先算账再写代码 → [上下文工程：Agent 真正的命门](https://agent.meetoffer.cn/#/doc/07-context)
- 【必读】**四层上下文结构**：哪些常驻、哪些按需、哪些用完即弃 → [上下文工程](https://agent.meetoffer.cn/#/doc/07-context)
- 【动手】**三种压缩策略**：摘要、裁剪、外置，分别什么时候用 → [上下文工程](https://agent.meetoffer.cn/#/doc/07-context)
- 【选读】**预检路由与前缀缓存**：降成本、降延迟的两个工程手段 → [上下文工程](https://agent.meetoffer.cn/#/doc/07-context)

**学到什么程度**：给循环接三个真实工具，带参数校验与幂等键；长对话能自动压缩，账单不再随轮数线性上涨。

**常见坑**：把整个对话历史无脑塞进去；工具描述写得含糊让模型自己猜参数；危险动作不做权限收敛。

---

### 第 4 层 · 检索、记忆与框架

模型不知道你的私域资料，也不会自动记住上一轮说过什么。这一层补上「外部知识」和「框架认知」。

**要掌握的知识点**

- 【必读】**为什么整份文档塞进去必然更差**：噪声、稀释、成本三笔账 → [检索增强：让答案带得出出处](https://agent.meetoffer.cn/#/doc/08-rag)
- 【动手】**切分与编号**：按自然边界切块，每块带可引用的 id → [检索增强](https://agent.meetoffer.cn/#/doc/08-rag)
- 【动手】**关键词 + 语义双路检索与融合**：只有一路为什么不够 → [检索增强](https://agent.meetoffer.cn/#/doc/08-rag)
- 【必读】**业务重排与版本冲突**：新旧制度同时命中时，用代码判定而不是让模型判断 → [检索增强](https://agent.meetoffer.cn/#/doc/08-rag)
- 【必读】**溯源校验与拒答阈值**：材料不足时系统必须有权说「我不知道」 → [检索增强](https://agent.meetoffer.cn/#/doc/08-rag)
- 【必读】**「全存下来」叫日志不叫记忆**：三层记忆的划分 → [记忆系统：以及什么时候坚决不该记](https://agent.meetoffer.cn/#/doc/09-memory)
- 【动手】**写入判定、冲突消解、召回与遗忘**：哪些东西绝不能记 → [记忆系统](https://agent.meetoffer.cn/#/doc/09-memory)
- 【必读】**框架替你接管了哪六件事**：状态、循环、工具分发、追踪、重试、持久化 → [框架与工具协议：它们到底替你做了什么](https://agent.meetoffer.cn/#/doc/10-framework)
- 【必读】**工具协议解决与不解决什么**、**解耦适配层**：换框架不该重写业务 → [框架与工具协议](https://agent.meetoffer.cn/#/doc/10-framework)

**学到什么程度**：助手能查自己的文档、答案带得出处、材料不足时明确拒答；别人给你一个框架，你能说清它替你做了什么、什么时候在帮倒忙。

**常见坑**：把检索当成「把文档丢给模型」；答案不带出处；新旧版本冲突靠提示词解决；把聊天记录当记忆全存。

---

### 第 5 层 · 评测与可靠性

到这里系统「能跑」了，但离「敢开给别人用」还差一整层。这一层全是区分「做过 Demo」和「做过系统」的知识点。

**要掌握的知识点**

- 【必读】**三层评测**：单步、任务级、系统级各看什么 → [评测：怎么证明改了一版没变差](https://agent.meetoffer.cn/#/doc/11-eval)
- 【动手】**从 30 条起步的用例集**：正常、边界、注入、历史回归怎么配比 → [评测](https://agent.meetoffer.cn/#/doc/11-eval)
- 【必读】**性质断言而非文本断言**：测「有没有引用出处」而不是「答案一字不差」 → [评测](https://agent.meetoffer.cn/#/doc/11-eval)
- 【动手】**回归门禁**：新版通过率不得低于基线，卡住发布 → [评测](https://agent.meetoffer.cn/#/doc/11-eval)
- 【必读】**间接提示注入**：为什么提示词挡不住，攻击面在哪 → [安全与护栏：让系统敢开给别人用](https://agent.meetoffer.cn/#/doc/12-safety)
- 【必读】**最小权限矩阵、输出扫描、四重预算**：钱、轮数、时间、工具次数都要有上限 → [安全与护栏](https://agent.meetoffer.cn/#/doc/12-safety)
- 【动手】**上线自检清单**：照着勾一遍再放行 → [安全与护栏](https://agent.meetoffer.cn/#/doc/12-safety)
- 【动手】**幂等落盘、结构化日志、超时降级、健康检查、指标、灰度与回滚** → [从 Demo 到上线：差的不是部署](https://agent.meetoffer.cn/#/doc/13-production)

**学到什么程度**：改任何一版都能用评测集证明没变差；超时、乱码、越权、恶意套话、账单暴涨，每一种都有兜底路径。

**常见坑**：靠「我感觉好像好一点了」判断改动；用确定性断言测非确定性输出；没有成本上限；把部署当成工程化的终点。

---

### 第 6 层 · 项目与表达

知识点全部学完，最后要能把它们串成作品，并在 15 分钟里讲清楚。

**要掌握的知识点**

- 【必读】**不写「基于大模型开发了智能助手」**：写约束、权衡与可验证的结果 → [三个能写进简历的项目](https://agent.meetoffer.cn/#/doc/14-projects)
- 【动手】**三个项目的架构、代码骨架、评测口径**：制度问答 / 排障助手 / 带护栏的任务代理 → [三个能写进简历的项目](https://agent.meetoffer.cn/#/doc/14-projects)
- 【必读】**数字口径与简历改写对照**：怎么把做的事情说成可验证的结果 → [三个能写进简历的项目](https://agent.meetoffer.cn/#/doc/14-projects)
- 【必读】**面试官追的是决策链，不是知识点**：四条高频追问链逐层拆解 → [面试追问链：把项目答到第四层](https://agent.meetoffer.cn/#/doc/15-interview)
- 【必读】**转行者专属三问**、**15 分钟讲项目的节奏** → [面试追问链](https://agent.meetoffer.cn/#/doc/15-interview)

**学到什么程度**：三个项目能演示；随便从哪一层追问进去都能答到第四层，并说清当初为什么不选另一条路。

**常见坑**：项目只有「能跑」没有约束；简历堆技术名词；被问「为什么这么做」时答不上取舍。

---

## 五、10 周时间表（每一格都点得开）

按每周 10~12 小时算。这不是「看完」，是「做完」。

| 周 | 这周攻的知识点 | 这周要交出的东西 | 点开正文 |
|---|---|---|---|
| 1 | 模型机制、请求五块、超时与重试 | 带超时、重试、JSON 校验、成本打印的调用脚本 | [01](https://agent.meetoffer.cn/#/doc/01-how-llm-works) · [02](https://agent.meetoffer.cn/#/doc/02-first-call) |
| 2 | 输出契约、三层校验、自动纠正 | 模型返回不合法时自动纠正（最多三次）的模块 | [03](https://agent.meetoffer.cn/#/doc/03-structured-output) |
| 3 | Agent 判据、适用边界 | 用白话说清与固定流程的区别，画一张三态图 | [04](https://agent.meetoffer.cn/#/doc/04-what-is-agent) |
| 4~5 | 循环状态、终止条件、错误回传、检查点 | 200 行手写循环，零第三方包，跑通多步任务 | [05](https://agent.meetoffer.cn/#/doc/05-agent-loop) |
| 6 | 工具 Schema、权限矩阵、幂等键 | 接上三个真实工具，带参数校验与幂等 | [06](https://agent.meetoffer.cn/#/doc/06-tool-calling) |
| 7 | 上下文预算、压缩策略、预检路由 | 预算表 + 压缩策略，长对话不再越聊越贵 | [07](https://agent.meetoffer.cn/#/doc/07-context) |
| 8 | 切分、双路检索、溯源、拒答、记忆写入 | 能查自己文档、答案带出处的检索模块 | [08](https://agent.meetoffer.cn/#/doc/08-rag) · [09](https://agent.meetoffer.cn/#/doc/09-memory) |
| 9 | 框架六大件、协议边界、用例集、注入防护 | 30 条评测用例 + 追踪日志 + 护栏与成本上限 | [10](https://agent.meetoffer.cn/#/doc/10-framework) · [11](https://agent.meetoffer.cn/#/doc/11-eval) · [12](https://agent.meetoffer.cn/#/doc/12-safety) |
| 10 | 幂等降级、灰度回滚、项目口径、追问链 | 三个项目跑通、简历改完、追问链练到第四层 | [13](https://agent.meetoffer.cn/#/doc/13-production) · [14](https://agent.meetoffer.cn/#/doc/14-projects) · [15](https://agent.meetoffer.cn/#/doc/15-interview) |

三个「不要」比时间表更重要：**不要收集第二份教程**（缺的是动手不是资料）；**不要第一周就装一堆框架**（前七周只用标准库）；**不要跳过评测**（否则答不出「怎么证明改这版没变差」）。

## 六、哪些东西现在不用学

省下来的时间比多学几个名词值钱得多。以下这些，零基础阶段可以明确跳过：

- **Transformer 的数学推导、注意力公式**——你是在用这个组件，不是在造它；把「猜下一个词」和上下文窗口搞懂就够开工。
- **微调、预训练、分布式训练**——本路线全程不训练模型，调用现成服务即可，前七周甚至不用联网。
- **背框架的 API 与版本差异**——先手写一遍循环，框架只是把那六件事包起来，到时候看文档一天就能上手（见[框架与工具协议](https://agent.meetoffer.cn/#/doc/10-framework)）。
- **一上来就做多智能体**——单 Agent 的循环、工具、上下文都没吃透之前，多智能体只会把问题放大。
- **囤账号、囤工具、囤课程**——本路线所有示例只用 Python 标准库，复制粘贴就能跑（见[第一次调用](https://agent.meetoffer.cn/#/doc/02-first-call)）。

## 七、五条学习建议

1. **先跑起来，再理解**。第一天的任务只有一个：把 [check.py](https://agent.meetoffer.cn/#/doc/00-start-here) 跑出 `通过 6/6 项`。别等「准备好」。
2. **代码一定要自己敲一遍**。看懂 ≠ 会写，尤其 [200 行循环](https://agent.meetoffer.cn/#/doc/05-agent-loop) 和 [检索模块](https://agent.meetoffer.cn/#/doc/08-rag)，敲一遍和看三遍是两种水平。
3. **不要死记概念**。每个知识点都从「为什么会这样」推出来，理解了自然记住；忘了就回来查，不用背。
4. **学会看轨迹和报错**。循环出问题时，靠[检查点与轨迹回放](https://agent.meetoffer.cn/#/doc/05-agent-loop) 复现，而不是靠改提示词碰运气。
5. **每篇末尾的自检清单要能答出来**。答不上就别往下一层走——后一层一定踩在前一层上。

## 八、常见问题

**Q：完全零基础，真的能学会吗？**
能，但别跳层。第 1 层只要求会一点 Python；第 2 层开始才涉及状态与循环设计。整条路线就是按「后一层必须用到前一层」排的，顺序本身就是为小白设计的。先看[写给想转 Agent 开发的你](https://agent.meetoffer.cn/#/doc/00-start-here)。

**Q：要先学深度学习 / 数学吗？**
不用。本路线是「把一个不确定的组件装进确定的系统里」，用的全是工程能力（契约、校验、重试、权限、评测）。模型内部原理只在[第 1 篇](https://agent.meetoffer.cn/#/doc/01-how-llm-works)用大白话讲一层，不涉公式。

**Q：要花钱买 API 吗？**
前七周不用。所有示例都用标准库 + 本地模拟，零账号零联网；想接真实服务时只改三个环境变量（见[第一次调用](https://agent.meetoffer.cn/#/doc/02-first-call)）。

**Q：这跟「只会调接口」差在哪？**
差在循环、工具契约、上下文预算、评测、护栏这一整层「壳」。第 2~5 层讲的全是它，也是这个岗位真正考的东西（见[什么是 Agent](https://agent.meetoffer.cn/#/doc/04-what-is-agent)）。

**Q：学完能写进简历吗？**
能，第 6 层就是干这个的：三个项目各带架构、代码骨架、评测口径与追问预判（见[三个能写进简历的项目](https://agent.meetoffer.cn/#/doc/14-projects)）。

## 九、16 篇速查目录（全部链接到网站）

| 层 | 篇 | 标题 |
|---|---|---|
| 总纲 | 00 | [写给想转 Agent 开发的你](https://agent.meetoffer.cn/#/doc/00-start-here) |
| 1 | 01 | [大模型到底在干什么](https://agent.meetoffer.cn/#/doc/01-how-llm-works) |
| 1 | 02 | [第一次调用：把一次请求拆成五块](https://agent.meetoffer.cn/#/doc/02-first-call) |
| 1 | 03 | [让输出稳定下来](https://agent.meetoffer.cn/#/doc/03-structured-output) |
| 2 | 04 | [什么是 Agent：一条线划清边界](https://agent.meetoffer.cn/#/doc/04-what-is-agent) |
| 2 | 05 | [手写第一个 Agent 循环](https://agent.meetoffer.cn/#/doc/05-agent-loop) |
| 3 | 06 | [工具调用：让文字安全地碰到真实世界](https://agent.meetoffer.cn/#/doc/06-tool-calling) |
| 3 | 07 | [上下文工程：Agent 真正的命门](https://agent.meetoffer.cn/#/doc/07-context) |
| 4 | 08 | [检索增强：让答案带得出出处](https://agent.meetoffer.cn/#/doc/08-rag) |
| 4 | 09 | [记忆系统：以及什么时候坚决不该记](https://agent.meetoffer.cn/#/doc/09-memory) |
| 4 | 10 | [框架与工具协议：它们到底替你做了什么](https://agent.meetoffer.cn/#/doc/10-framework) |
| 5 | 11 | [评测：怎么证明改了一版没变差](https://agent.meetoffer.cn/#/doc/11-eval) |
| 5 | 12 | [安全与护栏：让系统敢开给别人用](https://agent.meetoffer.cn/#/doc/12-safety) |
| 5 | 13 | [从 Demo 到上线：差的不是部署](https://agent.meetoffer.cn/#/doc/13-production) |
| 6 | 14 | [三个能写进简历的项目](https://agent.meetoffer.cn/#/doc/14-projects) |
| 6 | 15 | [面试追问链：把项目答到第四层](https://agent.meetoffer.cn/#/doc/15-interview) |

## 十、每一篇是怎么写的

16 篇采用同一套讲解结构，目标是让小白真能读下去：

> 开篇一个真实场景提问 → 先破一个常见误解 → 用生活类比讲机制 → 自绘示意图 → 层层追问 → 一段可运行代码并逐行解释 → 踩坑与边界 → 自检清单 → 三句话小结

站点会把示意图渲染成 SVG、把要点与自检渲染成讲解卡片。`docs/` 是唯一内容源，一份文件同时驱动 GitHub 与网站。

## 十一、资料包与求职情报

这份知识库**免费且持续更新**。完整资料包包含按公司 / 岗位分类的笔面情报与网申时间线、主流笔试平台的题型与规则差异、面经追问链合集与项目讲法模板。

公众号回复关键词 **`Agent`** 领取；1v1 笔面辅导与情报咨询走微信 `offer630`，成交走闲鱼担保。

> 仓库与 [agent.meetoffer.cn](https://agent.meetoffer.cn) 内容同步。平台上只做情报与辅导，不做任何违规承诺。

## 附：本地跑网站 / 跑代码

零第三方依赖，不需要 `npm install`，不需要联网：

```bash
cd agent-offer
node scripts/build-content.mjs      # docs/*.md -> site/assets/content.js
node site/server.js                 # http://127.0.0.1:8899
```

站点自带亮 / 暗主题、左侧目录树、页内目录滚动高亮、`Ctrl+K` 全文搜索、阅读进度、代码复制、响应式移动端。

文中代码段都是完整可运行脚本，只用 Python 标准库，复制保存即可：

```bash
python check.py    # 第 00 篇：环境自检
python loop.py     # 第 05 篇：手写 Agent 循环 + 轨迹回放
python rag.py      # 第 08 篇：检索、重排、溯源、拒答
python eval.py     # 第 11 篇：评测集与回归门禁
```

想接真实模型服务时，只需设置 `MODEL_BASE_URL` / `MODEL_API_KEY` / `MODEL_NAME` 三个环境变量（见[第一次调用](https://agent.meetoffer.cn/#/doc/02-first-call)），业务逻辑一行不用改。

## 如何贡献

发现写错了、某个实践该更新了、有更好的图，欢迎提 Issue 或 PR。规范：

- 内容写进 `docs/`，头部保留 `title / category / order / summary / minutes` 五个字段
- 用自己的话写，配一张图、一段可运行代码、一份自检清单
- 跑一次 `node scripts/build-content.mjs` 确认站点渲染正常
- 涉及数据与战绩只写真实口径，不编数字

## 引用

```
AgentOffer — 从零基础到能独立交付的 Agent 开发指南, https://github.com/bimianwangzhe/agent-offer
```

## 开源协议

[MIT](./LICENSE) · 内容可自由使用，请保留出处。

---

<div align="center">

**AgentOffer** · 笔面王者 · [agent.meetoffer.cn](https://agent.meetoffer.cn)

琼ICP备2025054949号-1

</div>
