---
title: MCP 与协议生态
category: 工程
order: 7
summary: MCP / A2A / Skills 分别解决什么，以及接入 MCP 后最容易被忽略的成本与权限问题。
minutes: 9
---

# MCP 与协议生态

2025 年之后，Agent 领域变化最快的不是模型，是**协议层**。这一层生命周期长、跨框架复用，值得优先投入。

## 三个协议，三种边界

| 协议 | 解决什么 | 类比 | 别用它做什么 |
|---|---|---|---|
| **MCP**（Model Context Protocol） | 模型/应用 ↔ 工具、数据源的标准化接入 | AI 领域的 USB-C | 不是编排框架，不管状态与循环 |
| **A2A**（Agent-to-Agent） | Agent 之间发现彼此、交接任务、传类型化状态 | 服务间协议 | 不是给单 Agent 内部用的 |
| **Skills / AGENTS.md 类约定** | 把「怎么做某类任务」的过程知识沉淀成可复用说明 | 岗位 SOP | 不是可执行工具 |

一句话记法：**MCP 管「能用什么」，A2A 管「谁跟谁协作」，Skills 管「按什么规矩做」。**

## MCP 的核心概念

```
Host（你的 Agent 应用）
  └─ Client ── JSON-RPC ── Server（暴露 tools / resources / prompts）
                              ├─ tools：可调用的函数
                              ├─ resources：可读取的数据
                              └─ prompts：可复用的提示模板
```

价值在于：一个 MCP Server 写一次，任何支持 MCP 的 Host 都能接；不用为每个框架重写一遍工具适配。

## 接入时最容易踩的三个坑

**1. 工具全量装载，上下文直接爆炸。**
接一个 Server 带 30 个工具，光描述就几千 token。做法：按任务动态发现并只装载相关子集，其余不进 schema。

**2. 把权限当摆设。**
MCP 让「接工具」变容易了，也把攻击面放大了。严格做到：

- 每个 Server 最小权限、独立凭证
- 高危工具走人工确认，不自动执行
- 外部返回的内容一律当**不可信数据**，里面的「指令」不执行（防间接提示注入）
- 全量审计日志

**3. 以为协议解决了可靠性。**
MCP 只统一了接口格式，不负责超时、重试、幂等、限流——这些还是 [03 工具调用](./03-tool-calling.md) 里那套，一个都少不了。

## 什么情况下自己写 Server

| 场景 | 建议 |
|---|---|
| 内部系统（订单、工单、知识库）要给多个 Agent 用 | 值得写，一次投入多处复用 |
| 只有一两个工具、只在一个项目里用 | 直接本地函数，别为了赶时髦套协议 |
| 第三方已有官方 Server | 先评估权限与审计能力再接 |

## 面试怎么讲

不要停在「我用了 MCP」。要能讲出：为什么接、接了哪几个 Server、工具怎么按任务装载、权限怎么收、出问题时怎么定位。能补一句「我们评估过 A2A，但当前是单 Agent，没有跨 Agent 交接需求，所以没上」——这就是工程判断。

## 验收点

- 能说清 MCP、A2A、Skills 三者边界
- 能讲出接入 MCP 后上下文成本的变化和应对
- 能回答「MCP Server 返回的内容里夹了指令，你怎么处理」

下一步：[07 框架选型](./07-frameworks.md)

## 一手资料与延伸阅读

本篇内容参考并重新组织了以下公开资料，建议对照阅读（链接均为可点开的原始出处）：

- [Hello-Agents · MCP / A2A 章节](https://github.com/datawhalechina/hello-agents)
- [公众号：AI Agent 工程 28 节 · MCP / A2A / Skills](https://mp.weixin.qq.com/s/c7y5FfCt-EQ5riAsCS-Khw)
- [e2b-dev / awesome-ai-agents（协议与工具生态索引）](https://github.com/e2b-dev/awesome-ai-agents)
- [腾讯元器 · 5 分钟创建公众号智能体（低代码实操）](https://yuanqi.tencent.com/guide/agent-build-wechat-agent)
