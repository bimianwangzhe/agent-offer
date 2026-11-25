---
title: 三个能写进简历的项目（含架构与代码骨架）
category: 上岗
order: 12
summary: 不是 Demo：研报助手、运维 Agent、长会话客服，每个都带工程约束、评测口径与讲法。
minutes: 18
---

# 三个能写进简历的项目

「基于 LangChain 的智能问答」这类项目在 2026 年已经没有区分度了：没有约束、没有数据、面试官一追问就只剩「调了 API」。

好项目的判据只有一条：**它解决了一个会真实发生的故障，并且你能用数字证明**。下面三个项目按「约束 → 架构 → 关键代码 → 评测口径 → 讲法」展开，可以直接照着做。

---

## 项目一：带回归评测的研报助手

**约束**：答案必须可溯源；资料里没有就必须拒答；改一版不能让老问题变差。

### 架构

```
提问 → Query 改写 → 混合检索(BM25 + 向量) → 重排 top-5 → 元数据过滤
     → 组装(带 chunk_id) → 生成(强制引用) → 引用命中校验 → 输出 / 拒答
                                      ↑
                              50 条评测集 + CI 回归门禁
```

### 关键代码骨架

```python
def answer(question: str) -> Answer:
    q = rewrite(question, history)                 # 多轮补全
    hits = hybrid_search(q, top_k=50)
    hits = rerank(q, hits)[:5]
    hits = [h for h in hits if allowed(h.meta)]    # 权限过滤

    if max(h.score for h in hits) < THRESHOLD:
        return Answer.refused("资料中未找到相关依据")   # 弃权逻辑

    ctx = build_context(hits)                      # 每段带 chunk_id
    out = llm(ctx, response_format=AnswerSchema)  # 强制 citations

    # 机械校验：引用里是否真的包含答案的关键事实
    if not verify_citations(out, hits):
        return Answer.refused("引用校验未通过，已拒绝输出")
    return out
```

### 评测口径（写进简历的数字从这里来）

| 指标 | 定义 | 起步目标 |
|---|---|---|
| 答案正确率 | 50 条标注集上人工判定 | ≥ 80% |
| 引用命中率 | 引用 chunk 含关键事实的比例 | ≥ 95% |
| 正确拒答率 | 资料外问题被拒的比例 | ≥ 90% |
| P95 延迟 | 端到端 | ≤ 4s |
| 单任务成本 | 一次问答的 token 花费 | 明确报出数值 |

**回归门禁**：每次改 Prompt / 切分 / 重排模型，评测集正确率下跌超过 2 个百分点就阻断合并。

### 讲法（五段式）

> 背景是内部研报检索，最怕编造数据。我先建了 50 条标注集，再上混合检索 + 重排，最后加了一层引用机械校验——模型可能编，但引用命中校验骗不过去。上线后正确拒答率 92%，单任务成本 X 元。有一版我调了 Prompt 想提高召回，正确率从 83% 掉到 79%，评测门禁直接拦下并回滚了。

最后那句「被拦下并回滚」是区分度最高的部分。

---

## 项目二：多工具运维 Agent

**约束**：高危动作必须人工确认；工具调用必须幂等；服务重启不能重复执行。

### 架构

```
告警 → 主管节点(意图/分级) → 只读诊断(日志/指标/拓扑)
     → 生成处置方案 → [高危?] ── 是 ─→ HITL 人工确认 ─┐
                              └─ 否 ─→ 自动执行 ───────┤
                                                      ↓
                              幂等执行器(key = 告警ID+步骤+参数哈希)
                                                      ↓
                              检查点落库 → 结果回传 → 审计日志
```

### 关键代码骨架

```python
def execute_step(step, state):
    key = f"{state.alert_id}:{state.round}:{step.name}:{hash(step.args)}"
    with transaction() as tx:
        if tx.exists("exec_log", key):            # 幂等：命中直接返回旧结果
            return tx.get("exec_log", key).result
        if step.risk == "high" and not state.approved:
            return Pending("等待人工确认")         # HITL 关卡
        result = run_with_timeout(step, timeout=10)
        tx.insert("exec_log", key, result)        # 执行与 key 同一事务
    save_checkpoint(state)                        # 崩溃可恢复
    return result
```

三处是面试官会追的：**幂等 key 的构成**、**执行与日志同一事务**、**检查点在哪一步落**。

### 评测口径

| 指标 | 说明 |
|---|---|
| 处置成功率 | 场景评测集上完成预期动作的比例 |
| 重复执行次数 | 故障注入（重复点击 / 重启）后应为 **0** |
| 高危动作确认覆盖率 | 100%，这是硬指标 |
| 崩溃恢复耗时 | 从检查点恢复到继续执行的耗时 |

**故障注入是这项目的灵魂**：主动制造「工具超时」「进程重启」「同一告警来两次」，证明系统不重复执行、不丢状态。

### 讲法

> 单 Agent + 状态机就够了，没上多智能体，因为三个瓶颈都不成立。高危动作走人工确认，幂等 key 由告警 ID、轮次和参数哈希组成，执行和日志在同一事务里。我做过故障注入：跑到一半 kill 进程，恢复后没有重复下发任何一条命令。

---

## 项目三：长会话客服 Agent

**约束**：上下文会爆、成本要可控、跨会话要记住用户偏好但不能越记越脏。

### 架构

```
L0 系统层(固定)  →  L1 任务层(当前目标)  →  L2 工作层(最近 N 轮 + 摘要)
                                          →  L3 召回层(长期记忆 top-k)
预检路由：闲聊 / 简单问答 → 小模型，不挂工具、不查记忆
          复杂问题 → 挂工具子集 + 状态 → 大模型
```

### 关键代码骨架

```python
def build_messages(state):
    msgs = [L0_SYSTEM]                            # 永不淘汰
    msgs.append(task_block(state.goal))           # L1
    if state.rounds > 6:
        msgs.append(summarize(state.trace[:-4], keep="已排除的方案"))  # 压缩
    msgs.extend(state.trace[-4:])                 # L2 滚动窗口
    for m in recall(state.user_id, k=3):          # L3 按需召回
        msgs.append(as_data_block(m))             # 标记为不可信数据
    return within_budget(msgs, budget=state.budget_left)
```

摘要里**必须保留「已排除的方案」**，否则模型会把同一个错误再犯一遍——这是长会话最隐蔽的坑。

### 记忆治理

| 机制 | 作用 |
|---|---|
| 重要性打分 | 不是所有对话都值得长期存 |
| 去重 + TTL | 防止「用户说过一次」变成永久噪声 |
| 用户可删除 | 合规与体验都要 |
| 定期淘汰 | 控制检索库规模 |

### 评测口径

- 单轮平均 token（压缩前后对比，报出降幅百分比）
- 长会话（20 轮后）任务完成率是否下降
- 记忆召准率、错误记忆引入率
- P95 延迟与单任务成本

### 讲法

> 最大成本不是模型，是每轮都把全部历史塞回去。我做了四层上下文 + 预检路由，简单问题不挂工具不查记忆，长会话用摘要压缩但保留「已排除方案」。压缩后单轮 token 降了约 X%，20 轮后完成率没有下降。

---

## 三个项目怎么选

| 你的目标岗位 | 优先做 | 原因 |
|---|---|---|
| 大模型应用 / RAG 方向 | 项目一 | 评测与溯源是最硬的通用能力 |
| Agent 平台 / 工程方向 | 项目二 | 状态、幂等、HITL 直接对口 |
| C 端 AI 产品方向 | 项目三 | 成本与体验权衡最直观 |

**做一个做透，胜过三个都跑通 Demo。** 每个项目都要能交出四样东西：架构图、评测集与回归报告、单任务成本分析、一条可回放的 trace。

## 简历里别这么写

| 别写 | 改写 |
|---|---|
| 「基于 LangChain 实现智能问答」 | 「建 50 条标注集做回归门禁，引用校验后正确拒答率 92%」 |
| 「使用多智能体提升效果」 | 「评估后保持单 Agent，因上下文/权限/吞吐瓶颈均不成立」 |
| 「优化了 Prompt，效果提升」 | 「Prompt 改动使评测集从 83% 降至 79%，已回滚」 |
| 「支持长期记忆」 | 「重要性打分 + TTL 淘汰，20 轮后完成率无下降」 |

## 验收点

- 任选一个项目，画出架构图并指出三处工程约束
- 每个数字都能说清口径（样本量、评测集还是线上、统计区间）
- 准备一个「被评测门禁拦下」的真实复盘

## 一手资料与延伸阅读

- [Shubhamsaboo / awesome-llm-apps（100+ 应用案例）](https://github.com/Shubhamsaboo/awesome-llm-apps)
- [NirDiamant / GenAI_Agents（50+ 教程与实现）](https://github.com/NirDiamant/GenAI_Agents)
- [patchy631 / ai-engineering-hub（真实 Agent 应用深度教程）](https://github.com/patchy631/ai-engineering-hub)
- [公众号：Ai Agent 实战项目，拿走直接用（30 个项目 / 10 个简历项目）](http://mp.weixin.qq.com/s?__biz=Mzk2OTAyODU1Mw==&mid=2247486348&idx=1&sn=95974b9544ff7e28b02304ee10e7053f)

下一步：[09 Agent 开发岗面试考点](./09-interview.md)
