---
title: 审批超时默认拒绝与责任归因
category: 安全与护栏
order: 149
summary: 高风险审批超时一律不执行，并把这次拒绝的来龙去脉记成可追责的账。
minutes: 14
---

# 审批超时默认拒绝与责任归因

## 一、场景提问

你给一个会替人办事的智能体加了道保险：凡是转账、改额度、对外发消息这类动作，先弹一张审批单给负责人，负责人点了「同意」才真正执行。上线头几天挺顺，直到某个周五下午，负责人手机没电、审批消息被一堆群聊淹了，那张单子一直挂在「等待中」。周一早上你翻记录，发现那笔两万元的转账没人批过，却已经打出去了——因为当初写代码时图省事，留了一句「超时就当默认同意，别卡着流程」。更糟的是，事后你想弄明白「这到底是谁放的、凭什么」，日志里只有一行「任务完成」，发起人是谁、本该谁批、什么时间该截止、最后是谁拍的板，一个都答不上来。一个本该最安全的闸门，反而成了最容易出事、又最说不清的地方。

## 二、破误解

**不是审批人没干活儿就该让它过去，也不是「默认拒绝」就等于没人负责；真正的分界是「没有明确批准就绝不执行」，同时把这次拒绝的来龙去脉记成谁都赖不掉的账。**

先把两个方向摆清楚。人在回路（HITL，Human-In-The-Loop，把真人放进自动流程里做确认）本来就是为了让高风险动作多一道人的把关，凡是涉及钱、权限、对外副作用的动作，都该先挂起等一个明确的「同意」，这部分在 [人在回路与高风险确认](./k102-human-in-loop.md) 里讲过。问题出在「等不到」的时候：审批人下班、离职、消息被淹、甚至故意拖着不点，系统必须有一个确定行为。这个行为只有两种取法——默认放行（fail-open，出故障或超时时维持「照常通过」）和默认拒绝（fail-safe，也叫 fail-closed，故障导向安全，出问题时自动倒向「不执行、不给权限」这一边）。

选前者，等于把「没人管」偷偷翻译成「同意」：只要挑审批人不在的时间发起高风险动作，就能绕过整道关卡，而且越权是静悄悄发生的，连错误日志都不会报。选后者，超时的单子被判成「拒绝」，动作不执行，安全是保住了，可如果到此为止、只写一句「超时未处理」，麻烦会换个形式回来：没人知道这条请求卡了多久、本该谁批、是不是审批通道本身坏了、下次该不该把时限调长，流程缺陷被「反正没出事」掩盖过去。

所以这件事其实是两个必须同时做到的半边。第一半是结果上的安全：没有那个明确的、来自有权审批人的「同意」，就绝不产生任何副作用，超时一律按拒绝结算。第二半是过程上的可交代：把「谁发起、要做什么、风险多高、本该谁在什么时候之前批、最后由谁或哪条规则拍板、依据的是哪一版策略」逐条记下来，让事后能回答「这一步为什么这样、该找谁、要不要改流程」。前者管住动作，后者管住责任，缺哪半都会出事。把「默认拒绝」误当成「这事就结束了」，是很多团队踩过的最隐蔽的坑——安全事故是没了，可流程一直在烂，直到某天有人为了「别再卡单」把闸门整段注释掉。

## 三、生活类比

把它想成公司里领用保险柜钥匙。规矩很死：钥匙不能自己拿，必须由保管员当面在登记本上签字、写明用途，你才能取走。有一次保管员临时开会不在，前台小姑娘看你着急，说「要不你先拿去用，回头补个签字」——这就是默认放行，看着体贴，实质是把「保管员没在场」当成了「保管员同意」，真丢了东西谁都说不清。

稳妥的做法是另一套：保管员不在，钥匙就一直锁在柜里，谁也拿不走，这是默认拒绝。但事情不能停在这。登记本上要如实记一笔：「某日某时，某某来领钥匙，指定保管员某某，因保管员未在场、超过约定等待时间，本次未领用，按《钥匙管理规则》第 3 条由值班制度兜底」。这一笔把发起人、指定审批人、时间点、依据的规矩、最终是谁（这里是制度而非某个具体的人）拍的板全钉死了。

对应关系很具体：保险柜钥匙就是那笔高风险动作；保管员当面签字就是明确的「批准」；保管员开会不在就是审批超时；「先拿走回头补签」就是默认放行；「没签字就一直锁着」就是默认拒绝；而那本写满来龙去脉的登记本，就是责任归因要落的账。这里最容易被忽略的一处是：登记本记的是「制度兜底未领用」，不是编一句「保管员不同意」——把系统的默认行为栽到某个人头上，看似给了个交代，实则污染了事实，复盘时会误判成「保管员太严」，而不是「等待时限定得不合理、缺个替补审批人」。这个类比还点出另一层：光有「锁着不给」不够，还得有个能运转的兜底——比如约定「主管不在时由副手代批」，否则每次都卡死，早晚有人忍不住图省事去走那条「先拿后补签」的近路。

## 四、自绘示意图

:::figure 一条高风险审批从发起到超时结算
@flow
发起高风险请求|挂起等待审批|到达截止时刻|无人批即默认拒绝|写责任账本可归因
:::

这五个格子有两处千万别并成一格。「挂起等待审批」意味着请求此刻既不是「同意」也不是「拒绝」，而是一个独立的中间状态，动作被冻结、副作用为零；只有明确批准才会跳到执行，否则就顺着时间走到「到达截止时刻」。而最后一格「写责任账本可归因」不是可省的收尾：没有它，前面所有安全都只保住了这一次，下一次同样的卡单还会重演。很多实现把「超时」直接接到「按成功处理」，整条链路就塌了。

:::figure 责任账本必须能回答的五件事
@stack
发起人与动作::谁发起、要做什么、风险等级多高
指定审批人::这条本该由谁在期限内确认
三个时刻::发起、截止、最终决策各记一个时间点
决策者与依据::是谁或哪条策略拍的板、哪一版
状态与留痕::每次状态变化都追加一条可查记录
:::

五行里最容易漏的是「三个时刻」和「决策者与依据」。少了时间点，就说不清「到底卡了多久」，也就没法判断时限该不该调；少了「是谁或哪条策略」，「默认拒绝」会变成一笔没有主语的糊涂账——事后既找不到人，也定位不到是哪版规则在起作用。注意「决策者」这一栏允许填的是策略标识，比如「按超时默认拒绝策略兜底」，这不叫甩锅，而是如实区分「人做的决定」和「制度做的决定」。每次状态变化都追加、而不是覆盖，才能还原出「先挂起、后超时」的完整经过，这和 [结构化日志与轨迹回放](./k095-structured-log.md) 里讲的一事一记是同一套思路。

:::figure 超时那一刻两种取法的差别
@compare
超时默认拒绝::高风险不执行|故障导向安全|留痕可追责
超时默认放行::无人批也照做|越权悄悄发生|事后难说清
:::

左边是故障导向安全，右边是图省事。二者在「一切正常」时看不出差别，真正的分水岭全在审批人缺位的那一刻：一边把风险收住，一边把权限悄悄放大，而且右边这种放大不会报错、不会告警，往往要等出了事才被发现。这也是为什么它必须由 [护栏放在代码里](./k106-guardrail-in-code.md) 的确定性分支来保证，而不是指望有人记得去点、或者靠一句口头约定。

## 五、层层追问

:::ask 那如果审批人只是晚了几分钟，钱其实该转，默认拒绝会不会把正常业务也误伤了？
:::

会，而且这个担心是对的，但它不该用「默认放行」来解决。先分清两件事：**放行一个动作**和**处理一条超时请求**是两回事。超时那一刻，系统手里没有任何「这个人同意」的证据，凭什么替他做主说同意？稳妥的选择只能是拒绝这一次执行。误伤的解法在别处：给审批设一个合理的时限（TTL，Time To Live，这里指一张审批单的有效期），期限内没批就升级转交（escalation，把单子自动转给副手或上级），并让发起人能「重新发起一条新请求」而不是去改旧请求的状态。这样既不把无人确认的动作放过去，又给正常业务留了顺畅的出口。关键是新旧要分开：旧单如实记成「超时拒绝」，新单是全新的一次审批、新的时间线，谁也不能回头把旧单涂改成「早就同意了」——这一点和 [幂等落盘](./k107-idempotent-persist.md) 里「一次决策只用稳定标识结算一次」是同一个道理。顺带一提，超时后本人再来补批也必须被挡回去，否则「截止时刻」就形同虚设，这条边界在 [超时与确定性降级](./k109-timeout-fallback.md) 里也成立：过了点就是过了点。

:::ask 那如果超时的根本原因是审批消息根本没送到、或者被人冒名点了同意呢？默认拒绝还够用吗？
:::

这就把问题推到了第二层，也点出了「责任归因」为什么不能省。默认拒绝只保证「没人明确同意就不执行」，它保证不了两件事：请求是不是真的交到了有权人手里的，以及那条「同意」是不是本人发的。前者要靠审批通道本身的可达性和回执——消息发出去有没有被收到、有没有超时重投，属于 [超时不等于没执行](./k039-timeout-reconcile.md) 那类「别把没回应当成没发生」的谨慎；后者要靠身份由服务端注入、而不是信任请求里自带的名字，冒名审批必须被校验挡下，见 [最小权限与双层校验](./k100-least-privilege.md)。而把这两类异常和「谁该批、谁实际拍板、依据哪条策略」一起记进账本，正是责任归因的用武之地：复盘时你能一眼看出「这一批超时全是同一个审批人、且回执缺失」，从而判断是这个人离职了没换、还是通知通道坏了，该改的是替补规则还是投递链路，而不是笼统归成「用户没配合」。换句话说，默认拒绝管住的是「这一次别出事」，责任归因管住的是「下一次别再这样」；把它们和 [熔断与 kill switch](./k104-circuit-breaker.md) 那种「异常攒多了就整体掐断」配合起来，才是一套能收敛的护栏。若想看清这些字段怎么统一进一条可回放的记录，可对照 [Trace 该记什么](./k094-trace-fields.md)。

## 六、可运行代码与逐行解释

下面这段只用 Python 标准库，把「高风险挂起—期限内批准才执行—超时按默认策略拒绝—每次结算都写责任账本」完整演示一遍。时钟是注入的逻辑整数，不读真实时间，所有结果可手工推算、可复现；复制到任意装有 Python 的机器上直接运行即可，不需要任何第三方包、账号或网络。末尾还留了一个「默认放行」的对照组，用来直观看清它为什么危险。

```python
import json
import tempfile
from pathlib import Path


def risk_of(amount):
    """按金额判风险：超过阈值算高风险，必须人工审批。"""
    return "HIGH" if amount > 500 else "LOW"


class Approvals:
    """审批台账：用注入的逻辑时钟判定超时，并把每次结算写进责任账本。"""

    def __init__(self, path, ttl=5):
        self.path = Path(path)
        self.ttl = ttl
        self.requests = {}
        self.ledger = []   # 真正执行、产生副作用的动作
        self.audit = []    # 责任账本：每次状态结算留一条
        self._write()

    def _write(self):
        self.path.write_text(json.dumps({
            "ttl": self.ttl,
            "states": {k: v["state"] for k, v in self.requests.items()},
        }, ensure_ascii=False, sort_keys=True), encoding="utf-8")

    def submit(self, request_id, actor, action, amount, approver, now):
        """发起请求：高风险挂起等待审批，低风险按策略直接放行。"""
        level = risk_of(amount)
        record = {
            "request_id": request_id,
            "actor": actor,
            "action": action,
            "amount": amount,
            "level": level,
            "approver": approver,
            "submitted_at": now,
            "deadline": now + self.ttl,
            "state": "approved" if level == "LOW" else "pending",
            "decided_by": "policy:auto-low-risk" if level == "LOW" else None,
            "decided_at": now if level == "LOW" else None,
            "policy": "v1",
        }
        self.requests[request_id] = record
        self._audit(record, now)
        if record["state"] == "approved":
            self._execute(record)
        self._write()
        return record["state"]

    def approve(self, request_id, who, now):
        """审批人批准：身份须匹配、须未超时、须仍在待审批状态。"""
        record = self.requests[request_id]
        if record["state"] != "pending":
            return "已结算，忽略"
        if who != record["approver"]:
            return "审批人不符，拒绝"
        if now > record["deadline"]:
            return "已超时，不能批准"
        record["state"] = "approved"
        record["decided_by"] = who
        record["decided_at"] = now
        self._audit(record, now)
        self._execute(record)
        self._write()
        return "approved"

    def settle_expired(self, now):
        """扫一遍到点还没人批的请求：一律默认拒绝，并写明由策略兜底。"""
        denied = []
        for record in self.requests.values():
            if record["state"] == "pending" and now > record["deadline"]:
                record["state"] = "denied"
                record["decided_by"] = "policy:deny-on-timeout"
                record["decided_at"] = now
                denied.append(record["request_id"])
                self._audit(record, now)
        self._write()
        return denied

    def _execute(self, record):
        """真正执行：产生一次可观察副作用，只有批准状态才会走到这里。"""
        self.ledger.append((record["request_id"], record["action"], record["amount"]))

    def _audit(self, record, now):
        """责任归因：把一条决策的来龙去脉记成不可抵赖的账。"""
        self.audit.append({
            "request_id": record["request_id"],
            "actor": record["actor"],
            "action": record["action"],
            "level": record["level"],
            "approver": record["approver"],
            "submitted_at": record["submitted_at"],
            "deadline": record["deadline"],
            "state": record["state"],
            "decided_by": record["decided_by"],
            "decided_at": record["decided_at"],
            "policy": record["policy"],
            "logged_at": now,
        })

    def trace(self, request_id):
        """按请求号取出全部责任记录，供事后复盘与追责。"""
        return [a for a in self.audit if a["request_id"] == request_id]


def fail_open_settle(requests, now):
    """对照组：错误做法——超时默认放行，把没人批的动作也执行掉。"""
    executed = []
    for r in requests:
        if r["state"] == "pending" and now > r["deadline"]:
            r["state"] = "approved"
            executed.append(r["request_id"])
    return executed


def main():
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "approvals.json"
        app = Approvals(path, ttl=5)
        checks = []

        st_low = app.submit("r1", "alice", "查余额", 10, "bob", now=0)
        checks.append(("低风险自动放行", st_low == "approved"))
        checks.append(("低风险产生一次执行", len(app.ledger) == 1))

        st_high = app.submit("r2", "alice", "对外转账", 2000, "bob", now=0)
        checks.append(("高风险进入待审批", st_high == "pending"))
        checks.append(("挂起期间不执行", len(app.ledger) == 1))

        r = app.approve("r2", "mallory", now=1)
        checks.append(("冒名审批被拒绝", r == "审批人不符，拒绝"))
        checks.append(("冒名后仍是待审批", app.requests["r2"]["state"] == "pending"))

        r = app.approve("r2", "bob", now=6)
        checks.append(("超时后不能补批", r == "已超时，不能批准"))

        denied = app.settle_expired(now=6)
        checks.append(("超时请求被默认拒绝", "r2" in denied))
        checks.append(("默认拒绝不产生执行", len(app.ledger) == 1))
        checks.append(("默认拒绝写明由策略兜底",
                       app.requests["r2"]["decided_by"] == "policy:deny-on-timeout"))

        tr = app.trace("r2")
        last = tr[-1]
        checks.append(("账本记录发起人与指定审批人",
                       last["actor"] == "alice" and last["approver"] == "bob"))
        checks.append(("账本记录决策者与依据策略",
                       last["decided_by"].startswith("policy") and last["policy"] == "v1"))
        checks.append(("账本可算出发起、截止、决策时刻",
                       last["submitted_at"] == 0 and last["deadline"] == 5
                       and last["decided_at"] == 6))
        checks.append(("账本含每次状态变化留痕", len(tr) >= 2))

        app.submit("r3", "carol", "改额度", 900, "bob", now=0)
        r = app.approve("r3", "bob", now=3)
        checks.append(("期限内本人批准生效", r == "approved"))
        checks.append(("批准后才执行", len(app.ledger) == 2))
        checks.append(("批准决策归因到具体的人",
                       app.requests["r3"]["decided_by"] == "bob"))

        snap = json.loads(path.read_text(encoding="utf-8"))
        checks.append(("拒绝状态写进快照可查", snap["states"]["r2"] == "denied"))

        fo = [{"request_id": "x1", "state": "pending", "deadline": 5}]
        fo_exec = fail_open_settle(fo, now=6)
        checks.append(("对照组默认放行会误执行高风险", fo_exec == ["x1"]))

        passed = sum(1 for _, good in checks if good)
        for name, good in checks:
            print(("通过 " if good else "失败 ") + name)
        print("通过 %d/%d 项" % (passed, len(checks)))
        assert passed == len(checks), "存在未通过项"


if __name__ == "__main__":
    main()
```

1. `risk_of` 用一个金额阈值把请求分成高风险和低风险。真实系统里风险等级可能来自动作类型、金额、目标对象等多个维度，这里收成一个确定性函数，是为了让「哪条该挂起」能一眼看明白、结果不靠碰运气。
2. `Approvals` 里三份数据各司其职：`requests` 是每条请求的当前状态，`ledger` 只记录真正执行、产生副作用的动作，`audit` 是责任账本。`submit` 对低风险直接置成 `approved` 并调用 `_execute`，对高风险置成 `pending` 且**不**调用 `_execute`——「默认拒绝、挂起零副作用」就落在这一处分支上。
3. 每条 `record` 一次性把「谁发起 `actor`、做什么 `action`、风险 `level`、本该谁批 `approver`、发起与截止时刻、决策者 `decided_by`、决策时刻、策略版本 `policy`」都存下来。`decided_by` 特意允许是 `policy:...` 这样的策略标识：如实区分「人拍板」和「制度兜底」，正是责任归因不甩锅、也不冒认的关键。
4. `approve` 连挡三道：状态必须还是 `pending`、审批人身份必须与指定人一致、`now` 不能超过 `deadline`。冒名的 `mallory` 被第二道挡回，超时后本人才来补批被第三道挡回，任何一道失守都会让「明确批准」这件事变味。
5. `settle_expired` 是默认拒绝的落点：扫到「还挂着且已过截止」的请求，一律置成 `denied`，把 `decided_by` 写成 `policy:deny-on-timeout`，并**追加**一条审计。注意它全程不碰 `ledger`，所以断言里「默认拒绝不产生执行」成立。
6. `_audit` 每次状态变化都 `append` 一条完整记录，`trace` 按请求号把它们全取出来。于是 `r2` 能还原出「先挂起、后超时拒绝」两步，而不是只剩一个孤零零的最终状态——这正是「三个时刻」「每次留痕」能落地的原因。
7. `main` 用注入的 `now` 走完整条链：先验证低风险放行、高风险挂起不执行；再验证冒名被拒、超时不能补批、到点默认拒绝且由策略兜底；接着逐条核对责任账本能回答「谁发起、谁该批、谁拍板、依据哪版、各在什么时刻」；然后验证期限内本人批准才执行、决策归因到人、状态写进配置快照。最后的 `fail_open_settle` 是对照组，专门证明默认放行会把没人批的高风险动作也放进 `approved`。结尾 `assert` 保证任何一条性质被破坏都会以非零状态退出。
8. 这里用逻辑整数代替真实时钟、用本地临时文件代替审批数据库、用金额阈值代替风险引擎，全是为了让整条链路不联网、不要账号和第三方包就能独立跑通并手算核对。它演示的是「挂起—超时—默认拒绝—可归因」的顺序与边界，不是任何具体审批平台的实现。

## 七、踩坑与边界

- **超时当成默认同意**：现象是审批人缺位时高风险动作照常执行、越权静悄悄发生、日志里还不报错 → 原因是把「没有回应」错误翻译成了「同意」 → 把超时分支明确接到「拒绝」并断言执行账本为空，参照 [护栏放在代码里](./k106-guardrail-in-code.md)。
- **默认拒绝却只记一句「超时未处理」**：现象是安全没出事，但卡单反复发生、没人知道本该谁批、时限该不该调 → 原因是把「拒绝」当成了流程终点、没留下可复盘的账 → 每次结算都追加一条含发起人、指定审批人、三个时刻、决策者与策略版本的责任记录，见 [结构化日志与轨迹回放](./k095-structured-log.md)。
- **允许回头改旧单状态**：现象是审批人过点了再补批也生效、或者有人把「超时拒绝」涂成「早就同意」，时间线对不上 → 原因是用覆盖代替追加、没给请求一个只结算一次的稳态 → 过了截止一律挡回，正常业务走「重新发起新请求」的新时间线，思路同 [幂等落盘](./k107-idempotent-persist.md)。
- **信任请求里自带的审批人名字**：现象是随便填个名字就能把单子批掉、冒名同意防不住 → 原因是身份由调用方传入而非服务端注入校验 → 审批人身份与权限由服务端核定，配合 [最小权限与双层校验](./k100-least-privilege.md) 做双层核对。
- **把系统兜底栽到某个人头上**：现象是账本写成「某某不同意」，复盘误判成「审批人太严」，真正坏掉的通知通道或缺失的替补规则一直没修 → 原因是想给拒绝找个「人」当主语、模糊了人做决定与制度做决定 → `decided_by` 如实写策略标识，再靠累计的归因记录定位流程缺陷，异常攒多了就按 [熔断与 kill switch](./k104-circuit-breaker.md) 整体掐断。

还要划清两道边界。其一，「默认拒绝」不等于「永远不做」：它只结算这一次请求，正常业务应当靠时限设置、升级转交、重新发起这三条出口继续走，否则把闸门焊死，反而会逼出「先执行后补审批」的近路。其二，这套机制的代价是可用性和时延——每一次高风险动作都要等人、可能误伤正常请求，所以它只适用于真正有不可逆副作用的动作；对纯查询、只读、可随意重放的操作硬加审批，只会制造大量「看都不看就点同意」的麻木，反而稀释了真正需要把关的地方，这与 [动作白名单](./k148-decouple-allowlist.md) 里「分清哪些动作才配被严管」是同一条线。至于审批消息「发出去了到底算不算送达」这类含糊地带，则要按 [超时不等于没执行](./k039-timeout-reconcile.md) 的谨慎去处理，别把没回应当成没发生。

## 八、自检清单

:::check 学完自检
- [ ] 能说清默认放行与默认拒绝在审批人缺位那一刻各自的后果，以及为什么必须选后者
- [ ] 能徒手画出「挂起—到达截止—默认拒绝—写责任账本」的顺序，并指出挂起期零副作用
- [ ] 能列出责任账本至少五个字段，并解释为什么「决策者」允许填策略标识
- [ ] 能解释为什么超时后本人补批要挡回、正常业务该走「重新发起」而不是改旧单
- [ ] 能判断哪些动作适合加审批、哪些加了反而制造麻木
:::

## 九、三句话小结

审批超时默认拒绝与责任归因，是让高风险动作在拿不到明确批准时一律不执行，并把这次拒绝的发起人、指定审批人、时间点、决策者与策略依据记成可追责账本的一套护栏。

关键做法是超时分支确定性地接到拒绝、挂起期不产生任何副作用、身份由服务端核定、每次结算追加一条不可覆盖的记录，并给正常业务留好升级转交与重新发起的出口。

当动作纯只读、可随意重放、没有不可逆副作用时，不必套这套审批；但只要一次执行会动到钱、权限或对外状态，它就该被「没有明确同意绝不执行、且每次拒绝都说得清」这条线守着。
