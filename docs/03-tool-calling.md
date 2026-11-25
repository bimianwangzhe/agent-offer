---
title: 工具调用与结构化输出
category: 核心
order: 4
summary: 工具描述怎么写、Schema 怎么收窄、幂等与权限怎么做，以及失败重试的边界。
minutes: 10
---

# 工具调用与结构化输出

工具是 Agent 唯一能改变外部世界的手段，也是**事故最集中的地方**。模型会编参数、会重复调用、会在不该写库的时候写库。这一层的设计直接决定系统能不能上线。

## 工具描述比 Prompt 更重要

大多数「模型不会用工具」的问题，根因在工具描述写得像给人看的注释。写描述的原则：

```json
{
  "name": "search_orders",
  "description": "按时间范围查询订单。仅返回订单号、金额、状态。不要用于查用户资料。",
  "parameters": {
    "type": "object",
    "properties": {
      "start_date": { "type": "string", "description": "ISO 8601 日期，如 2026-01-01" },
      "end_date":   { "type": "string", "description": "ISO 8601 日期，含当天" },
      "status":     { "type": "string", "enum": ["paid", "refunded", "pending"] }
    },
    "required": ["start_date", "end_date"],
    "additionalProperties": false
  }
}
```

四条硬规则：

1. **说清「不要用于什么」**——边界比功能更能防止误选
2. **枚举值写进 `enum`**，别让模型自由发挥
3. **`additionalProperties: false`**，堵住编造字段
4. **示例写进 description**（日期格式、单位、ID 形态），比在 system prompt 里喊十遍有用

## 结构化输出的两层校验

模型输出「看起来像 JSON」不等于合法。要过两道：

| 层 | 做什么 | 失败怎么办 |
|---|---|---|
| 语法层 | JSON 解析 + Schema 校验 | 把报错原文回传，让模型重出一次（限 1~2 次） |
| 语义层 | 值域、权限、业务规则 | 直接拒绝，不重试（重试解决不了权限问题） |

> 别无限重试。语法错误重试 2 次就该降级；语义错误重试只会烧钱。

## 幂等：面试最爱追的点

「用户点了两次 / 模型重复调了一次，会不会下两单？」

做法是给每个工具调用带 **idempotency key**（例如 `会话ID + 轮次 + 工具名 + 参数哈希`）：

- 写操作前查 key 是否执行过，命中就直接返回上次结果
- 执行与 key 落库要在同一个事务里
- 只读工具不需要，但要有超时和限流

配套三件套：**超时**（别让一个工具拖死整轮）、**限流**（防止循环里疯狂调用）、**审计日志**（谁、在哪一步、改了什么）。

## 权限与高危动作

| 级别 | 例子 | 策略 |
|---|---|---|
| 只读 | 检索、查询 | 自动执行，记录日志 |
| 可逆写 | 草稿、临时文件 | 自动执行，保留回滚 |
| 不可逆 / 高危 | 转账、发邮件、删数据 | **最小权限 + 人工确认（HITL）** |

最小权限要落到工具粒度：给 Agent 一个「只读订单」的 token，而不是把数据库账号给它。提示注入能骗模型，但骗不过权限系统——**这是最后一道、也是最可靠的一道防线**。

## 失败回传的措辞

工具报错时回给模型的文本要包含「发生了什么 + 可以怎么改」：

```
工具执行失败：参数 start_date 格式不合法（收到 "上个月"）。
请改用 ISO 8601 日期，例如 2026-01-01。
```

只回 `Error` 会让模型原地打转；把可执行的信息给足，它通常一轮就能修正。

## 验收点

- 能写出一个带 enum、required、additionalProperties 的 Schema
- 能讲清语法错误和语义错误分别怎么处理
- 能回答「你的写操作怎么保证不重复执行」

下一步：[04 上下文工程](./04-context-engineering.md)

## 一手资料与延伸阅读

本篇内容参考并重新组织了以下公开资料，建议对照阅读（链接均为可点开的原始出处）：

- [OpenAI 函数调用最佳实践（第一手规范）](https://platform.openai.com/docs/guides/function-calling/best-practices)
- [Anthropic Tool Use 实现文档](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/implement-tool-use)
- [OpenAI Cookbook · 官方示例集](https://github.com/openai/openai-cookbook)
- [OpenAI Agents SDK 文档 · Tools / Guardrails / Tracing](https://openai.github.io/openai-agents-python/)
