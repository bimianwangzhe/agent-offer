---
title: 什么是 Agent：先划清边界
category: 基础
order: 1
summary: Agent、Workflow、Chatbot 的区别，以及「模型只做 20%」这条 2026 年共识。
minutes: 8
---

# 什么是 Agent：先划清边界

面试里最容易被追问的一个问题是：**「你说你做了个 Agent，它凭什么算 Agent？」** 很多人答不上来，因为把「调了大模型」当成了 Agent。

## 三种形态的边界

| 形态 | 谁决定下一步 | 典型特征 | 例子 |
|---|---|---|---|
| Chatbot | 用户 | 一问一答，无外部动作 | 普通问答窗口 |
| Workflow | 开发者（代码里写死） | 步骤固定、可预测、无循环 | 上传 PDF → 切分 → 总结 → 发邮件 |
| **Agent** | **模型（在运行时决定）** | 自主选工具、多轮循环、能根据观察改计划 | 「查一下这份财报里毛利率异常的原因，必要时自己找外部资料」 |

判据只有一条：**控制流是不是在运行时由模型决定的**。把 LLM 塞进一个 if-else 流程里，那叫 Workflow，不叫 Agent。反过来，Workflow 并不是低级——生产环境里大量场景应该用 Workflow，因为可预测、好测、便宜。

> 面试加分点：主动说「我们这个场景最后选了 Workflow 而不是 Agent，因为步骤确定且要可审计」，比硬说用了 Agent 更显工程判断。

## Agent = 模型 + Harness

2026 年一线实践里最有用的一个心智模型：

```
Agent = 模型能力(约 20%) + Harness(约 80%)

Harness 包括：
  上下文管理  ·  工具编排  ·  状态与检查点
  记忆系统    ·  评测机制  ·  权限与护栏
```

意思是：模型再强，没有外围这一套，也只是一个会说话的接口；换更强的模型能提升上限，但决定系统能不能上线的，是 Harness 的质量。

这条结论直接影响学习投入的分配——**别把 80% 的时间花在调 Prompt 和换模型上**。

## 六个组成件

| 组件 | 职责 | 出问题时的表现 |
|---|---|---|
| Planner | 拆任务、定顺序 | 一上来就乱调工具、漏步骤 |
| Executor | 执行动作 | 卡死、重复执行 |
| Tools | 连接外部系统 | 参数幻觉、权限过大 |
| Memory | 保存跨轮信息 | 聊久了就忘 / 越聊越贵 |
| State | 记录当前进度、可恢复 | 崩溃后从头再来 |
| Reflection | 检查结果、自我修正 | 错了还一路错下去 |

这六个不是都要自己写，但**每个都要能说清「我用了什么、不用会怎样」**。

## 一个最小可用的定义

> Agent 是一个在循环中运行、能自主选择工具、并根据工具返回结果调整后续行为的系统；它有状态、有终止条件、有失败处理。

三个必要条件：

1. **循环**：不是一次调用，是「观察 → 决策 → 行动」的多轮
2. **选择权**：模型在运行时从工具集里挑，而不是代码写死顺序
3. **终止条件**：最大轮数、预算上限、目标达成、人工中断——至少要有一个，否则就是死循环

## 验收点

- 能用自己的话讲清 Workflow 和 Agent 的判据，并举一个「本该用 Workflow」的例子
- 能画出一个 Agent 的组件图，并指出你项目里每个组件由谁实现
- 能回答「如果一个工具永远返回错误，你的系统会怎样」

下一步：[02 Agent 循环](./02-agent-loop.md)

## 一手资料与延伸阅读

本篇内容参考并重新组织了以下公开资料，建议对照阅读（链接均为可点开的原始出处）：

- [Anthropic《Building Effective Agents》—— 什么时候不该用 Agent](https://www.anthropic.com/research/building-effective-agents)
- [OpenAI《A Practical Guide to Building Agents》PDF](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- [Hello-Agents 在线书 · 智能体基础](https://datawhalechina.github.io/hello-agents/)
