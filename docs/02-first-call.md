---
title: 第一次调用：把一次请求拆成五块
category: 大模型与调用
order: 2
summary: 从零写一份带超时、指数退避、成本打印的调用脚本；不申请任何账号就能跑通，之后换真实服务只改两行。
minutes: 18
---

# 第一次调用：把一次请求拆成五块

几乎所有人第一次接触模型调用，都是从一段十来行的示例代码开始的：填个地址、传一句话、打印返回值。跑通了，很开心。然后把它搬进自己的项目，问题立刻全冒出来：

- 偶尔卡住不动，整个接口跟着挂住；
- 偶尔返回一个错误，重试几次又好了；
- 偶尔返回的内容被截断了，后半段没了；
- 想加一句「只输出 JSON」，结果它回了一段带着解释的 JSON；
- 月底看账单，不知道钱花在哪儿了。

**问题不在模型，在于你把一次调用当成了「发一个字符串」。** 实际上它是「组装一份带结构的请求，再处理一份带结构的响应」，中间还有一整套失败处理。这一篇我们把它拆开，写一份能直接放进项目里的骨架。

## 一、一次请求里到底装了什么

别把它想成发消息，想成**填一张快递单**：收件人、物品、保价、签收方式、超时怎么办，每一栏都有用，漏一栏就得出问题。

:::figure 一次模型请求的五块内容
@stack
① 身份与规则::system：你是谁、边界在哪、什么情况下必须说「不知道」
② 输入材料::messages：历史对话 + 这一轮的用户问题 + 刚查回来的数据
③ 可用动作::tools：这轮允许它选哪些工具，每个工具的入参长什么样
④ 输出约束::要求返回的结构、必填字段、字段类型与取值范围
⑤ 运行参数::超时、最大输出长度、随机性、重试与预算上限
:::

新手最常漏的是 ①④⑤，而生产事故里最常见的也恰恰是这三块：没定边界 → 被人套话；没定输出约束 → 下游解析崩；没定超时和预算 → 一个请求拖垮整条链路。

:::tip 顺序上的一个小讲究
① 放最前面，② 里当前问题放最后面。原因在上一篇讲过：模型是在「接着往前写」，**离它越近的内容权重越高**。把当前问题放在末尾，比埋在一大段历史中间有效得多。
:::

## 二、先跑起来：一份零依赖的调用骨架

这份代码有两个特点，是专门给转行的人设计的：

1. **默认走本地模拟，不需要申请任何账号、不需要装任何包、不需要联网**，复制粘贴就能跑；
2. 想接真实服务时，**只改两行**（地址和密钥），其余逻辑一行不动。

```python
# client.py —— 零依赖，python client.py
import json, os, time, random, urllib.request, urllib.error

class CallResult:
    """统一返回结构：不管底层是模拟还是真实服务，上层只认这一种形状。"""
    def __init__(self, text, usage, finish, raw=None):
        self.text = text
        self.usage = usage          # {"in": 输入量, "out": 输出量}
        self.finish = finish        # stop / length / tool / error
        self.raw = raw or {}

    def __repr__(self):
        return "<CallResult finish=%s in=%s out=%s>" % (
            self.finish, self.usage["in"], self.usage["out"])

class MockTransport:
    """本地假模型：不联网也能把整条链路跑通。"""
    def __init__(self, fail_first=0):
        self.fail_first = fail_first
        self.calls = 0

    def send(self, payload, timeout):
        self.calls += 1
        if self.calls <= self.fail_first:
            raise OSError("模拟网络抖动")
        q = payload["messages"][-1]["content"]
        if "年假" in q:
            text = '{"need_clarify": true, "reason": "缺少制度版本与入职年份"}'
        else:
            text = '{"need_clarify": false, "answer": "已收到：%s"}' % q[:20]
        return {"text": text, "finish": "stop", "usage": {"in": 128, "out": 32}}

class HttpTransport:
    """接任意兼容服务：地址和密钥从环境变量读，代码里不写死任何一家。"""
    def __init__(self):
        self.base = os.environ.get("MODEL_BASE_URL", "")
        self.key = os.environ.get("MODEL_API_KEY", "")
        self.model = os.environ.get("MODEL_NAME", "default")
        if not self.base or not self.key:
            raise ValueError("请先设置 MODEL_BASE_URL / MODEL_API_KEY")

    def send(self, payload, timeout):
        body = json.dumps({
            "model": self.model,
            "messages": payload["messages"],
            "temperature": payload.get("temperature", 0),
            "max_tokens": payload.get("max_tokens", 800),
        }, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            self.base.rstrip("/") + "/chat/completions",
            data=body, method="POST",
            headers={"Content-Type": "application/json",
                     "Authorization": "Bearer " + self.key})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        choice = data["choices"][0]
        u = data.get("usage", {})
        return {"text": choice["message"].get("content") or "",
                "finish": choice.get("finish_reason", "stop"),
                "usage": {"in": u.get("prompt_tokens", 0),
                          "out": u.get("completion_tokens", 0)}}

class ModelClient:
    """把五块内容 + 超时 + 退避重试 + 成本打印，收在一个地方。"""
    PRICE = {"in": 0.000002, "out": 0.000006}   # 示例单价，按自己的实际账单改

    def __init__(self, transport, timeout=8, retries=3):
        self.t = transport
        self.timeout = timeout
        self.retries = retries
        self.total_in = self.total_out = 0

    def call(self, system, user, history=None, temperature=0, max_tokens=800):
        messages = [{"role": "system", "content": system}]
        messages += (history or [])
        messages.append({"role": "user", "content": user})
        payload = {"messages": messages, "temperature": temperature,
                   "max_tokens": max_tokens}

        last = None
        for i in range(self.retries):
            try:
                r = self.t.send(payload, self.timeout)
                self.total_in += r["usage"]["in"]
                self.total_out += r["usage"]["out"]
                res = CallResult(r["text"], r["usage"], r["finish"], r)
                self._warn_if_truncated(res)
                return res
            except Exception as e:
                last = e
                if i < self.retries - 1:
                    time.sleep(0.05 * (2 ** i))   # 指数退避：0.05 / 0.1 / 0.2
        raise RuntimeError("调用失败（重试 %d 次）: %s" % (self.retries, last))

    def _warn_if_truncated(self, res):
        if res.finish == "length":
            print("  [警告] 输出被截断，需要加大 max_tokens 或压缩上下文")

    def bill(self):
        cost = self.total_in * self.PRICE["in"] + self.total_out * self.PRICE["out"]
        print("  累计：输入 %d / 输出 %d，估算 ¥%.4f" %
              (self.total_in, self.total_out, cost))

if __name__ == "__main__":
    client = ModelClient(MockTransport(fail_first=2))   # 故意先抖两次
    SYSTEM = "你是内部制度助手。只依据给定材料回答；材料不足时说明缺什么，不要猜测。"
    for q in ["我去年没休的年假能折现吗？", "介绍一下你自己"]:
        r = client.call(SYSTEM, q)
        print("问：", q)
        print("答：", r.text, "|", r)
    client.bill()
```

跑一下，你会看到前两次「网络抖动」被自动吃掉，第三次成功；两轮问答后打印累计用量和估算成本。

## 三、逐行说清几个关键设计

### 为什么要包一层 `CallResult`

因为**上层不该知道底层用的是模拟还是真实服务**。后面写 Agent 循环时，判断的是 `res.finish == "tool"` 还是 `"stop"`，是 `res.text` 能不能解析成 JSON，而不是「某个 SDK 返回的某个字段」。换服务商、换模型、做单元测试，全都只动 `Transport` 这一层。

:::quote
在系统里留一层「翻译层」，是转行者最容易展示工程素养的地方。新手把 SDK 的返回对象一路传到业务代码里，老手先把它翻译成自己的结构。
:::

### 为什么重试要带指数退避

限流和抖动通常是短时的。立刻重试等于往拥堵里再挤一脚，连着三次全失败；间隔逐次翻倍，成功率会高很多。两个细节别漏：

- **只对可重试的错误重试**。参数写错、密钥无效、输出结构不合法，重试一百次也不会好，反而烧钱。上面示例为了简洁统一捕获了，真实项目里要按错误类型分开。
- **重试要有上限和总预算**。否则一个卡住的请求会无限占用连接。

### 为什么要检查 `finish`

`finish` 比内容本身更重要，它告诉你**这次输出是怎么结束的**：

| finish | 含义 | 你该做什么 |
|---|---|---|
| `stop` | 正常说完 | 继续走解析 |
| `length` | 撞到长度上限，被硬截断 | 别解析了，压缩上下文或加大预算后重来 |
| `tool` | 它想调工具 | 进入工具分支（[工具调用](./06-tool-calling.md)） |
| `error` / 空 | 异常 | 走降级或人工 |

:::warn 最常见的低级事故
拿到一个被截断的 JSON 直接 `json.loads()`，抛异常，然后整个请求 500。**先判 `finish`，再解析内容**——顺序反了，线上一定出事。
:::

### 为什么成本要当场打印

不是省钱强迫症，是为了让你在**第一周就建立体感**。你会立刻发现：把整份制度文档每轮重发一遍，输入量是问题本身的几十倍；把 `max_tokens` 从 800 调到 200，输出费用直接掉下来。到了[上下文工程](./07-context.md)，这些数字就是你的优化依据。

## 四、四种失败，四种处理

把上一节的骨架画成一张决策图，基本上就是生产环境里调用层的全部：

:::figure 调用失败的四种去向
@flow
发起调用|超时或抖动|参数或鉴权错|输出被截断|正常结束
:::

对应动作：

- **超时 / 抖动 / 限流** → 指数退避重试，超过次数走降级（返回「稍后再试」，别把异常抛给用户）。
- **参数 / 鉴权错** → 立刻失败、记日志、告警，绝不重试。
- **输出被截断** → 不解析；压缩上下文或提高预算后重来一次，仍失败走降级。
- **正常结束但内容不合法** → 这是下一篇的主题：输出契约与自动纠正。

:::ask 想一个边界情况
如果第 3 次重试刚好成功，但前两次其实已经执行成功了、只是响应在回程丢了——会发生什么？提示：如果这次调用后面接的是「下单」「发邮件」这类有副作用的动作，重试就会造成重复执行。这个坑在[工具调用](./06-tool-calling.md)里用「幂等键」解决。
:::

## 五、把五块内容填进真实场景

回到开篇的制度助手，一次完整请求应该长这样：

```python
SYSTEM = """你是公司内部制度助手，服务于在职员工。
规则：
1. 只依据【材料】里的内容回答，不得引用外部常识。
2. 材料不足时，明确列出缺什么信息，不要补全、不要猜测。
3. 答案里必须给出引用到的材料段落编号。
4. 输出为 JSON，字段：answer(str)、citations(list[int])、need_clarify(bool)。
"""
MATERIAL = """[1] 2026 版休假制度：年假按自然年结算，未休部分可结转至次年 3 月 31 日。
[2] 2026 版休假制度：结转年假不折现，过期作废。
[3] 2025 版休假制度：未休年假可申请折现。"""

r = client.call(
    system=SYSTEM,
    user="【材料】\n" + MATERIAL + "\n\n【问题】我去年没休的年假能折现吗？",
    temperature=0,
    max_tokens=400,
)
```

注意 `【材料】` 是拼进 `user` 里的，不是另开一个字段——**因为模型看到的只有一整段文字**，这一点上一篇已经讲过。也注意规则里写了「材料不足时说明缺什么」，这是把上一篇那句「真实性必须由系统补」落到了提示词上；但请记住，**提示词只是提高胜率，真正兜底还得靠校验**，那就是下一篇。

:::check 学完这一篇，你要能回答
- 一次请求的五块内容分别是什么？你最容易漏哪一块？
- 为什么重试要区分错误类型？举一个「越重试越糟」的例子。
- `finish == "length"` 时直接解析会出什么事？正确顺序是什么？
- 如果调用后面接的是「发邮件」，重试会带来什么风险？
:::

## 小结

:::figure 这一篇的产物
@stack
一个骨架::ModelClient：五块内容 + 超时 + 退避 + 成本
一层隔离::CallResult 让上层不依赖任何具体服务
一个习惯::先判 finish，再解析内容
四种去向::重试 / 立刻失败 / 压缩重来 / 正常解析
:::

现在你已经能稳定地「问一句、拿一句」了。但拿回来的字符串还不一定是你想要的 JSON——下一篇把这件事彻底解决。

下一步：[让输出稳定下来](./03-structured-output.md) —— 三层输出契约、自动纠正重试、以及什么时候该果断降级。
