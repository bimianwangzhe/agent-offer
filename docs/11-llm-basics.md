---
title: LLM 调用与结构化输出：先把地基打实
category: 基础
order: 2
summary: 一次调用的完整组成、流式输出、JSON 契约、非法输出兜底与成本核算，附可运行代码。
minutes: 14
---

# LLM 调用与结构化输出：先把地基打实

Agent 的所有花活都建立在一次朴素的 API 调用上。**这一层没打实，后面所有框架都会变成黑盒**。本篇只做一件事：把「调模型」这件事拆到每个参数都能解释，并写出能直接跑的代码。

## 一次调用的完整组成

```python
resp = client.chat.completions.create(
    model="gpt-4o-mini",          # 按季度复盘选型，不要写死
    messages=[                     # 上下文的全部内容，见上下文工程篇
        {"role": "system", "content": "你是订单助手，只输出 JSON。"},
        {"role": "user",   "content": "把这句话抽成字段：张三 3 月 2 日买了 2 件，共 199 元"},
    ],
    tools=[...],                   # 工具清单（工具调用篇展开）
    response_format={"type": "json_object"},
    temperature=0,                 # 抽取/分类类任务用 0，创作类再调高
    max_tokens=400,                # 输出预留，别让它吃掉上下文预算
    stream=False,
)
```

五个必须能解释的参数：

| 参数 | 作用 | 常见错误 |
|---|---|---|
| `messages` | 唯一的上下文载体，角色分 system / user / assistant / tool | 把工具结果塞进 user 文本里，模型分不清是谁说的 |
| `tools` | 声明可调用函数的 schema | 全量挂载几十个工具，token 直接被吃光 |
| `response_format` | 约束输出形态 | 以为设了就一定合法（见下） |
| `temperature` | 采样随机性 | 抽取任务用了 0.8，同一输入结果飘 |
| `max_tokens` | 输出上限 | 设太小导致 JSON 被截断 |

> 采样参数还有 `top_p`、`presence_penalty` 等，但**不要同时调 temperature 和 top_p**，这是最常见的无效调参。

## 流式输出

流式不是「体验优化」，是长输出场景的必需项——非流式要等整段生成完才返回，用户会以为卡死。

```python
parts = []
with client.chat.completions.create(..., stream=True) as s:
    for chunk in s:
        delta = chunk.choices[0].delta.content
        if delta:
            parts.append(delta)
            yield delta            # 逐字推给前端
text = "".join(parts)
```

两个坑：

1. **流式下工具调用是分片到达的**（`tool_calls` 的 `function.arguments` 会被拆成多块），要按 index 累积拼接，不能拿到第一片就解析。
2. 断流要能降级：记录已产出内容，重试时用「续写」而不是从头再来。

## 结构化输出：三层契约

「让模型输出 JSON」听起来简单，实际是三层，缺一层线上就会漏：

| 层 | 做法 | 防住什么 |
|---|---|---|
| ① hint | system 里写「只输出 JSON，不要 markdown 代码块」 | 模型爱套 json 代码块 |
| ② 约束 | `response_format=json_object` 或工具调用的 JSON Schema | 输出根本不是 JSON |
| ③ 校验 | 本地用 Schema / Pydantic 再验一次 | 是 JSON 但字段类型/枚举不对 |

**第 ② 层只保证「是合法 JSON」，不保证「符合你的 schema」。** 这是新手最常踩的坑。

```python
from pydantic import BaseModel, ValidationError
from typing import Literal

class Order(BaseModel):
    buyer: str
    date: str                     # 生产里应校验 ISO 8601
    count: int
    amount: float
    currency: Literal["CNY", "USD"] = "CNY"

def extract(text: str, attempts: int = 2) -> Order | None:
    for i in range(attempts):
        raw = call_llm(text, expect_json=True)
        cleaned = raw.strip().removeprefix("```json").removesuffix("```").strip()
        try:
            return Order.model_validate_json(cleaned)     # 第 ③ 层
        except (ValidationError, ValueError) as e:
            text = f"{text}\n\n上次输出不合法：{e}。请严格按字段与类型重出。"
    return None                                           # 降级，不无限重试
```

关键设计：**把校验错误原文回传给模型**（只回 `error` 没用，要给可执行的修正信息），并且**只重试 2 次**，之后降级到规则解析或人工。

## Token 与成本

```
单次成本 = 输入 tokens × 输入单价 + 输出 tokens × 输出单价
```

三条实用结论：

- 输出单价比输入贵数倍，**长输出比长输入更烧钱**
- 工具描述、系统提示是每次都要重付的「固定税」，要尽量短
- 先做缓存与路由（见上下文工程篇），再谈换便宜模型

打印一次调用的真实用量，是所有成本优化的前提：

```python
u = resp.usage
print(f"prompt={u.prompt_tokens} completion={u.completion_tokens} total={u.total_tokens}")
```

## 常见坑速查

| 现象 | 根因 | 解法 |
|---|---|---|
| 返回带 json 代码块 | 只做了 hint 没做清洗 | 清洗 + Schema 校验 |
| 字段名偶发变化 | 没给 schema，只靠自然语言 | 工具调用 / Structured Output |
| 数字变成字符串 | 模型自由发挥 | Pydantic 强类型校验 + 回传错误 |
| 长 JSON 被截断 | `max_tokens` 太小 | 预留足够输出空间，或改分段输出 |
| 同一输入结果不一致 | temperature 过高 | 抽取/分类固定 0 |

## 面试追问链

```
「你怎么让模型稳定输出 JSON？」
→ 「response_format 之后还要校验吗？为什么？」
→ 「校验失败了怎么办？重试几次？」
→ 「如果重试两次还失败，线上怎么兜底？」
→ 「缓存 key 怎么设计？语义相近的问题怎么处理？」
```

最后一问已经进入上下文工程与成本，能接住就说明地基是实的。

## 验收点

- 不看文档写出一次带 tools + response_format 的调用，并解释每个参数
- 能处理模型输出 json 代码块 包裹、字段类型错误、被截断三种情况
- 能算出一次调用的真实 token 用量与成本

## 一手资料与延伸阅读

- [OpenAI Cookbook · 官方示例集](https://github.com/openai/openai-cookbook)
- [OpenAI 函数调用最佳实践](https://platform.openai.com/docs/guides/function-calling/best-practices)
- [Hugging Face AI Agents Course 中文版 · Unit 0](https://huggingface.co/learn/agents-course/zh-CN/unit0/introduction)
- [微软《AI Agents for Beginners》18 课](https://github.com/microsoft/ai-agents-for-beginners)

下一步：[02 Agent 循环](./02-agent-loop.md)
