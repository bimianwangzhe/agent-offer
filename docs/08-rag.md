---
title: 检索增强：让答案带得出出处
category: 扩展
order: 8
summary: 从「为什么整份文档塞进去必然更差」开始，手写一个带切分、混合检索、重排、溯源与拒答的模块，并给出答案不对时的完整排查顺序。
minutes: 25
---

# 检索增强：让答案带得出出处

先讲一个特别典型的新手操作：

拿到一份 5 万字的公司制度，用户问「年假能不能折现」。他想：模型不知道我们公司的事，那我把整份文档塞进上下文不就行了？

结果三个问题一起冒出来：**贵**（每轮重发 5 万字）、**慢**、以及最反直觉的——**答案反而更差**。模型在几十页里翻到一段 2025 版的旧规定，理直气壮地回答「可以折现」，而 2026 版明明写着不折现。

:::quote
检索增强不是「把文档塞给模型」，是**先替模型找到该看的那几段，只把那几段给它**。它本质是一个信息检索问题，不是提示词问题。
:::

## 一、先破误解：模型不缺「容量」，缺「注意力」

第一篇讲过，模型是在「接着往下写」，长文本中间的内容权重会被摊薄。你塞 5 万字，等于把那句关键规定埋在第 37000 字的位置——它看得见，但很容易略过。

所以正确做法是把一次「大阅读」拆成两步：

:::figure 检索增强的两阶段
@stack
离线::把资料切成块、编号、建索引，一次做好反复用
在线::用户提问 → 检索出最相关的 3~5 块 → 只把这 3~5 块拼进上下文 → 生成答案 → 校验引用
:::

注意「离线」这一步：很多新手以为检索增强就是「每次把文档丢给某个库查一下」，结果切分、编号、版本管理全没做，后面溯源和排查全无从谈起。**索引是要事先设计的数据资产**。

## 二、五个环节，每个都会出错

:::figure 一条完整的检索链路
@flow
切分编号|建索引|混合检索|重排|生成并溯源
:::

| 环节 | 干什么 | 做错了会怎样 |
|---|---|---|
| 切分编号 | 按语义块切，给稳定 id | 切太碎丢上下文，切太大带进一堆噪声 |
| 建索引 | 关键词 + 语义两套索引 | 只做一套，换个说法就查不到 |
| 混合检索 | 两路结果合并 | 只看 top1，关键那段排第 2 就漏了 |
| 重排 | 用业务规则二次排序 | 2025 版旧规定排在 2026 版前面 |
| 生成并溯源 | 答案带段落编号 | 编出 `[99]` 这种不存在的引用 |

:::warn 五个环节里，最常被跳过的是「编号」和「溯源」
没有稳定编号，答案就无法核验，第 03 篇那层语义校验也无从做起。**编号是检索增强和「随便塞点资料」之间的分界线。**
:::

## 三、完整实现（零依赖，可直接跑）

下面这份代码实现了整条链路：语义块切分 + 稳定编号、关键词倒排 + 字符向量两路检索、混合打分、业务重排、答案生成与溯源校验、以及**材料不足时明确拒答**。

```python
# rag.py —— 零依赖，python rag.py
import re, math, json
from collections import Counter

# ---------- 1. 切分：按语义块，带重叠，给稳定编号 ----------
def split_doc(text, max_chars=90, overlap=30):
    """优先按自然行/段落边界切（一条制度一行最理想）；超长行再按句号细切。"""
    blocks, buf = [], ""
    for line in [l.strip() for l in text.strip().splitlines() if l.strip()]:
        if len(line) <= max_chars:
            if buf.strip():
                blocks.append(buf.strip()); buf = ""
            blocks.append(line)
            continue
        for seg in re.split(r"(?<=。)", line):
            seg = seg.strip()
            if not seg: continue
            if len(buf) + len(seg) > max_chars and buf:
                blocks.append(buf.strip())
                buf = buf[-overlap:] + " " + seg   # 重叠，防止一句话被切断
            else:
                buf += (" " if buf else "") + seg
    if buf.strip(): blocks.append(buf.strip())
    return [{"id": i + 1, "text": b} for i, b in enumerate(blocks)]

# ---------- 2. 中文友好的词项：字 bigram + 数字/英文词 ----------
def terms(s):
    s = s.lower()
    cn = re.findall(r"[\u4e00-\u9fa5]{2}", s)
    bi = [s[i:i + 2] for i in range(len(s) - 1)
          if "\u4e00" <= s[i] <= "\u9fff" and "\u4e00" <= s[i + 1] <= "\u9fff"]
    en = re.findall(r"[a-z0-9]+", s)
    return cn + bi + en

def vec(s):
    return Counter(terms(s))

def cosine(a, b):
    if not a or not b: return 0.0
    common = set(a) & set(b)
    dot = sum(a[k] * b[k] for k in common)
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0

# ---------- 3. 建索引（关键词倒排 + 向量，两路） ----------
class Index:
    def __init__(self, blocks):
        self.blocks = blocks
        self.vectors = {b["id"]: vec(b["text"]) for b in blocks}
        self.df = Counter()
        for b in blocks:
            for t in set(terms(b["text"])):
                self.df[t] += 1
        self.N = len(blocks)

    def bm25(self, q, k1=1.5, b=0.75):
        qt = terms(q)
        avg = sum(len(blk["text"]) for blk in self.blocks) / max(1, self.N)
        scores = {}
        for blk in self.blocks:
            tf = Counter(terms(blk["text"]))
            dl = len(blk["text"])
            s = 0.0
            for t in set(qt):
                if t not in tf: continue
                idf = math.log(1 + (self.N - self.df[t] + 0.5) /
                               (self.df[t] + 0.5))
                s += idf * tf[t] * (k1 + 1) / (tf[t] + k1 * (1 - b + b * dl / avg))
            scores[blk["id"]] = s
        return scores

    def semantic(self, q):
        qv = vec(q)
        return {b["id"]: cosine(qv, self.vectors[b["id"]]) for b in self.blocks}

    def hybrid(self, q, w_bm25=0.55):
        a, b = self.bm25(q), self.semantic(q)
        ma, mb = max(a.values()) or 1, max(b.values()) or 1
        return {k: w_bm25 * a[k] / ma + (1 - w_bm25) * b[k] / mb for k in a}

# ---------- 4. 重排：业务规则压过纯相关度 ----------
def rerank(scores, blocks, query):
    bmap = {b["id"]: b for b in blocks}
    out = {}
    for bid, s in scores.items():
        text = bmap[bid]["text"]
        boost = 0.0
        # 规则一：问「今年/能不能」时，现行版本优先，历史版本降权
        if re.search(r"2026|现行|今年", query) and "2026" in text:
            boost += 0.35
        if "2025" in text and re.search(r"2026|现行|今年", query):
            boost -= 0.45
        # 规则二：命中「折现/结转」这类核心词加分
        if any(k in text for k in ("折现", "结转")) and any(k in query for k in ("折现", "结转", "年假")):
            boost += 0.15
        out[bid] = s + boost
    return sorted(out.items(), key=lambda x: -x[1])

# ---------- 5. 生成 + 溯源 + 拒答 ----------
MIN_SCORE = 0.32

def answer(index, blocks, query, top_k=3):
    ranked = rerank(index.hybrid(query), blocks, query)
    picked = [(bid, s) for bid, s in ranked[:top_k] if s >= MIN_SCORE]
    if not picked:
        return {"answer": "", "citations": [], "need_clarify": True,
                "scores": {}, "reason": "材料中没有足够依据，拒绝作答"}
    bmap = {b["id"]: b for b in blocks}
    material = "\n".join("[%d] %s" % (bid, bmap[bid]["text"]) for bid, _ in picked)
    # 真实系统里，这里把 material 拼进上下文交给模型；
    # 本示例用抽取式答案演示「溯源必须能核验」这一层。
    cites = [bid for bid, _ in picked]
    body = "依据材料： " + "；".join(bmap[bid]["text"][:60] for bid in cites)
    return {"answer": body, "citations": cites, "need_clarify": False,
            "material": material, "scores": {str(b): round(s, 3) for b, s in picked}}

def verify(obj, valid_ids):
    """第 03 篇的语义校验，落到这里就是：引用编号必须真实存在。"""
    errs = []
    for c in obj.get("citations", []):
        if c not in valid_ids:
            errs.append("引用了不存在的段落 [%s]" % c)
    if obj.get("answer") and not obj.get("citations"):
        errs.append("给了结论但没有出处")
    return errs

DOC = """
2026 版休假制度第 1 条：年假按自然年结算，未休部分可结转至次年 3 月 31 日，逾期作废。
2026 版休假制度第 2 条：结转年假不折现，不得以任何形式折算为现金或补贴。
2026 版休假制度第 3 条：员工离职时，未休年假按当年在岗天数折算，具体见薪酬制度附件。
2025 版休假制度第 7 条：未休年假可申请折现，经部门审批后随当月工资发放。（本条已废止）
2026 版报销制度第 1 条：差旅报销需在行程结束后 15 个工作日内提交。
"""

if __name__ == "__main__":
    blocks = split_doc(DOC)
    idx = Index(blocks)
    print("切成 %d 块：" % len(blocks))
    for b in blocks:
        print("  [%d] %s" % (b["id"], b["text"][:56]))
    for q in ["今年的年假能不能折现", "差旅报销多久之内提交", "股票期权怎么行权"]:
        print("\n问：", q)
        r = answer(idx, blocks, q)
        print("  命中：", r["scores"])
        print("  引用：", r["citations"])
        print("  结论：", (r["answer"] or r["reason"])[:120])
        print("  校验：", verify(r, {b["id"] for b in blocks}) or "通过")
```

跑一遍，三个问题会呈现三种典型结果：

- 「今年的年假能不能折现」→ 命中 2026 版不折现那条，**2025 版那条被重排降权压下去**；
- 「差旅报销多久之内提交」→ 命中报销制度；
- 「股票期权怎么行权」→ 最高分低于阈值，返回 `need_clarify: true` 并说明「材料中没有足够依据」，**拒答而不是编**。

:::tip 第三个用例比前两个都重要
能拒答的系统才敢上线。绝大多数「幻觉事故」不是检索没找到，而是**找到了一堆弱相关内容，却硬要模型给个答案**。设一个阈值，让系统有权利说「我不知道」，是最便宜也最有效的一道护栏。
:::

## 四、答案不对，按什么顺序查

线上出了问题别急着改提示词。按下面顺序排查，命中率最高：

:::figure 检索问题的排查顺序
@flow
先看命中了哪几块|再看切分是否合理|再查索引与打分|再看重排规则|最后才动提示词
:::

| 现象 | 大概率原因 | 先查什么 |
|---|---|---|
| 答案引用了无关段落 | 检索命中错了 | 打印 top-k 及分数，看相关段落排第几 |
| 关键那句被截断 | 切分把一句话切两半 | 调整块大小与重叠 |
| 换个问法就查不到 | 只做了关键词索引 | 加语义那一路，调混合权重 |
| 引用了已废止版本 | 没做业务重排 | 给版本、生效时间加规则 |
| 答案对但没出处 | 生成时没要求带编号 | 输出契约加 `citations` 必填 + 校验 |
| 明明没有却硬答 | 没设拒答阈值 | 提高 `MIN_SCORE`，补 `need_clarify` |

:::warn 别跳过第一步
「打印命中的 top-k 和分数」这一步能定位八成问题。很多团队直接改提示词，改了三天，最后发现是切分把关键句切断了。
:::

## 五、六个高频坑

1. **切太碎**：按固定字数硬切，一句话变两半，两边都不完整。→ 按语义边界切 + 重叠。
2. **只看 top1**：关键段落排第 2 就被丢掉。→ 取 3~5 块，让重排决定顺序。
3. **不给稳定编号**：引用变成「上面那段」，无法核验。→ 索引时分配固定 id，并随文档版本一起管理。
4. **版本混用**：新旧制度都在库里，旧的还排前面。→ 元数据带 `生效年份 / 是否废止`，重排里硬规则优先。
5. **把整块原文塞进上下文**：忘了裁剪。→ 用第 07 篇的 `ContextBuilder`，检索结果也算额度。
6. **不设拒答**：弱相关也硬答。→ 阈值 + `need_clarify` + 结构化降级。

:::ask 想一层
如果用户问「我去年没休的年假能折现吗」，而库里 2025 版和 2026 版都有，系统该直接答「不能」吗？更好的做法是**主动识别到版本歧义**，返回 `need_clarify: true` 并列出「需要确认适用哪一版制度」。这和[让输出稳定下来](./03-structured-output.md)里的语义校验是同一件事——**歧义不是缺陷，是必须上报的信号**。
:::

## 六、它和「记忆」的分工

这一篇解决的是「模型不知道**外部资料**」；下一篇解决「模型不记得**我们聊过什么**」。两者经常被混为一谈，其实完全不同：

:::figure 检索增强与记忆系统的边界
@compare
检索增强::资料来自外部文档|事先建索引|答案要能溯源|内容相对静态
记忆系统::信息来自对话过程|运行时逐步写入|要判断值不值得记|内容持续变化
:::

:::quote
**检索是「查资料」，记忆是「记状态」。** 把用户偏好写成一份文档再检索，是常见的设计错误——那属于记忆，不该走索引。
:::

:::check 学完这一篇，你要能回答
- 为什么把整份文档塞进上下文，答案反而可能更差？
- 五个环节里，哪一个决定了「答案能不能核验」？
- 为什么要做两路检索再混合？只做关键词会漏什么？
- 答案不对时的排查顺序是什么？为什么第一步不是改提示词？
- 「能拒答」为什么比「答得全」更重要？
:::

## 小结

:::figure 这一篇的产物
@stack
一条链路::切分编号 → 双路索引 → 混合检索 → 业务重排 → 生成溯源
一个权利::分数不够就拒答，不硬编
一张排查表::先打印命中，再依次查切分、索引、重排、提示词
一条边界::检索查外部资料，记忆存对话状态
:::

下一步：[记忆系统](./09-memory.md) —— 短期、长期、以及一个更重要的问题：**什么时候坚决不该记**。
