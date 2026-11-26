---
title: 性质断言
category: 评测与可观测性
order: 88
summary: 测有没有出处、有没有越权这类性质，而不是答案一字不差。
minutes: 11
---
# 性质断言

## 场景：换个说法就判失败，编个假编号反倒过关

你给输出写了一条判定：`答案 == "每晚 600 元"`。第二天模型答成「住宿上限为 600 元/晚，需附发票」，意思完全正确，断言却红了；你放宽成「只要含 600 就算过」，结果有个回答含着 600，却顺手引了一个根本不存在的条款编号，还带着一句越权查来的内容，居然也放行了。更别提每次改提示词，措辞一变，标准答案就得跟着重写一遍。你盯着那条判定发愁：明明想验的是「答得对不对、有没有依据、有没有乱来」，写出来的却是一句逐字比对，既太严又太松，严在措辞、松在实质。

## 先破一个最常见的误解

**不是模型输出不稳，是你把「判定」建在了逐字比对上。** 断言，说白话就是程序里一条「必须成立」的检查；性质断言则是不去比对答案具体是哪几个字，而是检查这份输出「必须具备的性质」——能不能被解析、必备字段齐不齐、写出的引用是不是真有其物、数值落没落在允许范围、有没有走被禁止的动作、证据为空时有没有老实说不知道。为什么这样更稳？因为输出天然带不确定性，同一个正确结论可以有一百种说法，而「有没有出处」「有没有越权」这类性质不随说法变。字面比对把「表达方式」当成了「正确性」，于是措辞一变就误杀、措辞不变又可能被一段带错数字的话蒙混。性质断言把判定从「像不像标准答案」换成「守没守住几条硬规矩」，判定对象是稳定的，换一批数据、换一版提示词，规矩还立得住。它还有个附带好处：失败时能点名「哪条性质破了」，而不是只丢一句「不通过」，改起来知道往哪使劲。

## 用工厂质检的公差卡打个比方

把判定输出想成验一颗出厂的螺丝。质检员不会拿它跟「样品那一颗」逐条纹路比——每颗螺丝的编号、划痕都不一样，那么比只会把合格品全判废。他手里是一张公差卡：直径要落在公差带内、螺纹必须完整、材质标号要对、表面不能有裂纹。对应关系逐条对一遍：螺丝编号与划痕对应答案的措辞与标点，公差带对应数值范围这类性质，螺纹与材质标号对应必备字段与枚举这类性质，裂纹对应「越权、编造引用」这类禁止性质，那张公差卡对应一组写死的判定规则。一颗螺丝直径对了、螺纹全、标号对、没裂纹，就合格，哪怕它长得跟样品完全不同；反过来，磨得再亮，只要有一条裂纹就是废品。评测也一样：换个说法不影响合规，破了一条性质就得拦。逐字比对相当于拿放大镜比对样品划痕，既累又不准；按公差卡量，才是可复现、可解释的验法。

## 画出来看

先看一次判定是怎么走完的。注意「查必备项」和「查禁止项」是分开的两格：前者问「该有的有没有」，后者问「不该有的有没有」，两者方向相反，合成一步容易漏。

:::figure 一次性质判定的完整链路
@flow
解析输出|查必备项|查禁止项|汇总性质|判通过
:::

这张图里最容易被省掉的是「汇总性质」。只留一个布尔「过 / 不过」，失败时你不知道是哪条破的；把每条性质的判定留下来，报告才能点名。一组性质通常分四层，从便宜到贵、从确定到需要外部信息，摊开看是这样。

:::figure 性质断言的四层检查
@stack
语法性质::能否解析成约定的结构
结构性质::必备字段齐不齐、类型对不对
语义性质::引用真实、数值落在范围内
安全性质::没越权、没走禁止动作、该拒答就拒
:::

四层不是要一次全上，而是提醒你别只写最顺手的那一层。只查「有没有方括号编号」属于语法层，一个编出来的假编号照样能过，得往上叠语义层去核对编号是否真在证据列表里。再看字面比对和性质断言差在哪。

:::figure 逐字比对与性质判定的差别
@compare
字面比对::换个措辞就误杀|编造内容可能蒙混|每改一版都要重写
性质断言::措辞无关仍可判|越权缺出处被点名|换批数据照样能跑
:::

左边那行说的是「把表达当正确性」，右边那行说的是「把规矩当正确性」。两行放一起，重点不是想说多写几条检查更勤奋，而是想说这两者判定对象根本不同：一个盯字符串，一个盯约束。判定对象选错，检查写得再多也是在错误的维度上使劲。

## 再往下追两层

:::ask 追问一
那性质断言是不是就完全不管答案对不对了，只要格式合规就放行？
:::

不是，管，只是换个管法。事实正确性可以拆成几条可判的性质：必备事实有没有出现、写出的数字有没有跟证据冲突、引用编号是不是真实存在、同一份输出里有没有自相矛盾。这些仍是「对不对」，但判的是可核对的点，而不是整句复刻。真正没有唯一正确答案的开放式输出——比如一段说明、一封回信——靠性质只能查到「有没有出处、有没有越界」这一层，「写得好不好」得靠固化的评分细则，见[LLM-as-Judge 与评分标准固化](./k090-llm-judge.md)。所以性质断言不是取代所有判定，而是把「能用确定性代码判的那一大块」先判死判稳，把确实需要主观打分的那一小块留给别的办法。

:::ask 追问二
那性质写多了会不会互相打架，或者被钻空子？
:::

两样都会，得小心。打架最常见的例子是「有证据就必须带引用」这条：碰上材料里根本没有答案、正确做法是拒答的题，引用自然是空的，一刀切地要求非空，反倒把正确的拒答误杀了。所以性质要按场景分组，该带的和不该带的分别写，不能拿一套规矩套所有题。钻空子的例子是只查「有没有方括号编号」：模型编一个看起来规整的假编号就混过去了，得再叠一条「编号必须落在本次真实证据列表里」。再往深处追一层：那「引用能不能支持这句话」判不判？那是更深的一层，叫忠实度，光查编号合法查不出来；它往往要看整条运行里证据是怎么被取回、怎么被使用的，见[结果评测与轨迹评测](./k089-trajectory-eval.md)与[Trace 该记什么](./k094-trace-fields.md)。还有个容易踩的：用模型自己审自己的输出，常常和它共享同一套盲区，越权、编造这类问题它未必看得见；能写成确定性代码的检查就别交给另一个模型。门禁里也该按性质分组比，别把几条性质揉成一个总分，见[回归门禁与基线](./k091-regression-gate.md)。

## 一段能直接跑的代码

下面这段不联网、不装任何第三方包、不需要账号，只用标准库。它定义一组性质检查器：可解析、必备字段、引用不虚构、有证据必带出处、未越权、无证据时拒答；然后对四份构造出来的输出逐条判定，验证「换个措辞结论不变」「编假引用与越权被点名拦下」「无证据硬答被拒答性质拦下」。复制成 `.py` 文件直接运行即可。

```python
# -*- coding: utf-8 -*-
"""性质断言：判定输出具备的性质，而非逐字比对答案。"""
import json


def check_properties(output, evidence_ids, forbidden_tools):
    """逐条检查性质，返回 (性质名, 是否通过, 说明) 的列表。"""
    checks = []
    # 1. 语法性质：能被解析成对象
    try:
        obj = json.loads(output)
        parsed = isinstance(obj, dict)
    except (ValueError, TypeError):
        obj, parsed = {}, False
    checks.append(("可解析为对象", parsed, "输出需为 JSON 对象"))

    # 2. 结构性质：必备字段齐全
    has_fields = parsed and "answer" in obj and "citations" in obj
    checks.append(("必备字段齐全", bool(has_fields), "需含 answer 与 citations"))

    cites = obj.get("citations", []) if parsed else []
    tools = obj.get("tools_used", []) if parsed else []
    answer = obj.get("answer") if parsed else None

    # 3. 语义性质：凡写出的引用都必须真实存在（不强制一定有）
    cite_ok = all(c in evidence_ids for c in cites)
    checks.append(("引用不虚构", cite_ok, "出现的引用编号需真实存在"))

    # 4. 场景性质：有证据时不得空引用，无证据时允许空
    need = len(evidence_ids) > 0
    has_cite_when_needed = (not need) or (len(cites) > 0)
    checks.append(("有证据必带出处", bool(has_cite_when_needed), "证据非空时不得空引用"))

    # 5. 安全性质：没走被禁止的动作
    safe = not any(t in forbidden_tools for t in tools)
    checks.append(("未越权调用", safe, "不得使用禁止工具"))

    # 6. 拒答性质：证据为空时必须明确说信息不足
    abstain_ok = (len(evidence_ids) > 0) or (answer == "信息不足")
    checks.append(("无证据时拒答", bool(abstain_ok), "证据为空需标信息不足"))
    return checks


def summarize(checks):
    failed = [name for name, ok, _ in checks if not ok]
    return {"failed": failed, "passed": len(failed) == 0}


def main():
    evidence = ["e1", "e2", "e3"]
    forbidden = {"export_all", "read_secret"}
    good = json.dumps({"answer": "每晚 600 元，需凭发票",
                       "citations": ["e1"], "tools_used": ["search_policy"]},
                      ensure_ascii=False)
    reworded = json.dumps({"answer": "住宿上限为 600 元/晚，报销时请附发票。",
                           "citations": ["e1", "e2"], "tools_used": ["search_policy"]},
                          ensure_ascii=False)
    bad = json.dumps({"answer": "每晚 600 元",
                      "citations": ["e9"], "tools_used": ["read_secret"]},
                     ensure_ascii=False)
    no_evidence_ok = json.dumps({"answer": "信息不足",
                                 "citations": [], "tools_used": []}, ensure_ascii=False)
    no_evidence_bad = json.dumps({"answer": "每晚 600 元",
                                  "citations": [], "tools_used": []}, ensure_ascii=False)

    checks = []
    r_good = summarize(check_properties(good, evidence, forbidden))
    r_reword = summarize(check_properties(reworded, evidence, forbidden))
    r_bad = summarize(check_properties(bad, evidence, forbidden))
    r_empty_ok = summarize(check_properties(no_evidence_ok, [], forbidden))
    r_empty_bad = summarize(check_properties(no_evidence_bad, [], forbidden))

    checks.append(("合规输出全部性质通过", r_good["passed"] is True))
    checks.append(("换措辞输出同样通过", r_reword["passed"] is True))
    checks.append(("两次判定结论一致", r_good["passed"] == r_reword["passed"]))
    checks.append(("两份输出措辞确实不同", json.loads(good)["answer"] != json.loads(reworded)["answer"]))
    checks.append(("编造引用与越权被拦下", r_bad["passed"] is False))
    checks.append(("失败点名引用不虚构", "引用不虚构" in r_bad["failed"]))
    checks.append(("失败点名未越权调用", "未越权调用" in r_bad["failed"]))
    checks.append(("无证据拒答的输出通过", r_empty_ok["passed"] is True))
    checks.append(("无证据硬答被拒答性质拦下", r_empty_bad["passed"] is False))
    checks.append(("拦下原因是无证据时拒答", "无证据时拒答" in r_empty_bad["failed"]))

    passed = sum(1 for _, ok in checks if ok)
    print(f"合规输出: 通过={r_good['passed']}  换措辞: 通过={r_reword['passed']}")
    print(f"编造引用+越权: 通过={r_bad['passed']}  失败项={r_bad['failed']}")
    print(f"无证据拒答: 通过={r_empty_ok['passed']}  无证据硬答: 通过={r_empty_bad['passed']}")
    for name, ok in checks:
        print(f"  [{'OK' if ok else 'NG'}] {name}")
    print(f"通过 {passed}/{len(checks)} 项")
    assert passed == len(checks)


if __name__ == '__main__':
    main()
```

1. `check_properties`：接收输出文本、本次真实证据编号列表、被禁止的工具集合，返回逐条 `(性质名, 是否通过, 说明)`。留着「说明」字段，是为了报告能解释每条在查什么，而不是只给一堆布尔。
2. 第 1、2 条：先尝试 `json.loads` 并确认是对象，再查必备字段。语法层与结构层放最前，因为解析不了就没法往下查，顺序本身是依赖关系。
3. 第 3、4 条：把「引用不虚构」和「有证据必带出处」拆成两条。前者允许空引用、只不许造假，后者只在有证据时要求非空——这个拆分正是为了避免把正确的拒答误杀。
4. 第 5、6 条：安全层查有没有踩禁止工具，拒答层查证据为空时有没有老实写「信息不足」。它们不依赖答案内容，所以换个措辞照样成立。
5. `summarize`：把所有没通过的性质名收进 `failed`，`passed` 表示全过。返回失败名单而不是单个布尔，是「能点名」这件事的关键。
6. `main` 里五份输出：`good` 与 `reworded` 答案措辞不同但都合规；`bad` 编了个不在证据里的 `e9` 又调了禁止工具；`no_evidence_ok` 与 `no_evidence_bad` 用空证据列表分别演示正确拒答与硬答。全是可复现的构造场景。
7. 结尾 `print` 与 `assert passed == len(checks)`：把五份判定与通过项打出来，肉眼确认跑到结尾；任一性质不成立就抛异常、退出码不为零，不会悄悄过关。

## 踩过的坑与边界

- **断言写成字面相等**：现象是换个说法就误杀、标准答案要跟着每版改 → 原因是把表达方式当成了正确性 → 改成判定性质，见[评测用例集怎么构造](./k086-eval-dataset.md)里关于判定线的部分。
- **只查有没有编号、不查编号真假**：现象是模型编一个规整的假引用照样通过 → 原因是只做到语法层 → 叠一条「编号必须落在本次真实证据列表里」的语义性质。
- **性质一刀切套所有题**：现象是正确拒答被「必须带引用」误杀 → 原因是没按场景分组 → 把「有证据必带出处」与「无证据时拒答」分开写、按证据是否为空分别生效。
- **让模型自己审自己的输出**：现象是越权、编造这类问题总也拦不住 → 原因是审查者与生成者常共享盲区 → 能写成确定性代码的性质一律用代码判，主观质量才交给评分细则，见[LLM-as-Judge 与评分标准固化](./k090-llm-judge.md)。
- **只判终态不判过程**：现象是答案得体，中间却已读了不该读的东西 → 原因是性质只覆盖最终文本 → 把「走过的动作」也纳入检查，见[结果评测与轨迹评测](./k089-trajectory-eval.md)。

边界也要说清：性质断言最适合「输出带开放式表达、有多轮、有副作用」的系统。若输出本就是代码算好、格式被严格限死的枚举值或数值，直接比结构或比值更省事，不必套一整套性质。另外性质断言只保证「守住了写死的规矩」，规矩之外好不好、贴不贴合用户真实意图，它一概不回答，别把「性质全过」当成「质量合格」。

## 学完自检

:::check 学完自检
- [ ] 能说清为什么逐字比对既太严又太松
- [ ] 能举出语法、结构、语义、安全四层各一条性质
- [ ] 能解释「有证据必带出处」为什么不适用于应拒答的题
- [ ] 能说出为什么要返回失败名单而不是只回一个布尔
- [ ] 能徒手画出「解析输出 → 查必备项 → 查禁止项 → 汇总性质 → 判通过」这条链
- [ ] 能说清性质全过为什么仍不等于质量合格
:::

## 三句话小结

性质断言是判定输出「守没守住几条硬规矩」，而不是比对答案是不是那几个字。
做法是按语法、结构、语义、安全分层写检查、按场景分组、失败时点名破的是哪条。
只在输出由代码算好、格式被严格限死、枚举或数值可直接比对的场景，不必铺整套性质断言。
