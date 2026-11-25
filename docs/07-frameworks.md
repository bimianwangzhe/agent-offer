---
title: 框架选型：别让框架替你思考
category: 工程
order: 8
summary: LangGraph / CrewAI / AutoGen / OpenAI Agents SDK / 低代码平台的取舍，以及自研的边界。
minutes: 10
---

# 框架选型：别让框架替你思考

框架每季度都在变，但选型的判断标准不变：**它替你解决了什么问题，又把什么问题变成了它的约束。**

## 主流方案对比

| 方案 | 定位 | 适合 | 主要代价 |
|---|---|---|---|
| **LangGraph** | 有状态图 / 持久化编排 | 生产级、需要循环、分支、检查点、HITL | 概念多，简单任务显得重 |
| **CrewAI** | 角色化多 Agent 协作 | 快速搭「研究/写作/审阅」流水线 | 抽象偏高层，细粒度控制弱 |
| **AutoGen** | Agent 间对话与编排 | 多 Agent 研究、实验性场景 | 生产化需自己补不少工程件 |
| **OpenAI Agents SDK**（及同类轻量 SDK） | 轻量 primitives：工具、护栏、交接 | 想少抽象、贴近原生 API | 生态与持久化能力需自建 |
| **Dify / Coze 等低代码** | 可视化编排、快速上线 | 内部工具、验证需求、非核心链路 | 定制与可测试性受限，难做复杂评测 |
| **自研（纯 API + 状态机）** | 完全掌控 | 流程固定、要可审计、要极致成本 | 得自己写检查点、追踪、护栏 |

## 一张决策图

```
流程固定、步骤可枚举        → Workflow / 自研状态机
需要模型在运行时决策       → Agent 循环
  ├─ 要上线、要恢复、要人在回路 → LangGraph 类持久化编排
  ├─ 只是内部小工具、快速验证   → 轻量 SDK 或低代码
  └─ 真需要多个角色协作         → CrewAI / AutoGen（先确认单 Agent 确实不够）
```

**默认建议：单 Agent + 持久化编排起步。** 多 Agent 不是升级，是复杂度乘以 N；只有当上下文容量、职责边界、吞吐三者之一真出现瓶颈时才拆。

## 框架到底替你做了什么

手写过 [02 Agent 循环](./02-agent-loop.md) 之后，再看框架就很清楚：

| 你手写时要操心的 | 框架通常提供 |
|---|---|
| 状态在内存里，崩了就没 | 检查点 / 持久化 |
| 循环与分支靠 if-else | 图 / 节点 / 条件边 |
| 人工确认要自己暂停 | HITL 关卡原语 |
| 每步日志自己打 | 内置追踪钩子 |
| 工具注册自己写适配 | 工具抽象、MCP 接入 |

**框架没替你做的**：评测集、业务权限、成本预算、提示注入防护、引用校验。这些永远是你的责任，也是面试最值钱的部分。

## 选型的三个反问

1. **换掉它的成本有多高？** 业务逻辑越往框架里塞，越难换。把领域逻辑留在自己的函数里，框架只管编排。
2. **出问题时能不能看到内部？** 无法打印每一步输入输出的框架，线上排障会很痛苦。
3. **半年后还有人维护吗？** 优先选社区活跃、协议层标准（如 MCP）兼容好的，而不是功能最多的。

## 版本策略

- 锁版本，升级前跑一遍回归评测集
- 把模型与框架解耦：模型按季度用真实数据复盘再换，别跟着新闻换
- 优先投生命周期长的原语：**上下文工程、编排者模式、MCP、评测体系**

## 验收点

- 能说出一个「我们没用某框架」的具体理由
- 能列出框架替你做的三件事、没替你做的三件事
- 能回答「为什么先单 Agent 而不是直接上多 Agent」

下一步：[08 评测与生产化](./08-eval-production.md)

## 一手资料与延伸阅读

本篇内容参考并重新组织了以下公开资料，建议对照阅读（链接均为可点开的原始出处）：

- [LangGraph 官方文档](https://docs.langchain.com/oss/python/langgraph/overview)
- [LangChain Academy · Intro to LangGraph](https://academy.langchain.com/courses/intro-to-langgraph)
- [DeepLearning.AI《AI Agents in LangGraph》](https://www.deeplearning.ai/courses/ai-agents-in-langgraph)
- [ed-donner / agents · 6 周工程课（SDK / CrewAI / AutoGen / MCP）](https://github.com/ed-donner/agents)
