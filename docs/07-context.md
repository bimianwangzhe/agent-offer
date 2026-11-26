---
title: 上下文工程：Agent 真正的命门
category: 上下文工程
order: 207
summary: 「聊了二十轮突然变笨」的完整解法：一张预算表、四层结构、三种压缩策略、预检路由与前缀缓存。
minutes: 24
---

# 上下文工程：Agent 真正的命门

先描述一个几乎人人都会遇到的现象：

Demo 的时候很聪明，问什么答什么。上线之后用户连着聊了二十轮，系统开始变慢、答非所问、把前面说过的事忘了，账单还翻了几倍。运维看了一圈：模型没换、代码没改、服务没挂。

**不是模型退化了，是你把上下文当成了一个无限容器。**

第一篇讲过机制：模型每猜一个词，都要把前面**所有文字**重新读一遍。上下文就是它这一眼能看到的东西。塞得越多，越贵越慢，注意力也被摊薄——当前问题被挤到一大段旧记录的中间，权重自然下降。

:::quote
上下文不是「聊天记录」，是**每轮都要重新组装的一份有限预算的输入**。「工程」两个字，指的就是把它当资源来管。
:::

## 一、先破误解：别指望「窗口变大」解决问题

每次上下文不够用，第一反应都是「换个窗口更大的模型」。这能缓解，但解决不了根子：

- 窗口越大，**每轮单价越贵**，成本是线性涨的；
- 窗口越大，**注意力越稀**，长文档中间的内容更容易被忽略（俗称「中间遗失」）；
- 更麻烦的是，很多内容根本**不该带**：上一轮的工具原始返回、三页前的失败尝试、和当前问题无关的历史分支。

所以正确顺序是：**先做预算和裁剪，再考虑换模型**。

## 二、一张预算表，把上下文管起来

别再「想到什么拼什么」。开工前先把额度分好，像做数据库容量规划一样：

:::figure 一次调用的上下文预算分配（示例：8000 单位）
@stack
系统规则 800::固定不变，每轮必带，写清边界与输出格式
工具清单 600::只带本轮相关的，不相关的一组都不给
结构化状态 400::目标 / 轮数 / 已完成步骤 / 待办，用紧凑格式
历史摘要 1200::早期对话压成几句话，不保留原文
最近轨迹 2400::最近 4~6 轮完整保留，含工具结果
当前输入 1600::用户这一轮的问题 + 本轮检索到的材料
留给输出 1000::别把额度吃光，否则输出会被硬截断
:::

注意最后一格：**输出也要占额度**。很多人把输入塞满，结果 `finish == "length"`，答案被拦腰砍断——这正是[第一次调用](./02-first-call.md)里那个警告。

:::tip 一条立刻见效的规则
工具返回的原始内容**永远不整段进上下文**。先裁剪成结构化摘要（保留关键字段 + 一个「已截断，共 N 条」的提示），原始大对象落在轨迹存储里，需要时再按 id 取。这一条通常能省掉一半以上的开销。
:::

## 三、四层结构：哪些永远带，哪些可以扔

把上下文按「生命周期」分层，裁剪时才知道先砍谁：

| 层 | 内容 | 每轮 | 裁剪策略 |
|---|---|---|---|
| L0 固定层 | 身份、边界、输出格式 | 必带 | 永不裁剪，尽量写短写死 |
| L1 状态层 | 目标、轮数、已完成/待办、预算余量 | 必带 | 结构化紧凑表示，别用自然语言铺陈 |
| L2 近期层 | 最近 4~6 轮完整轨迹 | 必带 | 按轮数窗口滚动 |
| L3 素材层 | 检索材料、工具原始返回、早期对话 | 按需 | 先摘要，再截断，最后丢弃 |

:::warn 最容易犯的错
把 L3 的大段原文放在最前面、把用户当前问题埋在中间。**顺序也影响效果**：L0 打头定调，当前问题放末尾（离模型最近，权重最高），早期历史压成摘要夹在中间。
:::

## 四、把 ContextBuilder 写出来

下面这份零依赖实现，把预算、分层、压缩、预检路由、前缀缓存全做进去，可直接跑。

```python
# context.py —— 零依赖，python context.py
import json, hashlib

BUDGET = {"system": 800, "tools": 600, "state": 400,
          "summary": 1200, "recent": 2400, "input": 1600, "reserve": 1000}
TOTAL = 8000

def rough(s):
    """粗略估算：中文按字、英文按词折半。真实项目换成计费器给的准确值。"""
    return int(len(s) * 0.8)

class ContextBuilder:
    def __init__(self, system, tool_groups):
        self.system = system
        self.tool_groups = tool_groups      # {"订单组": [...], "日志组": [...]}
        self.cache = {}

    # ---- 预检路由：先判断本轮该带哪组工具 ----
    def route(self, text):
        if any(k in text for k in ("订单", "退款", "物流")):
            return "订单组"
        if any(k in text for k in ("日志", "报错", "超时")):
            return "日志组"
        if any(k in text for k in ("制度", "年假", "报销")):
            return "制度组"
        return "通用组"

    # ---- 压缩策略一：早期轨迹压成摘要 ----
    @staticmethod
    def summarize(trace):
        if not trace:
            return ""
        acts = [t["action"] for t in trace]
        errors = [t for t in trace if isinstance(t.get("result"), dict)
                  and not t["result"].get("ok", True)]
        return ("此前共 %d 轮，依次执行 %s；其中 %d 次失败%s。" %
                (len(trace), " → ".join(acts[:8]) + ("…" if len(acts) > 8 else ""),
                 len(errors),
                 "（最近失败：" + errors[-1]["result"].get("error", "")[:40] + "）"
                 if errors else ""))

    # ---- 压缩策略二：工具结果裁剪 ----
    @staticmethod
    def trim_result(r, limit=260):
        s = json.dumps(r, ensure_ascii=False)
        if len(s) <= limit:
            return s
        return s[:limit] + "…[已截断，原始结果存于 trace]"

    # ---- 压缩策略三：按预算硬截断 ----
    @staticmethod
    def fit(text, quota, label):
        if rough(text) <= quota:
            return text, False
        cut = int(quota / 0.8)
        return text[:cut] + "\n…[%s 超预算已截断]" % label, True

    def build(self, state, user_input, recent_window=5):
        group = self.route(user_input)
        tools = self.tool_groups.get(group, self.tool_groups.get("通用组", []))
        recent, old = state["trace"][-recent_window:], state["trace"][:-recent_window]

        parts, report = [], []
        # L0
        t, cut = self.fit(self.system, BUDGET["system"], "系统规则")
        parts.append("【规则】\n" + t); report.append(("system", rough(t), cut))
        # 工具清单：只带路由后的这一组
        spec = "\n".join("- " + x for x in tools)
        t, cut = self.fit(spec, BUDGET["tools"], "工具清单")
        parts.append("\n【本轮可用动作 · %s】\n%s" % (group, t))
        report.append(("tools", rough(t), cut))
        # L1 结构化状态（紧凑格式，不用自然语言）
        st = ("目标=%s | 轮数=%d | 已完成=%s | 待办=%s | 剩余预算=%d" %
              (state["goal"], state["rounds"],
               ",".join(state.get("done_steps", [])) or "无",
               ",".join(state.get("todo", [])) or "无",
               TOTAL - sum(x[1] for x in report)))
        parts.append("\n【状态】" + st); report.append(("state", rough(st), False))
        # L3 早期历史 -> 摘要
        s = self.summarize(old)
        t, cut = self.fit(s, BUDGET["summary"], "历史摘要")
        if t: parts.append("\n【此前进展】" + t)
        report.append(("summary", rough(t), cut))
        # L2 最近轨迹
        rec = "\n".join("[%d] %s(%s) -> %s" %
                        (x["round"], x["action"],
                         json.dumps(x["args"], ensure_ascii=False),
                         self.trim_result(x["result"])) for x in recent)
        t, cut = self.fit(rec, BUDGET["recent"], "近期轨迹")
        parts.append("\n【最近 %d 轮】\n%s" % (len(recent), t))
        report.append(("recent", rough(t), cut))
        # 当前输入放最后
        t, cut = self.fit("【材料】\n" + state.get("material", "无") +
                          "\n\n【本轮问题】" + user_input,
                          BUDGET["input"], "当前输入")
        parts.append("\n" + t); report.append(("input", rough(t), cut))

        used = sum(x[1] for x in report)
        # 前缀缓存：规则 + 工具清单这一截几乎不变，可复用
        prefix = parts[0] + parts[1]
        pk = hashlib.md5(prefix.encode()).hexdigest()[:10]
        cached = pk in self.cache
        self.cache[pk] = True
        return {"text": "\n".join(parts), "used": used, "left": TOTAL - used,
                "group": group, "truncated": any(x[2] for x in report),
                "prefix_cached": cached, "report": report}

if __name__ == "__main__":
    SYSTEM = "你是内部助手。只依据材料回答；材料不足时说明缺什么；输出 JSON，字段 answer/citations/need_clarify。"
    GROUPS = {
        "订单组": ["search_order_by_id(order_id)", "create_refund_request(order_id,reason)"],
        "日志组": ["query_logs(level,minutes)", "get_trace(trace_id)"],
        "制度组": ["read_policy_section(section_id)", "check_policy_version(year)"],
        "通用组": ["finish(answer)"],
    }
    cb = ContextBuilder(SYSTEM, GROUPS)
    trace = []
    for i in range(24):
        trace.append({"round": i, "action": "read_policy_section",
                      "args": {"section_id": i % 5 + 1},
                      "result": {"ok": i % 7 != 0,
                                 "text": "第%d段制度原文" % (i % 5 + 1) * 40,
                                 "error": "数据源超时"}})
    state = {"goal": "确认年假能否折现", "rounds": 24, "trace": trace,
             "done_steps": ["确认用户身份"], "todo": ["核对版本", "给出结论"],
             "material": "[1] 2026 版：不折现\n[2] 2025 版：可折现"}
    ctx = cb.build(state, "我去年没休的年假能折现吗？")
    print("路由到：", ctx["group"])
    print("已用额度：%d / %d，剩余：%d，发生截断：%s，前缀命中缓存：%s" %
          (ctx["used"], TOTAL, ctx["left"], ctx["truncated"], ctx["prefix_cached"]))
    print("\n--- 组装结果（前 900 字）---")
    print(ctx["text"][:900])
    print("\n--- 各层占用 ---")
    for name, n, cut in ctx["report"]:
        print("  %-9s %5d  %s" % (name, n, "截断" if cut else ""))
```

跑完你会看到：24 轮历史被压成一句摘要，只剩最近 5 轮完整保留；工具清单只带「制度组」两条而不是全部；总用量稳稳落在预算内；系统规则和工具清单这一段前缀被标记为可缓存。

## 五、三种压缩策略，什么时候用哪个

:::figure 上下文不够时的决策顺序
@flow
先减数量|再压早期历史|再裁工具结果|最后才换大窗口模型
:::

| 策略 | 做法 | 适用 | 代价 |
|---|---|---|---|
| **丢弃** | 早期轮次、无关分支直接不带 | 事实已被后续步骤覆盖 | 可能丢掉「为什么当初这么选」 |
| **摘要** | 把 N 轮压成一句结构化进展 | 长对话、多步任务 | 摘要本身也可能漏关键信息 |
| **结构化状态** | 用 `已完成 / 待办 / 关键结论` 代替原始对话 | 最推荐 | 需要一开始就设计状态字段 |

:::tip 结构化状态是三者里最值钱的
因为它**不丢信息，只换表示**。原文里「我查了 2025 版，发现写的是可折现，但用户问的是今年，所以又查了 2026 版」压成状态就是 `版本核对=已完成(2026生效)`。信息还在，字数少了十倍。这也是为什么[手写循环](./05-agent-loop.md)里我们坚持把 `State` 显式化——它同时就是最好的压缩素材。
:::

## 六、怎么发现「压过头了」

压缩必然有损，关键是能发现。三个信号：

- **模型开始重复做已经做过的事**（又查了一遍 2025 版）→ 摘要里没写清「已完成」；
- **结论和前文矛盾** → 关键事实被裁掉了；
- **`need_clarify` 突然变多** → 上下文里缺了必要前提。

应对不是把原文全塞回去，而是**补结构化状态字段**：把「已完成」「已确认的事实」「当前生效的版本」明确写进 L1。这三个字段通常在项目第一周就该定好。

:::ask 想一个边界
如果一份材料有 5 万字，用户问的问题只需要其中第 37 页的一段——你会整份塞进上下文吗？正确答案当然是不会，但「怎么自动找到那一段」就是下一篇的主题。
:::

## 七、两个进阶动作

**预检路由**：示例里的 `route()` 用关键词做了最朴素的意图判断，本轮只带相关工具组。生产上可以用一次轻量调用来做，但**别为了路由再花一次大调用**，得不偿失。它同时解决[工具调用](./06-tool-calling.md)里「40 个工具塞满上下文」的问题。

**前缀缓存**：L0 规则 + 工具清单每轮几乎不变。很多服务对相同前缀有复用折扣，所以**把稳定内容放最前面、易变内容放后面**，不只是为了效果，也是为了省钱。这也是为什么调整顺序时不能把系统规则挪来挪去。

## 八、成本与效果的平衡

最后给一张自检表，上线前逐条过：

- [ ] 有没有一张写明额度的预算表，而不是「拼到能用为止」
- [ ] 工具结果是不是先裁剪再入上下文
- [ ] 早期历史是不是压成了摘要或结构化状态
- [ ] 当前问题是不是放在最后
- [ ] 输出额度是不是留出来了（防 `finish == "length"`）
- [ ] 稳定前缀是不是固定在最前（可缓存）
- [ ] 有没有监控「每轮用量」「截断次数」「重复动作次数」三个指标

:::quote
**提示词决定下限，上下文决定上限。** 同一个模型，上下文管得好与不好，线上表现能差出一个档次——而这完全不花钱，只花设计。
:::

:::check 学完这一篇，你要能回答
- 「聊了二十轮变笨」的三个原因分别是什么？为什么换大窗口模型治不了根？
- 四层结构里哪一层永不裁剪？当前问题为什么放最后？
- 三种压缩策略各有什么代价？为什么最推荐结构化状态？
- 模型开始重复做已经做过的事，说明哪一层出了问题？
- 为什么稳定的系统规则要固定在最前面？
:::

## 小结

:::figure 这一篇的产物
@stack
一张预算表::把上下文当有限资源，连输出额度都预留
一个 Builder::分层 + 路由 + 摘要 + 裁剪 + 前缀缓存
三个指标::每轮用量 / 截断次数 / 重复动作次数
一句判断::提示词决定下限，上下文决定上限
:::

上下文管住了，系统才敢接真实数据。下一篇解决上一节那道题：**5 万字材料里，怎么自动找到该给模型看的那一段，并且让答案带得出出处**。

下一步：[检索增强](./08-rag.md) —— 不背概念，从「为什么直接把文档塞进去必然失败」开始，手写一个带切分、混合检索、重排、溯源与拒答的完整模块。
