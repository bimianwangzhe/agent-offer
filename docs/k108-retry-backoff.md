---
title: 重试、指数退避与抖动：别让重试成为第二次冲击
category: 生产化与成本
order: 108
summary: 间隔翻倍、加上限和随机抖动，避免下游刚恢复就被重试压垮。
minutes: 12
---

# 重试、指数退避与抖动：别让重试成为第二次冲击

## 场景提问

你给助手接了一个查询接口，偶尔会返回「服务暂时不可用」。你很自然地加了个重试：失败就再调一次，还不行就再调一次，连试五次。单测里下游只在第一次失败，重试一次就成功，一切正常。可真正对外服务的某天，下游因为负载过高抖了一下，成百上千个请求同时失败、又几乎在同一毫秒一起重试，本来只是有点喘的下游被这一波齐刷刷的重试直接压趴下，恢复时间反而被拖得更长。你看着监控发懵：明明加了重试，怎么情况更糟了？

## 破误解

**不是重试次数不够，是「失败就立刻再试」把一次小故障放大成了一波同步冲击。**

很多人把重试理解成「多给几次机会」，于是写成一失败就马上再来、间隔固定、次数拉满。问题在于，失败往往不是单个请求的偶然，而是下游整体在那一刻吃紧：所有客户端会在几乎相同的时间点感知到失败，又用几乎相同的节奏重试，于是它们的第二次、第三次请求又叠在一起准时到达。这种大量客户端步调一致地同时涌来的现象叫惊群（thundering herd，一群本来散开的请求突然挤到同一时刻）。下游刚要缓过来，就被下一波整齐的重试按回去。重试从「补救手段」变成了「第二次事故」。真正要设计的不是「试几次」，而是「什么时候再试」，让重试在时间上散开、并且越失败越克制。

## 生活类比

把它想成给一家很忙的店铺打订座电话。电话占线，多数人的本能是立刻重拨，一秒一次，越打不着越急。可如果全城几百个人都在同一 minute 被告知「现在可以订了」，又都养成了「占线就立刻重拨」的习惯，那么交换机每隔一秒就会被同一批人同时砸一次，接线员根本腾不出手，谁都打不进来。

聪明的做法有三条，正好对应重试策略的三个零件。第一，别一秒一次地死磕，而是这次没通就等两秒、再没通等四秒、再等八秒，越不顺利越拉长间隔，这叫指数退避（exponential backoff，等待时间按次数翻倍增长）；给接线员留出喘息的窗口，而不是持续占用线路。第二，等待不能无限翻倍，得有个天花板，比如最多等到十几秒就不再往上加，否则一个小故障会让你等上好几分钟，这叫上限（cap）。第三，也是最容易被忽略的：即便大家都用「两秒、四秒、八秒」，如果节拍完全一样，仍然会在两秒后、四秒后齐齐重拨。所以每个人要在自己的等待上再加一点点随机零头，比如两秒到两秒六之间随便取一个值，这叫抖动（jitter，给等待时间掺入随机量，把整齐的重试时刻打散）。对应关系很直接：占线是下游失败，重拨是重试，越拉越长的间隔是退避，天花板是上限，那个随机零头就是抖动。三条凑齐，几百个人才不会挤成同一波。

## 自绘示意图

:::figure 一次带退避与抖动的重试链
@flow
调用失败|等待翻倍|加随机抖动|再次尝试|成功或达上限
:::

注意「等待翻倍」和「加随机抖动」是两件独立的事，顺序不能省：翻倍解决的是「越失败越别急」，抖动解决的是「大家别踩同一个点」，只做其中一件都挡不住惊群。

:::figure 两种重试姿势的差别
@compare
立刻固定间隔重试::同一刻齐刷刷到达|下游恢复被反复打断|失败越久冲击越猛
翻倍加抖动重试::重试时刻被摊开|给下游留出恢复窗|越失败节奏越克制
:::

左边是「多给几次机会」的朴素写法，右边是把时间也当成资源来管的写法。二者单次看差别不大，放到大量客户端一起失败的时刻，结果会截然不同。

## 层层追问

:::ask 那如果下游一直不恢复，一直退避下去会怎样？
:::

这正是「上限」要管的事，而且它有两层含义。一层是单次等待的上限：间隔翻倍不能无限翻，翻到某个天花板就停住，避免把一次调用拖成几分钟。另一层是总次数的上限：试到既定次数仍失败，就必须果断停止，转去 [超时与确定性降级](./k109-timeout-fallback.md) 给一个确定的兜底结果，而不是无限期地挂在那里。没有这两道上限，重试会把「快速失败」拖成「慢慢失败」，上游请求、连接、内存全被占着，故障反而扩散。还要提醒一句：重试只该用在「这次失败、下次可能成功」的临时性错误上；参数写错、权限不足这类确定性错误，重试一万次也是错，重试前先分类能省下大量无效流量。

:::ask 那如果多个进程各用各的随机种子，抖动还打得散吗？
:::

抖动要生效，前提是各客户端的随机量彼此独立。如果所有进程都用同一个固定种子、又在同一时刻启动，它们的「随机」零头会完全相同，抖了等于没抖——这也是为什么演示代码里把随机种子显式传进去、并专门验了「换种子结果不同」。真实部署时随机源要来自各自进程，而不是共享一个写死的序列。再往深一层，光靠客户端自觉还不够稳妥：下游侧最好配合配额、限流和自动切断开关一类的保护，在真的被打满时主动挡一部分流量。客户端的退避与抖动是第一道自觉，服务端的削峰是第二道兜底，两边都做才稳。

## 可运行代码与逐行解释

下面这段只用 Python 标准库，用一个本地模拟下游（前几次抛错、之后成功）把「翻倍、上限、抖动、次数上限」四件事都跑一遍，结尾用一组断言逐条验证性质。随机种子固定，结果可复现，不需要任何第三方包、账号或网络。

```python
import random


def raw_backoff(attempt, base, cap):
    """第 n 次重试的基准等待：base * 2^n，但不超过上限 cap。"""
    return min(cap, base * (2 ** attempt))


def backoff_with_jitter(attempt, base, cap, jitter_ratio, rng):
    """在基准等待上叠加随机抖动，打散同一时刻一起重试的客户端。"""
    raw = raw_backoff(attempt, base, cap)
    span = raw * jitter_ratio
    return raw + rng.uniform(0, span)  # 抖动区间 [raw, raw+span]


class Downstream:
    """本地模拟的下游：前 fail_times 次抛错，之后成功。"""

    def __init__(self, fail_times):
        self.fail_times = fail_times
        self.calls = 0

    def call(self):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise RuntimeError("下游暂时不可用")
        return {"status": "ok", "call": self.calls}


def call_with_retry(downstream, max_attempts, base, cap, jitter_ratio, seed):
    rng = random.Random(seed)  # 固定种子，结果可复现
    delays = []
    for attempt in range(max_attempts):
        try:
            result = downstream.call()
            return result, delays, attempt
        except RuntimeError:
            if attempt == max_attempts - 1:
                return None, delays, attempt
            delays.append(backoff_with_jitter(attempt, base, cap, jitter_ratio, rng))
    return None, delays, max_attempts - 1


def main():
    base, cap, jitter = 0.1, 1.6, 0.3
    no_jitter = [raw_backoff(n, base, cap) for n in range(6)]
    checks = [
        ("基准等待按指数翻倍", no_jitter[0] == 0.1 and abs(no_jitter[1] - 0.2) < 1e-9 and abs(no_jitter[2] - 0.4) < 1e-9),
        ("基准等待被上限 cap 截断", no_jitter[4] == cap and no_jitter[5] == cap),
        ("所有基准等待不超过 cap", all(x <= cap + 1e-9 for x in no_jitter)),
    ]

    d1 = call_with_retry(Downstream(fail_times=3), max_attempts=6, base=base, cap=cap, jitter_ratio=jitter, seed=42)
    result, delays, retries = d1
    checks.append(("第 4 次调用成功", result == {"status": "ok", "call": 4}))
    checks.append(("共重试 3 次", retries == 3 and len(delays) == 3))
    checks.append(("每次等待都带正抖动", all(x >= raw_backoff(i, base, cap) - 1e-9 for i, x in enumerate(delays))))

    d2 = call_with_retry(Downstream(fail_times=3), max_attempts=6, base=base, cap=cap, jitter_ratio=jitter, seed=7)
    checks.append(("不同种子抖动结果不同", d1[1] != d2[1]))

    d3 = call_with_retry(Downstream(fail_times=99), max_attempts=4, base=base, cap=cap, jitter_ratio=jitter, seed=1)
    checks.append(("超过重试上限果断放弃", d3[0] is None and d3[2] == 3))

    passed = sum(1 for _, ok in checks if ok)
    for name, ok in checks:
        print(("通过 " if ok else "失败 ") + name)
    print("通过 %d/%d 项" % (passed, len(checks)))
    assert passed == len(checks), "存在未通过项"


if __name__ == "__main__":
    main()
```

1. `raw_backoff` 用 `min(cap, base * (2 ** attempt))` 一行同时实现「翻倍」和「封顶」：第 0 次等 `base`，第 1 次翻倍，翻到 `cap` 之后 `min` 会把它压住不再涨。
2. `backoff_with_jitter` 先取基准等待 `raw`，再算出抖动幅度 `span = raw * jitter_ratio`，最后用 `rng.uniform(0, span)` 在这个区间里取一个随机零头加上去。抖动是「只加不减」，保证等待不会短于基准值。
3. `Downstream` 是一个本地桩：`call` 每被调用一次 `calls` 加一，前 `fail_times` 次抛 `RuntimeError`，之后返回正常结果。它模拟了「临时故障、之后恢复」这一类可重试错误，不涉及任何真实请求。
4. `call_with_retry` 用 `random.Random(seed)` 构造独立随机源；循环里先试着调用，成功就立即返回；失败且还没到 `max_attempts - 1`，才算一次等待并追加到 `delays`；最后一次仍失败则返回 `None`，交给上层降级。
5. `main` 第一段直接检查 `raw_backoff` 的序列：`0.1, 0.2, 0.4, 0.8, 1.6, 1.6`，由此证明「按指数翻倍」和「被 cap 截断」两条性质都成立。
6. 接着用 `fail_times=3` 的下游跑一次，断言第 4 次调用成功、恰好重试 3 次、每次等待都带正抖动；再换一个 `seed` 跑一遍，断言等待序列不同，用来证明抖动确实依赖独立随机源、能打散时刻。
7. 最后用 `fail_times=99`、`max_attempts=4` 模拟下游始终不恢复，断言到达次数上限后返回 `None` 并停在最后一次尝试——对应「不超过上限、果断转降级」。结尾 `assert` 保证任何一条性质被破坏都会以非零状态退出。

## 踩坑与边界

- **对确定性错误也重试**：现象是参数错误、越权、格式不对的请求被反复重试，流量白烧、问题却分毫未动 → 原因是没区分「临时」与「确定」两类失败 → 重试前先看错误类型，只对可能自愈的临时错误重试。
- **只翻倍不加抖动**：现象是单客户端看不出问题，多客户端一起失败时仍在同一刻齐刷刷重试 → 原因是所有实例节拍完全一致 → 在每次等待上叠加独立随机零头，并确认各进程随机源彼此独立。
- **等待没有上限**：现象是一次调用被拖成好几分钟，连接和内存被长期占用 → 原因是间隔无限翻倍 → 给单次等待设天花板，并给总次数设上限。
- **无上限地一直重试**：现象是下游没恢复，请求却永远不返回，上游越堆越多 → 原因是缺总次数上限 → 试到既定次数就停，转去 [超时与确定性降级](./k109-timeout-fallback.md) 返回确定的兜底。
- **忽略了有副作用的动作**：现象是写类动作超时后重试，结果被执行了两次 → 原因是「没收到回执」被当成了「没执行」 → 这类动作必须配合 [幂等落盘](./k107-idempotent-persist.md) 的幂等键，让重试安全。

还要分清两层保护：退避与抖动是调用方的自觉，用来不制造惊群；真正被打满时，还需要 [高并发与并发上限](./k115-concurrency.md) 里的排队、限流与降级从服务端削峰。另外，重试会让「一次用户请求」变成「多次下游调用」，用量与延迟都会放大，做成本账时不能只按一次调用算，这一点在 [成本优化与发布清单](./k116-cost-checklist.md) 里要单独记一笔。

:::check 学完自检
- [ ] 能说清为什么「失败就立刻重试」会把小故障放大成惊群
- [ ] 能解释指数退避、上限、抖动各自解决的是哪一个问题
- [ ] 能徒手写出 `min(cap, base * 2**n)` 这样的等待公式
- [ ] 能判断哪些错误值得重试、哪些必须立刻放弃
- [ ] 能说出有副作用的动作重试前为什么需要幂等键
:::

## 三句话小结

重试、指数退避与抖动，是把「失败后再试」从立刻重拨改成越失败越克制、且各客户端不踩同一时刻的一套节奏控制。

关键做法是等待按次数翻倍但设天花板、每次叠加独立随机零头、总次数设上限并只重试临时性错误。

当错误是确定性的、动作没有幂等保障、或下游已被打满时，不该继续重试，而应立刻失败、降级或转人工。
