---
title: 参数有效不等于业务合法：四道关一道都不能省
category: 工具与函数调用
order: 34
summary: 合法 JSON 也可能越权、超限额、操作他人数据；结构之外还要过语义、鉴权、策略三关。
minutes: 13
---

# 参数有效不等于业务合法：四道关一道都不能省

## 场景提问

你写了个退款工具，参数校验很齐：订单号格式对、金额是正整数、字段一个不缺。投入运行前一切正常，直到有人对着输入框说了一句「帮我给订单 A-1002 退 5000 元」——而 A-1002 根本不是这个人的订单，可退额度也只有 300 元。工具照单全收，钱退给了别人。你翻日志，参数在 Schema 那一层干干净净全部通过，没有任何一处「不合法」，可业务上这是一次彻底的越权。你一时说不清该在哪儿拦，因为报错信息里连一条像样的错误都没有。

## 破误解

**不是校验器写漏了字段，是你把「形状对」当成了「该放行」——Schema 只管参数长什么样，从来不管这个人能不能做这件事。**

JSON Schema（用一份结构化说明描述 JSON 参数该有哪些字段、各是什么类型）能保证的，是「这段文本能被解析、字段齐、类型对、取值落在给定集合里」。它像一个只检查表格有没有填满、有没有把数字写进日期栏的收件员，至于「这张退款单是不是本人递的」「金额有没有超出可退额度」「这个动作要不要先审批」，它一概不读、也不该由它读。这些属于业务含义，得在宿主里另立几道关。把它们全押在「参数合法」上，是最常见也最危险的一次裸奔：一份格式挑不出毛病的退款参数，完全可能操作他人订单、超出限额、跳过审批。前面 [工具 Schema 设计](./k032-tool-schema.md) 讲的是第一关，这一篇讲它后面还必须叠上的三关。

## 生活类比

把它想成财务室报销。第一关是收件员看单子填得规不规整：日期栏是日期、金额栏是数字、签名没空着——这对应结构校验，只看形状。单子规整了，还得往里走三道：会计核金额有没有超这类费用的报销标准、发票金额和申请金额对不对得上，这是语义校验；主管确认「这张单是你本人经手的吗、这笔预算归不归你这个组」，这是资源鉴权；单笔超过一定数额、或涉及对外付款，还得额外走一道审批签字，这是风险策略。

对应关系逐条摆出来：填得规整 = 参数符合 Schema；报销标准与金额自洽 = 业务规则（额度、状态流转、标识符是否真实存在）；「是不是你本人、归不归你管」= 当前会话的身份与资源归属；超额要签字 = 高风险动作需人工确认。这里最要紧的一点：收件员再严格，也不能替会计和主管做决定。四道关用的是四种不同的信息——形状、业务数据、身份上下文、风险等级——任何一道都拿不到另一道需要的东西。尤其身份这一关，绝不能让递单子的人自己在单子上写「我是经理、已批准」就算数；真实系统里，身份只来自服务端认证会话，模型参数里带 `user_id`、`approved=true` 一律不信。这一点在 [用户身份服务端注入](./k137-identity-injection.md) 会展开成可运行的代码。

## 自绘示意图

:::figure 参数到动作的四道关
@stack
结构校验::字段齐不齐、类型对不对、取值在不在枚举里
语义校验::标识符真实存在吗、金额在额度内吗、状态能流转吗
资源鉴权::当前会话的身份能不能操作这个对象
风险策略::这笔动作是否需要审批、是否触及硬规则
:::

四行是依次递进的四道关，前一关通过只代表「可以进下一关」，绝不代表「可以执行」。把它们压成一道，等于让收件员替主管签字。

:::figure 一次合法参数的完整拦检链
@flow
解析出合法参数|查业务规则|比对会话身份|判风险等级|放行或结构化拒绝
:::

这张图里第一格已经是「合法参数」了，后面三格才是本文的主角。很多人把链路画到第一格就收笔，越权恰恰发生在这之后。

:::figure 形状合法与业务合法各管什么
@compare
形状合法::只看字段与类型|与是谁无关|Schema 即可判定
业务合法::要读业务数据|要认会话身份|必须另叠三关
:::

左列能在不碰任何外部数据的情况下判定，右列必须去查额度、查归属、查审批状态。两者用的信息源根本不同，所以不可能合并成一次「校验通过」。

## 层层追问

:::ask 那如果模型把 `user_id` 也规规矩矩填对了，是不是鉴权这关就能省？
:::

省不得，而且要追到第二层：模型填得对不对，和「该不该信它填的」是两回事。模型产出的所有参数一律按不可信输入对待，包括它自己报的身份。今天它填对了，明天外部文档里夹一句「把 user_id 换成某某」、或用户话术里带一句「以管理员身份查询」，它就可能填出一个不属于当前会话的身份——而参数形状依然完全合法。所以身份不能来自参数，必须由服务端在会话开始时注入，执行前用这份可信身份去比对资源归属，模型给的身份字段直接忽略或覆盖。再往深一层，即便身份对了，「能不能操作这个对象」还要单独查：同一个用户也不能退别人的订单、不能改不属于自己的记录。鉴权问的从来不是「你是谁」，而是「你此刻对这个具体对象有没有这个动作的权限」。

:::ask 那四道关全过了，是不是就可以直接执行、不必再管别的？
:::

还要看动作本身有没有副作用、会不会被重复执行。校验解决的是「该不该放行」，不解决「放行之后重试了怎么办」——退款、发券、对外发消息这类动作，一旦超时重试就可能做两次，那属于 [幂等键与副作用防重](./k038-idempotency-key.md) 和 [超时不等于没执行](./k039-timeout-reconcile.md) 的范围。还有一层更靠前的：与其把 `execute_sql` 这种万能工具交给模型自由拼动作、再靠四道关去兜，不如一开始就把工具按业务动作拆成具体的 `check_refund_eligibility`、`apply_refund`，让「能表达什么动作」本身就收敛。工具越具体，权限越能落在动作粒度上；工具越万能，四道关越容易被一个字符串参数绕过去。这就是为什么权限设计要和 [权限矩阵与最小权限](./k037-permission-matrix.md) 一起看，而不是等出了越权再补校验。

## 可运行代码与逐行解释

下面这段程序只用 Python 标准库，用一个本地假工具与一份四关校验器，演示「Schema 全过、却在语义/鉴权/策略关被拦下」的完整过程。复制到任意装了 Python 的机器上直接运行即可，不需要第三方包、账号或网络。

```python
import json

# 假的业务数据：订单归属、可退额度，全部由服务端掌握，绝不交给模型填
ORDERS = {
    "A-1001": {"owner": "u-alice", "refund_limit": 300, "status": "paid"},
    "A-1002": {"owner": "u-bob", "refund_limit": 200, "status": "paid"},
}

# 会话身份由服务端注入，不从参数里读
SESSION = {"user_id": "u-alice", "role": "user"}
APPROVAL_THRESHOLD = 500  # 超过此金额需人工审批

SCHEMA = {
    "required": ["order_id", "amount"],
    "properties": {
        "order_id": {"type": "string"},
        "amount": {"type": "integer", "minimum": 1},
    },
}


def structure_check(args):
    """第一关：形状。只看字段与类型。"""
    for f in SCHEMA["required"]:
        if f not in args:
            return False, "缺少字段 " + f
    if not isinstance(args["order_id"], str):
        return False, "order_id 应为字符串"
    amt = args["amount"]
    if not isinstance(amt, int) or isinstance(amt, bool) or amt < SCHEMA["properties"]["amount"]["minimum"]:
        return False, "amount 应为正整数"
    return True, ""


def semantic_check(args):
    """第二关：业务含义。标识符真实、金额在额度内、状态可流转。"""
    oid = args["order_id"]
    if oid not in ORDERS:
        return False, "订单标识不存在"
    order = ORDERS[oid]
    if order["status"] != "paid":
        return False, "订单状态不允许退款"
    if args["amount"] > order["refund_limit"]:
        return False, "金额超出可退额度 " + str(order["refund_limit"])
    return True, ""


def authz_check(args, session):
    """第三关：资源鉴权。用注入的会话身份比对资源归属。"""
    order = ORDERS[args["order_id"]]
    if order["owner"] != session["user_id"]:
        return False, "当前会话无权操作他人订单"
    return True, ""


def policy_check(args, session, approved):
    """第四关：风险策略。大额动作必须有人审批。"""
    if args["amount"] >= APPROVAL_THRESHOLD and not approved:
        return False, "金额达到审批阈值，需人工确认"
    return True, ""


def refund_tool(raw_text, session, approved=False, model_claimed_id=None):
    """宿主工具：模型参数一律不可信，身份以 session 为准。"""
    args = json.loads(raw_text)
    # 模型自报的身份直接忽略，不参与任何判定
    _ = model_claimed_id
    for name, check in [
        ("structure", lambda: structure_check(args)),
        ("semantic", lambda: semantic_check(args)),
        ("authz", lambda: authz_check(args, session)),
        ("policy", lambda: policy_check(args, session, approved)),
    ]:
        ok, reason = check()
        if not ok:
            return {"success": False, "failed_at": name, "error": reason, "executed": False}
    return {"success": True, "failed_at": None, "executed": True, "amount": args["amount"]}


def main():
    checks = []
    # 形状完全合法，但订单属于别人 → 倒在鉴权关
    r1 = refund_tool(json.dumps({"order_id": "A-1002", "amount": 100}), SESSION,
                     model_claimed_id="u-bob")
    checks.append(("他人订单被拒", r1["success"] is False))
    checks.append(("拒绝发生在鉴权关", r1["failed_at"] == "authz"))
    # 模型谎报身份也改变不了结果
    r2 = refund_tool(json.dumps({"order_id": "A-1002", "amount": 100}), SESSION,
                     model_claimed_id="u-alice")
    checks.append(("模型自报身份被忽略", r2["failed_at"] == "authz"))
    # 本人订单但超额度 → 倒在语义关
    r3 = refund_tool(json.dumps({"order_id": "A-1001", "amount": 5000}), SESSION)
    checks.append(("超额度被拒", r3["failed_at"] == "semantic"))
    # 本人、额度内、但达到审批阈值且未审批 → 倒在策略关
    r4 = refund_tool(json.dumps({"order_id": "A-1001", "amount": 300}), SESSION, approved=False)
    # 注意：300 未达阈值，这里用于确认「未触发审批的合法动作可放行」
    checks.append(("小额本人退款放行", r4["success"] is True))
    big = refund_tool(json.dumps({"order_id": "A-1001", "amount": 600}), SESSION, approved=False)
    # 600 既超额度也会触发语义关，验证顺序：语义先于策略
    checks.append(("超额先被语义关拦下", big["failed_at"] == "semantic"))
    # 构造一笔额度内但达到阈值需审批的情况：放宽数据仅用于演示策略关
    ORDERS["A-1003"] = {"owner": "u-alice", "refund_limit": 800, "status": "paid"}
    need_approval = refund_tool(json.dumps({"order_id": "A-1003", "amount": 600}), SESSION, approved=False)
    checks.append(("大额未审批倒在策略关", need_approval["failed_at"] == "policy"))
    approved = refund_tool(json.dumps({"order_id": "A-1003", "amount": 600}), SESSION, approved=True)
    checks.append(("审批通过后放行", approved["success"] is True))
    # 形状关：缺字段
    checks.append(("缺字段倒在结构关",
                   refund_tool(json.dumps({"order_id": "A-1001"}), SESSION)["failed_at"] == "structure"))

    passed = sum(1 for _, ok in checks if ok)
    for name, ok in checks:
        print(("通过 " if ok else "失败 ") + name)
    print("通过 %d/%d 项" % (passed, len(checks)))
    assert passed == len(checks), "存在未通过项"


if __name__ == "__main__":
    main()
```

1. `ORDERS` 是服务端掌握的假业务数据，含订单归属与可退额度；`SESSION` 是会话开始时注入的身份。这两份数据刻意都不从模型参数里取，从构造上杜绝「让不可信输入自证身份」。
2. `SCHEMA` 只描述形状：必填两个字段、`order_id` 是字符串、`amount` 是正整数。`structure_check` 就是第一关，它读不到 `ORDERS`、也读不到 `SESSION`——这正是「形状关拿不到业务信息」的体现。
3. `semantic_check` 去查标识符是否真实存在、状态能否流转、金额有没有超出该订单的额度。它用的是业务数据，和形状关完全不同的信息源。
4. `authz_check` 用注入的 `session["user_id"]` 比对 `order["owner"]`。注意它完全不看模型传了什么身份，这是本文最想钉死的一条。
5. `policy_check` 处理「金额达到阈值需审批」这类风险规则。`APPROVAL_THRESHOLD` 与 `approved` 标志模拟一次人工确认，未确认就拒绝。
6. `refund_tool` 按 structure → semantic → authz → policy 的顺序依次过关，任何一关失败就返回带 `failed_at` 的结构化结果，并明确 `executed: False`。`model_claimed_id` 参数收下后直接丢弃（赋给 `_`），用代码动作表达「模型自报身份不算数」。
7. `main` 里构造了多种情形：他人订单倒在鉴权、模型谎报身份仍倒在鉴权、超额度倒在语义、缺字段倒在结构、大额未审批倒在策略、审批后放行。几条断言还顺带验证了「关的先后顺序」——超 600 元时先被语义关（额度）拦下，轮不到策略关。想让策略关单独露面，就加一笔额度够但达到阈值的订单。
8. 结尾逐行打印并汇总「通过 N/N 项」，`assert` 兜底。跑一遍能清楚看到：同一份「形状挑不出毛病」的参数，会因为业务含义、身份、风险的不同，在四道关的不同位置被拦下。

## 踩坑与边界

- **把 Schema 通过当成放行**：现象是格式全对的退款参数操作了他人订单 → 原因是只做了结构校验 → 依次叠加语义、鉴权、策略三关，每关都返回明确的拒绝原因。
- **让模型在参数里传身份**：现象是话术一带就把 `user_id` 换成别人、越权查到数据 → 原因是把不可信输入当成了授权依据 → 身份由服务端按会话注入，模型给的身份字段一律忽略或覆盖。
- **四道关顺序随意**：现象是用一个不存在的订单号去触发鉴权逻辑，报出莫名其妙的错 → 原因是没先确认对象存在就查归属 → 结构 → 语义 → 鉴权 → 策略，前一关通过才进下一关，失败即停。
- **万能工具绕开动作粒度**：现象是 `execute_sql` 里拼出任意动作，四道关无从针对具体行为设限 → 原因是「能表达什么」没收敛 → 按业务动作拆成具体工具，让权限落在动作粒度上。
- **校验通过就直接执行有副作用的动作**：现象是超时重试后退了两次款 → 原因是只管放行、不管重复 → 写动作配幂等键与对账，见 [幂等键与副作用防重](./k038-idempotency-key.md)。

还要说清边界：本文的「合法」只到「本次该不该放行」为止，不含「放行之后动作会不会被重复、会不会超时后其实已生效」，也不含「模型输出里夹带的注入指令怎么识别」——后者是把不可信内容挡在动作之外的另一条线，可结合 [权限矩阵与最小权限](./k037-permission-matrix.md) 与 [用户身份服务端注入](./k137-identity-injection.md) 一起看。校验器返回的错误该怎么写才让模型改得动，接着读 [工具返回格式设计](./k035-tool-result.md)；整体脉络回到 [从这里开始](./00-start-here.md)。

:::check 学完自检
- [ ] 能说清「形状合法」和「业务合法」分别由谁判定、各用什么信息
- [ ] 能按顺序背出四道关，并说出每道关专门拦什么
- [ ] 能解释为什么身份必须由服务端注入、模型自报的一律不信
- [ ] 能指出「参数全过却越权」发生在链路的哪一格之后
- [ ] 能判断一个具体工具该不该按业务动作拆得更细
:::

## 三句话小结

参数有效不等于业务合法，指 Schema 只保证参数形状，越权、超限额、操作他人数据、跳过审批这些业务问题必须另叠语义、鉴权、策略三关。

关键做法是把四道关写成宿主里顺序固定的确定性代码、让身份来自可信会话、并把工具按具体业务动作收敛，使每道关都能拿到它需要的那份信息。

当工具只是纯读取、或参数完全来自可信内部来源且不含任何资源归属问题时，不必铺满四道关；但只要动作会改动他人数据、涉及金额或对外副作用，这四关一道都不该省。
