---
title: 工具调用：让文字安全地碰到真实世界
category: 核心
order: 6
summary: 工具不是「函数列表」，是一份契约。参数怎么设计才不让模型编、权限怎么收、副作用怎么防重复、工具清单怎么减肥。
minutes: 22
---

# 工具调用：让文字安全地碰到真实世界

先看一个真实到让人心疼的线上事故：

模型决定调用「查询订单」，参数是 `{"order_id": "ORD-2026-8891", "status": "已退款"}`。你的代码里根本没有 `status` 这个参数，但因为用了 `**kwargs` 一把塞进去，查询函数把它忽略掉了；接着模型根据「已退款」这个自己编出来的值生成了回复，用户被告知订单已退款——**实际上并没有**。

事故的根因不是模型笨，是**你把工具当成了「一堆函数」，而没把它当成「一份契约」**。

## 一、先破误解：工具说明是写给人看的？不，是写给模型看的

上一篇的 `ToolBox.spec()` 只是把函数名和参数名拼成一行字。到了真实项目，这行字是模型**唯一的依据**——它看不到你的实现、看不到数据库表结构、看不到注释。

于是有个反直觉但极其重要的结论：

:::quote
**工具描述不是文档，是提示词的一部分。** 描述写得含糊，模型就会用自己的想象补全；补全出来的参数，就是参数幻觉。
:::

:::figure 一次工具调用的完整链路
@flow
模型选动作|参数校验|权限判定|幂等检查|真正执行|结果裁剪|写回上下文
:::

注意中间那四格（校验、权限、幂等、裁剪）——**它们才是工具层的主体**，真正执行业务逻辑往往只有一行。新手把 90% 精力花在最后那一格，线上出事全在前面四格。

## 二、工具设计的四条原则

### 原则 1：名字用「动词 + 对象」，别用抽象名词

- ❌ `data`、`process`、`handle_query`
- ✅ `search_order_by_id`、`read_contract_section`、`send_refund_email`

原因很直接：模型是在「接着往下写」，一个动词明确的名字会把续写方向钉死。抽象名词给了它太大发挥空间。

### 原则 2：参数收窄到「能枚举就别放开」

对比两种写法：

```text
❌ query_logs(condition: str)                      # 模型会编出任意字符串
✅ query_logs(level: "info"|"warn"|"error", minutes: 1..1440, limit: 1..50)
```

后者把自由度关进了笼子。哪怕模型想编，也编不出合法范围外的东西，校验层一挡就回去了。

:::tip 一个立刻能用的技巧
把「时间范围」「状态」「排序方式」这类字段全部改成**枚举**，别让模型自由生成 SQL 或筛选表达式。想灵活，就多给几个枚举值，而不是放开成字符串。
:::

### 原则 3：描述里写清「什么时候**不要**用它」

这是最容易被漏掉、却最有效的一条。模型乱调工具，很多时候不是不会用，是**分不清两个工具的边界**。

```text
search_order_by_id：按订单号精确查单笔订单。
  适用：用户给了明确订单号。
  不要用：用户只给了时间范围或商品名 -> 用 search_orders_by_filter。
  不要用：需要退款操作 -> 用 create_refund_request。
```

### 原则 4：返回结构固定，且必须能放进上下文

工具返回一大坨 JSON、或者把整份数据库记录原样吐回来，会当场把上下文撑爆。返回结构要**预先定死、字段精简、带截断标记**：

```python
{"ok": true, "data": {...}, "truncated": false, "hint": "共 128 条，已返回前 5 条"}
```

:::warn 工具返回也必须做预算
很多人只算「提示词 + 历史」的 token，忘了工具结果是拼进上下文的。一次检索返回 3 万字，比前面聊十轮还贵。第 07 篇会把这件事做成一张显式的预算表。
:::

## 三、把 ToolBox 升级成契约层

下面是上一篇 `ToolBox` 的生产级版本，依然是零依赖、可直接跑。新增了四件事：**Schema 校验、权限等级、幂等落盘、危险动作二次确认**。

```python
# tools.py —— 零依赖，python tools.py
import json, hashlib, os
from dataclasses import dataclass

class ParamError(Exception):
    pass

class PermissionError_(Exception):
    pass

@dataclass
class Param:
    name: str
    typ: str                 # "str" | "int" | "enum" | "list[str]"
    required: bool = True
    allowed: tuple = ()      # enum 用
    lo: float = None         # int 下界
    hi: float = None         # int 上界
    max_len: int = 200       # str / list 长度上限

    def check(self, v):
        if self.typ == "str":
            if not isinstance(v, str): raise ParamError("%s 应为字符串" % self.name)
            if len(v) > self.max_len: raise ParamError("%s 超长（>%d）" % (self.name, self.max_len))
        elif self.typ == "int":
            if isinstance(v, bool) or not isinstance(v, int):
                raise ParamError("%s 应为整数" % self.name)
            if self.lo is not None and v < self.lo: raise ParamError("%s 小于下界" % self.name)
            if self.hi is not None and v > self.hi: raise ParamError("%s 大于上界" % self.name)
        elif self.typ == "enum":
            if v not in self.allowed: raise ParamError("%s 取值 %r 不在 %r" % (self.name, v, self.allowed))
        elif self.typ == "list[str]":
            if not isinstance(v, list) or not all(isinstance(i, str) for i in v):
                raise ParamError("%s 应为字符串列表" % self.name)
            if len(v) > self.max_len: raise ParamError("%s 列表过长" % self.name)

class Tool:
    LEVELS = {"read": 0, "write": 1, "danger": 2}

    def __init__(self, name, desc, params, fn, level="read", needs_confirm=False):
        self.name, self.desc, self.params = name, desc, params
        self.fn, self.level, self.needs_confirm = fn, level, needs_confirm

    def spec(self):
        ps = []
        for p in self.params:
            if p.typ == "enum":
                t = "枚举:" + "/".join(map(str, p.allowed))
            elif p.typ == "int":
                t = "整数:%s~%s" % (p.lo, p.hi)
            else:
                t = p.typ
            ps.append("%s(%s%s)" % (p.name, t, "" if p.required else ",可选"))
        return "- %s(%s): %s" % (self.name, ", ".join(ps), self.desc)

class ToolBox:
    def __init__(self, role="viewer", idem_path="idem.json"):
        self.tools = {}
        self.role = role
        self.role_level = {"viewer": 0, "operator": 1, "admin": 2}[role]
        self.idem_path = idem_path
        self.idem = self._load_idem()
        self.audit = []

    def _load_idem(self):
        if os.path.exists(self.idem_path):
            with open(self.idem_path, encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _save_idem(self):
        with open(self.idem_path, "w", encoding="utf-8") as f:
            json.dump(self.idem, f, ensure_ascii=False)

    def register(self, tool):
        self.tools[tool.name] = tool

    def spec(self):
        return "\n".join(t.spec() for t in self.tools.values())

    def execute(self, name, args, confirm=False):
        t = self.tools.get(name)
        if not t:
            return {"ok": False, "error": "未注册的动作 `%s`；可用：%s" %
                    (name, ", ".join(self.tools))}
        # 1) 参数校验：缺字段 / 多字段 / 类型 / 范围，一次挡掉
        try:
            known = {p.name for p in t.params}
            extra = set(args) - known
            if extra:
                raise ParamError("多余参数 %s（会被模型编出来，必须拒绝）" % sorted(extra))
            for p in t.params:
                if p.name not in args:
                    if p.required: raise ParamError("缺少必填参数 `%s`" % p.name)
                else:
                    p.check(args[p.name])
        except ParamError as e:
            return {"ok": False, "error": "参数校验失败: %s" % e}

        # 2) 权限判定
        if Tool.LEVELS[t.level] > self.role_level:
            return {"ok": False, "error": "权限不足：当前角色 %s 不能执行 %s(%s)" %
                    (self.role, t.level, name)}

        # 3) 危险动作二次确认
        if t.needs_confirm and not confirm:
            return {"ok": False, "need_confirm": True,
                    "error": "该动作有副作用，需要人工确认后重发（confirm=True）"}

        # 4) 幂等：落盘，重启后仍然有效
        key = name + ":" + hashlib.md5(
            json.dumps(args, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]
        if key in self.idem:
            self.audit.append({"action": name, "cached": True})
            return {"ok": True, "data": self.idem[key], "cached": True}

        # 5) 真正执行 + 6) 结果裁剪 + 7) 审计
        try:
            raw = t.fn(**args)
            data, truncated = self._trim(raw)
            self.idem[key] = data
            self._save_idem()
            self.audit.append({"action": name, "args": args, "cached": False})
            return {"ok": True, "data": data, "truncated": truncated}
        except Exception as e:
            return {"ok": False, "error": "%s: %s" % (type(e).__name__, e)}

    def _trim(self, raw, limit=800):
        s = json.dumps(raw, ensure_ascii=False) if not isinstance(raw, str) else raw
        if len(s) <= limit:
            return (raw if isinstance(raw, str) else raw), False
        return s[:limit] + "…（已截断）", True

# ---------- 装几个工具，逐个试 ----------
def build():
    tb = ToolBox(role="operator")
    tb.register(Tool(
        "query_logs", "查最近日志。适用：排查报错。不要用：查订单 / 查制度。",
        [Param("level", "enum", allowed=("info", "warn", "error")),
         Param("minutes", "int", lo=1, hi=1440),
         Param("limit", "int", lo=1, hi=50, required=False)],
        lambda level, minutes, limit=10: {"level": level, "lines": ["..."] * limit},
        level="read"))
    tb.register(Tool(
        "search_order_by_id", "按订单号精确查单笔订单。适用：用户给了订单号。",
        [Param("order_id", "str", max_len=32)],
        lambda order_id: {"order_id": order_id, "status": "已支付", "amount": 29900},
        level="read"))
    tb.register(Tool(
        "create_refund_request", "发起退款申请，有副作用。必须人工确认。",
        [Param("order_id", "str", max_len=32),
         Param("reason", "str", max_len=100)],
        lambda order_id, reason: {"ticket": "RF-" + order_id[-6:], "reason": reason},
        level="write", needs_confirm=True))
    tb.register(Tool(
        "drop_table", "删除整张表，极度危险。",
        [Param("table", "str", max_len=32)],
        lambda table: {"dropped": table},
        level="danger", needs_confirm=True))
    return tb

if __name__ == "__main__":
    tb = build()
    print("== 给模型看的动作清单 ==")
    print(tb.spec())
    print("\n== 六个用例 ==")
    cases = [
        ("query_logs", {"level": "error", "minutes": 30}),
        ("query_logs", {"level": "debug", "minutes": 30}),          # 枚举外
        ("query_logs", {"level": "error", "minutes": 99999}),       # 越界
        ("search_order_by_id", {"order_id": "ORD-1", "status": "已退款"}),  # 编参数
        ("create_refund_request", {"order_id": "ORD-1", "reason": "重复扣款"}),
        ("create_refund_request", {"order_id": "ORD-1", "reason": "重复扣款"}, True),
    ]
    for c in cases:
        name, args = c[0], c[1]
        confirm = c[2] if len(c) > 2 else False
        r = tb.execute(name, args, confirm=confirm)
        print("  %-24s -> %s" % (name, json.dumps(r, ensure_ascii=False)[:150]))
    print("\n== 审计日志 ==")
    print(json.dumps(tb.audit, ensure_ascii=False))
```

跑完重点看第 4 个用例：模型编出来的 `status` 被 `extra` 检查当场拒绝，并返回「可用动作列表」帮它下次选对。这就是开篇那个事故的修法。

## 四、参数幻觉的三个来源

| 来源 | 表现 | 对策 |
|---|---|---|
| 描述含糊 | 自己补出 `status`、`page_size` 等不存在的字段 | 描述写清字段清单 + 「不要用」；拒绝多余参数 |
| 枚举放开成字符串 | 编出 `"debug"`、`"全部"` 这类值 | 改枚举，校验层硬挡 |
| 上下文里有过期的工具说明 | 用了上一版的字段名 | 每轮从**代码**生成 spec，不要手写死在提示词里 |

:::tip 最重要的一条
`spec()` 必须由 `ToolBox` 自动生成，**绝不手抄进提示词**。手抄一定会和代码漂移，漂移之后模型按旧说明调，校验层天天报错，你还以为是模型不稳。
:::

## 五、副作用分级：不是所有工具都该一视同仁

把动作按「改不改真实世界」分三级，权限和确认策略完全不同：

:::figure 三级副作用与对应管控
@stack
① 只读::查库、读文件、检索 → 任何角色可调用，出错无非重试
② 写入::发消息、建工单、改状态 → 需要 operator 权限 + 幂等键 + 审计
③ 危险::删除、转账、批量操作 → admin + 二次确认 + 单人单次上限 + 可回滚
:::

三条硬规则：

1. **默认最小权限**：Agent 跑在 `viewer` 还是 `admin` 下，决定了出事时的最大损失面。别图方便全程给高权限。
2. **写操作一律带幂等键**，且**落盘**（示例里的 `idem.json`），否则重启就失效。
3. **危险动作不要交给模型自主决定**，做成「模型只能提出建议，人工点确认才执行」。

:::quote
模型可以提议做任何事，但**只有你的系统能批准**。把「建议」和「执行」分开，是安全边界的地基。
:::

## 六、工具太多怎么办：清单也要减肥

一个常见退化：项目做着做着注册了 40 个工具，每轮把 40 条说明全塞进上下文。后果是又贵又乱，模型开始选错工具。

三个办法，按推荐顺序：

- **分组路由**：先用一次轻量判断把请求分到「订单组 / 日志组 / 制度组」，本轮只带该组的 5~8 个工具。这也是[从 Demo 到上线](./13-production.md)里「预检路由」的雏形。
- **合并近义工具**：`search_order_by_id` 和 `search_order_by_phone` 合成一个带 `by` 枚举的工具。
- **两阶段暴露**：第一轮只给「选择能力」的元工具，选中后再展开该能力的具体参数。

:::warn 别用「把说明写得更短」来解决问题
压缩到看不懂，模型选错率会飙升，省下的 token 还不够赔重试。**减数量，不减信息量。**
:::

## 七、把这一层接回循环

上一篇的 `run()` 只需改一行：把 `tools.execute(...)` 换成这里的 `tb.execute(...)`，其余全部不动。这正是「先手写循环、再逐件替换」的好处——**每一层都是可插拔的**。

改完之后，你的循环就同时具备了：参数幻觉防护、权限边界、幂等落盘、危险动作确认、结果裁剪、审计日志。这六样，是简历上「做了 Agent 项目」和「做过线上 Agent 系统」的分水岭。

:::check 学完这一篇，你要能回答
- 为什么说「工具描述是提示词的一部分」？
- 模型编出了一个不存在的参数，你的系统应该在哪一层挡住？
- 幂等键为什么必须落盘？只放内存会出什么事？
- 40 个工具塞满上下文，正确解法是什么？为什么「把说明写短」是错的？
- 「模型提议、系统批准」这条边界，在代码里对应哪两个分支？
:::

## 小结

:::figure 这一篇的产物
@stack
四条设计原则::动词命名 / 参数收窄 / 写明不用 / 返回定死
七格链路::选动作→校验→权限→确认→幂等→执行→裁剪→写回
三级副作用::只读 / 写入 / 危险，逐级加管控
一句边界::模型提议，系统批准
:::

工具层稳了，下一个真正的瓶颈就浮出来了：**每一轮往上下文里塞的东西越来越多，越聊越贵、越聊越笨**。这就是整份教程里最被低估、也最能体现功力的一篇。

下一步：[上下文工程](./07-context.md) —— 一张预算表、四层结构、压缩策略、预检路由，以及「聊了二十轮突然变笨」的完整解法。
