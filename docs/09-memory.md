---
title: 记忆系统：以及什么时候坚决不该记
category: 记忆系统
order: 209
summary: 「把聊天记录全存下来」不叫记忆，叫日志。三层记忆、写入决策、冲突消解、召回与遗忘，还有一个更重要的问题：哪些东西绝不能记。
minutes: 20
---

# 记忆系统：以及什么时候坚决不该记

先看一个特别小、但特别破坏信任的场景：

用户第一轮说「我叫小李，别叫我张先生」。第五轮，系统又礼貌地来了一句「张先生您好」。用户当场就不想用了。

你查代码，发现历史对话明明都存着，一轮没落。那为什么还会叫错？

:::quote
**把聊天记录全存下来，不叫记忆，叫日志。** 存了 ≠ 会在需要的时候被想起来，更 ≠ 想起来的是对的那一版。
:::

## 一、先破误解：记忆不是一个存储问题，是三个决策问题

新手做记忆，第一版基本都是「开个表，每轮 append 一条」，然后每轮把全表拼进上下文。结果和[上下文工程](./07-context.md)里那个现象一模一样：越聊越贵、越聊越笨。

真正的记忆系统要解决三件事：

:::figure 记忆系统的三个决策
@stack
① 写入决策::这一条值不值得记？是事实、偏好，还是随口一句？
② 召回决策::本轮该想起哪几条？怎么和当前问题相关？
③ 冲突消解::新信息和旧信息矛盾时，谁生效？旧的是删还是标记过期？
:::

三个里，**① 最被低估**。绝大多数「记忆把系统搞坏」的事故，不是存丢了，是**存了不该存的东西**——把用户随口一句猜测当成事实，三个月后还在拿它做判断。

## 二、三层记忆，各管各的

| 层 | 存活时间 | 内容 | 存在哪 | 典型实现 |
|---|---|---|---|---|
| **工作记忆** | 单次循环内 | 本轮目标、已查过什么、待办 | 内存 `State` | [手写循环](./05-agent-loop.md)里的 `State` |
| **会话记忆** | 一次会话 | 当前任务的中间结论、已确认前提 | 内存 + 检查点 | 结构化状态 + 摘要 |
| **长期记忆** | 跨会话 | 稳定偏好、身份、长期有效的约定 | 持久化存储 | 带置信度与过期时间的条目表 |

:::figure 三层记忆的流转
@flow
工作记忆|会话结束时提炼|写入判定|长期记忆|下轮按需召回|工作记忆
:::

注意「**提炼**」和「**写入判定**」两道闸门。会话结束时不是把对话倒进长期记忆，而是先问「这里面有没有一条**未来还会用到、且现在仍然为真**的事实」。

## 三、一个带写入判定的记忆库（零依赖可跑）

```python
# memory.py —— 零依赖，python memory.py
import re, json, time, hashlib

# 明确禁止入库的信息类型：写入判定第一道闸
DENY = [
    (r"密码|口令|token|密钥|身份证|银行卡", "敏感凭证"),
    (r"验证码|一次性|临时|这次先|随便说说", "临时信息"),
    (r"可能|好像|大概|也许|我猜", "推测而非事实"),
]
# 值得长期记住的信号
KEEP = [
    (r"我叫|我的名字是|请叫我", "identity", 0.95),
    (r"我偏好|我喜欢|我不喜欢|请用|不要用", "preference", 0.90),
    (r"我们约定|以后都|默认", "convention", 0.92),
    (r"我是.*(工程师|应届|转行|在职)", "profile", 0.85),
]

class MemoryItem:
    def __init__(self, key, value, kind, conf, ttl_days=180):
        self.key, self.value, self.kind = key, value, kind
        self.conf = conf
        self.created = time.time()
        self.ttl = ttl_days * 86400
        self.superseded = False
        self.hits = 0

    def expired(self):
        return time.time() - self.created > self.ttl

    def to_dict(self):
        return {"key": self.key, "value": self.value, "kind": self.kind,
                "conf": self.conf, "created": self.created,
                "superseded": self.superseded, "hits": self.hits}

class MemoryStore:
    def __init__(self, min_conf=0.80):
        self.items = {}
        self.min_conf = min_conf
        self.rejected = []

    # ---- ① 写入决策 ----
    def consider(self, utterance):
        for pat, why in DENY:
            if re.search(pat, utterance):
                self.rejected.append((utterance, why))
                return None, "拒绝写入：%s" % why
        for pat, kind, conf in KEEP:
            m = re.search(pat, utterance)
            if m:
                if conf < self.min_conf:
                    return None, "置信度不足，暂不入库"
                key = hashlib.md5((kind + utterance).encode()).hexdigest()[:8]
                item = MemoryItem(key, utterance.strip(), kind, conf)
                self.items[key] = item
                return item, "已写入（%s, conf=%.2f）" % (kind, conf)
        return None, "无事值得长期记忆（普通对话留在会话记忆里）"

    # ---- ③ 冲突消解：同类型新事实让旧的失效 ----
    def resolve(self, kind):
        live = [i for i in self.items.values()
                if i.kind == kind and not i.superseded and not i.expired()]
        if len(live) <= 1:
            return
        live.sort(key=lambda x: (x.conf, x.created))
        for old in live[:-1]:
            old.superseded = True     # 不删除：保留审计轨迹

    # ---- ② 召回决策：只取本轮相关的、仍有效的 ----
    def recall(self, query, limit=3):
        qs = set(re.findall(r"[\u4e00-\u9fa5]{2}", query))
        scored = []
        for i in self.items.values():
            if i.superseded or i.expired():
                continue
            overlap = len(qs & set(re.findall(r"[\u4e00-\u9fa5]{2}", i.value)))
            score = overlap + (0.5 if i.kind == "identity" else 0) + i.conf * 0.1
            if score > 0:
                scored.append((score, i))
        scored.sort(key=lambda x: -x[0])
        out = []
        for _, i in scored[:limit]:
            i.hits += 1
            out.append(i)
        return out

    # ---- 遗忘：过期清理 + 用户主动删除 ----
    def forget(self, key=None, all_=False):
        if all_:
            n = len(self.items); self.items.clear(); return n
        if key in self.items:
            del self.items[key]; return 1
        return 0

    def render(self, query):
        """召回结果拼成上下文片段：紧凑、结构化、不放大段原文。"""
        hit = self.recall(query)
        if not hit:
            return ""
        return "【已知的长期信息】\n" + "\n".join(
            "- [%s] %s" % (i.kind, i.value) for i in hit)

if __name__ == "__main__":
    store = MemoryStore()
    lines = [
        "我叫小李，别叫我张先生",
        "请叫我李工就好",
        "我的密码是 abc123，帮我记一下",
        "我可能明年想转管理岗",
        "我偏好用表格回答，不要用长段落",
        "这次先按 2025 版制度处理吧",
        "我是转行做 Agent 开发的在职工程师",
        "今天天气不错",
    ]
    print("== 会话结束，逐条做写入判定 ==")
    for l in lines:
        item, why = store.consider(l)
        print("  %-34s -> %s" % (l[:32], why))
    store.resolve("identity")     # 两条身份信息，保留置信度更高/更新的那条
    print("\n== 被明确拒绝的条目 ==")
    for u, why in store.rejected:
        print("  %s -> %s" % (u, why))
    print("\n== 下一轮召回 ==")
    q = "帮我用表格整理一下年假制度，顺便确认下称呼"
    print(store.render(q))
    print("\n== 库内状态 ==")
    print(json.dumps([i.to_dict() for i in store.items.values()],
                     ensure_ascii=False, indent=2)[:900])
```

跑完重点看三处：

- 「密码」「可能」「这次先」三条被**写入判定**当场拒绝，理由分别是敏感凭证、推测、临时信息；
- 两条身份信息经 `resolve` 冲突消解，旧的被标记 `superseded` 而**不是物理删除**（保留审计轨迹）；
- 下一轮只召回相关的三条，拼成紧凑片段，不是把八句话全倒回去。

:::tip 「不删除，标记失效」是个重要的工程习惯
用户改口说「别叫李工了，叫我小李」，物理删除会让你失去「曾经叫过什么」的线索，出问题无法回溯。标记 `superseded` + 保留时间戳，既不影响召回，又留了完整历史。
:::

## 四、什么时候坚决不该记

这一节比代码更重要。按风险从高到低：

:::figure 写入判定的黑名单
@stack
敏感凭证::密码、密钥、token、证件号、银行卡 —— 永不入库，也不要写进日志
推测与情绪::「我可能」「我猜」「烦死了」—— 不是事实，会污染未来判断
临时信息::「这次先」「随便说说」「临时用一下」—— 带明确时效
高频易变事实::当前项目名、当前公司、当前用的工具版本 —— 下次就变了，记了反而误导
无稳定主体的评价::「这个方案不太好」—— 缺少对象，未来无法解释
:::

还有一条容易被忽略的：

:::warn 别把「模型的推断」当成记忆写回去
比如模型根据对话推断「用户应该是应届生」，这条**没有经过用户确认**，写进长期记忆就成了系统自己造的事实，之后每轮都拿它做判断，错得越来越隐蔽。要写，就标 `source=inferred` 并降低置信度，且在下次召回时向用户确认。
:::

## 五、隐私：遗忘权是功能，不是负担

三个必须有的能力，示例代码里已经留了接口：

| 能力 | 实现 | 为什么必须 |
|---|---|---|
| 查看 | 导出某个用户全部记忆条目 | 用户有权知道自己被记了什么 |
| 删除 | `forget(key)` / `forget(all_=True)` | 用户说「忘掉我」时要能真忘掉 |
| 过期 | 每条带 TTL，`expired()` 自动失效 | 不主动清理，库会变成垃圾场 |

再加两条工程约束：

- **记忆按用户隔离**，key 里必须带用户标识，绝不能跨用户召回；
- **记忆写入要审计**，记下「哪一轮、哪句话、被哪条规则写入」，出问题能追。

:::quote
记忆系统的目标不是「记得多」，是**「该记得的准确记得，不该记的一条不留」**。
:::

## 六、和上下文、检索的关系

把三篇串起来，一张图就清楚了：

:::figure 三种「让模型知道更多」的手段，别混用
@stack
上下文::本轮输入，一次性，管的是这一轮看得见什么
检索::外部文档，事先建索引，答案要能溯源
记忆::对话里沉淀的稳定事实，运行时写入，按相关度召回
:::

一个判断口诀：**「文档里查得到的 → 检索；用户说过的稳定事实 → 记忆；这一轮临时要用的 → 上下文」**。把用户偏好写成文档再检索、或者把制度原文塞进长期记忆，都是典型的层用错了。

:::check 学完这一篇，你要能回答
- 为什么「把聊天记录全存下来」不叫记忆？
- 三个决策里，最被低估的是哪一个？为什么？
- 「我可能明年想转管理岗」为什么不该入库？
- 用户改口后，为什么标记失效比物理删除更好？
- 模型自己推断出的「用户是应届生」，能不能直接写进长期记忆？
:::

## 小结

:::figure 这一篇的产物
@stack
三层记忆::工作 / 会话 / 长期，各有存活期与载体
三个决策::写入 / 召回 / 冲突消解
一张黑名单::敏感、推测、临时、易变、无主体，一律不记
两个能力::查看与遗忘，配上 TTL 自动过期
:::

下一篇把视角从「自己写」转到「用别人的」：工具协议与框架到底替你做了什么，以及**什么时候它们在帮倒忙**。

下一步：[框架与工具协议](./10-framework.md)
