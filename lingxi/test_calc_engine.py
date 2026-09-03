# -*- coding: utf-8 -*-
"""计算引擎移植验证 —— 测试向量取自 TS 版 calculator.test.ts / analyzer.test.ts

运行：uv run python lingxi/test_calc_engine.py
"""

from calc_engine import (
    sum_variable_costs, calc_category, single_category, multi_category,
    analyze, build_sensitivity_matrix, goal_seek,
    step_chart_to_stacked_data, store_cvp_line_data, categories_pie_data,
    parse_scenarios, compare_scenarios,
    format_core_metrics, format_step_table, format_suggestions,
    format_goal_seek_text, format_compare_text, format_input_snapshot,
    waterfall_svg, cvp_svg, route, _no_data,
    parse_markdown_table,
)


def make_cat(**overrides):
    cat = {
        'category': '智屏',
        'costMode': 'modeA',
        'tierNames': ['X', 'C', 'P', 'S'],
        'productStructure': {
            'X': {'sales': 30000, 'volume': 2, 'grossMargin': 0.30},
            'C': {'sales': 280000, 'volume': 33, 'grossMargin': 0.22},
            'P': {'sales': 240000, 'volume': 40, 'grossMargin': 0.15},
            'S': {'sales': 50000, 'volume': 15, 'grossMargin': 0.08, 'subsidy': 20000},
        },
        'variableCosts': {
            'commission': 0.03, 'annualRebate': 0.015, 'retailDiscount': 0.01,
            'extraRebate': 0.005, 'promotionSupport': 0.01,
            'channelIncentivePrivate': 0.008, 'channelIncentiveReferral': 0.005,
            'salesCommission': 0.01, 'businessCommission': 0.005,
            'extraIncentive': 0.003, 'logisticsFee': 0.008, 'promotionFee': 0.006,
            'contractRebate': 0, 'channelIncentiveOnline': 0,
            'commissionSales': 0, 'commissionBusiness': 0, 'retailIncentive': 0, 'salesGap': 0,
        },
    }
    cat.update(overrides)
    return cat


FC = {'venueFee': 17000, 'operationSupport': 4000, 'laborCost': 10000,
      'dailyExpense': 2000, 'boothCost': 8000}

passed = failed = 0


def check(name, cond):
    global passed, failed
    if cond:
        passed += 1
    else:
        failed += 1
        print(f'  ✗ {name}')


def close(a, b, tol=1e-6):
    return abs(a - b) <= tol


# ── F13: sum_variable_costs 按核算模式过滤 ──
both = {'commission': 0.03, 'contractRebate': 0.02, 'extraRebate': 0.01}
check('modeA 排除 modeB 专属项', close(sum_variable_costs(both, 'modeA'), 0.04, 1e-10))
check('modeB 排除 modeA 专属项', close(sum_variable_costs(both, 'modeB'), 0.03, 1e-10))
check('不传模式汇总全部', close(sum_variable_costs(both), 0.06, 1e-10))

# ── F1: 保本点纳入补贴 BEP=(FC-subsidy)/CMR ──
r = single_category(make_cat(), FC)
total_sales = 600000
vr = 0.115
weighted_cmr = (30000 / total_sales) * (0.30 - vr) + (280000 / total_sales) * (0.22 - vr) \
    + (240000 / total_sales) * (0.15 - vr) + (50000 / total_sales) * (0.08 - vr)
net_fc = 41000 - 20000
check('保本点=BEP净固定费用/CMR', close(r['breakevenSales'], net_fc / weighted_cmr, 1e-6))
check('修复后保本点 < 未扣补贴的 41000/CMR', r['breakevenSales'] < 41000 / weighted_cmr)

cat2 = make_cat()
cat2['productStructure']['S'] = {'sales': 50000, 'volume': 15, 'grossMargin': 0.08, 'subsidy': 50000}
r2 = single_category(cat2, FC)
check('补贴≥固定费用时保本点为0', r2['breakevenSales'] == 0)
check('补贴≥固定费用时安全边际率=1', r2['safetyMarginRate'] == 1)

# ── 0 销售额系列 ──
cat3 = make_cat()
cat3['productStructure']['X'] = {'sales': 0, 'volume': 0, 'grossMargin': 0.05}
res3, tiers3 = calc_category(cat3)
check('0销售额系列 cmr 归零', close(tiers3['X']['cmr'], 0))
check('0销售额系列贡献额为0', close(tiers3['X']['contributionAmount'], 0))
check('0销售额系列占比为0', close(tiers3['X']['ratio'], 0))
check('有销售额系列 cmr 保持数学值', close(tiers3['C']['cmr'], 0.22 - 0.115, 1e-10))
check('有销售额系列贡献额正确', close(tiers3['C']['contributionAmount'], 280000 * (0.22 - 0.115), 1e-10))
check('品类贡献额=各系列和', close(
    res3['contributionAmount'],
    (280000 * (0.22 - 0.115)) + (240000 * (0.15 - 0.115)) + (50000 * (0.08 - 0.115)), 1e-6))

cat4 = make_cat()
for k in list(cat4['productStructure']):
    cat4['productStructure'][k] = {**cat4['productStructure'][k], 'sales': 0}
res4, _ = calc_category(cat4)
check('全0销售额时加权CMR为0', close(res4['weightedCMR'], 0))
check('全0销售额时贡献额为0', close(res4['contributionAmount'], 0))

# ── analyzer: 0销售额不误报负CMR ──
cat5 = make_cat()
cat5['productStructure']['X'] = {'sales': 0, 'volume': 0, 'grossMargin': 0.05}
an5 = analyze(single_category(cat5, FC))
check('0销售额系列不产生"负CMR"建议',
      not any('X系列边际贡献率为负' in s['message'] for s in an5['suggestions']))

cat6 = make_cat()
cat6['productStructure']['S'] = {'sales': 50000, 'volume': 15, 'grossMargin': 0.05}
an6 = analyze(single_category(cat6, FC))
check('有销售的负CMR系列仍被诊断',
      any('S系列边际贡献率为负' in s['message'] for s in an6['suggestions']))

# ── 多品类 smoke test ──
multi = multi_category({'智屏': make_cat()}, FC)
check('多品类单氛围 totalSales 正确', close(multi['totalSales'], 600000))
check('多品类有 stepChartData', 'stepChartData' in multi and len(multi['stepChartData']['segments']) > 0)

# ── goalSeek / sensitivity smoke test ──
gs = goal_seek(r, 80000)
check('goalSeek 产出 requiredSales', gs['requiredSales'] is not None and gs['requiredSales'] > 0)
check('goalSeek 产出三方案', len(gs['multiVarSolutions']) == 3)
sm = build_sensitivity_matrix(r)
check('sensitivity 5x5 单元格', len(sm['cells']) == 5 and all(len(row) == 5 for row in sm['cells']))

# ── 图表数据转档 ──
seg_rows = step_chart_to_stacked_data(r['stepChartData'])
# 每段 2 行（底座+贡献），4 个系列 → 8 行
check('阶梯图转档：每段底座+贡献两层', len(seg_rows) == 2 * len(r['stepChartData']['segments']))
check('阶梯图转档：首行是底座值0', seg_rows[0]['group'] == '底座' and seg_rows[0]['value'] == 0)
check('阶梯图转档：字段含 category/value/group',
      all(set(row.keys()) == {'category', 'value', 'group'} for row in seg_rows))
# 校验堆叠语义：某段的 底座 + 贡献 = 该段累计贡献
first_seg = r['stepChartData']['segments'][0]
base0 = seg_rows[0]['value']
contrib0 = seg_rows[1]['value']
check('阶梯图转档：底座+贡献=累计贡献',
      close(base0 + contrib0, first_seg['cumulativeContribution'], 1e-2))

cvp_rows = store_cvp_line_data(r)
check('CVP 转档：收入/总成本两条线都有',
      set(row['group'] for row in cvp_rows) == {'收入', '总成本'})
check('CVP 转档：字段含 time/value/group',
      all(set(row.keys()) == {'time', 'value', 'group'} for row in cvp_rows))

pie_rows = categories_pie_data(r)
check('饼图转档：单品类产生1行', len(pie_rows) == 1)
check('饼图转档：字段含 category/value',
      all(set(row.keys()) == {'category', 'value'} for row in pie_rows))
check('饼图转档：value=品类贡献额', close(pie_rows[0]['value'], r['categoryResults']['智屏']['contributionAmount'], 0.1))

# ── 多品类饼图 ──
cat_ac = make_cat()
cat_ac['category'] = '空调'
multi2 = multi_category({'智屏': make_cat(), '空调': cat_ac}, FC)
pie2 = categories_pie_data(multi2)
check('饼图转档：多品类产生2行', len(pie2) == 2)
check('饼图转档：品类名正确', set(p['category'] for p in pie2) == {'智屏', '空调'})

# ── 阶段2：意图路由 + 方案对比（parse_scenarios / compare_scenarios） ──
# 旧平铺格式兼容：无 scenarios 字段 → 单方案
flat_input = {
    'store_name': '测试店',
    'categories': [{'category': '智屏', 'cost_mode': 'modeA', 'variable_cost_rate': 0.115,
                    'X': {'sales': 300000, 'gross_margin': 0.30},
                    'C': {'sales': 280000, 'gross_margin': 0.22},
                    'P': {'sales': 240000, 'gross_margin': 0.15},
                    'S': {'sales': 50000, 'gross_margin': 0.08, 'subsidy': 20000}}],
    'store_fixed_costs': {'场地费': 17000, '展台': 8000, '人力成本': 10000, '日常费用': 2000, '运营支持': 4000},
}
parsed = parse_scenarios(flat_input)
check('parse_scenarios：平铺格式→单方案', len(parsed) == 1)
check('parse_scenarios：方案名取 store_name', parsed[0]['name'] == '测试店')
check('parse_scenarios：品类转换正确', '智屏' in parsed[0]['categories'])
check('parse_scenarios：固定费用5项', list(parsed[0]['store_fixed_costs'].keys()) ==
      ['venueFee', 'boothCost', 'laborCost', 'dailyExpense', 'operationSupport'])

# 新多方案格式
multi_input = {
    'scenarios': [
        {'name': '提价策略', 'categories': [{'category': '智屏', 'variable_cost_rate': 0.115,
          'X': {'sales': 300000, 'gross_margin': 0.30}, 'C': {'sales': 280000, 'gross_margin': 0.22},
          'P': {'sales': 240000, 'gross_margin': 0.15}, 'S': {'sales': 50000, 'gross_margin': 0.11}}],
         'store_fixed_costs': {'场地费': 17000, '展台': 8000, '人力成本': 10000, '日常费用': 2000, '运营支持': 4000}},
        {'name': '扩量策略', 'categories': [{'category': '智屏', 'variable_cost_rate': 0.115,
          'X': {'sales': 400000, 'gross_margin': 0.30}, 'C': {'sales': 350000, 'gross_margin': 0.22},
          'P': {'sales': 280000, 'gross_margin': 0.15}, 'S': {'sales': 60000, 'gross_margin': 0.08}}],
         'store_fixed_costs': {'场地费': 17000, '展台': 8000, '人力成本': 10000, '日常费用': 2000, '运营支持': 4000}},
    ],
}
parsed2 = parse_scenarios(multi_input)
check('parse_scenarios：多方案格式→2方案', len(parsed2) == 2)
compare = compare_scenarios(parsed2)
check('compare_scenarios：2行对比', len(compare['rows']) == 2)
check('compare_scenarios：行含全部指标',
      all(k in compare['rows'][0] for k in ['name', 'profit', 'totalSales', 'weightedCMR', 'breakevenSales']))
check('compare_scenarios：利润正确（扩量>提价）',
      compare['rows'][1]['profit'] > compare['rows'][0]['profit'])

# ── 阶段2维护：格式化输出（LLM 照抄文本，禁止重算） ──
# 用例1 标准数据（X=30万，销售总额 87 万）
cat87 = {
    'category': '智屏', 'costMode': 'modeA', 'variableCostRate': 0.115,
    'productStructure': {
        'X': {'sales': 300000, 'grossMargin': 0.30}, 'C': {'sales': 280000, 'grossMargin': 0.22},
        'P': {'sales': 240000, 'grossMargin': 0.15}, 'S': {'sales': 50000, 'grossMargin': 0.08, 'subsidy': 20000},
    },
}
r87 = single_category(cat87, FC)
m = format_core_metrics(r87)
check('format_core_metrics：含销售额 87万', '87.00 万' in m)
check('format_core_metrics：含 CMR 10.52%', '10.52%' in m)
check('format_core_metrics：含保本 19.96万', '19.96 万' in m)
check('format_core_metrics：含利润 7.06万', '7.06 万' in m)

t = format_step_table(r87)
check('format_step_table：含 X 系列累计贡献', '| X | 5.55 万' in t)
check('format_step_table：含保本点 ¥113,514', '¥113,514' in t)
check('format_step_table：含净固定费用 2.10万', '2.10 万' in t)

# 亏损店阶梯表（无法覆盖）
loss_cat = {
    'category': '智屏', 'costMode': 'modeA', 'variableCostRate': 0.115,
    'productStructure': {
        'X': {'sales': 20000, 'grossMargin': 0.30}, 'C': {'sales': 30000, 'grossMargin': 0.22},
        'P': {'sales': 10000, 'grossMargin': 0.15}, 'S': {'sales': 5000, 'grossMargin': 0.08},
    },
}
loss_base = single_category(loss_cat, FC)
t_loss = format_step_table(loss_base)
check('format_step_table：亏损店提示无法覆盖', '不足以覆盖固定费用' in t_loss)

# ── 格式化输出（目标反推 / 方案对比 / 诊断线索） ──
from calc_engine import goal_seek as _gs
_gs_r = single_category(cat87, FC)
_gs_out = _gs(_gs_r, 100000)
g_text = format_goal_seek_text(_gs_r, _gs_out, 100000)
check('format_goal_seek_text：含方案A所需 114.99万', '114.99 万' in g_text)
check('format_goal_seek_text：含可行性 30', '30/100' in g_text)
check('format_goal_seek_text：含三方案', all(m in g_text for m in ['保守方案', '均衡方案', '激进方案']))

cmp2 = compare_scenarios(parsed2)
c_text = format_compare_text(cmp2)
check('format_compare_text：含两方案名', '提价策略' in c_text and '扩量策略' in c_text)
check('format_compare_text：含利润列', '5.21 万' in c_text and '7.75 万' in c_text)

s_text = format_suggestions(r87)
check('format_suggestions：含盈利状态', '健康' in s_text)
check('format_suggestions：含负CMR线索', 'S系列边际贡献率为负' in s_text)

# ── SVG 图形生成 ──
wf_svg = waterfall_svg(r87)
check('waterfall_svg：含 <svg 根标签', '<svg' in wf_svg and '</svg>' in wf_svg)
check('waterfall_svg：含净固定费参考线', '净固定费' in wf_svg)
check('waterfall_svg：含系列标签 X', '>X<' in wf_svg or 'X</text>' in wf_svg)
check('waterfall_svg：含保本虚线（stroke-dasharray）', 'stroke-dasharray' in wf_svg)

cvp_svg_out = cvp_svg(r87)
check('cvp_svg：含 <svg 根标签', '<svg' in cvp_svg_out and '</svg>' in cvp_svg_out)
check('cvp_svg：含保本点标记', '保本点' in cvp_svg_out)
check('cvp_svg：含两条折线（polyline×2）', cvp_svg_out.count('<polyline') == 2)

# ── 追问守卫：空数据/chat 意图不崩溃（修复 IndexError） ──
# 1. chat 意图（追问）：返回空 facts + 引导，不报错
chat_out = route({'intent': 'chat'})
check('route(chat)：不崩溃且 facts 为空', chat_out['facts_text'] == '')
check('route(chat)：guidance 含追问引导', '追问' in chat_out['guidance_text'])
check('route(chat)：chart_svg 为空', chat_out['chart_svg'] == '')

# 2. calc 但 categories 为空（抽取漏掉数据）：不崩溃，返回 _no_data
empty_out = route({'intent': 'calc'})
check('route(空categories)：不崩溃', empty_out['facts_text'] == '' and empty_out['chart_svg'] == '')
check('route(空categories)：guidance 引导补数据', '品类' in empty_out['guidance_text'])

# 3. goal_seek 但无数据：不崩溃
gs_empty = route({'intent': 'goal_seek', 'target_profit': 100000})
check('route(goal_seek空数据)：不崩溃', gs_empty['facts_text'] == '')

# 4. compare 但无 scenarios：不崩溃
cmp_empty = route({'intent': 'compare'})
check('route(compare空数据)：不崩溃', cmp_empty['facts_text'] == '')

# 5. 正常 calc 仍走通（回归）
ok_out = route({'intent': 'calc', 'categories': [{'category': '智屏', 'variable_cost_rate': 0.115,
    'X': {'sales': 300000, 'gross_margin': 0.30}, 'C': {'sales': 280000, 'gross_margin': 0.22},
    'P': {'sales': 240000, 'gross_margin': 0.15}, 'S': {'sales': 50000, 'gross_margin': 0.08, 'subsidy': 20000}}],
    'store_fixed_costs': {'场地费': 17000, '展台': 8000, '人力成本': 10000, '日常费用': 2000, '运营支持': 4000}})
check('route(calc正常)：输出三字段', set(ok_out.keys()) == {'facts_text', 'guidance_text', 'chart_svg'})
check('route(calc正常)：facts 含 CMR', '10.52%' in ok_out['facts_text'])

# 6. 输入快照（修改重算依据）：facts 含当前生效明细
snap = format_input_snapshot({'store_name': '测试店', 'categories': [{'category': '智屏', 'cost_mode': 'modeA',
    'X': {'sales': 300000, 'gross_margin': 0.30}, 'C': {'sales': 280000, 'gross_margin': 0.22},
    'P': {'sales': 240000, 'gross_margin': 0.15}, 'S': {'sales': 50000, 'gross_margin': 0.08, 'subsidy': 20000}}],
    'store_fixed_costs': {'场地费': 17000, '展台': 8000, '人力成本': 10000, '日常费用': 2000, '运营支持': 4000}})
check('format_input_snapshot：含品类名', '智屏' in snap)
check('format_input_snapshot：含 X 销售额明细', '300000' in snap)
check('format_input_snapshot：含 S 补贴', '20000' in snap)
check('format_input_snapshot：含固定费用', '场地费17000' in snap)
check('route(calc正常)：facts 含输入快照块', '本次测算输入数据' in ok_out['facts_text'])

# ── Excel markdown 解析（parse_markdown_table，真实模板数据） ──
_MD = '''| 门店名称 | Suning Elec阳江雨田广场店 | Unnamed: 2 | Unnamed: 3 | Unnamed: 4 | Unnamed: 5 |
| ---- | ------------------ | ---------- | ---------- | ---------- | ---------- |
| 品类 | 智屏 | nan | nan | nan | nan |
| 核算模式：倒扣制核算法 | nan | nan | nan | nan | nan |
| 产品结构 | nan | nan | nan | nan | nan |
| 项目 | 合计 | X（高端） | C（中端） | P（主流） | S（低端） |
| 销售额（元） | nan | 25000 | 416095.71 | 127907.2 | 60914.9 |
| 销量 | nan | 1 | 50 | 24 | 21 |
| 毛利率 | 0.3 | 0.3 | 0.25403049697388 | 0.465165369893173 | 0.202873188661559 |
| 总部补贴（元） | nan | 0 | 0 | 0 | nan |
| 变动费用（点位%，如 3% 填 0.03） | nan | nan | nan | nan | nan |
| 基于供价的资源投入-客户费用 | nan | nan | nan | nan | nan |
| 1、开单扣 | 0.063 | nan | nan | nan | nan |
| 2、年度返利 | 0.02 | nan | nan | nan | nan |
| 3、零售折扣 | 0.0623 | nan | nan | nan | nan |
| 基于实际零售额客户费用投入 | nan | nan | nan | nan | nan |
| 合同外返利 | 0.02 | nan | nan | nan | nan |
| 促销活动支持 | 0.02 | nan | nan | nan | nan |
| 基于零售额的经营费用投入 | nan | nan | nan | nan | nan |
| 1、渠道激励（对私） | 0.024 | nan | nan | nan | nan |
| 2、渠道激励（带单） | 0 | nan | nan | nan | nan |
| 3、销代提成 | 0.0309 | nan | nan | nan | nan |
| 4、业务提成 | 0.003 | nan | nan | nan | nan |
| 5、追加激励 | 0.005 | nan | nan | nan | nan |
| 6、储运费 | 0.006 | nan | nan | nan | nan |
| 7、促销推广费 | 0.005 | nan | nan | nan | nan |
| 固定费用（元/月） | nan | nan | nan | nan | nan |
| 场地费 | 0 | nan | nan | nan | nan |
| 展台 | 10000 | nan | nan | nan | nan |
| 人力成本 | 22800 | nan | nan | nan | nan |
| 日常费用 | 1000 | nan | nan | nan | nan |
| 运营支持 | 0 | nan | nan | nan | nan |'''

md_data = parse_markdown_table(_MD)
check('parse_markdown_table：门店名正确', md_data['store_name'] == 'Suning Elec阳江雨田广场店')
check('parse_markdown_table：品类智屏', md_data['categories'][0]['category'] == '智屏')
check('parse_markdown_table：变动费率 0.2592',
      abs(md_data['categories'][0]['variable_cost_rate'] - 0.2592) < 1e-9)
check('parse_markdown_table：X 销售额 25000',
      md_data['categories'][0]['X']['sales'] == 25000)
check('parse_markdown_table：X 毛利率 0.3',
      abs(md_data['categories'][0]['X']['gross_margin'] - 0.3) < 1e-9)
check('parse_markdown_table：展台 10000',
      md_data['store_fixed_costs']['展台'] == 10000)

# 端到端：通过 route 算出结果，验证数字
md_out = route(md_data)
check('Excel route：facts 含利润 -1.20万', '-1.20 万' in md_out['facts_text'])
check('Excel route：facts 含 CMR 3.46%', '3.46%' in md_out['facts_text'])


# ── Excel markdown 解析（多品类模板，真实数据） ──
# 结构：门店信息 sheet（门店名+核算模式+固定费用） + 每品类一个 sheet（品类名+产品结构+变动费用）
# 期望值均手工独立核算，与引擎输出逐项对账。
_MD_MULTI = '''| 门店名称 | 泰阳广场旗舰店 |
| 核算模式：倒扣制核算法 |  |
| 固定费用（元/月） |  |
| 场地费 | 25000 |
| 展台 | 12000 |
| 人力成本 | 18000 |
| 日常费用 | 3000 |
| 运营支持 | 5000 |

| 品类：智屏 |  |  |  |  |  |
| 产品结构 |  |  |  |  |  |
| 项目 | 合计 | X（高端） | C（中端） | P（主流） | S（低端） |
| 销售额（元） | 30000 | 280000 | 240000 | 50000 |  |
| 毛利率 | 0.3 | 0.22 | 0.15 | 0.08 |  |
| 总部补贴（元） |  | 2000 | 1000 | 0 |  |
| 变动费用（点位%，如 3% 填 0.03） |  |  |  |  |  |
| 1、开单扣 | 0.03 |  |  |  |  |
| 2、年度返利 | 0.015 |  |  |  |  |
| 3、零售折扣 | 0.01 |  |  |  |  |
| 合同外返利 | 0.005 |  |  |  |  |
| 促销活动支持 | 0.01 |  |  |  |  |
| 1、渠道激励（对私） | 0.008 |  |  |  |  |
| 2、渠道激励（带单） | 0.005 |  |  |  |  |
| 3、销代提成 | 0.01 |  |  |  |  |
| 4、业务提成 | 0.005 |  |  |  |  |
| 5、追加激励 | 0.003 |  |  |  |  |
| 6、储运费 | 0.008 |  |  |  |  |
| 7、促销推广费 | 0.006 |  |  |  |  |

| 品类：空调 |  |  |  |  |  |
| 产品结构 |  |  |  |  |  |
| 项目 | 合计 | X（高端） | C（中端） | P（主流） | S（低端） |
| 销售额（元） | 60000 | 250000 | 150000 | 60000 |  |
| 毛利率 | 0.25 | 0.2 | 0.14 | 0.07 |  |
| 总部补贴（元） |  | 1500 | 500 | 0 |  |
| 变动费用（点位%，如 3% 填 0.03） |  |  |  |  |  |
| 1、开单扣 | 0.025 |  |  |  |  |
| 2、年度返利 | 0.012 |  |  |  |  |
| 3、零售折扣 | 0.008 |  |  |  |  |
| 合同外返利 | 0.004 |  |  |  |  |
| 促销活动支持 | 0.008 |  |  |  |  |
| 1、渠道激励（对私） | 0.006 |  |  |  |  |
| 2、渠道激励（带单） | 0.004 |  |  |  |  |
| 3、销代提成 | 0.008 |  |  |  |  |
| 4、业务提成 | 0.004 |  |  |  |  |
| 5、追加激励 | 0.002 |  |  |  |  |
| 6、储运费 | 0.006 |  |  |  |  |
| 7、促销推广费 | 0.005 |  |  |  |  |

| 品类：白电 |  |  |  |  |  |
| 产品结构 |  |  |  |  |  |
| 项目 | 合计 | X（高端） | C（中端） | P（主流） | S（低端） |
| 销售额（元） | 40000 | 180000 | 100000 | 30000 |  |
| 毛利率 | 0.28 | 0.22 | 0.18 | 0.1 |  |
| 总部补贴（元） |  | 1000 | 500 | 0 |  |
| 变动费用（点位%，如 3% 填 0.03） |  |  |  |  |  |
| 1、开单扣 | 0.028 |  |  |  |  |
| 2、年度返利 | 0.014 |  |  |  |  |
| 3、零售折扣 | 0.009 |  |  |  |  |
| 合同外返利 | 0.004 |  |  |  |  |
| 促销活动支持 | 0.009 |  |  |  |  |
| 1、渠道激励（对私） | 0.007 |  |  |  |  |
| 2、渠道激励（带单） | 0.004 |  |  |  |  |
| 3、销代提成 | 0.009 |  |  |  |  |
| 4、业务提成 | 0.005 |  |  |  |  |
| 5、追加激励 | 0.002 |  |  |  |  |
| 6、储运费 | 0.007 |  |  |  |  |
| 7、促销推广费 | 0.005 |  |  |  |  |

| 品类：CIoT |  |  |  |  |  |
| 产品结构 |  |  |  |  |  |
| 项目 | 合计 | X（高端） | C（中端） | P（主流） | S（低端） |
| 销售额（元） | 10000 | 40000 | 20000 | 10000 |  |
| 毛利率 | 0.35 | 0.28 | 0.2 | 0.12 |  |
| 总部补贴（元） |  | 800 | 300 | 0 |  |
| 变动费用（点位%，如 3% 填 0.03） |  |  |  |  |  |
| 1、开单扣 | 0.02 |  |  |  |  |
| 2、年度返利 | 0.01 |  |  |  |  |
| 3、零售折扣 | 0.006 |  |  |  |  |
| 合同外返利 | 0.003 |  |  |  |  |
| 促销活动支持 | 0.006 |  |  |  |  |
| 1、渠道激励（对私） | 0.005 |  |  |  |  |
| 2、渠道激励（带单） | 0.003 |  |  |  |  |
| 3、销代提成 | 0.007 |  |  |  |  |
| 4、业务提成 | 0.004 |  |  |  |  |
| 5、追加激励 | 0.002 |  |  |  |  |
| 6、储运费 | 0.005 |  |  |  |  |
| 7、促销推广费 | 0.004 |  |  |  |  |'''

md_multi = parse_markdown_table(_MD_MULTI)
check('多品类：解析出 4 个品类', len(md_multi['categories']) == 4)
check('多品类：品类顺序 智屏/空调/白电/CIoT',
      [c['category'] for c in md_multi['categories']] == ['智屏', '空调', '白电', 'CIoT'])
check('多品类：门店名正确', md_multi['store_name'] == '泰阳广场旗舰店')
check('多品类：场地费 25000', md_multi['store_fixed_costs']['场地费'] == 25000)
check('多品类：智屏变动费率 0.115',
      abs(md_multi['categories'][0]['variable_cost_rate'] - 0.115) < 1e-9)
check('多品类：空调变动费率 0.092',
      abs(md_multi['categories'][1]['variable_cost_rate'] - 0.092) < 1e-9)
check('多品类：智屏 X 销售额 280000（忽略「合计」列占位值）',
      md_multi['categories'][0]['X']['sales'] == 280000)
check('多品类：智屏 X 毛利率 0.22',
      abs(md_multi['categories'][0]['X']['gross_margin'] - 0.22) < 1e-9)

# 端到端：多品类 route 核心指标（手工独立核算锚点）
# 总销售=141万 总毛利=25.38万 总贡献=10.875万 补贴=0.76万 利润=53350→5.34万
# CMR=10.875/141=7.71% 保本=(6.3-0.76)/0.0771=71.83万
md_multi_out = route(md_multi)
check('多品类 route：销售额 141.00 万', '141.00 万' in md_multi_out['facts_text'])
check('多品类 route：利润 5.34 万', '5.34 万' in md_multi_out['facts_text'])
check('多品类 route：CMR 7.71%', '7.71%' in md_multi_out['facts_text'])
check('多品类 route：保本 71.83 万', '71.83 万' in md_multi_out['facts_text'])


print(f'\n结果：{passed} 通过，{failed} 失败')
if failed:
    raise SystemExit(1)