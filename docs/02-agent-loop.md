---
title: Agent 循环：ReAct 与三种范式
category: 核心
order: 3
summary: 不用框架手写一个 Agent 循环，理解 ReAct、Plan-Execute、Reflection 与四个必设的终止条件。
minutes: 12
---

# Agent 循环：ReAct 与三种范式

所有 Agent 框架剥到最后都是同一个 `while` 循环。**手写一遍，比看十个框架的文档有用。**

## 最小循环（伪代码）

```python
def run(goal, tools, budget):
    state = State(goal=goal, trace=[], spent=0)
    while True:
        # 1. 组装上下文：系统提示 + 目标 + 历史轨迹 + 工具清单
        messages = build_messages(state)

        # 2. 模型决策：要么给最终答案，要么给一次工具调用
        decision = llm.call(messages, tools=tools.schema(), response_format="json")

        # 3. 终止判断
        if decision.is_final:
            return decision.answer
        if state.rounds >= budget.max_rounds:
            return fallback("超出最大轮数")          # 必须兜底
        if state.spent >= budget.max_tokens:
            return fallback("超出预算")               # 必须兜底

        # 4. 执行工具（带校验、超时、幂等键）
        try:
            observation = tools.execute(decision.name, decision.args, idempotency_key=state.rounds)
        except ToolError as e:
            observation = f"工具执行失败：{e}"        # 把错误交回模型，别直接崩

        # 5. 记录轨迹，进入下一轮
        state.trace.append(Step(decision, observation))
        state.rounds += 1
```

四个必须自己加的东西：**最大轮数、预算上限、工具超时、错误回传**。少了任何一个，线上都会出事故。

## 三种范式

| 范式 | 怎么走 | 适合 | 代价 |
|---|---|---|---|
| **ReAct** | 思考 → 行动 → 观察，边走边想 | 探索型任务、工具结果会改变计划 | 轮数多、token 贵、容易绕路 |
| **Plan-and-Execute** | 先一次性拆出计划，再逐步执行 | 步骤明确、需要可审计 | 计划错了要能重规划，否则一路错 |
| **Reflection** | 执行后让模型自评，不合格再改 | 生成类、有明确质量标准 | 多一轮调用；自评不可靠，需外部校验 |

真实系统通常是混合的：**外层 Plan 控结构，内层 ReAct 处理不确定步骤，关键点加 Reflection 或人工确认**。

## 四个高频失败模式

| 现象 | 根因 | 处理 |
|---|---|---|
| 反复调同一个工具 | 观察没写进上下文 / 工具返回无信息量 | 轨迹里带上去重提示，或硬性禁止同参重复 |
| 工具参数幻觉 | 工具描述含糊、枚举值没约束 | JSON Schema 收窄类型 + enum + 必填校验 |
| 上下文越滚越大 | 轨迹全文塞进 prompt | 压缩历史、只保留最近 N 步 + 摘要 |
| 「想完了不输出」 | 没有强制终止判据 | 结构化输出里设 `final` 分支 + 轮数硬上限 |

## 状态与检查点

循环一旦超过几轮，就要面对「进程挂了怎么办」。生产做法是把状态外置：

- 每步结束写一次检查点（checkpoint），崩溃后从最近一步恢复
- 长任务用持久化工作流（如状态机 / Temporal 类方案），而不是内存里的 while
- 高危动作前设 **HITL（人在回路）关卡**：暂停、等确认、再继续

面试常问：「你这个 Agent 跑到一半服务重启了会怎样？」——能答出检查点 + 幂等，就明显高一个档。

## 验收点

- 不看框架文档，写出上面的循环并跑通 5 轮
- 能说出你设了哪几个终止条件，以及为什么
- 能解释「为什么错误要回传给模型，而不是直接抛异常」

下一步：[03 工具调用与结构化输出](./03-tool-calling.md)

## 一手资料与延伸阅读

本篇内容参考并重新组织了以下公开资料，建议对照阅读（链接均为可点开的原始出处）：

- [Hello-Agents · 手写 ReAct / Plan-and-Solve / Reflection](https://github.com/datawhalechina/hello-agents)
- [Hugging Face Agents Course · Unit 1（Agent 循环与工具）](https://huggingface.co/learn/agents-course/zh-CN/unit1/introduction)
- [freeCodeCamp 开源 LLM Agent 手册 · 循环与规划](https://www.freecodecamp.org/news/the-open-source-llm-agent-handbook/)
- [公众号：AI Agent 工程 28 节系列课程](https://mp.weixin.qq.com/s/c7y5FfCt-EQ5riAsCS-Khw)
