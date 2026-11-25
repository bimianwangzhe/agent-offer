---
title: 从 Demo 到上线：差的不是部署
category: 评测与可靠性
order: 13
summary: 本地跑通和敢开给别人用之间，隔着十项显式化：幂等落盘、结构化日志、超时降级、健康检查、指标、灰度与回滚。
minutes: 22
---

# 从 Demo 到上线：差的不是部署

几乎每个项目都经历过这一天：本地演示一切正常，部署到服务器上，第一天就出问题。

- 用户刷新了一下页面，同一个请求被发了两次，工单建了两张；
- 某个下游接口慢了 20 秒，整个请求挂住，连接池被占满；
- 出错时页面只显示「Internal Server Error」，客服不知道发生了什么；
- 想复盘昨天那次异常，翻日志只有几行 `print`，关键上下文全没有；
- 改了一版发上去，第二天发现某个场景坏了，只能连夜回滚，还不知道该回滚哪一版。

**这些问题没有一个是「模型不聪明」造成的。** 它们全是 Demo 里被省略掉的东西。

:::quote
上线不是「把代码放到服务器上」，是**把本地开发时所有隐含的假设，一条条变成显式的契约**：会超时、会重复、会失败、会变慢、会被回滚。
:::

## 一、Demo 与上线，差的十项

| # | 项目 | Demo | 上线 |
|---|---|---|---|
| 1 | 状态 | 内存变量 | 可持久化、可恢复、带版本 |
| 2 | 幂等 | 没考虑 | 落盘，重启后仍生效 |
| 3 | 超时 | 默认无限等 | 每层独立超时 + 总超时 |
| 4 | 重试 | 随手 try | 区分错误类型 + 退避 + 上限 |
| 5 | 失败 | 抛异常 | 结构化降级 + 用户可读提示 |
| 6 | 日志 | `print` | 结构化、带 trace_id、可检索 |
| 7 | 轨迹 | 没存 | 每轮完整留痕，可回放 |
| 8 | 指标 | 无 | 延迟、轮数、成本、失败率、降级率 |
| 9 | 预算 | 无 | 四道闸 + 单用户限流 |
| 10 | 发布 | 直接覆盖 | 评测门禁 + 灰度 + 一键回滚 |

这十项里，**第 2、5、6 是最先该补的三项**——它们决定了出事时你能不能查、能不能兜、有没有重复伤害用户。

## 二、一次请求的完整生命周期

:::figure 上线版请求链路
@flow
接入限流|生成 trace_id|幂等检查|加载状态|带预算循环|结果校验|结构化降级|落轨迹与指标
:::

注意「幂等检查」排在「加载状态」之前：同一个请求重发时，理想情况是**连循环都不进**，直接返回第一次的结果。这比在工具层做幂等更省，也更彻底。

## 三、一份能跑的上线骨架

```python
# production.py —— 零依赖，python production.py
import json, time, os, hashlib, uuid
from collections import defaultdict

IDEM_PATH, LOG_PATH = "idem_store.json", "trace_log.jsonl"

def load(path, default):
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return default
    return default

def atomic_write(path, obj):
    """原子写：先写临时文件再替换，避免进程崩在半路留下半截 JSON。"""
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    os.replace(tmp, path)

def append_jsonl(path, row):
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")

def log(level, trace_id, event, **kw):
    """结构化日志：每行一个 JSON，字段固定，方便检索与告警。"""
    append_jsonl(LOG_PATH, {"ts": round(time.time(), 3), "level": level,
                            "trace_id": trace_id, "event": event, **kw})

class Metrics:
    def __init__(self):
        self.c = defaultdict(int)
        self.lat = []

    def inc(self, k, n=1): self.c[k] += n
    def observe(self, ms): self.lat.append(ms)

    def snapshot(self):
        s = sorted(self.lat)
        return {"requests": self.c["req"], "ok": self.c["ok"],
                "degraded": self.c["degraded"], "failed": self.c["failed"],
                "idempotent_hit": self.c["idem"],
                "p95_ms": s[int(len(s) * .95)] if s else 0,
                "avg_ms": round(sum(s) / len(s), 1) if s else 0}

class ProductionRunner:
    def __init__(self, handler, budget_rounds=6, timeout=5.0):
        self.handler = handler          # 业务函数，返回 (结果, 轨迹)
        self.budget_rounds = budget_rounds
        self.timeout = timeout
        self.idem = load(IDEM_PATH, {})
        self.metrics = Metrics()
        self.healthy = True

    def _key(self, user, payload):
        raw = user + "|" + json.dumps(payload, sort_keys=True, ensure_ascii=False)
        return hashlib.md5(raw.encode()).hexdigest()[:16]

    def handle(self, user, payload):
        t0, tid = time.time(), uuid.uuid4().hex[:12]
        self.metrics.inc("req")
        log("info", tid, "request_in", user=user)

        # 1) 幂等：重复请求直接返回首次结果，连业务都不进
        k = self._key(user, payload)
        if k in self.idem:
            self.metrics.inc("idem")
            log("info", tid, "idempotent_hit", key=k)
            return self.idem[k]

        try:
            # 2) 带总超时执行业务（真实项目用信号/协程超时，这里用检查点模拟）
            if time.time() - t0 > self.timeout:
                raise TimeoutError("总超时")
            result, trace = self.handler(payload)
            if len(trace) > self.budget_rounds:
                raise RuntimeError("轮数超预算")

            # 3) 结果校验：结构不合法也走降级，绝不把脏结果给用户
            if not isinstance(result, dict) or "answer" not in result:
                raise ValueError("结果结构不合法")

            out = {"ok": True, "data": result, "trace_id": tid,
                   "rounds": len(trace), "degraded": False}
            self.metrics.inc("ok")
            log("info", tid, "done", rounds=len(trace))

        except TimeoutError as e:
            out = self._degrade(tid, "timeout", str(e))
        except Exception as e:
            out = self._degrade(tid, "error", "%s: %s" % (type(e).__name__, e))

        # 4) 落幂等 + 轨迹 + 指标
        self.idem[k] = out
        atomic_write(IDEM_PATH, self.idem)
        append_jsonl("run_trace.jsonl", {"trace_id": tid, "trace": trace
                     if "trace" in dir() else []})
        self.metrics.observe((time.time() - t0) * 1000)
        return out

    def _degrade(self, tid, kind, why):
        """降级必须是结构化的、用户可读的、不泄露内部细节的。"""
        self.metrics.inc("failed" if kind == "error" else "degraded")
        log("warn", tid, "degraded", kind=kind, reason=why[:120])
        return {"ok": False, "degraded": True, "trace_id": tid,
                "data": {"answer": "暂时无法完成，请稍后重试或联系人肉协助。",
                         "need_clarify": True},
                "hint": "如对结果有疑问，可提供此编号查询：%s" % tid}

    def health(self):
        return {"healthy": self.healthy,
                "idempotent_entries": len(self.idem),
                "metrics": self.metrics.snapshot()}

# ---------- 模拟业务：第 2 个请求故意失败，用来看降级 ----------
calls = {"n": 0}
def biz(payload):
    calls["n"] += 1
    if calls["n"] == 2:
        raise OSError("下游数据源暂时不可用")
    trace = [{"round": 0, "action": "search", "result": {"ok": True}}]
    return {"answer": "2026 版不折现", "citations": [2],
            "need_clarify": False}, trace

if __name__ == "__main__":
    r = ProductionRunner(biz)
    req = {"q": "年假能折现吗"}
    print("== 四次请求（含一次重复、一次故障）==")
    for i, (u, p) in enumerate([("u1", req), ("u1", req),
                                ("u2", req), ("u3", req)], 1):
        out = r.handle(u, p)
        print("  %d. ok=%-5s degraded=%-5s %s" %
              (i, out["ok"], out.get("degraded"),
               (out["data"].get("answer") or "")[:34]))
    print("\n== 健康检查 ==")
    print(json.dumps(r.health(), ensure_ascii=False, indent=2))
    print("\n== 结构化日志（末 3 行）==")
    with open(LOG_PATH, encoding="utf-8") as f:
        for line in f.read().strip().split("\n")[-3:]:
            print("  ", line[:170])
```

跑完看四个结果：第 2 次是**重复请求**（幂等命中，连业务都没进），第 3 次业务抛错被降级成「暂时无法完成 + 可查询编号」，第 4 次正常。健康检查里能看到请求数、降级数、幂等命中数、P95 延迟。

:::tip 降级文案的三个要求
**用户能看懂**（不说 `OSError`）、**不泄露内部细节**（不贴堆栈、不贴系统提示）、**给一个可追踪的编号**。第三点最常被漏，但它决定了客服能不能在两分钟内定位问题。
:::

## 四、可观测三件套

:::figure 出事时你手上要有的三样东西
@stack
结构化日志::每行一个 JSON，带 trace_id / 轮次 / 动作 / 耗时 / 级别
指标::请求量、成功率、降级率、P95 延迟、平均轮数、单次成本
轨迹::完整动作序列与结果，能在本地复现任意一次请求
:::

三者分工：**指标告诉你「出事了」，日志告诉你「在哪一轮」，轨迹告诉你「当时到底发生了什么」**。只装监控大盘没有轨迹，等于只知道疼但查不出病因。

还要设三个最有用的告警：

- 降级率突增（下游挂了 / 新版本回归）；
- 平均轮数或单次成本突增（循环开始绕路 / 上下文膨胀）；
- 危险动作被提议的次数（有人在系统性地试探护栏）。

## 五、降级策略矩阵

不是所有失败都该返回同一句话。按失败类型定动作：

| 失败类型 | 动作 | 用户看到 |
|---|---|---|
| 超时 / 下游抖动 | 退避重试 → 仍失败走降级 | 「稍后重试」+ 编号 |
| 输出结构不合法 | 有限次自纠 → 结构化降级 | 「暂时无法完成」+ 编号 |
| 材料不足 | 直接 `need_clarify`，不重试 | 「需要确认：适用哪一版制度」 |
| 权限不足 | 立刻拒绝，不重试 | 「当前账号无此权限」 |
| 预算将尽 | 主动收尾，给部分结论 | 「已尽力完成，以下为已确认部分」 |
| 危险动作未确认 | 挂起等人工 | 「该操作需要你确认」 |

:::warn 材料不足别重试
这是[评测](./11-eval.md)和[检索增强](./08-rag.md)都强调过的点：**歧义是要上报的信号，不是要修好的错误**。重试只会让模型编得更像。
:::

## 六、发布：门禁 → 灰度 → 回滚

一次改动上线的正确顺序：

:::figure 发布三道关
@flow
评测门禁|小流量灰度|观察指标|全量或回滚
:::

- **门禁**：[评测](./11-eval.md)的回归基线必须先过，核心用例 100%。
- **灰度**：先放 5% 流量，重点看降级率、平均轮数、成本这三个指标。
- **回滚**：配置与提示词要**版本化**，能一键回到上一版。最怕的是「改了提示词但没记版本号」，出事只能靠回忆。

:::quote
发布的目标不是「一次发对」，是**「发错了能在两分钟内退回去，并且知道退的是哪一版」**。
:::

## 七、上线自检清单

- [ ] 十项对照表逐条勾过，尤其是幂等落盘、结构化降级、结构化日志
- [ ] 幂等检查排在业务之前，重复请求不进循环
- [ ] 每层独立超时 + 一个总超时
- [ ] 所有写操作原子写，不留半截文件
- [ ] 日志带 `trace_id`，指标能算 P95，轨迹能本地复现
- [ ] 降级文案不泄露内部细节，且带可查询编号
- [ ] 四道预算 + 单用户限流已开
- [ ] 评测门禁接入发布流程，提示词与配置有版本号
- [ ] 灰度与一键回滚演练过一次

:::check 学完这一篇，你要能回答
- 为什么说「上线不是部署」？Demo 里最常省略的三项是什么？
- 幂等检查为什么应该排在「加载状态 / 跑循环」之前？
- 降级文案的三个要求是什么？
- 可观测三件套分别回答什么问题？
- 「材料不足」为什么不该重试？
- 发布三道关里，回滚的前提条件是什么？
:::

## 小结

:::figure 这一篇的产物
@stack
一张十项表::把隐含假设变成显式契约
一份骨架::幂等落盘 / 超时 / 结构化降级 / 日志 / 指标 / 健康检查
三件套::日志定位轮次、指标发现异常、轨迹复现现场
一条发布链::门禁 → 灰度 → 观察 → 回滚
:::

到这里，你已经能独立交付一个「敢开给别人用」的系统了。最后两篇切换到求职视角：**怎么把这套能力变成简历上三个能讲十五分钟的项目，以及怎么答到面试官的第四层追问**。

下一步：[三个能写进简历的项目](./14-projects.md)
