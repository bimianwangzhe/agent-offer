<div align="center">

# AgentOffer

### 2026 最新 Agent 开发学习路线 · 零基础到能独立交付一条龙

**把 153 个知识点按依赖关系分成 12 组逐条罗列成一篇总纲，再给每一个知识点单独写一篇完整正文。点开就是内容，不是让你再去别处搜。**

[![stars](https://img.shields.io/github/stars/bimianwangzhe/agent-offer?style=flat-square&label=Stars)](https://github.com/bimianwangzhe/agent-offer/stargazers)
[![forks](https://img.shields.io/github/forks/bimianwangzhe/agent-offer?style=flat-square&label=Forks)](https://github.com/bimianwangzhe/agent-offer/network/members)
[![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
[![docs](https://img.shields.io/badge/在线阅读-agent.meetoffer.cn-blue?style=flat-square)](https://agent.meetoffer.cn)

**在线阅读（推荐）**：[agent.meetoffer.cn](https://agent.meetoffer.cn) · [GitHub 仓库](https://github.com/bimianwangzhe/agent-offer)

</div>

---

## 🔥 必看

| 入口 | 讲什么 |
|---|---|
| ⭐ [学习路线一条龙：全部知识点总纲](https://agent.meetoffer.cn/#/doc/00-start-here) | 12 组 153 个知识点逐条罗列、按依赖关系排好，每条点开都是网站上一篇完整正文 |
| 🔥 [Agent 开发高频面试题精讲](https://agent.meetoffer.cn/#/doc/16-interview-qa) | 10 道高频题，每题从第一层定义答到第四层追问 |
| 📌 [从能跑到敢开：生产化落地清单](https://agent.meetoffer.cn/#/doc/17-production-checklist) | 成本、可观测性、护栏、灰度回滚逐项落到代码，附可照着勾的清单 |
| 📌 [三个能写进简历的项目](https://agent.meetoffer.cn/#/doc/14-projects) · [面试追问链](https://agent.meetoffer.cn/#/doc/15-interview) | 把知识点串成作品，并练到随便从哪一层追问都能答下去 |
| 📚 [全部文章](https://agent.meetoffer.cn/#/all) · [知识点索引](https://agent.meetoffer.cn/#/index) · [学习路线页](https://agent.meetoffer.cn/#/roadmap) | 按组铺开的完整目录、术语速查、逐层递进的路线 |

---

## 📚 全部知识点目录（12 组 / 153 条）

每一个知识点都单独写成一篇完整正文：场景提问 → 破误解 → 生活类比 → 自绘示意图 → 层层追问 → 可运行代码逐行解释 → 踩坑与边界 → 自检清单 → 三句话小结。所有示例只用 Python 标准库，零账号、零联网，复制即跑。

### 第 1 组 · 模型与调用（15 条）

> 学完能：能独立写出一个带超时、重试、用量统计的调用脚本，并说清模型为什么会出错。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K001 | [Token 与分词](https://agent.meetoffer.cn/#/doc/k001-token) | 模型读写的基本单位，输入输出都按它计量，也是上下文长度的度量。 |
| K002 | [下一个词预测](https://agent.meetoffer.cn/#/doc/k002-next-token) | 模型只在做一件事：根据已有文字猜下一个最可能的 token，循环到该停为止。 |
| K003 | [上下文窗口](https://agent.meetoffer.cn/#/doc/k003-context-window) | 一次调用里模型这一眼能看到的全部文字，超了会截断或报错。 |
| K004 | [采样参数与不确定性](https://agent.meetoffer.cn/#/doc/k004-sampling) | 温度、top_p 控制随机程度；调到 0 也不等于确定，因此不能用确定性断言去测。 |
| K005 | [幻觉为什么必然存在](https://agent.meetoffer.cn/#/doc/k005-hallucination) | 不是模型坏了，是它把话接得太像真的；真实性必须由系统外部补上。 |
| K006 | [基础模型 / 指令模型 / 推理模型](https://agent.meetoffer.cn/#/doc/k006-model-types) | 三者的训练目标不同，选型看任务匹配而不是参数或宣传口径。 |
| K007 | [消息角色与对话拼装](https://agent.meetoffer.cn/#/doc/k007-message-roles) | system / user / assistant / tool 各自的位置与优先级，拼错顺序会改变行为。 |
| K008 | [一次请求拆成五块](https://agent.meetoffer.cn/#/doc/k008-request-anatomy) | 地址、鉴权、消息体、参数、返回；拆开才能逐项排查与替换实现。 |
| K009 | [流式输出与首字延迟](https://agent.meetoffer.cn/#/doc/k009-streaming) | 边生成边返回降低等待，但要处理半截内容、中断与拼接。 |
| K010 | [用量统计与计费口径](https://agent.meetoffer.cn/#/doc/k010-usage-billing) | 按任务、按用户记录输入与输出用量，是成本优化与账单告警的前提。 |
| K127 | [max_tokens 与停止条件](https://agent.meetoffer.cn/#/doc/k127-max-tokens) | 输出长度上限配合结束符与停止词控制生成边界；设太小会截断成半截 JSON。 |
| K128 | [流式断线恢复与分片校验](https://agent.meetoffer.cn/#/doc/k128-stream-recovery) | 事件 ID、分片排序与断点续传；只做前端拼接会产生残缺或重复文本。 |
| K129 | [Embedding 与向量化](https://agent.meetoffer.cn/#/doc/k129-embedding) | 把文本映射为稠密向量，是检索、长期记忆、去重的共同地基；换模型必须重建索引。 |
| K130 | [相似度度量对齐](https://agent.meetoffer.cn/#/doc/k130-similarity) | 余弦、点积、欧氏距离代表不同的「相近」；度量方式必须与向量模型训练口径一致。 |
| K131 | [异常分类与可重试判定](https://agent.meetoffer.cn/#/doc/k131-error-classify) | 区分瞬时网络错、限流、参数错、服务故障；盲目重试会放大限流与账单。 |

### 第 2 组 · 提示与输出契约（13 条）

> 学完能：能让不合法输出自动纠正、超过次数果断降级，而不是靠祈祷模型听话。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K011 | [系统提示该写什么](https://agent.meetoffer.cn/#/doc/k011-system-prompt) | 常驻声明身份、能力边界、输出格式与禁止事项；别把业务事实写死在里面。 |
| K012 | [少样本示例](https://agent.meetoffer.cn/#/doc/k012-few-shot) | 用几个完整示例定格式，比讲一堆道理更能稳定输出。 |
| K013 | [思维链与分步引导](https://agent.meetoffer.cn/#/doc/k013-chain-of-thought) | 引导分步推理改善复杂任务稳定性，但不改变输出的非确定性。 |
| K014 | [「请只输出 JSON」为什么不是保证](https://agent.meetoffer.cn/#/doc/k014-json-request) | 这是请求不是约束；模型随时可能加解释、包代码块、漏字段。 |
| K015 | [JSON Schema 约束](https://agent.meetoffer.cn/#/doc/k015-json-schema) | 把输出结构写成机器可读描述，让校验有依据，也让模型有明确目标。 |
| K016 | [语法层校验](https://agent.meetoffer.cn/#/doc/k016-syntax-check) | 第一关只看能不能解析，失败优先做清洗与提取而不是立刻重问。 |
| K017 | [结构层校验](https://agent.meetoffer.cn/#/doc/k017-structure-check) | 第二关看字段齐不齐、类型对不对、嵌套有没有缺。 |
| K018 | [语义层校验](https://agent.meetoffer.cn/#/doc/k018-semantic-check) | 第三关看值是否合法：枚举、范围、引用 ID 是否真实存在、是否自相矛盾。 |
| K019 | [自动纠正与重试上限](https://agent.meetoffer.cn/#/doc/k019-auto-repair) | 把具体错误信息回传给模型纠正，并设次数上限防止死循环。 |
| K020 | [果断降级与兜底返回](https://agent.meetoffer.cn/#/doc/k020-graceful-fallback) | 超过次数就返回确定的默认结果或人工接管，绝不让调用无限挂起。 |
| K132 | [结构化提示词模板六模块](https://agent.meetoffer.cn/#/doc/k132-prompt-template) | 角色、任务、约束、输出格式、示例、异常处理分开维护，才能定位是哪段改动导致行为漂移。 |
| K133 | [分隔符与输入定界](https://agent.meetoffer.cn/#/doc/k133-delimiter) | 用明确标记把不可信数据块包起来并声明「这是数据」，但定界符本身也可能被伪造绕过。 |
| K134 | [约束解码原理](https://agent.meetoffer.cn/#/doc/k134-constrained-decoding) | 在生成时直接限制候选 token 使输出必然合法，与「事后校验再重试」是两条不同的路。 |

### 第 3 组 · Agent 循环与状态（11 条）

> 学完能：能徒手写出一个可终止、可回放、可恢复的多步循环，不依赖任何框架。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K021 | [Agent 的唯一判据](https://agent.meetoffer.cn/#/doc/k021-agent-criterion) | 下一步做什么由模型在运行时决定，还是事先写死在代码里。 |
| K022 | [Workflow 与 Agent 的分界](https://agent.meetoffer.cn/#/doc/k022-workflow-vs-agent) | 路径能预先固定就用流程；上 Agent 是为了解决路径不确定，不是为了时髦。 |
| K023 | [决策—行动—观察闭环](https://agent.meetoffer.cn/#/doc/k023-decision-loop) | 选动作、执行、拿结果、再决策，直到达标、失败、超限或人工接管。 |
| K024 | [ReAct：推理与行动交替](https://agent.meetoffer.cn/#/doc/k024-react) | 用外部工具拿新信息，再据此决定下一步；要讲清 Thought / Action / Observation 各自存哪。 |
| K025 | [Plan-and-Execute](https://agent.meetoffer.cn/#/doc/k025-plan-execute) | 先统筹任务清单与完成标准，再逐项执行，适合长任务与跨系统操作。 |
| K026 | [反思与自我修正](https://agent.meetoffer.cn/#/doc/k026-reflection) | 按评价标准回看并修改产物；弱点是重复自身偏见，必须配外部验证器。 |
| K027 | [循环状态该存什么](https://agent.meetoffer.cn/#/doc/k027-loop-state) | 目标、历史、观察、轮数、预算、已完成步骤用结构化字段存，不靠聊天记录。 |
| K028 | [四个终止条件](https://agent.meetoffer.cn/#/doc/k028-stop-conditions) | 完成、超预算、重复动作、不可恢复错误，缺一个就可能跑飞。 |
| K029 | [错误回传](https://agent.meetoffer.cn/#/doc/k029-error-feedback) | 工具报错不是抛异常结束，而是变成下一轮的观察交给模型决策。 |
| K030 | [检查点与轨迹回放](https://agent.meetoffer.cn/#/doc/k030-checkpoint-replay) | 每一步状态与观察落盘，出事后能复现当时到底发生了什么。 |
| K135 | [目标漂移与周期性重述](https://agent.meetoffer.cn/#/doc/k135-goal-drift) | 长任务里模型会逐渐偏离原始目标，需要周期性把目标与完成标准重新写回上下文。 |

### 第 4 组 · 工具与函数调用（13 条）

> 学完能：能设计带参数校验、权限分级、幂等防重的工具层，且不因一个合法 JSON 就放行危险动作。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K031 | [Function Calling 的职责边界](https://agent.meetoffer.cn/#/doc/k031-fc-boundary) | 模型只声明调哪个工具、传什么参数，真正执行永远在宿主程序。 |
| K032 | [工具 Schema 设计](https://agent.meetoffer.cn/#/doc/k032-tool-schema) | 类型、枚举、必填、取值范围写清楚，能挡掉大半参数错误。 |
| K033 | [工具描述写法](https://agent.meetoffer.cn/#/doc/k033-tool-description) | 描述是给模型看的接口文档：说清适用与不适用，比函数名重要得多。 |
| K034 | [参数有效不等于业务合法](https://agent.meetoffer.cn/#/doc/k034-param-validity) | 合法 JSON 也可能越权、超限额、操作别人的数据；业务规则要另做一层。 |
| K035 | [工具返回格式设计](https://agent.meetoffer.cn/#/doc/k035-tool-result) | 结构化、可判定、不冗长；错误信息要让模型能据此改参数。 |
| K036 | [工具清单减肥与分层路由](https://agent.meetoffer.cn/#/doc/k036-tool-routing) | 工具太多时先做轻量判断，只把本轮相关的几个带进上下文。 |
| K037 | [权限矩阵与最小权限](https://agent.meetoffer.cn/#/doc/k037-permission-matrix) | 读、写、危险动作分级；按用户与会话授予，不按模型意愿授予。 |
| K038 | [幂等键与副作用防重](https://agent.meetoffer.cn/#/doc/k038-idempotency-key) | 为每个有副作用的动作分配稳定标识，重试前先查执行状态。 |
| K039 | [超时不等于没执行](https://agent.meetoffer.cn/#/doc/k039-timeout-reconcile) | 网络超时时动作可能已经生效，必须先对账再决定是否允许重试。 |
| K040 | [工具失败分类与重试策略](https://agent.meetoffer.cn/#/doc/k040-tool-failure) | 区分可重试、不可重试、需人工三类，别把所有错误都交给模型碰运气。 |
| K136 | [tool_call_id 配对与并行调用](https://agent.meetoffer.cn/#/doc/k136-tool-call-id) | 每次调用结果必须严格对应发起时的 id；并行调用前要判断动作之间有没有依赖。 |
| K137 | [用户身份服务端注入](https://agent.meetoffer.cn/#/doc/k137-identity-injection) | 身份与权限不能让模型填进参数，必须由服务端按会话注入，否则参数篡改就是越权。 |
| K138 | [超大工具结果裁剪与二级工具](https://agent.meetoffer.cn/#/doc/k138-large-result) | 原始返回撑爆上下文时，先裁剪或落盘，再提供按 id 取详情的二级工具。 |

### 第 5 组 · 上下文工程（12 条）

> 学完能：能给长对话做预算、分层与压缩，并验证压缩没把关键信息弄丢。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K041 | [上下文预算表](https://agent.meetoffer.cn/#/doc/k041-context-budget) | 系统提示、历史、工具结果、检索片段各占多少，先算账再写代码。 |
| K042 | [四层上下文结构](https://agent.meetoffer.cn/#/doc/k042-context-layers) | 常驻、按需、近期、外置，分别决定谁能进窗口、谁用完即弃。 |
| K043 | [滑动窗口裁剪](https://agent.meetoffer.cn/#/doc/k043-sliding-window) | 保留最近若干轮原文，最便宜也最容易丢掉早期约束。 |
| K044 | [摘要式压缩](https://agent.meetoffer.cn/#/doc/k044-summary-compression) | 把早期对话压成几句话；要留决策与承诺，不要留寒暄。 |
| K045 | [检索式召回压缩](https://agent.meetoffer.cn/#/doc/k045-retrieval-compression) | 历史原文外置落盘，本轮只按相关度取回需要的片段。 |
| K046 | [结构化状态摘要](https://agent.meetoffer.cn/#/doc/k046-structured-state) | 用紧凑字段写清目标、已完成、待办、证据、待审批，替代自然语言复述。 |
| K047 | [压缩触发阈值与时机](https://agent.meetoffer.cn/#/doc/k047-compression-trigger) | 按额度占比、轮数或阶段边界触发；别等到超限报错才动手。 |
| K048 | [压缩后信息丢失怎么验证](https://agent.meetoffer.cn/#/doc/k048-compression-verify) | 用一组必须保留的事实做回归断言，比「读一遍感觉没问题」可靠。 |
| K049 | [上下文膨胀与中间遗失](https://agent.meetoffer.cn/#/doc/k049-context-bloat) | 每轮累加观察导致成本复合增长、注意力被摊薄，长材料中间更易被忽略。 |
| K050 | [前缀缓存与即时注入](https://agent.meetoffer.cn/#/doc/k050-prefix-cache) | 复用稳定前缀降成本；只给本轮需要的信息，不把整个知识库贴进来。 |
| K139 | [写选压隔四类操作与不可压缩项](https://agent.meetoffer.cn/#/doc/k139-context-ops) | 上下文管理拆成写入、选择、压缩、隔离；硬约束、金额、用户明确承诺属于不可压缩项。 |
| K140 | [Push 与 Pull 按需拉取](https://agent.meetoffer.cn/#/doc/k140-push-pull) | 是预先把材料推进上下文，还是让模型需要时再取，决定了成本与信息新鲜度的取舍。 |

### 第 6 组 · 检索增强 RAG（16 条）

> 学完能：能搭出带双路召回、重排、溯源、拒答的检索模块，并分别评测检索与答案质量。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K051 | [为什么需要 RAG](https://agent.meetoffer.cn/#/doc/k051-why-rag) | 外部知识三种放法（塞提示 / 改权重 / 检索）各自的代价与适用边界。 |
| K052 | [离线索引与在线检索两段](https://agent.meetoffer.cn/#/doc/k052-index-query-two-stage) | 写时建索引、读时查片段，两段各自可以独立优化与回滚。 |
| K053 | [文档解析与清洗](https://agent.meetoffer.cn/#/doc/k053-doc-cleaning) | 标题层级、表格、页眉页脚、编码与乱码，脏数据会一路污染到答案。 |
| K054 | [固定长度切分与重叠](https://agent.meetoffer.cn/#/doc/k054-fixed-chunking) | 最简单可控；重叠防止语义被切断，但会带来冗余与重复引用。 |
| K055 | [语义切分与层级切分](https://agent.meetoffer.cn/#/doc/k055-semantic-chunking) | 按自然边界切、保留父子关系；小块命中、大块作答。 |
| K056 | [切分元数据与父块回溯](https://agent.meetoffer.cn/#/doc/k056-chunk-metadata) | 来源、页码、版本、权限、时间跟着块走，是溯源与过滤的前提。 |
| K057 | [稠密检索与稀疏检索](https://agent.meetoffer.cn/#/doc/k057-dense-sparse) | 语义向量与关键词加权各自有盲区，专有名词、型号、编号尤其依赖后者。 |
| K058 | [混合检索与 RRF 融合](https://agent.meetoffer.cn/#/doc/k058-hybrid-rrf) | 两路召回按倒数排名合并，无需归一化分数，也少一个要调的权重。 |
| K059 | [查询改写与指代补全](https://agent.meetoffer.cn/#/doc/k059-query-rewrite) | 把「它多少钱」补成完整问题，复合问题拆开，口语转书面。 |
| K060 | [元数据过滤前置](https://agent.meetoffer.cn/#/doc/k060-metadata-filter) | 权限、租户、时效过滤要早于语义检索，避免先召回再发现无权看。 |
| K061 | [粗排 + 精排与重排后截断](https://agent.meetoffer.cn/#/doc/k061-rerank) | 先快速召回较多候选，再用更重的重排筛少数片段，并控制多样性。 |
| K062 | [溯源、拒答与零召回兜底](https://agent.meetoffer.cn/#/doc/k062-citation-abstain) | 答案必须指回材料；材料不足时系统有权说不知道，零召回要有明确降级。 |
| K063 | [索引更新、增量与知识冲突](https://agent.meetoffer.cn/#/doc/k063-index-update) | 文档频繁变化时怎么设计删除与增量；两份材料矛盾时按权威级别裁决。 |
| K064 | [多轮检索与检索质量评测](https://agent.meetoffer.cn/#/doc/k064-rag-eval) | 不够就改写再查；把检索召回质量与最终答案质量分开测，才知道错在哪。 |
| K141 | [版面还原、表格原子化与去重](https://agent.meetoffer.cn/#/doc/k141-layout-restore) | 表格、代码块、OCR 内容要按原子块保留结构；去重与版本管理决定索引会不会越滚越脏。 |
| K142 | [检索排序指标与 RAG 四项核心指标](https://agent.meetoffer.cn/#/doc/k142-retrieval-metrics) | 召回率、排序质量、答案忠实度与上下文相关性分开看，才能定位链路哪一环坏了。 |

### 第 7 组 · 记忆系统（11 条）

> 学完能：能设计分层记忆，并说清哪些东西坚决不该记。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K065 | [记忆不是日志](https://agent.meetoffer.cn/#/doc/k065-memory-vs-log) | 日志是发生过的全部，记忆是会影响未来决策的那一小部分。 |
| K066 | [工作 / 情景 / 语义三层记忆](https://agent.meetoffer.cn/#/doc/k066-memory-types) | 当前任务状态、经历过的事、提炼出的稳定事实，各自存法与生命周期不同。 |
| K067 | [短期记忆与滑动窗口](https://agent.meetoffer.cn/#/doc/k067-short-term) | 最近若干轮原文保留，简单但会随窗口滑动丢掉早期约束。 |
| K068 | [长期记忆与向量化存储](https://agent.meetoffer.cn/#/doc/k068-long-term) | 跨会话保留稳定事实，难点是召回准不准、会不会把旧信息当真。 |
| K069 | [实体摘要与画像更新](https://agent.meetoffer.cn/#/doc/k069-entity-summary) | 把关于同一对象的分散事实合并成一份可更新的摘要。 |
| K070 | [写入判定：什么时候该记](https://agent.meetoffer.cn/#/doc/k070-write-decision) | 先决定该不该记，再决定记什么；用规则判定，不让模型自由发挥。 |
| K071 | [冲突消解与版本](https://agent.meetoffer.cn/#/doc/k071-conflict-resolution) | 新旧事实矛盾时按时间、来源权威级别与显式撤销处理，而不是覆盖。 |
| K072 | [召回排序与相关性](https://agent.meetoffer.cn/#/doc/k072-memory-recall) | 按相关性与时效取回，并限制条数，避免记忆反过来污染上下文。 |
| K073 | [遗忘、过期与 TTL](https://agent.meetoffer.cn/#/doc/k073-forgetting) | 给过期、错误、敏感信息明确的退出机制，否则错误会永久影响决策。 |
| K074 | [隐私脱敏、同意与记忆污染](https://agent.meetoffer.cn/#/doc/k074-memory-privacy) | 写入前脱敏、按同意门控，并防范把外部注入内容写进长期记忆。 |
| K143 | [结构化事实抽取与记忆命名空间](https://agent.meetoffer.cn/#/doc/k143-fact-extraction) | 把散落对话抽成可更新的字段，并按租户与用户分命名空间，避免串味与污染。 |

### 第 8 组 · 框架与协议（12 条）

> 学完能：能说清框架六大件、协议解决哪一层问题，并写出可换框架的适配层。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K075 | [框架六大件](https://agent.meetoffer.cn/#/doc/k075-framework-six) | 状态、循环、工具分发、追踪、重试、持久化——框架替你接管的那几件事。 |
| K076 | [状态机与图编排](https://agent.meetoffer.cn/#/doc/k076-state-machine) | 用节点与边表达分支、并行、回退，比一堆 if 更容易验证终止性。 |
| K077 | [解耦适配层](https://agent.meetoffer.cn/#/doc/k077-adapter-layer) | 把业务代码与框架 API 隔开，换框架时不重写业务逻辑。 |
| K078 | [工具协议与标准化接入](https://agent.meetoffer.cn/#/doc/k078-tool-protocol) | 统一发现与接入外部能力，解决接入层问题，不解决模型侧的调用表达。 |
| K079 | [三类能力原语与渐进披露](https://agent.meetoffer.cn/#/doc/k079-primitives-skills) | 工具 / 资源 / 提示模板分开；能力说明按需加载，而不是全量塞进上下文。 |
| K080 | [传输、会话与网关限流](https://agent.meetoffer.cn/#/doc/k080-transport-session) | 本地进程、长连接、流式会话各自的边界；限流放在网关而不是模型里。 |
| K081 | [主体间消息契约](https://agent.meetoffer.cn/#/doc/k081-agent-message) | 把任务与必要上下文移交给另一个决策主体，需显式定义字段与完成标准。 |
| K082 | [多模型路由与网关](https://agent.meetoffer.cn/#/doc/k082-model-router) | 按任务难度、成本、延迟分流，并在下游异常时做确定性兜底。 |
| K083 | [框架选型与自研编排的取舍](https://agent.meetoffer.cn/#/doc/k083-build-vs-framework) | 要对循环、状态、失败恢复有控制权时，自研编排往往比堆框架更省事。 |
| K084 | [版本漂移与升级策略](https://agent.meetoffer.cn/#/doc/k084-version-drift) | 接口、工具 schema、提示模板都会变；用契约测试与灰度升级挡住漂移。 |
| K144 | [Reducer 合并语义与分槽写入](https://agent.meetoffer.cn/#/doc/k144-reducer-slot) | 多个分支同时改同一份状态时，靠明确的合并规则与分槽写入避免互相覆盖。 |
| K145 | [时间旅行、重放与分叉](https://agent.meetoffer.cn/#/doc/k145-time-travel) | 从任意历史检查点重放或拉出新分支，是调试与复盘最省力的基础设施。 |

### 第 9 组 · 评测与可观测性（13 条）

> 学完能：能搭出用例集、性质断言、回归门禁与结构化轨迹，并把线上坏例回收成新用例。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K085 | [三层评测](https://agent.meetoffer.cn/#/doc/k085-three-level-eval) | 单步、任务级、系统级各看不同指标，别只盯一个通过率。 |
| K086 | [评测用例集怎么构造](https://agent.meetoffer.cn/#/doc/k086-eval-dataset) | 从真实任务分布取样，标注预期动作与预期性质，持续积累坏例。 |
| K087 | [正常 / 边界 / 注入 / 回归配比](https://agent.meetoffer.cn/#/doc/k087-case-mix) | 四类按配比从 30 条起步，缺一类就会在对应场景翻车。 |
| K088 | [性质断言](https://agent.meetoffer.cn/#/doc/k088-property-assertion) | 测「有没有引用出处」「有没有越权」这类性质，而不是答案一字不差。 |
| K089 | [结果评测与轨迹评测](https://agent.meetoffer.cn/#/doc/k089-trajectory-eval) | 前者看目标是否达成，后者看路径是否合理，还得把成本算进去。 |
| K090 | [LLM-as-Judge 与评分标准固化](https://agent.meetoffer.cn/#/doc/k090-llm-judge) | 开放式输出用模型打分，需配人工抽检与固定的评分细则。 |
| K091 | [回归门禁与基线](https://agent.meetoffer.cn/#/doc/k091-regression-gate) | 新版通过率不得低于基线，卡住发布，避免「感觉好像好一点」。 |
| K092 | [离线好、线上差的成因](https://agent.meetoffer.cn/#/doc/k092-offline-online-gap) | 用例单一、缺多轮叠加、缺模糊指令、缓存与负载不一致。 |
| K093 | [Badcase 回收闭环与分级评测](https://agent.meetoffer.cn/#/doc/k093-badcase-loop) | 线上坏例回流成用例；小迭代冒烟、大版本全量、只测改动模块。 |
| K094 | [Trace 该记什么](https://agent.meetoffer.cn/#/doc/k094-trace-fields) | 检索到的上下文、工具调用、模型输入输出、状态转移、策略检查、延迟、用量。 |
| K095 | [结构化日志与轨迹回放](https://agent.meetoffer.cn/#/doc/k095-structured-log) | 用可检索的行式记录取代散落 print，出事能按 id 复现整条链。 |
| K096 | [核心指标与按成功任务核算成本](https://agent.meetoffer.cn/#/doc/k096-metrics-cost) | 完成率、纠正率、人工接管率、工具错误率、每成功任务成本；不按每次调用算账。 |
| K146 | [Trace / Span / TraceId 与日志脱敏](https://agent.meetoffer.cn/#/doc/k146-trace-span) | 用树状 span 表达一次运行内部的嵌套关系；日志要脱敏、定期限与线上抽样质检。 |

### 第 10 组 · 安全与护栏（13 条）

> 学完能：能设计一个有最小权限、四重预算、人在回路、熔断隔离的护栏层。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K097 | [直接提示注入](https://agent.meetoffer.cn/#/doc/k097-direct-injection) | 用户输入里夹带指令试图改写系统规则；输入层要做分类与隔离。 |
| K098 | [间接提示注入](https://agent.meetoffer.cn/#/doc/k098-indirect-injection) | 网页、文件、工单、检索片段里夹带指令劫持下一轮决策，是最容易被忽略的攻击面。 |
| K099 | [输出扫描与内容过滤](https://agent.meetoffer.cn/#/doc/k099-output-scan) | 对外内容发出前做确定性扫描，别指望模型自己不泄露。 |
| K100 | [最小权限与双层校验](https://agent.meetoffer.cn/#/doc/k100-least-privilege) | Agent 声明要的权限，外加另一个系统实际校验，两道都不省。 |
| K101 | [代码沙箱与隔离](https://agent.meetoffer.cn/#/doc/k101-sandbox) | 执行代码或命令的工具必须与宿主文件、网络、凭证隔离。 |
| K102 | [人在回路与高风险确认](https://agent.meetoffer.cn/#/doc/k102-human-in-loop) | 不可逆、高金额、对外动作强制人工确认，且交接不能是死路。 |
| K103 | [四重预算](https://agent.meetoffer.cn/#/doc/k103-four-budgets) | 钱、轮数、时间、工具次数都要有上限，且每轮决策前检查。 |
| K104 | [熔断与 kill switch](https://agent.meetoffer.cn/#/doc/k104-circuit-breaker) | 计数超阈值自动切断，避免一个跑飞的循环把账单打穿。 |
| K105 | [会话隔离与租户边界](https://agent.meetoffer.cn/#/doc/k105-session-isolation) | 请求开始就确定作用域，贯穿检索、记忆与工具调用；一个用户不能影响另一个。 |
| K106 | [护栏放在代码里](https://agent.meetoffer.cn/#/doc/k106-guardrail-in-code) | 把约束写在包裹 Agent 的程序里，而不是写在模型可以忽略的提示词里。 |
| K147 | [持久化后门与来源信任标注](https://agent.meetoffer.cn/#/doc/k147-persistent-backdoor) | 注入内容被写进记忆或知识库后长期生效；每份外部材料都要带来源与信任级别。 |
| K148 | [逻辑层与执行层解耦、动作白名单](https://agent.meetoffer.cn/#/doc/k148-decouple-allowlist) | 模型只产出意图，执行层按白名单放行；两者不分开，提示词就是唯一防线。 |
| K149 | [审批超时默认拒绝与责任归因](https://agent.meetoffer.cn/#/doc/k149-approval-timeout) | 人工确认没回来时必须默认不动，并把谁在何时批准了什么完整留痕。 |

### 第 11 组 · 生产化与成本（12 条）

> 学完能：能照着一份上线检查清单逐项勾完，并给出故障时的兜底与回滚路径。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K107 | [幂等落盘](https://agent.meetoffer.cn/#/doc/k107-idempotent-persist) | 动作与状态持久化，重放同一请求不会重复产生副作用。 |
| K108 | [重试、指数退避与抖动](https://agent.meetoffer.cn/#/doc/k108-retry-backoff) | 间隔翻倍、加上限与随机抖动，避免下游恢复瞬间被重试打垮。 |
| K109 | [超时与确定性降级](https://agent.meetoffer.cn/#/doc/k109-timeout-fallback) | 下游异常时给确定的兜底结果，而不是把异常抛给用户。 |
| K110 | [优雅中断与断点恢复](https://agent.meetoffer.cn/#/doc/k110-graceful-resume) | 从检查点续跑、处理过期凭据、避免重复已完成动作。 |
| K111 | [凭据过期与刷新](https://agent.meetoffer.cn/#/doc/k111-credential-expiry) | 长任务里凭证会失效，要有刷新与明确的重新授权路径。 |
| K112 | [影子模式、灰度与回滚](https://agent.meetoffer.cn/#/doc/k112-shadow-canary) | 先只决策不执行，再小流量，出问题按版本号快速退回。 |
| K113 | [提示与策略版本化](https://agent.meetoffer.cn/#/doc/k113-prompt-versioning) | 提示、schema、策略当可部署产物管理，带 diff、评审与回滚。 |
| K114 | [健康检查与 SLO](https://agent.meetoffer.cn/#/doc/k114-health-slo) | 让外部能探知服务状态，并给成功率、延迟、成本定可守护的目标。 |
| K115 | [高并发与并发上限](https://agent.meetoffer.cn/#/doc/k115-concurrency) | 打满模型并发时排队、降级、分流，而不是让请求一起超时。 |
| K116 | [成本优化与上线检查清单](https://agent.meetoffer.cn/#/doc/k116-cost-checklist) | 缓存、模型分级、循环上限、批量接口；配一份能照着勾的发布清单。 |
| K150 | [生产失败模式清单与支出硬上限](https://agent.meetoffer.cn/#/doc/k150-failure-modes) | 先把「会怎么坏」列全，再给支出设不可绕过的硬上限，而不是只靠监控告警。 |
| K151 | [服务化封装与部署](https://agent.meetoffer.cn/#/doc/k151-service-wrap) | 把循环包成可水平扩展的服务：无状态入口、外部化状态、超时与队列，而不是脚本常驻。 |

### 第 12 组 · 多智能体与项目表达（12 条）

> 学完能：能说清多智能体的取舍，并用约束、权衡与可验证结果讲清三个项目。

| 编号 | 知识点 | 它是什么 / 不做会怎样 |
|---|---|---|
| K117 | [什么时候才该拆多智能体](https://agent.meetoffer.cn/#/doc/k117-when-multi-agent) | 职责、上下文、验证或并行收益真实存在才拆；多数任务单 Agent 更稳。 |
| K118 | [主从 / 流水线 / 辩论三种模式](https://agent.meetoffer.cn/#/doc/k118-multi-patterns) | 各自适合什么任务、消息怎么走、结果由谁裁决。 |
| K119 | [任务拆分与完成标准](https://agent.meetoffer.cn/#/doc/k119-task-decomposition) | 子任务必须带可判定验收条件，否则拆得越细越难判断完成没有。 |
| K120 | [状态共享、冲突处理与失败恢复](https://agent.meetoffer.cn/#/doc/k120-shared-state) | 共享什么、谁有权改、其中一个失败时整单怎么收尾。 |
| K121 | [岗位 JD 拆解与「该不该用 Agent」](https://agent.meetoffer.cn/#/doc/k121-jd-analysis) | 从 JD 反推要考的工程能力，并对每个场景先做必要性判断。 |
| K122 | [三个能写进简历的项目](https://agent.meetoffer.cn/#/doc/k122-three-projects) | 每个项目的边界、架构、关键取舍与可验证结果。 |
| K123 | [约束、权衡与可验证结果](https://agent.meetoffer.cn/#/doc/k123-tradeoffs) | 简历不写「做了智能助手」，写清限制条件、为什么不选另一条路。 |
| K124 | [数字口径与统计范围](https://agent.meetoffer.cn/#/doc/k124-number-integrity) | 只写真实可核对的数字，说明统计范围与时间窗，不编数据。 |
| K125 | [四层追问链与转行者三问](https://agent.meetoffer.cn/#/doc/k125-followup-chain) | 面试官追的是决策链；凭什么信你做过、和只会调接口差在哪、怎么定位问题。 |
| K126 | [15 分钟讲项目的节奏](https://agent.meetoffer.cn/#/doc/k126-project-pitch) | 背景与约束 → 架构与关键取舍 → 评测与故障 → 复盘，节奏预先练过。 |
| K152 | [扇出并行与 workers 上限](https://agent.meetoffer.cn/#/doc/k152-fanout) | 并行能降延迟，但必须限制分支数与总预算，否则一次扇出就把额度吃光。 |
| K153 | [简历四行模板、STAR(L) 与讲清失败案例](https://agent.meetoffer.cn/#/doc/k153-resume-template) | 用约束、动作、结果、复盘四行写项目；主动讲一次真实失败比堆形容词更有说服力。 |

---

## 📖 专题长文

除逐条知识点正文外，另有一组按主题串起来的长文，用于把零散知识点连成能落地的系统：

| 篇目 | 讲什么 |
|---|---|
| [Agent 开发学习路线一条龙：要掌握的全部知识点](https://agent.meetoffer.cn/#/doc/00-start-here) | 把 Agent 开发岗要掌握的全部知识点按依赖关系逐条罗列，每条点开都是一篇完整正文。 |
| [大模型到底在干什么](https://agent.meetoffer.cn/#/doc/01-how-llm-works) | 不讲公式。只用「猜下一个词」这一件事，把幻觉、上下文长度、Token 计费、输出不稳定、以及提示词为什么有用，全部推导出来。 |
| [第一次调用：把一次请求拆成五块](https://agent.meetoffer.cn/#/doc/02-first-call) | 从零写一份带超时、指数退避、成本打印的调用脚本；不申请任何账号就能跑通，之后换真实服务只改两行。 |
| [让输出稳定下来](https://agent.meetoffer.cn/#/doc/03-structured-output) | 「只输出 JSON」为什么没用？把校验从模型手里收回来：语法、结构、语义三层契约，加上自动纠正与果断降级。 |
| [什么是 Agent：一条线划清边界](https://agent.meetoffer.cn/#/doc/04-what-is-agent) | 判断是不是 Agent 只有一条标准；以及一个更重要的问题——什么时候根本不该用 Agent。 |
| [手写第一个 Agent 循环](https://agent.meetoffer.cn/#/doc/05-agent-loop) | 不用任何框架，从零写一个能跑完整多步任务的 Agent：状态、工具、终止条件、错误回传、幂等、检查点、轨迹回放，全部自己实现。 |
| [工具调用：让文字安全地碰到真实世界](https://agent.meetoffer.cn/#/doc/06-tool-calling) | 工具不是「函数列表」，是一份契约。参数怎么设计才不让模型编、权限怎么收、副作用怎么防重复、工具清单怎么减肥。 |
| [上下文工程：Agent 真正的命门](https://agent.meetoffer.cn/#/doc/07-context) | 「聊了二十轮突然变笨」的完整解法：一张预算表、四层结构、三种压缩策略、预检路由与前缀缓存。 |
| [检索增强：让答案带得出出处](https://agent.meetoffer.cn/#/doc/08-rag) | 从「为什么整份文档塞进去必然更差」开始，手写一个带切分、混合检索、重排、溯源与拒答的模块，并给出答案不对时的完整排查顺序。 |
| [记忆系统：以及什么时候坚决不该记](https://agent.meetoffer.cn/#/doc/09-memory) | 「把聊天记录全存下来」不叫记忆，叫日志。三层记忆、写入决策、冲突消解、召回与遗忘，还有一个更重要的问题：哪些东西绝不能记。 |
| [框架与工具协议：它们到底替你做了什么](https://agent.meetoffer.cn/#/doc/10-framework) | 不点名任何产品，只讲共性原理：框架替你接管了哪六件事、工具协议解决与不解决什么、以及什么时候它们在帮倒忙。 |
| [评测：怎么证明改了一版没变差](https://agent.meetoffer.cn/#/doc/11-eval) | 三层评测、一份从 30 条起步的用例集、性质断言而非文本断言、以及一条能卡住上线的回归门禁。 |
| [安全与护栏：让系统敢开给别人用](https://agent.meetoffer.cn/#/doc/12-safety) | 间接提示注入为什么提示词挡不住、四类攻击面、最小权限矩阵、成本炸弹与预算、以及一份可照着勾的上线自检清单。 |
| [从 Demo 到上线：差的不是部署](https://agent.meetoffer.cn/#/doc/13-production) | 本地跑通和敢开给别人用之间，隔着十项显式化：幂等落盘、结构化日志、超时降级、健康检查、指标、灰度与回滚。 |
| [三个能写进简历的项目](https://agent.meetoffer.cn/#/doc/14-projects) | 不写「基于大模型开发了智能助手」，写约束、权衡与可验证的结果。三个项目各带架构、代码骨架、评测口径与追问预判。 |
| [面试追问链：把项目答到第四层](https://agent.meetoffer.cn/#/doc/15-interview) | 面试官追的不是知识点，是你的决策链。四条高频追问链逐层拆解，外加转行者专属三问与 15 分钟讲项目的节奏。 |
| [Agent 开发高频面试题精讲](https://agent.meetoffer.cn/#/doc/16-interview-qa) | 用 10 道真实高频题，把「决策闭环、工具链路、检索、评测」这些必考知识点讲成能答到第四层的回答，而不是背名词。 |
| [从能跑到敢开：生产化落地清单](https://agent.meetoffer.cn/#/doc/17-production-checklist) | 把成本、可观测性、护栏、灰度回滚四件事逐项落到代码里，附一份能照着勾的上线检查清单与可直接运行的最小实现。 |

---

## 关于本站

|  |  |
|---|---|
| **内容形态** | 1 篇总纲 + 153 篇知识点正文 + 18 篇专题长文，全部是原创正文，不是链接清单 |
| **代码** | 全部 Python 标准库，零账号、零联网，复制粘贴就能跑，逐行解释 |
| **站点** | 亮 / 暗主题、常驻目录树、页内目录、全文搜索、阅读进度、移动端抽屉 |
| **费用** | 教程全部免费公开、持续更新 |

---

## 资料包与求职情报

按公司 / 岗位分类的笔面情报与网申时间线、主流笔试平台的题型与规则差异、面经追问链合集与项目讲法模板。

公众号回复关键词 **`Agent`** 领取；1v1 笔面辅导与情报咨询走微信 `offer630`，成交走闲鱼担保。

---

<div align="center">

**AgentOffer** · 笔面王者 · [agent.meetoffer.cn](https://agent.meetoffer.cn)

MIT 协议 · 内容可自由使用，请保留出处 · 琼ICP备2025054949号-1

</div>
