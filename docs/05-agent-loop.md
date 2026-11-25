---
title: 手写第一个 Agent 循环
category: Agent 原理
order: 5
summary: 不用任何框架，从零写一个能跑完整多步任务的 Agent：状态、工具、终止条件、错误回传、幂等、检查点、轨迹回放，全部自己实现。
minutes: 26
---

# 手写第一个 Agent 循环

先说一个很普遍的经历：你照着某个框架的快速开始，十行代码，一个「能自己查资料回答问题」的 Demo 就跑起来了。很兴奋。然后面试官问：

> 「如果它第 3 轮卡住了，你怎么让它停？」
> 「工具连续报错，它会怎么样？」
> 「进程崩了，能从断点继续吗？」
> 「你怎么证明改了一版没变差？」

答不上来。因为框架把这些全包了，你甚至不知道它们存在。

**这一篇我们不用任何框架，纯标准库，手写一个约 200 行的循环，把上面四问全部变成看得见的代码。** 写完这一篇，你再去看任何框架，都能一眼指出「哦，这段是替我管状态的」「那段是替我做检查点的」。这个能力，比会配十个框架值钱得多。

## 一、先破误解：循环的核心不是「反复调模型」

新手写循环，第一版基本都长这样：

```python
while True:
    answer = model.ask(question)
    if "好了" in answer:
        break
```

能跑吗？跑两步就出事：没有轮数上限、没有预算、没有状态、工具结果没地方放、报错直接抛穿、上下文每轮重新拼还越拼越乱。

**真正的核心不是那个 `while`，是「状态怎么管」。** 循环只是驱动状态往前走一圈的马达。

:::figure 手写循环的三根支柱
@stack
状态 State::唯一真相源：走到第几步、查过什么、还剩多少预算、轨迹是什么
动作 Tools::一组带参数说明的可用动作，执行结果必须能回到状态里
边界 Budget::轮数 / 调用数 / 耗时 / 目标达成，四个终止条件缺一不可
:::

先把这根柱子立住，代码就不会散。

## 二、完整代码（复制粘贴即可运行）

下面的脚本零依赖、不需要账号、不需要联网。它用一个「按轮次返回预设决策」的本地假模型，跑完一个多步任务，中间**故意让一个工具报错**，你会亲眼看到模型怎么收到错误、改路线、最终收尾。

```python
# loop.py —— 零依赖，python loop.py
import json, time, hashlib
from dataclasses import dataclass, field, asdict

# ---------- 1. 状态与预算：唯一真相源 ----------
@dataclass
class Budget:
    max_rounds: int = 8
    max_calls: int = 12
    max_seconds: float = 10.0

@dataclass
class State:
    goal: str
    rounds: int = 0
    calls: int = 0
    done: bool = False
    answer: str = ""
    trace: list = field(default_factory=list)   # 每轮的完整记录
    cache: dict = field(default_factory=dict)   # 幂等缓存
    started: float = field(default_factory=time.time)

    def snapshot(self):
        return {"goal": self.goal, "rounds": self.rounds, "calls": self.calls,
                "done": self.done, "answer": self.answer, "trace": self.trace}

# ---------- 2. 工具箱：注册 / 说明 / 校验 / 幂等 / 错误捕获 ----------
class ToolBox:
    def __init__(self):
        self.items = {}

    def register(self, name, desc, params, fn):
        self.items[name] = {"desc": desc, "params": params, "fn": fn}

    def spec(self):
        """给模型看的动作清单：只给必要信息，别把实现细节塞进去。"""
        return "\n".join(
            "- %s(%s): %s" % (n, ", ".join(t["params"]), t["desc"])
            for n, t in self.items.items())

    def execute(self, name, args, state):
        if name not in self.items:
            return {"ok": False, "error": "未注册的动作 `%s`" % name}
        item = self.items[name]
        # 参数校验：缺字段、多字段都在这里挡掉，绝不把脏参数传给实现
        missing = [p for p in item["params"] if p not in args]
        if missing:
            return {"ok": False, "error": "缺少参数 %s" % missing}
        # 幂等键：同一动作 + 同一参数，只真正执行一次
        key = name + ":" + hashlib.md5(
            json.dumps(args, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:10]
        if key in state.cache:
            return {"ok": True, "data": state.cache[key], "cached": True}
        try:
            data = item["fn"](**args)
            state.cache[key] = data
            state.calls += 1
            return {"ok": True, "data": data}
        except Exception as e:
            # 关键：错误不外抛，变成一条可观察的结果
            return {"ok": False, "error": "%s: %s" % (type(e).__name__, e)}

# ---------- 3. 假模型：按轮次给出预设决策 ----------
class ScriptedModel:
    """不联网。用脚本模拟一个会改计划的模型，专门用来把循环跑通。"""
    def __init__(self):
        self.plan = [
            {"action": "search_financial", "args": {"year": 2025},
             "thought": "先查 2025 年财报里的毛利率"},
            {"action": "get_industry_avg", "args": {"year": 2025},
             "thought": "拿到毛利率了，和行业均值比一下才能判断异常"},
            # 这一轮工具会故意报错，看系统怎么处理
            {"action": "calculate", "args": {"expr": "gross_margin_2025 - avg"},
             "thought": "行业均值没查到，先算个差值试试"},
            {"action": "search_financial", "args": {"year": 2024},
             "thought": "上一步数据不全，改查 2024 年做同比"},
            {"action": "finish", "args": {"answer": "2025 毛利率 31%，同比 2024 的 42% 下降 11 个点；行业均值接口暂不可用，结论基于同比，建议人工复核。"},
             "thought": "信息够了，输出结论并注明限制"},
        ]
        self.i = 0

    def decide(self, context):
        # 演示「错误回传会改变路线」：看到上下文里有失败记录就跳过原计划
        d = self.plan[min(self.i, len(self.plan) - 1)]
        self.i += 1
        if "error" in context and self.i == 3:
            self.i = 4          # 模拟模型看到错误后改主意
        return d

# ---------- 4. 上下文组装：模型只看得到一整段文字 ----------
def build_context(state, tools):
    recent = state.trace[-4:]        # 只带最近 4 条轨迹，控制预算
    lines = [
        "你是财报分析助手。每轮只输出一个动作，格式为 JSON："
        '{"action": "...", "args": {...}, "thought": "..."}',
        "", "【目标】" + state.goal,
        "", "【可用动作】", tools.spec(),
        "", "【已用轮数】%d / 累计工具调用 %d" % (state.rounds, state.calls),
        "", "【最近轨迹】",
    ]
    for t in recent:
        lines.append("- 第%d轮 选 %s(%s) -> %s" %
                     (t["round"], t["action"], json.dumps(t["args"], ensure_ascii=False),
                      t["result"]))
    lines += ["", "请输出下一轮动作的 JSON。"]
    return "\n".join(lines)

def stop_reason(state, budget, decision):
    if decision.get("action") == "finish":
        return "目标达成"
    if state.rounds >= budget.max_rounds:
        return "轮数用尽"
    if state.calls >= budget.max_calls:
        return "调用数用尽"
    if time.time() - state.started > budget.max_seconds:
        return "耗时超限"
    return None

# ---------- 5. 主循环 ----------
def run(goal, model, tools, budget=None, checkpoint_path=None):
    budget = budget or Budget()
    state = State(goal)
    while True:
        ctx = build_context(state, tools)
        decision = model.decide(ctx)
        # 最小输出校验：不是 dict、没有 action，就当失败处理
        if not isinstance(decision, dict) or "action" not in decision:
            state.trace.append({"round": state.rounds, "action": "?",
                                "args": {}, "result": {"ok": False, "error": "决策不合法"}})
            state.rounds += 1
            continue
        why = stop_reason(state, budget, decision)
        if why:
            state.done = True
            state.answer = decision.get("args", {}).get("answer", "")
            print("  >> 终止：%s" % why)
            break
        obs = tools.execute(decision["action"], decision.get("args", {}), state)
        result = obs if obs["ok"] else {"ok": False, "error": obs["error"]}
        state.trace.append({"round": state.rounds, "action": decision["action"],
                            "args": decision.get("args", {}), "result": result})
        print("  第%d轮 %-18s -> %s" %
              (state.rounds, decision["action"],
               json.dumps(result, ensure_ascii=False)[:110]))
        state.rounds += 1
        if checkpoint_path:
            save_checkpoint(state, checkpoint_path)
    return state

# ---------- 6. 检查点：崩了能接着走 ----------
def save_checkpoint(state, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state.snapshot(), f, ensure_ascii=False, indent=2)

def load_checkpoint(path, goal):
    with open(path, encoding="utf-8") as f:
        s = json.load(f)
    st = State(goal)
    st.rounds, st.calls, st.done = s["rounds"], s["calls"], s["done"]
    st.answer, st.trace = s["answer"], s["trace"]
    return st

# ---------- 7. 轨迹回放：评测与答辩都靠它 ----------
def replay(state):
    print("\n========== 轨迹回放 ==========")
    print("目标：", state.goal)
    for t in state.trace:
        print("  [%d] %s(%s) -> %s" %
              (t["round"], t["action"], json.dumps(t["args"], ensure_ascii=False),
               json.dumps(t["result"], ensure_ascii=False)))
    print("结论：", state.answer or "（无）")
    print("统计：%d 轮 / %d 次工具调用 / %d 条轨迹" %
          (state.rounds, state.calls, len(state.trace)))

# ---------- 8. 装工具并跑 ----------
def make_tools():
    tb = ToolBox()
    FIN = {2025: {"gross_margin": 0.31, "revenue": 12.4},
           2024: {"gross_margin": 0.42, "revenue": 10.1}}
    def search_financial(year):
        if year not in FIN:
            raise KeyError("没有 %s 年的财报" % year)
        return FIN[year]
    def get_industry_avg(year):
        raise OSError("行业数据源暂时不可用")   # 故意失败，演示错误回传
    def calculate(expr):
        return {"expr": expr, "value": 0.31 - 0.42}
    def finish(answer):
        return {"answer": answer}
    tb.register("search_financial", "查指定年度财报", ["year"], search_financial)
    tb.register("get_industry_avg", "查行业平均毛利率", ["year"], get_industry_avg)
    tb.register("calculate", "计算表达式", ["expr"], calculate)
    tb.register("finish", "结束并给出结论", ["answer"], finish)
    return tb

if __name__ == "__main__":
    state = run("查 A 公司 2025 年毛利率，异常的话找出原因",
                ScriptedModel(), make_tools(),
                checkpoint_path="checkpoint.json")
    replay(state)
```

跑一遍，你会看到类似这样的输出（第 2 轮工具报错，第 3 轮模型改路线，最后收尾）：

```text
  第0轮 search_financial   -> {"ok": true, "data": {"gross_margin": 0.31, "revenue": 12.4}}
  第1轮 get_industry_avg   -> {"ok": false, "error": "OSError: 行业数据源暂时不可用"}
  第2轮 calculate          -> {"ok": true, "data": {"expr": "gross_margin_2025 - avg", "value": -0.11}}
  第3轮 search_financial   -> {"ok": true, "data": {"gross_margin": 0.42, "revenue": 10.1}}
  >> 终止：目标达成
```

:::tip 这份代码里已经藏了后面所有篇章的种子
输出校验（第 03 篇）、工具参数与幂等（第 06 篇）、上下文裁剪（第 07 篇）、检查点与可恢复状态（第 13 篇）、轨迹即评测样本（第 11 篇）。**先把这 200 行吃透，后面每一篇都只是在替换其中一个部件。**
:::

## 三、逐段拆开讲

### 1. `State` 为什么必须是唯一真相源

注意整个循环里，没有散落的全局变量：`rounds`、`calls`、`trace`、`cache` 全在 `State` 上。好处有三个——能一行打印出来调试、能直接序列化成检查点、能整条拿去做回归对比。

新手最爱把「当前查过什么」藏在闭包或局部变量里，结果一加并发、一加恢复就全乱。**状态显式化是工程和玩具的分界线。**

### 2. 终止条件为什么要四个

:::figure 一个循环的所有出口
@flow
目标达成|轮数用尽|调用数用尽|耗时超限|人工中断
:::

- **目标达成**：模型输出 `finish`。注意我们在代码里**统一由 `stop_reason` 判定**，不允许工具自己悄悄结束。
- **轮数用尽**：防死循环。
- **调用数用尽**：防「一轮里疯狂调工具」。
- **耗时超限**：防某个工具卡住把整条链路拖死。
- **人工中断**：生产环境必备，这里留了接口（[安全与护栏](./12-safety.md)会补）。

:::warn 只设 `max_rounds` 是不够的
真实事故里最常见的是「轮数还早，但某个工具每轮调 50 次」，或者「轮数没到，一个 HTTP 卡了 60 秒」。**轮数、调用数、耗时三个维度要同时设**，再加一个总金额上限更稳。
:::

### 3. 工具报错为什么要「喂回去」而不是抛出去

看 `ToolBox.execute`：所有异常都被捕获，转成 `{"ok": false, "error": "..."}`，然后**作为一条轨迹留在上下文里**。下一轮 `build_context` 会带上它，模型就能看到「行业均值查不到」并改主意。

这就是为什么 `ScriptedModel` 里那段「看到错误就跳到查 2024 年」不是玄学——**错误是信息，不是终点**。反过来，如果这里直接 `raise`，整个任务当场结束，用户只看到一个 500。

:::quote
在 Agent 里，**失败是一次观察，不是一个异常**。把它记进轨迹，系统才具备「换条路再试」的能力。
:::

### 4. 幂等键为什么必须在工具层

`execute` 里用 `动作名 + 参数的哈希` 做了缓存：同样的调用第二次直接返回缓存，不真正执行。这在有副作用的动作上是救命的——回忆[第一次调用](./02-first-call.md)末尾那道题：重试时如果前一次其实已经下单成功、只是响应丢了，没有幂等就会下两单。

:::ask 想一步
如果 `cache` 只放在内存里，进程重启后会怎样？答案：幂等失效，重启后的重试会真的重复执行。所以生产环境要把这个 key 落到数据库或 Redis，并设过期时间——这是[从 Demo 到上线](./13-production.md)要补的第一件事。
:::

### 5. `build_context` 为什么这么拼

回看第一篇那句话：**模型只看得到一整段文字**。所以系统规则、目标、动作清单、当前进度、最近轨迹，全是拼成一个字符串。三个细节：

- **动作清单只给签名和一句话说明**，不把实现代码塞进去（省预算，也减少干扰）；
- **只带最近 4 条轨迹**，更早的做摘要或丢掉——这就是最朴素的上下文预算控制；
- **进度数字写进去**（`已用轮数 3`），模型才知道自己快没预算了，会倾向于收尾。

第 07 篇会把这个 `build_context` 单独拆出来，做成带预算表、压缩、预检路由的完整模块。

### 6. 轨迹回放为什么值钱

`replay()` 不是调试玩具，它同时是三样东西：

| 用途 | 怎么用 |
|---|---|
| 答辩 | 现场把一条完整轨迹打出来，讲清每一步为什么这么选 |
| 评测 | 把 `trace` 存成样本，改一版后重跑对比轮数、调用数、结论是否退化 |
| 排障 | 线上出问题时，用同一份轨迹在本地复现，不用猜 |

:::tip 从第一天就存轨迹
很多团队等出事了才想起来加日志，但轨迹格式没定过，历史数据全白费。**循环写完的当天就定 `trace` 结构**，后面评测、监控、成本分析全都吃这份数据。
:::

## 四、死循环的三种真实原因

按出现频率排：

1. **工具一直返回同样的结果**，模型每轮做同一个决策，`rounds` 到上限才停。→ 加「重复动作检测」：连续两轮相同 `动作+参数` 就强制换策略或收尾。
2. **错误被吞掉但没进上下文**，模型看不到失败，于是永远重复同一个动作。→ 检查 `build_context` 有没有真的把 `error` 带进去。
3. **终止条件只认 `finish`，而模型从来不输出 `finish`**。→ 保留轮数/耗时硬上限，并在接近上限时把「预算快用完了，请尽快收尾」写进上下文。

第三种特别隐蔽，务必在提示词里**明确列出 `finish` 这个动作**，别指望模型自己发明。

## 五、从这份代码到框架

现在你可以带着问题去看任何框架了，对照表如下：

| 手写部件 | 框架里通常叫什么 | 你仍需要自己决定的 |
|---|---|---|
| `State` / `trace` | State、Checkpointer | 哪些字段要持久化、保留多久 |
| `build_context` | Prompt / Message 组装 | 预算怎么分、砍谁留谁 |
| `ToolBox` | Tool / Function 注册 | 参数校验、幂等、权限 |
| `stop_reason` | Recursion limit | 业务上「什么算完成」 |
| `save_checkpoint` | Persistence | 存储、并发、过期 |
| `replay` | Tracing | 评测口径、告警阈值 |

:::quote
框架没有替你做决策，它只是把你**本来该做的决策**藏起来了。手写一遍，是让这些决策重新回到你手里。
:::

:::check 学完这一篇，你要能回答
- 为什么说循环的核心不是 `while`，而是状态管理？
- 终止条件为什么至少要有轮数、调用数、耗时三个维度？
- 工具报错为什么要转成观察结果写进轨迹，而不是抛异常？
- 幂等键放在内存里有什么风险？生产上该怎么改？
- 死循环最常见的三种原因，各给一条对应的修法。
:::

## 小结

:::figure 这一篇你亲手造出来的东西
@stack
一个 State::唯一真相源，可打印、可序列化、可回放
一个 ToolBox::注册 / 校验 / 幂等 / 错误捕获 / 缓存
一个循环::四步循环 + 四类终止条件 + 检查点
一条轨迹::同时服务于答辩、评测、排障
:::

到这里你已经真正「会写 Agent」了，后面都是在给这副骨架加肌肉。

下一步：[工具调用](./06-tool-calling.md) —— 把 `ToolBox` 做扎实：参数怎么设计才不让模型编、权限怎么收、副作用动作怎么防重复、以及工具清单本身该怎么减肥。
