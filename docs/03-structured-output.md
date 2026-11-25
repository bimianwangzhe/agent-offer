---
title: 让输出稳定下来
category: 打底
order: 3
summary: 「只输出 JSON」为什么没用？把校验从模型手里收回来：语法、结构、语义三层契约，加上自动纠正与果断降级。
minutes: 18
---

# 让输出稳定下来

先看一段几乎每个新手都收到过的返回：

````text
好的，以下是您要的结果：

```json
{
  "answer": "可以折现",
  "citations": [3]
}
```

需要说明的是，具体以公司最新制度为准。
````

你明明在提示词里写了「只输出 JSON，不要任何解释」。它照样给你加了开场白、代码围栏、和一句客气的免责声明。于是你的 `json.loads()` 当场炸掉。

多数人的第一反应是**把提示词写得更狠**：加「严禁」「必须」「否则你会被惩罚」「不要输出任何其它字符」。有用吗？有一点，胜率从七成提到九成。但**九成不是百分之百**，而下游解析器只要遇到一次就会挂。

:::quote
问题从来不是提示词不够狠，而是**你把校验的责任推给了模型**。模型负责生成，系统负责验证——上一篇那条分工，在这里第一次真正落地。
:::

## 一、把「合法输出」拆成三层

「输出合法」其实不是一件事，是三件事，而且**能自动修的程度完全不同**：

:::figure 输出契约的三层
@stack
① 语法层::是不是一段能被解析的 JSON（去掉围栏、去掉前后废话）→ 可自动清洗
② 结构层::字段齐不齐、类型对不对、枚举值在不在范围内 → 可自动纠正
③ 语义层::引用的编号真的存在吗、答案和材料矛盾吗 → 必须外接校验，重试无用
:::

这个分层极其重要，因为它直接决定**遇到错该怎么办**：

| 层次 | 典型问题 | 处理方式 | 该不该重试 |
|---|---|---|---|
| 语法 | 带 ```json 围栏、前后有客套话、末尾逗号 | 本地清洗，不花一分钱 | 不用 |
| 结构 | 少字段、数字写成字符串、枚举值拼错 | 把错误信息喂回去，让模型改一版 | 可以，最多 2 次 |
| 语义 | 引用了 `[99]`、答案和材料相反 | 用你自己的数据校验，判为不可信 | **不该**，重试只会编得更像 |

:::warn 最烧钱也最没用的做法
不分层，只要解析失败就整轮重试。语法问题本可以本地免费修，语义问题重试一百次也不会变对——中间那部分才是唯一值得重试的。
:::

## 二、第一层：本地清洗，零成本

模型常见的「脏输出」就那么几种，用二十行能覆盖九成情况：

```python
# clean.py
import json, re

def clean_json(text):
    """把模型的自由发挥，尽量洗成一段可解析的 JSON。"""
    s = text.strip()
    # 1. 去掉 ```json ... ``` 围栏（也兼容裸 ```）
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", s, re.I)
    if fence:
        s = fence.group(1).strip()
    # 2. 去掉常见开场白 / 结尾客套
    s = re.sub(r"^(好的|以下是|当然|没问题)[^\n{]*[：:]\s*", "", s)
    s = re.sub(r"\n\s*(以上|希望|需要说明)[^\n]*$", "", s)
    # 3. 截取第一个 { 到最后一个 }（或 [ 到 ]）
    for a, b in [("{", "}"), ("[", "]")]:
        i, j = s.find(a), s.rfind(b)
        if i >= 0 and j > i:
            s = s[i:j + 1]
            break
    # 4. 修掉对象/数组末尾多余的逗号
    s = re.sub(r",\s*([}\]])", r"\1", s)
    return s.strip()

def parse_loose(text):
    """返回 (对象, 错误信息)。错误信息为空表示成功。"""
    try:
        return json.loads(clean_json(text)), ""
    except Exception as e:
        return None, "JSON 解析失败: %s" % e

if __name__ == "__main__":
    raw = '好的，以下是结果：\n```json\n{"answer":"可以折现","citations":[3],}\n```\n以上仅供参考。'
    obj, err = parse_loose(raw)
    print("清洗后:", clean_json(raw))
    print("解析:", obj, "| 错误:", err or "无")
```

跑一下你会看到围栏、开场白、结尾逗号全被干净地处理掉，**而且没有发起第二次调用**。这一步省下的钱和延迟，在高频系统里非常可观。

:::tip 别把清洗写成"万能"
`clean_json` 只做确定性的文本处理，**绝对不要在里面"猜"模型想表达什么**。一旦开始猜，你就把语义责任又揽回来了。洗不干净就老实报错，交给下一层。
:::

## 三、第二层：结构校验 + 把错误喂回去

这一层是整套机制里最巧妙的部分：**不是让模型「再做一次」，而是把上一次错在哪里明确告诉它**，让它做一次有目标的自纠。

```python
# contract.py —— 零依赖，python contract.py
import json, re
from clean import clean_json, parse_loose

class Contract:
    """用一份字段规则，约束并自动纠正模型输出。"""

    def __init__(self, spec):
        # spec: {"字段名": ("类型", 是否必填, 允许的取值或 None)}
        self.spec = spec

    def validate(self, obj):
        """返回错误列表；空列表表示结构合法。只管结构，不管语义。"""
        errs = []
        if not isinstance(obj, dict):
            return ["顶层必须是对象，实际是 %s" % type(obj).__name__]
        for name, (typ, required, allowed) in self.spec.items():
            if name not in obj:
                if required:
                    errs.append("缺少必填字段 `%s`" % name)
                continue
            v = obj[name]
            ok = {"str": lambda x: isinstance(x, str),
                  "int": lambda x: isinstance(x, int) and not isinstance(x, bool),
                  "bool": lambda x: isinstance(x, bool),
                  "list": lambda x: isinstance(x, list),
                  "list[int]": lambda x: isinstance(x, list) and
                      all(isinstance(i, int) for i in x)}.get(typ, lambda x: True)(v)
            if not ok:
                errs.append("字段 `%s` 类型应为 %s，实际 %r" % (name, typ, v))
            elif allowed is not None and v not in allowed:
                errs.append("字段 `%s` 取值 %r 不在允许范围 %r 内" % (name, v, allowed))
        return errs

class MockModel:
    """本地假模型：第一次故意输出不合法，第二次按错误纠正。"""
    def __init__(self):
        self.round = 0

    def send(self, system, user):
        self.round += 1
        if self.round == 1:
            return '```json\n{"answer": "可以折现", "citations": "3"}\n```'
        # 看到纠正提示后，给出合法版本
        return json.dumps({"answer": "不能折现", "citations": [2],
                           "need_clarify": False}, ensure_ascii=False)

SPEC = {
    "answer":        ("str", True, None),
    "citations":     ("list[int]", True, None),
    "need_clarify":  ("bool", True, [True, False]),
}

def call_with_contract(model, contract, system, user, max_fix=2):
    messages = [("system", system), ("user", user)]
    for attempt in range(max_fix + 1):
        raw = model.send(system, "\n\n".join(m for _, m in messages))
        obj, err = parse_loose(raw)
        if err:
            print("  第 %d 次：%s -> 本地重洗仍失败" % (attempt + 1, err))
            continue
        errs = contract.validate(obj)
        if not errs:
            print("  第 %d 次：结构合法 ✓" % (attempt + 1))
            return obj
        print("  第 %d 次：结构不合法 -> %s" % (attempt + 1, "；".join(errs)))
        if attempt == max_fix:
            break
        # 关键：把具体错误作为新一轮输入，而不是简单重发原问题
        messages.append(("user",
            "上一次输出未通过校验，请只修正下列错误并重新输出完整 JSON，不要解释：\n- "
            + "\n- ".join(errs)))
    print("  达到纠正上限 -> 降级")
    return None

if __name__ == "__main__":
    c = Contract(SPEC)
    out = call_with_contract(
        MockModel(), c,
        system="你是制度助手。只输出 JSON，字段：answer(str)、citations(list[int])、need_clarify(bool)。",
        user="我去年没休的年假能折现吗？")
    print("最终结果:", out)
```

跑一遍，输出会是：第一次 `citations` 是字符串、"need_clarify" 缺失 → 打印两条具体错误 → 第二次修好 → 结构合法 ✓。

:::ask 为什么「把错误明确告诉它」比重发原问题有效？
因为重发原问题时，模型面对的是**同一段续写起点**，大概率走出同一条岔路；而把「字段 `citations` 类型应为 list[int]，实际 '3'」拼进上下文，等于换了一个开头，续写方向被强行拨正了。这又回到第一篇那个机制：**它只是在接着往下写**。
:::

三个必须设的边界：

1. **纠正上限**（示例里 2 次）。无限纠正就是无限烧钱。
2. **纠正只针对结构**。别把语义错误也塞进去让它「改」，那是在教它编得更像。
3. **纠正失败要降级**，返回明确的结构化降级对象（比如 `{"answer": "", "need_clarify": true, "degraded": true}`），让上游走人工或兜底文案，而不是抛 500。

## 四、第三层：语义校验必须用自己的数据

看这个输出：

```json
{"answer": "可以折现", "citations": [3], "need_clarify": false}
```

**语法合法、结构合法、语义却完全错**——因为材料里第 3 段是「2025 版」的规定，而用户问的是 2026 年当前政策。模型不会知道这一点，重试一百次也不会知道。

这类校验只有一个办法：**拿你自己的数据去核**。

```python
def semantic_check(obj, valid_ids, material):
    errs = []
    for cid in obj.get("citations", []):
        if cid not in valid_ids:
            errs.append("引用了不存在的段落 [%d]" % cid)
    if obj.get("answer") and not obj.get("citations"):
        errs.append("给了结论但没有任何出处")
    # 版本冲突：材料里出现"2025 版"却未声明澄清，判为高风险
    if "2025 版" in material and not obj.get("need_clarify"):
        errs.append("命中历史版本内容，应触发 need_clarify")
    return errs

material = "[1] 2026：可结转至次年 3/31\n[2] 2026：不折现\n[3] 2025：可折现"
obj = {"answer": "可以折现", "citations": [3], "need_clarify": False}
print(semantic_check(obj, {1, 2, 3}, material))
# -> ['命中历史版本内容，应触发 need_clarify']
```

:::quote
语法和结构可以交给模型自纠，**语义只能交给事实**。这条线划清楚，你的系统就从「碰运气」变成「可依赖」。
:::

语义不通过时，正确动作是**降级 + 记录**，不是重试：把这条样本存进评测集（[评测](./11-eval.md)会讲），当作下一轮优化的真实依据。

## 五、整套串起来

:::figure 一次输出从生成到可用
@flow
模型返回|本地清洗|结构校验|错误喂回纠正|语义校验|交付或降级
:::

对应的工程原则，浓缩成四条：

- **能在本地免费修的，绝不发第二次调用**；
- **能让模型自纠的，必须带具体错误信息**；
- **涉及事实的，必须用自己的数据核**；
- **任何一步走到尽头，都要有结构化降级**，不能把异常抛给用户。

:::check 学完这一篇，你要能回答
- 为什么「把提示词写得更狠」解决不了根本问题？
- 三层契约分别是什么？哪一层能自动纠正，哪一层重试无用？
- 为什么纠正时要「把具体错误拼进上下文」，而不是重发原问题？
- 模型引用了不存在的段落编号，属于哪一层错误？你该怎么处理？
:::

## 小结

:::figure 这一篇的产物
@stack
一个函数::clean_json：零成本洗掉围栏与废话
一个契约::Contract：字段、类型、枚举三件事一次校验
一个循环::带具体错误的有限次自纠 + 结构化降级
一条界线::语义交给事实，不交给模型
:::

到这里，你已经能稳定地「问一句、拿到一个可信的结构化结果」。这是全部后续内容的地基：**Agent 循环里每一轮，走的都是这一套**。

下一步：[什么是 Agent](./04-what-is-agent.md) —— 我们把「会调模型」和「Agent」之间的那条线画清楚，并解释为什么**很多场景根本不该用 Agent**。
