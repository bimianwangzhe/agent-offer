---
title: 工具 Schema 设计：把参数错误挡在执行之前
category: 工具与函数调用
order: 32
summary: 用类型、枚举、必填、范围写清参数契约，把大半参数错误挡在模型之后、执行之前。
minutes: 13
---

# 工具 Schema 设计：把参数错误挡在执行之前

## 场景提问

你接了个「订会议室」的工具，模型十次里有三次把 `count`（参会人数）填成字符串 `"five"`，或者把 `priority` 填成 `"the highest one"`，下游函数拿到就抛异常。你试着在提示词里反复写「请务必传整数、请只填 low/medium/high」，情况时好时坏。更头疼的是有一次模型干脆漏填了城市字段，工具用空值查了一通，返回一堆莫名其妙的结果，你翻了半天日志才定位到是参数从源头就少了东西。

## 破误解

**不是模型不认识数字，是你只给了一个名叫 `string` 的大口袋，却指望它自己往里装对东西。**

提示词里的「请务必」是一句请求，不是一道约束；模型每一步都从整个词表里自由挑下一个字，它不是在填一张被严格校验的表单。真正能在执行之前把错误挡住的，是一份机器可读的参数契约，工程上叫 Schema（模式，指用结构化描述写清「有哪些字段、各是什么类型、取值允许哪些」的说明书，工具场景里常用 JSON Schema 这种写法来描述）。这份说明书有两个作用：给模型一个明确的目标，让它知道该填什么；更关键的是给宿主一段可以确定性执行的校验代码，让不合法的参数在碰到真实业务之前就被拦下并返回具体错误。把力气花在 Schema 上，比反复加「请务必」有效得多，因为前者是机制，后者只是措辞。这一层和前面讲的 [职责边界](./k031-fc-boundary.md) 是连着的：说明书给模型看，校验器握在宿主手里，两边用的是同一份契约。

## 生活类比

把它想成快递站的寄件单。早期你只给寄件人一张空白纸，写什么全凭自觉，于是有人把「重量」写成「大概两斤」、把「城市」空着、把「是否保价」写成「看着办」，分拣机一读就卡住。后来站点换了带格子的标准单：重量那一格只印了数字键盘、旁边标着「1 到 50」，写字母根本按不下去；城市那一格是必填，不填不给提交；「保价」那格只有「是 / 否」两个勾选项，想写「看着办」没地方下笔；「派送时段」给了一张固定清单，只能从「上午 / 下午 / 晚间」里挑。

对应关系很整齐：那张带格子的单子就是 Schema；数字键盘就是 `type: integer`（整数类型）；「1 到 50」就是 `minimum` 与 `maximum`（取值下限与上限）；必填格就是 `required`；勾选清单就是 enum（enumeration，枚举，指把取值锁死在一个有限集合里）；分拣机就是宿主里的校验器。这里有个容易忽略的细节：格子的约束得是「物理上按不下去」，而不是在单子边角印一行小字「请填 1 到 50」——把枚举写进描述文字、却仍把字段声明成自由字符串，就跟印小字一个效果，模型照样能自造出 `P1`、`urgent` 这类取值。真正收窄自由度靠的是类型声明本身，不是旁边的提醒。至于哪些字段该设成必填，规律也来自这张单子：只把「寄件人此刻一定知道」的项设成必填，别把「所属时区」这种用户压根没提、模型只能凭空编的列进去。

## 自绘示意图

:::figure 一份工具 Schema 常写的四类约束
@stack
类型约束::把 count 定成整数、active 定成布尔，挡住类型错
闭集约束::状态与优先级用枚举锁死，不给自由文本留口子
范围约束::整数配上下限、数组配长度，防越界取值
必填约束::只放模型能从对话推断出的字段，其余给默认值
:::

这四行是同一份说明书的四个侧面，缺任何一类都会留出一个特定的漏洞：没有类型就有 `"five"`，没有枚举就有 `"urgent"`，没有范围就有超大数值，必填列得太多反而逼模型编造。

:::figure 一次参数校验的先后顺序
@flow
解析参数文本|查必填字段|验类型与枚举|验范围与格式|放行或结构化报错
:::

五格里，只有第一格碰文本，后面四格都是宿主里的确定性判断。任何一格不过，就该当场停下并把「哪个字段、为什么不对」结构化地送回去，而不是让参数继续往下走。

:::figure 只做解析与先校验的差别
@compare
只做容错解析::脏参数一路进下游|到运行时才炸|排查只能翻日志
先按 Schema 校验::不合法当场拦下|返回具体错误字段|模型一次就能改对
:::

左边是「能 parse 就放行」的写法，错误被推迟到下游才暴露，定位成本高；右边把判断提前，代价只是多写一段校验器，换来的却是每条错误都能指出具体字段。

## 层层追问

:::ask 那如果开了更严格的结构化输出，是不是就可以把服务端校验删了？
:::

万万不能。这是要追到第二层的关键一问。约束解码（指在生成过程中直接屏蔽会让输出变得不合法的候选字，使结果在构造上必然符合格式）能保证的是「结构合法」：字段齐、类型对、枚举值属于给定集合、订单号长得像标识符。但它管不到值的业务含义——枚举选 `high` 还是 `low` 合不合规、这个订单号是不是真实存在、金额算得对不对、这单能不能退，它一概不知道。一份挑不出格式毛病的退款参数，照样可能越权操作别人的订单。所以严格输出和服务端语义校验是叠加关系，不是替代关系；关于「合法却不合规」的展开，放到 [参数有效不等于业务合法](./k034-param-validity.md) 里专门讲。这里先记住一条：格式关和含义关，是两道不同的关。

:::ask 那必填字段是不是列得越全越严谨？
:::

恰恰相反。模型看到必填项一多，会倾向于「自己编一个值来凑齐」，因为它被要求必须交出每个字段。用户全程没提过时区，你把 `timezone` 列进必填，模型就会凭空编一个地区；用户没说会员等级，你硬要一个 `tier`，它就猜一个。更稳的做法是：只把「模型能从当前对话里确切推断出来」的字段设成必填，其余设成可空、给默认值，或者干脆拆成另一次调用先问清楚。还有一层更隐蔽的：嵌套别太深。把后端的数据模型原样搬进工具定义，动辄四五层，模型提取到中途很容易丢字段；能扁平就扁平，用扁平命名或把大工具拆成几个小工具。写完一份说明书，可以拿它对照 [工具描述写法](./k033-tool-description.md) 再过一遍——参数约束和文字说明是互补的两半，哪一半含糊，另一半都补不回来。

## 可运行代码与逐行解释

下面这段程序只用 Python 标准库，手写一份迷你 Schema 校验器，把「枚举写错、类型填错、漏必填、超范围」四类高频错误逐个拦下，并对照「只解析不校验」时脏参数如何一路流到假下游。复制到任意装了 Python 的机器上直接运行即可，不需要第三方包、账号或网络。

```python
import json
import re

# 一份工具说明书：字段、类型、枚举、范围、必填，集中在一处
SPEC = {
    "required": ["city", "count"],
    "properties": {
        "city": {"type": "string", "pattern": r"^[\u4e00-\u9fa5A-Za-z]+$"},
        "count": {"type": "integer", "minimum": 1, "maximum": 50},
        "priority": {"type": "string", "enum": ["low", "medium", "high"]},
        "tags": {"type": "array", "minItems": 1},
    },
}


def check_type(value, expected):
    if expected == "integer":
        # bool 是 int 的子类，要显式排除，否则 True 会被当整数放过
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "string":
        return isinstance(value, str)
    if expected == "array":
        return isinstance(value, list)
    return True


def validate(spec, args):
    """返回 (是否通过, 错误清单)。每条错误都点名字段与原因。"""
    errors = []
    for field in spec["required"]:
        if field not in args:
            errors.append("缺少必填字段 " + field)
    for field, value in args.items():
        rule = spec["properties"].get(field)
        if rule is None:
            errors.append("字段 " + field + " 不在说明书里")
            continue
        if not check_type(value, rule["type"]):
            errors.append("字段 " + field + " 类型应为 " + rule["type"])
            continue
        if "enum" in rule and value not in rule["enum"]:
            errors.append("字段 " + field + " 取值不在枚举 " + str(rule["enum"]) + " 内")
        if rule["type"] == "integer":
            if "minimum" in rule and value < rule["minimum"]:
                errors.append("字段 " + field + " 小于下限")
            if "maximum" in rule and value > rule["maximum"]:
                errors.append("字段 " + field + " 超过上限")
        if rule["type"] == "string" and "pattern" in rule:
            if not re.match(rule["pattern"], value):
                errors.append("字段 " + field + " 不符合格式")
        if rule["type"] == "array" and "minItems" in rule:
            if len(value) < rule["minItems"]:
                errors.append("字段 " + field + " 元素少于下限")
    return (len(errors) == 0, errors)


def host_dispatch(raw_text):
    """宿主：先解析、再校验，通过了才交给下游。"""
    args = json.loads(raw_text)
    ok, errors = validate(SPEC, args)
    if not ok:
        return {"success": False, "errors": errors, "retry_hint": "按错误清单修正参数后重试"}
    return {"success": True, "data": fake_downstream(args)}


def fake_downstream(args):
    """假下游写函数：只记录收到的参数，不真的改任何东西。"""
    return {"stored": dict(args)}


def naive_dispatch(raw_text):
    """对照：只做解析不做校验，脏参数一路进下游。"""
    return {"success": True, "data": fake_downstream(json.loads(raw_text))}


def main():
    checks = []
    good = json.dumps({"city": "北京", "count": 3, "priority": "high"}, ensure_ascii=False)
    bad_enum = json.dumps({"city": "北京", "count": 3, "priority": "urgent"}, ensure_ascii=False)
    bad_type = json.dumps({"city": "北京", "count": "five"}, ensure_ascii=False)
    missing = json.dumps({"city": "北京"}, ensure_ascii=False)
    bool_as_int = json.dumps({"city": "北京", "count": True}, ensure_ascii=False)
    out_of_range = json.dumps({"city": "北京", "count": 999}, ensure_ascii=False)

    checks.append(("合法参数被放行", host_dispatch(good)["success"] is True))
    r_enum = host_dispatch(bad_enum)
    checks.append(("枚举外的取值被拦下", r_enum["success"] is False))
    checks.append(("错误里点名了 priority", any("priority" in e for e in r_enum["errors"])))
    checks.append(("类型错被拦下", host_dispatch(bad_type)["success"] is False))
    checks.append(("漏必填被拦下", host_dispatch(missing)["success"] is False))
    checks.append(("布尔冒充整数被拦下", host_dispatch(bool_as_int)["success"] is False))
    checks.append(("超范围被拦下", host_dispatch(out_of_range)["success"] is False))
    checks.append(("校验失败带可操作提示", "retry_hint" in r_enum))

    # 对照：同样这份脏参数，不校验就原样进了下游
    naive = naive_dispatch(bad_type)
    checks.append(("不校验时脏参数进了下游", naive["data"]["stored"]["count"] == "five"))
    checks.append(("校验后脏参数没进下游", "data" not in host_dispatch(bad_type)))

    passed = sum(1 for _, ok in checks if ok)
    for name, ok in checks:
        print(("通过 " if ok else "失败 ") + name)
    print("通过 %d/%d 项" % (passed, len(checks)))
    assert passed == len(checks), "存在未通过项"


if __name__ == "__main__":
    main()
```

1. `SPEC` 把四类约束写在一个字典里：`required` 是必填清单，`type` 定类型，`enum` 锁闭集，`minimum`/`maximum`/`minItems`/`pattern` 管范围与格式。集中一处的好处是「说明书」和「校验器」同源，改字段时不会两边对不上。
2. `check_type` 里对 `integer` 特别排除了 `bool`。Python 中 `True` 是 `int` 的子类，若不排除，模型把人数填成 `true` 会被当成整数悄悄放过——这正是「细节里藏着坑」的典型例子。
3. `validate` 先查必填，再逐字段查类型、枚举、范围、格式，把所有问题收集成一份错误清单返回。注意错误字符串里都点名了字段名与原因，这是后面「模型一次就能改对」的前提：含糊的一句「参数错误」对纠正毫无帮助。
4. 类型不通过时用 `continue` 跳过后续比较，避免拿字符串去和整数下限比大小导致程序抛异常。校验器自己必须是确定、不会崩的代码，否则反而成了新的故障点。
5. `host_dispatch` 演示正确顺序：`json.loads` 解析 → `validate` 校验 → 不通过就返回带 `retry_hint` 的结构化错误，通过才调用 `fake_downstream`。JSON（JavaScript Object Notation，一种纯文本数据格式）在这里再次只是「模型交上来的文本」。
6. `naive_dispatch` 是对照组：只解析、不校验，直接把参数交给假下游。它存在的意义是让「只做容错解析」这条偷懒路径的后果可见。
7. `main` 里构造了六份参数，覆盖枚举错、类型错、漏必填、布尔冒充整数、超范围，以及一份合法的。断言逐个确认：该放的放、该拦的拦、错误点了名字段、失败带重试提示。最后两条对比尤为要紧——同一份 `"five"`，不校验时 `stored["count"]` 就是 `"five"`，校验后连 `data` 字段都不会产生。
8. 结尾逐行打印每条断言并汇总「通过 N/N 项」，`assert` 保证任何一条不成立就以非零状态退出。跑一遍就能看到：大半参数错误根本不需要模型变聪明，一份写对的说明书加一段校验器就挡住了。

## 踩坑与边界

- **把枚举写进描述却仍声明成 string**：现象是描述里明写「传 A 或 B」，模型照样自造 `urgent`、`P1` → 原因是约束解码只看类型声明，不看描述文字 → 用 `enum` 把取值锁进集合，`type: string` 的自由口袋换成有限清单。
- **所有字段一律 string**：现象是 `count` 收到 `"five"`、`active` 收到 `"yes"`、`list` 收到 `"a,b,c"`，下游转换时报错 → 原因是字符串没有任何结构约束 → 分别换成 `integer` 加范围、`boolean`、`array of string`，别指望「下游反正会转」。
- **必填列得过多**：现象是用户没提过的字段被模型凭空编出来凑齐 → 原因是 required 逼模型交出每个值 → 只放模型能从对话确切推断的字段，其余设可空或给默认值。
- **后端契约与工具定义两套**：现象是后端悄悄把订单号换成新格式，工具定义没跟上，几个月后才集中报错 → 原因是两份说明分开维护 → 让 Schema 与后端契约同源，任何一侧变更都同步另一侧并跑回归。
- **校验失败只回一句笼统的「参数错误」**：现象是模型带着同一段错误反复重试、始终修不好 → 原因是错误里没说哪个字段错、错在哪 → 回「字段 + 实际值 + 允许范围」的结构化清单，并给重试次数设上限。

还要留意这份校验器的位置：它只管「参数形状对不对」，不管「这个人能不能操作这单」「金额是否超出可退额度」——那属于含义与权限的关，得再叠一层，本文的 `validate` 一条都没碰。把 Schema 通过误当成安全放行，是这一章最危险的一次越界。想接着看形状之外的几道关，读 [参数有效不等于业务合法](./k034-param-validity.md)；想看校验失败后该怎么把错误写得让模型改得动，接 [工具返回格式设计](./k035-tool-result.md)；整体脉络可回到 [从这里开始](./00-start-here.md)。

:::check 学完自检
- [ ] 能说清 Schema 是给谁看的、又给哪段代码用
- [ ] 能列举至少四类约束，并各配一个它专门能挡住的错误
- [ ] 能解释为什么把枚举写进描述文字等于没约束
- [ ] 能说出必填字段该按什么标准挑，以及为什么不是越多越好
- [ ] 能讲清「结构合法」与「业务合法」为什么是两道不同的关
:::

## 三句话小结

工具 Schema 设计，是用类型、枚举、必填、范围把参数写成一份机器可读的契约，让模型有明确目标、让宿主有可执行的校验依据。

关键做法是让说明书与后端契约同源、用类型声明而非描述文字收窄自由度、只把能推断的字段设必填，并把每条校验失败都回成点名字段的具体错误。

当参数只在一处可信来源里流转、或字段本身就是完全开放的自由文本时，不必套上全套约束；但只要参数要驱动真实动作，这道形状关就不该被跳过，更不能用「请务必」这类措辞代替。
