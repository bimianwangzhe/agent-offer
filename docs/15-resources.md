---
title: 一手资料地图：教程、官方文档与实战项目
category: 资料
order: 15
summary: 把散落的 GitHub 教程、官方一手文档、在线书与实战项目整理成可按图索骥的清单。
minutes: 15
---

# 一手资料地图：教程、官方文档与实战项目

这份知识库不是凭空写的。我们把 GitHub 高星教程、官方一手文档、在线书、社区文章按三条线搜罗了一遍，再按岗位能力模型重新梳理成自己的体系。

这一页保留**原始出处**，方便你对照核验、按需深挖。所有链接都是可直接点开的公开资源；本仓库只做重新组织与讲清「为什么」，不搬运原文。

> 资料会持续更新。完整资料包（含 PDF 打包、按公司分类的岗位情报、笔试平台规则）在公众号回复关键词领取，见文末。

---

## 一、系统教程（能当教材用）

| 资源 | 内容 | 建议用法 |
|---|---|---|
| [datawhalechina / hello-agents](https://github.com/datawhalechina/hello-agents) | 中文《从零开始构建智能体》16 章，自研 HelloAgents 框架，手写 ReAct / Plan-and-Solve / Reflection，覆盖记忆、RAG、MCP/A2A、Agentic RL、多智能体、赛博小镇 | **中文最系统的一本**，配合 [在线书](https://datawhalechina.github.io/hello-agents/) 与 [国内加速站](https://hello-agents.datawhale.cc) 读；Extra-Chapter 含社区面试题 |
| [microsoft / ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners) | 微软官方 18 课，多语言含简体中文，视频 + Jupyter + 代码，含 Agentic RAG、工具调用、可信 Agent | 打基础，每课都有可跑代码 |
| [huggingface / agents-course](https://huggingface.co/learn/agents-course/zh-CN/unit0/introduction) | HF 免费课，smolagents / LlamaIndex / LangGraph，有作业、排行榜与证书 | 想拿一个可展示的学习凭证时选它 |
| [openai / openai-cookbook](https://github.com/openai/openai-cookbook) | 官方示例集：Agents SDK、函数调用、File Search、evals、部署 | 查「官方推荐怎么写」时第一手 |
| [ed-donner / agents](https://github.com/ed-donner/agents) | 6 周工程课：OpenAI Agents SDK / CrewAI / LangGraph / AutoGen / MCP，偏生产部署 | 已有基础、想补工程化时看 |

## 二、官方文档与在线书（自有网站类）

| 资源 | 为什么值得读 |
|---|---|
| [Anthropic《Building Effective Agents》](https://www.anthropic.com/research/building-effective-agents) | 讲「什么时候该用 Agent、什么时候不该用」，面试被引用最多的一篇 |
| [OpenAI《A Practical Guide to Building Agents》PDF](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | 生产级编排、护栏与安全模式 |
| [OpenAI Agents SDK 文档](https://openai.github.io/openai-agents-python/) · [函数调用最佳实践](https://platform.openai.com/docs/guides/function-calling/best-practices) | Agents / Handoffs / Guardrails / Tracing 的第一手规范 |
| [Anthropic Tool Use 实现文档](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/implement-tool-use) | 工具定义怎么写才不误导模型 |
| [LangGraph 官方文档](https://docs.langchain.com/oss/python/langgraph/overview) · [LangChain Academy](https://academy.langchain.com/courses/intro-to-langgraph) | 状态、持久化、HITL、部署 |
| [DeepLearning.AI《AI Agents in LangGraph》](https://www.deeplearning.ai/courses/ai-agents-in-langgraph) | 体系短课，适合快速建立框架直觉 |
| [freeCodeCamp 开源 LLM Agent 手册](https://www.freecodecamp.org/news/the-open-source-llm-agent-handbook/) | Agent 循环、LangGraph、CrewAI、规划、记忆、工具一次讲全 |
| [Hello-Agents 在线书](https://datawhalechina.github.io/hello-agents/) · [PDF](https://www.datawhale.cn/learn/summary/239) | 中文系统教材，可直接打包进资料包 |
| [腾讯元器：5 分钟创建公众号智能体](https://yuanqi.tencent.com/guide/agent-build-wechat-agent) | 中文低代码实操，理解平台边界 |

## 三、实战案例库（简历项目素材）

| 资源 | 内容 |
|---|---|
| [Shubhamsaboo / awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps) | 100+ 免费 Agent / RAG / Agent Skills 应用 |
| [NirDiamant / GenAI_Agents](https://github.com/NirDiamant/GenAI_Agents) | 50+ 教程与实现，从对话机器人到多智能体 |
| [patchy631 / ai-engineering-hub](https://github.com/patchy631/ai-engineering-hub) | LLM / RAG / 真实 Agent 应用深度教程 |
| [Arindam200 / awesome-ai-apps](https://github.com/Arindam200/awesome-ai-apps) | 100+ 案例，含 Google ADK、OpenAI SDK、CrewAI |
| [study8677 / awesome-architecture](https://github.com/study8677/awesome-architecture) | 中文双语 40 篇教程 + 31 张真实架构图（Claude Code / RAG / Agents），**偏面试** |

## 四、资源索引（做资料包目录用）

- [datawhalechina / Agent-Learning-Hub](https://github.com/datawhalechina/Agent-Learning-Hub) — 学习路线
- [WenyuChiou / awesome-agentic-ai-zh](https://github.com/WenyuChiou/awesome-agentic-ai-zh) — 三语地图，240+ 资源
- [e2b-dev / awesome-ai-agents](https://github.com/e2b-dev/awesome-ai-agents) — 工具与协议生态
- [dipakkr / awesome-ai-engineering](https://github.com/dipakkr/awesome-ai-engineering) — AI 工程资源
- [WangRongsheng / awesome-LLM-resources](https://github.com/WangRongsheng/awesome-LLM-resources) — 中文向
- [IAAR-Shanghai / Awesome-AI-Memory](https://github.com/IAAR-Shanghai/Awesome-AI-Memory) — Agent 记忆专题
- [nibzard / awesome-agentic-patterns](https://github.com/nibzard/awesome-agentic-patterns) — Agent 模式合集

## 五、公众号路线图文章

| 文章 | 类型 |
|---|---|
| [从零基础到独立开发 AI Agent：这份路线图请收好](http://mp.weixin.qq.com/s?__biz=MzY0MDg5OTU5Ng==&mid=2247483670&idx=1&sn=60680f8a16b36e769225c62c4edc2eb4) | 16 周连载，每周一个可跑成果 |
| [AI Agent 工程 28 节系列课程](https://mp.weixin.qq.com/s/c7y5FfCt-EQ5riAsCS-Khw) | ReAct → smolagents → MCP/A2A → 评估 → 安全 → 部署，目录完整 |
| [《.NET + AI × Agent 产品开发实战》](http://mp.weixin.qq.com/s?__biz=MzAwNTMxMzg1MA==&mid=2654103221&idx=4&sn=fd1d4e6a13a4f13f50a1bcc0a92ec3ec) | 16 讲，从 Demo 到产品化，偏工程判断 |
| [零基础学 AI Agent 开发：一份能落地的入门路线](http://mp.weixin.qq.com/s?__biz=MzI3MjY0NDc4Mw==&mid=2247489564&idx=1&sn=e3fec577fbbc2a6bdc7bb48f30f8d238) | 五阶段路线 + 免费资源 + 4 个坑 |
| [【零基础】AI 大模型 Agent 完整学习路线](http://mp.weixin.qq.com/s?__biz=MzkzMjQyMzAxMw==&mid=2247498517&idx=1&sn=7239d2a0ed8cfb9197665562bece0cb5) | 四阶段 + 4 个简历项目 |
| [AI Agent 最全学习路线从零到实战（2026 最新版）](http://mp.weixin.qq.com/s?__biz=Mzg2NjYyNjcxMg==&mid=2247483934&idx=1&sn=2dfd698c4e4e2b6a22c56a1cf28205c3) | 六阶段，含框架 / 向量库 / 工程化 |
| [AI Agent 开发：从入门到精通的完整学习路线](http://mp.weixin.qq.com/s?__biz=MzY5MDQ1NDAzNg==&mid=2247483852&idx=1&sn=352af4b36e637a825ccc393f52db854c) | 面向「从零到 Offer」 |
| [2026 年 AI 智能体开发完全指南：10 个 GitHub 顶级教程](http://mp.weixin.qq.com/s?__biz=MzU5NDM1MjU5Mg==&mid=2247518844&idx=2&sn=2dfd698c4e4e2b6a22c56a1cf28205c3) | 逐个拆解仓库章节结构 |
| [Ai Agent 实战项目，拿走直接用](http://mp.weixin.qq.com/s?__biz=Mzk2OTAyODU1Mw==&mid=2247486348&idx=1&sn=95974b9544ff7e28b02304ee10e7053f) | 30 个项目 / 10 个简历项目，典型资料包形态 |

---

## 按用途挑（省时间版）

| 你想做什么 | 直接取用这四样 |
|---|---|
| 系统学一遍 | Hello-Agents 在线书 + 微软 18 课中文版 + HF 中文课 |
| 查官方规范 | Anthropic《Building Effective Agents》+ OpenAI 函数调用最佳实践 + LangGraph 文档 |
| 找简历项目 | awesome-llm-apps + GenAI_Agents + ai-engineering-hub + 30 个实战项目那篇 |
| 准备面试 | awesome-architecture 架构图 + Hello-Agents Extra-Chapter + [09 面试考点](./09-interview.md) |

## 资料包与领取方式

公开仓库里的这一页就是**目录**，完整资料包包含：

- 上述系统教程的 PDF / 离线打包与阅读顺序
- 按公司 / 岗位分类的笔面情报与网申时间线
- 北森、智鼎、牛客等笔试平台的题型与规则差异
- 面经追问链合集与项目讲法模板

在公众号回复关键词 **`Agent`** 领取目录对应的完整版；1v1 笔面辅导与情报咨询走微信 `offer630`，成交走闲鱼担保。

> 我们只做情报与辅导，不做任何违规承诺。资料持续更新，仓库与网站 `agent.meetoffer.cn` 同步。

## 一手资料与延伸阅读

本页即索引。方法论部分见 [00 学习路线](./00-roadmap.md)，对标拆解见 [16 他们怎么做 GitHub 与网站](./16-benchmark.md)。

下一步：[16 对标拆解](./16-benchmark.md)
