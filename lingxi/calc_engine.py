# -*- coding: utf-8 -*-
"""TCL门店盈利测算 —— 计算引擎（Python 移植版）

从 Electron 版的 TypeScript 纯函数引擎（src/renderer/src/shared/calc/）机器移植，
逻辑保持一致，供灵犀平台 3.0 的 code 节点调用。

所有函数均为纯函数：输入 dict/数值，输出 dict/数值，无 IO、无副作用。
code 节点入口为 single_store() / multi_store()。
"""

import json
import re
import base64
import struct
import zlib
from decimal import Decimal, ROUND_HALF_UP

# ── 品类与费用项常量（与 categories.ts / costModeLabels.ts 一致）──

CATEGORY_COLORS = {
    '智屏': '#E4002B',
    '白电': '#ea4335',
    '空调': '#fbbc05',
    'CIoT': '#34a853',
}

# modeA 专属费用项（modeB 时排除，防止两套费用池重复计入）
MODE_A_ONLY_KEYS = {
    'commission', 'annualRebate', 'retailDiscount',
    'salesCommission', 'businessCommission', 'extraIncentive', 'logisticsFee',
}
# modeB 专属费用项（modeA 时排除）
MODE_B_ONLY_KEYS = {
    'contractRebate', 'salesGap', 'channelIncentiveOnline',
    'commissionSales', 'commissionBusiness', 'retailIncentive',
}


def sum_variable_costs(vc, mode=None):
    """变动费用率 = 按核算模式过滤后的字段之和。vc 为 {key: rate}。"""
    total = 0.0
    for k, v in vc.items():
        if mode == 'modeA' and k in MODE_B_ONLY_KEYS:
            continue
        if mode == 'modeB' and k in MODE_A_ONLY_KEYS:
            continue
        total += float(v or 0)
    return total


def calc_cmr(gm, vr):
    """系列边际贡献率 = 毛利率 − 变动费率"""
    return gm - vr


def calc_tier_cmr(tier, vr):
    """系列实际 CMR：销售额为 0 时无贡献，显示 0 而非负值"""
    if (tier.get('sales') or 0) <= 0:
        return 0.0
    return calc_cmr(tier.get('grossMargin') or 0, vr)


def _weighted_cmr(tiers, vr):
    """单品类 — 按系列销售额加权 CMR"""
    total = sum(float(t.get('sales') or 0) for t in tiers.values())
    if total == 0:
        return 0.0
    return sum(
        (float(t.get('sales') or 0) / total) * calc_cmr(t.get('grossMargin') or 0, vr)
        for t in tiers.values()
    )


def calc_category(data):
    """单品类计算 → (category_result, tier_results)

    data 可含 'variableCostRate'（聊天场景直接给整体变动费率），
    否则按 variableCosts 18 项 + 核算模式过滤求和。
    """
    tiers = data['productStructure'] if isinstance(data['productStructure'], dict) else {}
    mode = data.get('costMode')
    vr = data.get('variableCostRate')
    if vr is None:
        vr = sum_variable_costs(data.get('variableCosts') or {}, mode)

    total_sales = sum(float(t.get('sales') or 0) for t in tiers.values())
    total_gp = sum(float(t.get('sales') or 0) * (t.get('grossMargin') or 0) for t in tiers.values())
    total_vc = total_sales * vr
    weighted_cmr = _weighted_cmr(tiers, vr)
    contribution = total_sales * weighted_cmr

    tier_results = {}
    for name, t in tiers.items():
        cmr = calc_tier_cmr(t, vr)
        sales = float(t.get('sales') or 0)
        tier_results[name] = {
            'sales': sales,
            'volume': float(t.get('volume') or 0),
            'ratio': sales / total_sales if total_sales > 0 else 0.0,
            'grossMargin': t.get('grossMargin') or 0,
            'cmr': cmr,
            'contributionAmount': sales * cmr,
        }

    result = {
        'category': data.get('category', ''),
        'totalSales': total_sales,
        'totalGrossProfit': total_gp,
        'totalVariableCost': total_vc,
        'variableCostRate': vr,
        'weightedCMR': weighted_cmr,
        'contributionAmount': contribution,
        'tierResults': tier_results,
    }
    return result, tier_results


def _sum_fc(fc):
    return sum(float(v or 0) for v in (fc or {}).values())


def _total_subsidy(categories):
    s = 0.0
    for cat in categories.values():
        for t in cat.get('productStructure', {}).values():
            s += float(t.get('subsidy') or 0)
    return s


def _category_fc_total(categories):
    s = 0.0
    for cat in categories.values():
        s += _sum_fc(cat.get('exclusiveFixedCosts'))
    return s


def _build_store_result(total_sales, total_gp, total_vc, total_fc, weighted_cmr,
                        contribution, total_subsidy, category_results):
    """组装门店级结果（单/多品类共用）"""
    daily_contribution = contribution + total_subsidy
    daily_rate = daily_contribution / total_sales if total_sales > 0 else 0.0
    profit = daily_contribution - total_fc

    breakeven_sales = None
    safety_margin = None
    if weighted_cmr > 0:
        net_fc = total_fc - total_subsidy
        breakeven_sales = net_fc / weighted_cmr if net_fc > 0 else 0.0
        safety_margin = (total_sales - breakeven_sales) / total_sales if total_sales > 0 else 0.0

    return {
        'totalSales': total_sales,
        'totalGrossProfit': total_gp,
        'totalVariableCost': total_vc,
        'totalFixedCost': total_fc,
        'contributionAmount': contribution,
        'totalSubsidy': total_subsidy,
        'dailyContributionAmount': daily_contribution,
        'dailyContributionRate': daily_rate,
        'profit': profit,
        'grossMarginRate': total_gp / total_sales if total_sales > 0 else 0.0,
        'variableCostRate': total_vc / total_sales if total_sales > 0 else 0.0,
        'weightedCMR': weighted_cmr,
        'breakevenSales': breakeven_sales,
        'safetyMarginRate': safety_margin,
        'categoryResults': category_results,
    }


def multi_category(categories, store_fc):
    """多品类计算（含品类专属固定费用），对应 calcMultiCategory"""
    cat_results = {}
    total_sales = total_gp = total_vc = 0.0
    for key, cat in categories.items():
        result, _ = calc_category(cat)
        cat_results[key] = result
        total_sales += result['totalSales']
        total_gp += result['totalGrossProfit']
        total_vc += result['totalVariableCost']

    total_store_fc = _sum_fc(store_fc)
    total_cat_fc = _category_fc_total(categories)
    total_fc = total_store_fc + total_cat_fc

    weighted_cmr = 0.0
    if total_sales > 0:
        weighted_cmr = sum(
            (cr['totalSales'] / total_sales) * cr['weightedCMR']
            for cr in cat_results.values()
        )

    contribution = total_sales * weighted_cmr
    total_subsidy = _total_subsidy(categories)

    base = _build_store_result(total_sales, total_gp, total_vc, total_fc,
                               weighted_cmr, contribution, total_subsidy, cat_results)

    # 品类级保本点（品类专属固定费用 ÷ 加权 CMR）
    category_bep = None
    if weighted_cmr > 0 and total_cat_fc > 0:
        category_bep = total_cat_fc / weighted_cmr
    base['categoryBEP'] = category_bep

    base['stepChartData'] = _build_step_chart(base, is_multi=True)
    return base


def single_category(category_data, store_fc, store_name=''):
    """单品类完整计算（含阶梯图数据），对应 calcSingleStore"""
    result, _ = calc_category(category_data)
    total_store_fc = _sum_fc(store_fc)
    total_subsidy = _total_subsidy({'c': category_data})
    daily_contribution = result['contributionAmount'] + total_subsidy
    daily_rate = daily_contribution / result['totalSales'] if result['totalSales'] > 0 else 0.0
    profit = daily_contribution - total_store_fc

    breakeven_sales = None
    safety_margin = None
    if result['weightedCMR'] > 0:
        net_fc = total_store_fc - total_subsidy
        breakeven_sales = net_fc / result['weightedCMR'] if net_fc > 0 else 0.0
        safety_margin = (result['totalSales'] - breakeven_sales) / result['totalSales'] \
            if result['totalSales'] > 0 else 0.0

    base = _build_store_result(
        result['totalSales'], result['totalGrossProfit'], result['totalVariableCost'],
        total_store_fc, result['weightedCMR'], result['contributionAmount'],
        total_subsidy, {category_data.get('category', '单品类'): result},
    )
    base['breakevenSales'] = breakeven_sales
    base['safetyMarginRate'] = safety_margin
    base['stepChartData'] = _build_step_chart(base, is_multi=False)
    return base


# ── 阶梯边际贡献图 ──

def _build_step_chart(base, is_multi):
    segments = []
    tier_names = ['X', 'C', 'P', 'S']  # 四级产品结构固定顺序的兜底，实际按 CMR 降序

    if is_multi:
        cat_entries = sorted(base['categoryResults'].items(),
                             key=lambda kv: kv[1]['weightedCMR'], reverse=True)
        for key, cr in cat_entries:
            color = CATEGORY_COLORS.get(cr['category'], '#6b7280')
            tiers = sorted(cr['tierResults'].items(), key=lambda kv: kv[1]['cmr'], reverse=True)
            for name, tr in tiers:
                if tr['sales'] <= 0:
                    continue
                segments.append({
                    'label': f"{cr['category']}-{name}",
                    'category': cr['category'],
                    'sales': tr['sales'], 'cmr': tr['cmr'],
                    'contributionAmount': tr['contributionAmount'],
                    'color': color,
                })
    else:
        for key, cr in base['categoryResults'].items():
            color = CATEGORY_COLORS.get(cr['category'], '#6b7280')
            tiers = sorted(cr['tierResults'].items(), key=lambda kv: kv[1]['cmr'], reverse=True)
            for name, tr in tiers:
                if tr['sales'] <= 0:
                    continue
                segments.append({
                    'label': name,
                    'category': cr['category'],
                    'sales': tr['sales'], 'cmr': tr['cmr'],
                    'contributionAmount': tr['contributionAmount'],
                    'color': color,
                })

    cum_sales = cum_contrib = 0.0
    for seg in segments:
        cum_sales += seg['sales']
        cum_contrib += seg['contributionAmount']
        seg['cumulativeSales'] = cum_sales
        seg['cumulativeContribution'] = cum_contrib

    total_fc = base['totalFixedCost']
    total_subsidy = base.get('totalSubsidy') or 0

    def find_bep(fc):
        if fc <= 0:
            return {'sales': 0, 'label': '保本点 ¥0'}
        prev_cs = prev_cc = 0.0
        for seg in segments:
            if seg['cumulativeContribution'] >= fc:
                overshoot = fc - prev_cc
                bep = prev_cs + (overshoot / seg['cmr'] if seg['cmr'] > 0 else 0)
                bep = round(bep)
                return {'sales': bep, 'label': f"保本点 ¥{bep:,}"}
            prev_cs = seg['cumulativeSales']
            prev_cc = seg['cumulativeContribution']
        return None

    cat_fc = None
    cat_bep = None
    if is_multi and base.get('categoryBEP') and base['weightedCMR'] > 0:
        cat_fc = base['categoryBEP'] * base['weightedCMR']
        cat_bep = find_bep(cat_fc) if cat_fc > 0 else None

    net_fc = total_fc - total_subsidy
    return {
        'segments': segments,
        'storeFC': total_fc,
        'categoryFC': cat_fc,
        'storeBEP': find_bep(net_fc),
        'categoryBEP': cat_bep,
        'currentSales': base['totalSales'],
    }


# ── CVP 量本利分析（cvp.ts） ──

def generate_cvp_data(sales, variable_cost_rate, fixed_cost, gross_margin, points=20):
    max_sales = sales * 2
    step = max_sales / points
    data = []
    for i in range(points + 1):
        s = step * i
        variable_cost = s * variable_cost_rate
        total_cost = variable_cost + fixed_cost
        profit = s * gross_margin - variable_cost - fixed_cost
        data.append({'sales': s, 'revenue': s, 'variableCost': variable_cost,
                     'fixedCost': fixed_cost, 'totalCost': total_cost, 'profit': profit})
    cmr = gross_margin - variable_cost_rate
    break_even = fixed_cost / cmr if cmr > 0 else 0.0
    return {'data': data, 'breakEvenPoint': {'sales': break_even, 'revenue': break_even}}


# ── 敏感性分析（sensitivity.ts） ──

BREAKEVEN_THRESHOLD = 500


def build_sensitivity_matrix(result, sales_steps=None, cmr_steps=None):
    sales_steps = sales_steps or [-20, -10, 0, 10, 20]
    cmr_steps = cmr_steps or [-3, -1, 0, 1, 3]
    total_sales = result['totalSales']
    weighted_cmr = result['weightedCMR']
    total_fc = result['totalFixedCost']
    total_subsidy = result.get('totalSubsidy') or 0

    cells = []
    for s_change in sales_steps:
        adj_sales = total_sales * (1 + s_change / 100)
        row = []
        for c_change in cmr_steps:
            adj_cmr = weighted_cmr + c_change / 100
            profit = adj_sales * adj_cmr - total_fc + total_subsidy
            profit_rate = profit / adj_sales if adj_sales != 0 else 0.0
            status = 'profit'
            if abs(profit) < BREAKEVEN_THRESHOLD:
                status = 'breakeven'
            elif profit < 0:
                status = 'loss'
            row.append({'profit': profit, 'profitRate': profit_rate, 'status': status})
        cells.append(row)

    base_profit = total_sales * weighted_cmr - total_fc + total_subsidy
    base_profit_rate = base_profit / total_sales if total_sales != 0 else 0.0
    return {'salesChanges': sales_steps, 'cmrChanges': cmr_steps, 'cells': cells,
            'baseProfit': base_profit, 'baseProfitRate': base_profit_rate}


# ── 目标反推（goalSeek.ts） ──

def calc_feasibility_score(gap_rate):
    if gap_rate is None or gap_rate <= 0:
        return 95
    if gap_rate < 0.10:
        return 90
    if gap_rate < 0.20:
        return 70
    if gap_rate < 0.30:
        return 50
    if gap_rate < 0.50:
        return 30
    return 20


def goal_seek(result, target_profit):
    wcmr = result['weightedCMR']
    subsidy = result.get('totalSubsidy') or 0
    fc = result['totalFixedCost']
    sales = result['totalSales']

    if wcmr <= 0:
        return {'requiredSales': None, 'salesGap': None, 'salesGapRate': None,
                'requiredGrossMargin': None, 'grossMarginGap': None,
                'requiredCostReduction': None, 'targetProfitRate': None,
                'requiredSalesForRate': None, 'feasibilityScore': 0, 'multiVarSolutions': []}

    required_sales = (target_profit + fc - subsidy) / wcmr
    sales_gap = required_sales - sales
    sales_gap_rate = sales_gap / sales if sales > 0 else 0.0

    required_gm = result['variableCostRate'] + (target_profit + fc - subsidy) / sales \
        if sales > 0 else 0.0
    gm_gap = required_gm - result['grossMarginRate']

    required_cost_reduction = result['profit'] - target_profit

    target_profit_rate = target_profit / sales if sales > 0 else None
    required_sales_for_rate = None
    if target_profit_rate is not None and wcmr > 0 and wcmr - target_profit_rate > 0:
        required_sales_for_rate = (fc - subsidy) / (wcmr - target_profit_rate)

    feasibility = calc_feasibility_score(sales_gap_rate)

    multi_var = _multi_var_solutions(result, target_profit)

    return {'requiredSales': required_sales, 'salesGap': sales_gap, 'salesGapRate': sales_gap_rate,
            'requiredGrossMargin': required_gm, 'grossMarginGap': gm_gap,
            'requiredCostReduction': required_cost_reduction,
            'targetProfitRate': target_profit_rate, 'requiredSalesForRate': required_sales_for_rate,
            'feasibilityScore': feasibility, 'multiVarSolutions': multi_var}


def _multi_var_solutions(result, target_profit):
    wcmr = result['weightedCMR']
    sales = result['totalSales']
    profit_gap = target_profit - result['profit']
    if wcmr <= 0 or sales <= 0 or profit_gap <= 0:
        return []

    strategies = [
        ('保守方案', (0.80, 0.15, 0.05)),
        ('均衡方案', (0.40, 0.30, 0.30)),
        ('激进方案', (0.15, 0.35, 0.50)),
    ]
    out = []
    for label, (s_ratio, m_ratio, c_ratio) in strategies:
        sales_increase = (profit_gap * s_ratio) / wcmr
        sales_change = sales_increase / sales * 100 if sales > 0 else 0.0
        margin_change = (profit_gap * m_ratio) / sales * 100 if sales > 0 else 0.0
        cost_reduction = profit_gap * c_ratio
        cost_change = cost_reduction / result['totalFixedCost'] * 100 \
            if result['totalFixedCost'] > 0 else 0.0
        parts = []
        if sales_change > 0.1:
            parts.append(f"销售额+{sales_change:.1f}%")
        if margin_change > 0.01:
            parts.append(f"毛利率+{margin_change:.2f}pp")
        if cost_reduction > 0:
            parts.append(f"费用-¥{cost_reduction:.0f}")
        out.append({'label': label, 'salesChange': sales_change, 'marginChange': margin_change,
                    'costChange': cost_change, 'description': '、'.join(parts) if parts else '无需调整'})
    return out


# ── 诊断分析（analyzer.ts 规则移植，结构化线索 → 供 LLM 润色） ──

STATUS_MAP = {
    'healthy': {'label': '健康', 'color': 'bg-emerald-500'},
    'marginal': {'label': '微利', 'color': 'bg-amber-500'},
    'loss': {'label': '亏损', 'color': 'bg-red-500'},
    'critical': {'label': '严重', 'color': 'bg-red-700'},
}


def analyze(result):
    """按 analyzer.ts 规则生成诊断线索（原始数值，文案由 LLM 节点生成）"""
    suggestions = []
    r = result

    if (r.get('breakevenSales') and r['breakevenSales'] > r['totalSales'] * 3):
        status = 'critical'
        suggestions.append({'category': 'structure', 'priority': 'high', 'message':
            f"保本销售额（¥{round(r['breakevenSales']):,}）远超实际销售额（¥{round(r['totalSales']):,}），需结构级改革。"})
    elif r['profit'] > 0 and (r.get('safetyMarginRate') or 0) > 0.1:
        status = 'healthy'
    elif r['profit'] > 0:
        status = 'marginal'
    elif r['weightedCMR'] > 0:
        status = 'loss'
    else:
        status = 'critical'

    smr = r.get('safetyMarginRate')
    if smr is not None and 0 < smr < 0.1:
        suggestions.append({'category': 'structure', 'priority': 'medium', 'message':
            f"安全边际率仅{smr * 100:.1f}%，经营风险较高，微小的销售额波动即可能导致亏损。"})

    cat_count = len(r['categoryResults'])
    for cat_key, cr in r['categoryResults'].items():
        prefix = f"{cat_key}：" if cat_count > 1 else ''
        tier_items = list(cr['tierResults'].items())
        if tier_items:
            last_name, last_tier = tier_items[-1]
            if last_tier['ratio'] > 0.30:
                suggestions.append({'category': 'product', 'priority': 'high', 'message':
                    f"{prefix}{last_name}系列低毛利产品占比过高（{last_tier['ratio'] * 100:.0f}%），建议优化产品结构，提升高毛利系列占比。"})

        if cr['weightedCMR'] < 0.05:
            suggestions.append({'category': 'product', 'priority': 'medium', 'message':
                f"{prefix}边际贡献率偏低（{cr['weightedCMR'] * 100:.1f}%），建议调整型号结构或评估该品类必要性。"})

        for tname, tr in cr['tierResults'].items():
            if tr['cmr'] < 0:
                suggestions.append({'category': 'product', 'priority': 'high', 'message':
                    f"{prefix}{tname}系列边际贡献率为负，销售该系列反而亏损，需重点关注。"})

        breakeven_gm = r['variableCostRate'] + ((r['totalFixedCost'] - r.get('totalSubsidy', 0)) / r['totalSales']) \
            if r['totalSales'] > 0 else 0.0
        if cr['totalSales'] > 0 and cr['totalGrossProfit'] / cr['totalSales'] < breakeven_gm:
            suggestions.append({'category': 'product', 'priority': 'high', 'message':
                f"{prefix}综合毛利率（{cr['totalGrossProfit'] / cr['totalSales'] * 100:.1f}%）低于保本要求（{breakeven_gm * 100:.1f}%），需提升毛利率或降低费用。"})

    if r['variableCostRate'] > 0.25:
        suggestions.append({'category': 'cost', 'priority': 'high', 'message':
            f"变动费用率（{r['variableCostRate'] * 100:.1f}%）偏高，建议重点压缩可控费用项（渠道激励、促销推广、储运物流）。"})

    if r['totalSales'] > 0 and r['totalFixedCost'] / r['totalSales'] > 0.10:
        suggestions.append({'category': 'cost', 'priority': 'medium', 'message':
            f"固定费用占比（{r['totalFixedCost'] / r['totalSales'] * 100:.1f}%）过高，建议控制场地费、人力成本等刚性支出。"})

    bep = r.get('breakevenSales')
    if r['totalSales'] < (bep if bep is not None else float('inf')) and r['weightedCMR'] > 0:
        gap = bep - r['totalSales']
        suggestions.append({'category': 'revenue', 'priority': 'high', 'message':
            f"当前销售额低于保本点¥{round(gap):,}，需提升¥{round(gap):,}元销售额或压降¥{round(gap * r['weightedCMR']):,}元费用。"})

    segments = (r.get('stepChartData') or {}).get('segments') or []
    if len(segments) >= 2 and segments[1]['cumulativeContribution'] >= r['totalFixedCost']:
        suggestions.append({'category': 'structure', 'priority': 'low', 'message':
            '高CMR系列贡献充足，门店盈利基础稳固。但风险点：过度依赖少数高端系列。'})
    if segments and segments[-1]['cumulativeContribution'] < r['totalFixedCost'] and r['weightedCMR'] > 0:
        suggestions.append({'category': 'revenue', 'priority': 'high', 'message':
            '整体销量不足，即使所有系列按当前结构销售，仍无法覆盖固定成本。需做大总量。'})

    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    suggestions.sort(key=lambda s: priority_order[s['priority']])
    return {'status': status, 'statusLabel': STATUS_MAP[status]['label'],
            'statusColor': STATUS_MAP[status]['color'], 'suggestions': suggestions[:6]}


# ── code 节点入口 ──

def single_store(category, store_fc, store_name=''):
    """code 节点入口：单品类测算。category 为品类数据 dict，store_fc 为固定费用 dict"""
    base = single_category(category, store_fc, store_name)
    return {'result': base, 'analysis': analyze(base)}


def multi_store(categories, store_fc):
    """code 节点入口：多品类测算。categories 为 {品类名: 品类数据}"""
    base = multi_category(categories, store_fc)
    return {'result': base, 'analysis': analyze(base)}


# ── 图表数据转档（纯函数，图表数据由引擎产出，LLM/图表工具只消费） ──

def step_chart_to_stacked_data(step_chart):
    """阶梯图 → 堆叠柱状图数据（模拟瀑布）。

    每段拆成两层：{底座=前序累计贡献, 贡献=本段贡献}，stack 后柱顶 = 累计贡献，
    段高 = 本段贡献，从视觉上还原「卖到第几级覆盖固定成本」的瀑布语义。
    输出 [{category, value, group}]，category=系列名，group∈{'底座','贡献'}。
    """
    rows = []
    prev = 0.0
    for seg in (step_chart or {}).get('segments') or []:
        rows.append({'category': seg['label'], 'value': round(prev, 2), 'group': '底座'})
        rows.append({'category': seg['label'], 'value': round(seg['contributionAmount'], 2), 'group': '贡献'})
        prev = seg['cumulativeContribution']
    return rows


def store_cvp_line_data(store_result):
    """门店级 CVP 量本利图 → 折线图数据。

    两条线：收入 / 总成本，交点即保本点。
    输出 [{time, value, group}]，time=销售额刻度，group∈{'收入','总成本'}。
    """
    r = store_result
    cvp = generate_cvp_data(r['totalSales'], r['variableCostRate'],
                            r['totalFixedCost'], r['grossMarginRate'])
    rows = []
    for pt in cvp['data']:
        t = f"{pt['sales']:.0f}"
        rows.append({'time': t, 'value': round(pt['revenue'], 0), 'group': '收入'})
        rows.append({'time': t, 'value': round(pt['totalCost'], 0), 'group': '总成本'})
    return rows


def categories_pie_data(store_result):
    """品类边际贡献占比 → 饼图数据。输出 [{category, value}]，value=该品类贡献额。"""
    return [
        {'category': cr['category'], 'value': round(cr['contributionAmount'], 1)}
        for cr in (store_result.get('categoryResults') or {}).values()
        if cr.get('totalSales', 0) > 0
    ]


# ── 格式化输出（引擎产出格式化文本，LLM 照抄，杜绝 LLM 重算造成口径错误） ──

def _wan(x):
    """金额（元）→ 「万」文本，保留 2 位小数（精确到 100 元），四舍五入（half-up）。

    与原 Electron 版 UnitContext.tsx 的 (n/10000).toFixed(2) 语义一致。
    两步规避浮点坑：
    1. round(x, 2) 消除引擎累加噪声（-1949.9999…→-1950、70550.0000…01→70550）；
    2. Decimal quantize ROUND_HALF_UP 精确四舍五入到 0.01 万（不能用 f-string 的 %.2f，
       那对 Decimal 走银行家舍入：5.205→5.20 而非 5.21）。
    """
    wan = Decimal(str(round(x, 2))) / 10000
    return f"{wan.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)} 万"


def _pct(x):
    return f"{x * 100:.2f}%"


def format_core_metrics(result):
    """核心指标表 → markdown 文本。数值全部来自 result 字段，无任何重算。"""
    bep = result.get('breakevenSales')
    smr = result.get('safetyMarginRate')
    return '\n'.join([
        '| 指标 | 数值 |',
        '|---|---|',
        f"| 销售额 | {_wan(result['totalSales'])} |",
        f"| 商品毛利额 | {_wan(result['totalGrossProfit'])} |",
        f"| 总部补贴 | {_wan(result.get('totalSubsidy') or 0)} |",
        f"| 门店利润 | {_wan(result['profit'])} |",
        f"| 加权边际贡献率（CMR） | {_pct(result['weightedCMR'])} |",
        f"| 保本销售额 | {_wan(bep) if bep is not None else '—'} |",
        f"| 安全边际率 | {_pct(smr) if smr is not None else '—'} |",
        f"| 变动费用 | {_wan(result['totalVariableCost'])} |",
        f"| 固定费用 | {_wan(result['totalFixedCost'])} |",
    ])


def format_step_table(result):
    """阶梯边际贡献表 → markdown 文本。金额转「万」，保本点用引擎算好的 storeBEP。"""
    step = result.get('stepChartData') or {}
    segs = step.get('segments') or []
    if not segs:
        return '（无阶梯段数据）'
    lines = ['| 系列 | 本段贡献额 | 累计贡献额 |', '|---|---|---|']
    for s in segs:
        lines.append(
            f"| {s['label']} | {_wan(s['contributionAmount'])} | {_wan(s['cumulativeContribution'])} |")
    fc = step.get('storeFC') or 0
    subsidy = result.get('totalSubsidy') or 0
    net_fc = fc - subsidy
    bep = step.get('storeBEP')
    if bep and bep.get('sales') is not None:
        # 覆盖点 = 按贡献优先级（CMR 降序）逐级补足，累计贡献首次覆盖净固定费用的位置
        lines.append(f"\n固定费用 {_wan(fc)}，扣总部补贴 {_wan(subsidy)} 后净固定费用 {_wan(net_fc)}。"
                     f"按贡献优先级（高 CMR 先卖）逐个补齐，覆盖点在约 ¥{bep['sales']:,} 销售额处。"
                     f"（注：此为「优先序覆盖点」，按当前销售结构均摊的保本销售额见核心指标表，两者口径不同。）")
    else:
        lines.append(f"\n固定费用 {_wan(fc)}，扣补贴后净固定费用 {_wan(net_fc)}。"
                     f"全系列累计贡献不足以覆盖固定费用，覆盖点超出当前销售结构。")
    return '\n'.join(lines)


def format_suggestions(result):
    """诊断线索 → 文本。数字已含在 analyze() 的 message 里，为最终值。"""
    a = analyze(result)
    lines = [f"盈利状态：{a['statusLabel']}"]
    for s in a['suggestions']:
        lines.append(f"- [{s['priority']}|{s['category']}] {s['message']}")
    return '\n'.join(lines)


def format_goal_seek_text(result, gs, target):
    """目标反推 → 文本。所有数字均为 goal_seek 计算的最终值，无重算。"""
    r = result
    lines = []
    lines.append(f"- 当前利润：{_wan(r['profit'])}，目标利润：{_wan(target)}")
    if gs.get('requiredSales') is not None:
        lines.append(f"- 方案A（提高销售额）：需做到 {_wan(gs['requiredSales'])}"
                     f"（较当前增长 {_wan(gs['salesGap'])}，{(gs['salesGapRate'] or 0) * 100:.1f}%）")
    if gs.get('requiredGrossMargin') is not None:
        lines.append(f"- 方案B（提高毛利率）：需提升至 {gs['requiredGrossMargin'] * 100:.2f}%"
                     f"（较当前提升 {(gs['grossMarginGap'] or 0) * 100:.2f} 个百分点）")
    if gs.get('requiredCostReduction') is not None:
        red = max(gs['requiredCostReduction'], 0)
        lines.append(f"- 方案C（压降费用）：需压降 {_wan(red)}（{'已达标' if red == 0 else ''}）")
    lines.append(f"- 可行性评分：{gs.get('feasibilityScore', 0)}/100")
    if gs.get('multiVarSolutions'):
        lines.append('- 多变量组合方案：')
        for mv in gs['multiVarSolutions']:
            lines.append(f"  * {mv['label']}：{mv['description']}")
    return '\n'.join(lines)


def format_compare_text(cmp):
    """方案对比 → markdown 表格文本。"""
    lines = ['| 方案 | 销售额 | 毛利额 | 利润 | 毛利率 | CMR | 保本点 |',
             '|---|---|---|---|---|---|---|']
    for row in cmp['rows']:
        bep = row.get('breakevenSales')
        lines.append(
            f"| {row['name']} | {_wan(row['totalSales'])} | {_wan(row['totalGrossProfit'])} | "
            f"{_wan(row['profit'])} | {_pct(row['grossMarginRate'])} | {_pct(row['weightedCMR'])} | "
            f"{_wan(bep) if bep is not None else '—'} |")
    return '\n'.join(lines)


def format_input_snapshot(raw_data):
    """本次输入参数快照 → 文本（供下一轮 LLM 记忆窗口做修改重算时还原原始明细）。

    注意：raw_data 是 LLM 抽取的原始结构（categories 是数组，含 X/C/P/S 各字段的原始名），
    尚未经过 parse_scenario_categories 转成引擎格式。此函数独立走原始字段，避免口径混淆。
    """
    lines = ['【上一轮输入的完整门店数据】']
    cats = raw_data.get('categories') or []
    # compare 的 scenarios 也带上
    scen = raw_data.get('scenarios') or []
    if scen:
        for i, s in enumerate(scen):
            lines.append(f'方案：{s.get("name") or ("方案%d" % (i + 1))}')
            _dump_cats(s.get('categories'), s.get('store_fixed_costs'), lines)
    else:
        lines.append(f'门店：{raw_data.get("store_name") or "（未填）"}')
        _dump_cats(cats, raw_data.get('store_fixed_costs'), lines)
    return '\n'.join(lines)


# 核算模式展示名（内部 key → 中文，回答/快照里统一用中文，不暴露 modeA/modeB）
_MODE_LABELS = {'modeA': '倒扣制', 'modeB': '顺加制'}


def _mode_label(cost_mode):
    return _MODE_LABELS.get(cost_mode, cost_mode or '倒扣制')


def _dump_cats(cats, fc, lines):
    for c in cats or []:
        lines.append('品类 %s（核算模式 %s，变动费率 %s）：' % (
            c.get('category', '?'),
            _mode_label(c.get('cost_mode')),
            c.get('variable_cost_rate', '（未填，用默认）'),
        ))
        for t in ('X', 'C', 'P', 'S'):
            row = c.get(t) or {}
            sales = row.get('sales')
            gm = row.get('gross_margin')
            subsidy = row.get('subsidy')
            line = f'  {t}：销售额{sales if sales is not None else 0}，毛利率{gm if gm is not None else 0}'
            if subsidy:
                line += f'，补贴{subsidy}'
            lines.append(line)
    if fc:
        lines.append('固定费用：' + '、'.join(f'{k}{v}' for k, v in (fc or {}).items()))


# ── 抽取结果 → 引擎内部格式（纯函数，可单测；阶段2 意图路由的核心） ──

_TIERS = ('X', 'C', 'P', 'S')


def parse_scenario_categories(raw_categories):
    """LLM 抽取的 categories 数组 → 引擎 {品类名: CategoryData}。"""
    cats = {}
    for c in raw_categories or []:
        name = c.get('category') or ''
        if not name:
            continue
        tiers = {}
        for t in _TIERS:
            row = c.get(t) or {}
            tiers[t] = {
                'sales': float(row.get('sales') or 0),
                'volume': float(row.get('volume') or 0),
                'grossMargin': float(row.get('gross_margin') or 0),
                'subsidy': float(row.get('subsidy') or 0),
            }
        cd = {'category': name, 'costMode': c.get('cost_mode') or 'modeA', 'productStructure': tiers}
        if c.get('variable_cost_rate') is not None:
            cd['variableCostRate'] = float(c['variable_cost_rate'])
        cats[name] = cd
    return cats


def parse_fixed_costs(raw_fc):
    """LLM 抽取的 store_fixed_costs → 引擎 FixedCosts。"""
    fc = raw_fc or {}
    return {
        'venueFee': float(fc.get('场地费') or 0),
        'boothCost': float(fc.get('展台') or 0),
        'laborCost': float(fc.get('人力成本') or 0),
        'dailyExpense': float(fc.get('日常费用') or 0),
        'operationSupport': float(fc.get('运营支持') or 0),
    }


# ── Excel 模板 markdown 解析（原 excel-parser.ts 的精确移植，数字不经 LLM） ──

# 变动费用标签 → 引擎 key（与 excel-parser.ts VAR_LABEL_MAP 一致）
VAR_LABEL_MAP = {
    '佣金-销代': 'commissionSales', '佣金-业务': 'commissionBusiness',
    '开单扣': 'commission', '年度返利': 'annualRebate', '零售折扣': 'retailDiscount',
    '销代提成': 'salesCommission', '业务提成': 'businessCommission',
    '追加激励': 'extraIncentive', '储运费': 'logisticsFee',
    '合同内返利': 'contractRebate', '对内': 'channelIncentiveOnline',
    '储运物流': 'retailIncentive', '合同外返利': 'extraRebate',
    '促销活动支持': 'promotionSupport', '对私': 'channelIncentivePrivate',
    '带单': 'channelIncentiveReferral', '促销推广费': 'promotionFee',
    '销售补差': 'salesGap',
}
FIXED_LABEL_MAP = {
    '场地费': 'venueFee', '展台': 'boothCost', '人力成本': 'laborCost',
    '日常费用': 'dailyExpense', '运营支持': 'operationSupport',
}


def _safe_float(x):
    """容忍空串/nan/百分比等，返回 float"""
    if x is None:
        return 0.0
    s = str(x).strip()
    if s in ('', 'nan', 'None', '-', '—'):
        return 0.0
    s = s.replace(',', '').replace('，', '')
    if s.endswith('%'):
        return float(s[:-1]) / 100.0
    return float(s)


def _match_var_label(label):
    """两级匹配：先剥离括号内容匹配主标签，未命中再按原始文本匹配（与 excel-parser.ts 一致）。"""
    clean = re.sub(r'（[^）]*）|\([^)]*\)', '', label)
    for lab, key in VAR_LABEL_MAP.items():
        if lab in clean:
            return key
    for lab, key in VAR_LABEL_MAP.items():
        if lab in label:
            return key
    return None


def parse_markdown_table(text):
    """解析文档提取器输出的 markdown 表格文本 → LLM 抽取同构的 data dict。

    支持单品类模板（单 sheet：门店名称+品类+产品结构+变动费用+固定费用连在一张表）
    与多品类模板（门店信息 sheet + 每品类一个独立 sheet，sheet 名 = 品类名）。
    兼容 string 或 array[string]（多文件/多 sheet 全部拼接解析）。
    数字全部精确解析，不经 LLM。
    返回 {'store_name', 'categories': [...], 'store_fixed_costs': {...}}，可直接喂 parse_scenarios。
    """
    # 兼容 array[string] 或 string
    if isinstance(text, list):
        joined = '\n\n'.join(str(t) for t in text)
    else:
        joined = str(text or '')

    rows = []
    for ln in joined.split('\n'):
        ln = ln.strip()
        if not ln.startswith('|'):
            continue
        cells = [c.strip() for c in ln.strip('|').split('|')]
        if len(cells) == 1 and cells[0] == '':
            continue
        rows.append(cells)

    if not rows:
        return None

    def is_sep_row(r):
        return all(re.fullmatch(r':?-{3,}:?', c or '') for c in r)

    # 去掉 markdown 分隔行
    data_rows = [r for r in rows if not is_sep_row(r)]

    def is_cat_label(label):
        return label == '品类' or label.startswith('品类：') or label.startswith('品类:')

    # 品类标识行位置（单/多品类均有，作为品类块起点）
    cat_idx = [i for i, r in enumerate(data_rows) if is_cat_label(r[0].strip())]

    store_name = ''
    cost_mode = 'modeA'
    store_fc = {k: 0.0 for k in FIXED_LABEL_MAP.values()}

    # 门店信息块 = 第一个品类行之前（多品类：门店名+核算模式+固定费用；单品类：仅门店名）
    fixed_sec = False
    for r in data_rows[:cat_idx[0] if cat_idx else 0]:
        label = r[0].strip()
        if '门店名称' in label:
            store_name = (r[1].strip() if len(r) > 1 else '')
        elif '倒扣制' in label:
            cost_mode = 'modeA'
        elif '顺加制' in label:
            cost_mode = 'modeB'
        elif '固定费用' in label:
            fixed_sec = True
        elif fixed_sec:
            for lab, key in FIXED_LABEL_MAP.items():
                if lab in label:
                    if len(r) > 1:
                        store_fc[key] = _safe_float(r[1])
                    break

    # 各品类块（无品类标识时兜底：整块当一个品类，沿用默认「智屏」）
    starts = cat_idx if cat_idx else [0]
    categories = []
    for bi, start in enumerate(starts):
        end = starts[bi + 1] if bi + 1 < len(starts) else len(data_rows)
        cat = _parse_category_block(data_rows[start:end], cost_mode, store_fc)
        if cat:
            categories.append(cat)

    if not categories:
        return None

    return {
        'store_name': store_name,
        'categories': categories,
        'store_fixed_costs': {
            '场地费': store_fc['venueFee'],
            '展台': store_fc['boothCost'],
            '人力成本': store_fc['laborCost'],
            '日常费用': store_fc['dailyExpense'],
            '运营支持': store_fc['operationSupport'],
        },
    }


def _parse_category_block(block, cost_mode, store_fc):
    """解析单个品类块（「品类」标识行 + 产品结构 + 变动费用 [+ 固定费用，单品类模板]）。

    cost_mode 为门店级核算模式初始值（品类块内若标注核算模式则覆盖，仅该块内生效）；
    store_fc 为共享门店固定费用 dict——单品类模板的固定费用段落在品类块内，直接写入 store_fc。
    返回 category dict（{'category','cost_mode','variable_cost_rate','X'/'C'/'P'/'S'}），无有效销售则 None。
    """
    tier_names = ['X', 'C', 'P', 'S']
    category = '智屏'
    tiers = {t: {'sales': 0.0, 'volume': 0.0, 'gross_margin': 0.0, 'subsidy': 0.0} for t in tier_names}
    vc_rates = {}
    col_map = {}
    section = None

    for r in block:
        label = r[0].strip()
        # 品类名（两种写法：'品类 | 智屏' 与 '品类：智屏'）
        if label == '品类':
            if len(r) > 1 and r[1].strip() not in ('', 'nan', 'None'):
                category = r[1].strip()
            continue
        if label.startswith('品类：') or label.startswith('品类:'):
            nm = label.split('：', 1)[-1].split(':', 1)[-1].strip()
            category = nm or category
            continue
        # 核算模式（单品类模板在品类块内标注）
        if '倒扣制' in label:
            cost_mode = 'modeA'
            continue
        if '顺加制' in label:
            cost_mode = 'modeB'
            continue
        # 段落切分
        if '产品结构' in label:
            section = 'structure'
            continue
        if '变动费用' in label:
            section = 'variable'
            continue
        if '固定费用' in label:
            section = 'fixed'
            continue
        # 表头行（项目 | 合计 | X（高端）| C（中端）| P（主流）| S（低端））→ 定位系列列
        if label == '项目':
            col_map = {}
            for ci, h in enumerate(r):
                if ci == 0:
                    continue
                for t in tier_names:
                    if t in h and t not in col_map:
                        col_map[t] = ci
                        break
            continue
        # 跳过分组标题行
        if any(w in label for w in ('基于供价', '基于实际零售额', '基于零售额', '基于开单价', '经营费用', '客户费用')):
            continue

        def pick(t):
            ci = col_map.get(t)
            return _safe_float(r[ci]) if ci is not None and ci < len(r) else 0.0

        if section == 'structure':
            if '销售额' in label and '销量' not in label:
                for t in tier_names:
                    tiers[t]['sales'] = pick(t)
            elif '销量' in label:
                for t in tier_names:
                    tiers[t]['volume'] = pick(t)
            elif '毛利率' in label:
                for t in tier_names:
                    tiers[t]['gross_margin'] = pick(t)
            elif '补贴' in label:
                for t in tier_names:
                    tiers[t]['subsidy'] = pick(t)
            continue

        if section == 'variable':
            key = _match_var_label(label)
            if key and len(r) > 1:
                vc_rates[key] = _safe_float(r[1])
            continue

        if section == 'fixed':
            for lab, key in FIXED_LABEL_MAP.items():
                if lab in label:
                    if len(r) > 1:
                        store_fc[key] = _safe_float(r[1])
                    break
            continue

    if all(tiers[t]['sales'] <= 0 for t in tier_names):
        return None

    return {
        'category': category,
        'cost_mode': cost_mode,
        'variable_cost_rate': sum_variable_costs(vc_rates, cost_mode),
        'X': tiers['X'],
        'C': tiers['C'],
        'P': tiers['P'],
        'S': tiers['S'],
    }


def parse_scenarios(data):
    """把 LLM 抽取的顶层 data 转成 [{'name', 'categories'(引擎格式), 'store_fixed_costs'}]。

    兼容旧平铺格式：无 scenarios 字段时，用顶层 categories/store_fixed_costs 构造单方案。
    """
    scenarios = data.get('scenarios') or []
    if not scenarios and data.get('categories'):
        scenarios = [{
            'name': data.get('store_name') or '门店',
            'categories': data['categories'],
            'store_fixed_costs': data.get('store_fixed_costs') or {},
        }]
    out = []
    for s in scenarios:
        out.append({
            'name': s.get('name') or ('方案%d' % (len(out) + 1)),
            'categories': parse_scenario_categories(s.get('categories')),
            'store_fixed_costs': parse_fixed_costs(s.get('store_fixed_costs')),
        })
    return out


def compare_scenarios(parsed_scenarios):
    """多方案对比 → 供 LLM 生表的结构。输入来自 parse_scenarios。"""
    rows = []
    for s in parsed_scenarios:
        r = multi_category(s['categories'], s['store_fixed_costs'])
        rows.append({
            'name': s['name'],
            'status': analyze(r)['statusLabel'],
            'totalSales': r['totalSales'],
            'totalGrossProfit': r['totalGrossProfit'],
            'profit': r['profit'],
            'grossMarginRate': r['grossMarginRate'],
            'weightedCMR': r['weightedCMR'],
            'breakevenSales': r['breakevenSales'],
            'safetyMarginRate': r['safetyMarginRate'],
        })
    return {
        'metrics': ['totalSales', 'totalGrossProfit', 'profit',
                    'grossMarginRate', 'weightedCMR', 'breakevenSales', 'safetyMarginRate'],
        'rows': rows,
    }


# ── 意图路由（纯函数，含空数据守卫；wrapper 透传调用） ──

def route(data, with_chart=False):
    """按 intent 路由到测算/反推/对比，返回 code 节点输出 dict。

    chat / followup（追问）：不重算，返回为空 facts + 引导 guidance，交给诊断 LLM 的
    对话记忆窗口基于上一轮结果作答——避免追问时 categories 为空导致崩溃。
    兼容 code 节点传入 dict 或 JSON 字符串两种形态。

    with_chart=False（默认）：chart_svg 输出空串（表格化兜底，前端不渲染任何图片）。
    with_chart=True：chart_svg 输出内联 SVG（charts_svg / compare_bar_svg），
    供平台确认 SVG 可渲染的版本使用。
    """
    if not isinstance(data, dict):
        try:
            data = json.loads(data)
        except (ValueError, TypeError):
            data = {}
    data = data or {}
    intent = data.get('intent') or 'calc'
    parsed = parse_scenarios(data)

    # 追问/闲聊：无结构化数据，交给 LLM 记忆窗口
    if intent == 'chat':
        return {
            'facts_text': '',
            'guidance_text': '（用户在进行追问或闲聊，请结合对话历史中上一轮的测算结果回答；'
                             '若上一轮没有测算过，请礼貌引导用户先提供门店的品类销售结构与费用。）',
            'chart_svg': '',
        }

    if intent == 'goal_seek':
        if not parsed:
            return _no_data()
        s = parsed[0]
        base = multi_category(s['categories'], s['store_fixed_costs'])
        target = float(data.get('target_profit') or 0)
        gs = goal_seek(base, target)
        facts = '## 核心指标\n\n' + format_core_metrics(base) \
            + '\n\n## 目标利润反推\n\n' + format_goal_seek_text(base, gs, target) \
            + '\n\n' + _snapshot_section(data)
        return {
            'facts_text': facts,
            'guidance_text': format_suggestions(base),
            'chart_svg': charts_svg(base) if with_chart else '',
        }
    if intent == 'compare':
        if not parsed:
            return _no_data()
        cmp = compare_scenarios(parsed)
        best = max(cmp['rows'], key=lambda r: r['profit'])
        facts = '## 方案对比\n\n' + format_compare_text(cmp) \
            + '\n\n' + _snapshot_section(data)
        guidance = '方案对比：利润最高的是「%s」（%s）。请对各方案给点评和推荐。' % (
            best['name'], _wan(best['profit']))
        return {
            'facts_text': facts,
            'guidance_text': guidance,
            'chart_svg': compare_bar_svg(cmp) if with_chart else '',
        }
    # calc（默认，含空数据守卫）
    if not parsed:
        return _no_data()
    s = parsed[0]
    out = multi_store(s['categories'], s['store_fixed_costs'])
    base = out['result']
    facts = '## 核心指标\n\n' + format_core_metrics(base) \
        + '\n\n## 阶梯边际贡献\n\n' + format_step_table(base) \
        + '\n\n' + _snapshot_section(data)
    return {
        'facts_text': facts,
        'guidance_text': format_suggestions(base),
        'chart_svg': charts_svg(base) if with_chart else '',
    }


def _snapshot_section(raw_data):
    """折叠进 answer 的「当前生效数据」块，供下一轮 LLM 记忆窗口做修改重算。

    用纯 markdown（不依赖 HTML 渲染），保证在对话历史里可见。
    """
    return '---\n\n<small>本次测算输入数据（修改重算时依据此明细）</small>\n\n' \
        + format_input_snapshot(raw_data)


def _no_data():
    """未抽取到品类/费用数据时的友好降级（不再让 parsed[0] 抛 IndexError）。"""
    return {
        'facts_text': '',
        'guidance_text': '（未能从当前输入识别出门店的品类销售结构与费用，'
                         '请引导用户补充：各品类的 X/C/P/S 四级销售额、毛利率、变动费用率、固定费用。）',
        'chart_svg': '',
    }


# ── SVG 图表生成（引擎直接用已有数据拼 SVG，零插件依赖；可选走 agent 插件时不用） ──
#
# 设计：所有坐标/数值均来自引擎已有字段（单一真相源），LLM/前端只负责展示。
# SVG 是纯文本，answer 节点内嵌即可；HTML 宿主需能渲染 <svg>（请假单样例已证明前端能渲染 HTML）。

TCL_RED = '#E4002B'
TCL_AMBER = '#f59e0b'
TCL_GRAY = '#cbd5e1'


def _esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def waterfall_svg(store_result, width=640, height=320):
    """阶梯边际贡献瀑布图（真实瀑布）+ 净固定费用参考线。"""
    step = store_result.get('stepChartData') or {}
    segs = step.get('segments') or []
    if not segs:
        return ''
    subsicty = store_result.get('totalSubsidy') or 0
    net_fc = (step.get('storeFC') or 0) - subsicty
    max_contrib = max(max((s['cumulativeContribution'] for s in segs), default=0), net_fc, 1)

    pad_l, pad_r, pad_t, pad_b = 64, 16, 20, 40
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b
    n = len(segs)
    slot = plot_w / n
    bar_w = slot * 0.55
    y_max = max_contrib * 1.1

    def y(v):
        v = max(v, 0)
        return pad_t + plot_h - (v / y_max) * plot_h

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width * 1.2:g}" height="{height * 1.2:g}" '
        f'viewBox="0 0 {width} {height}" font-family="sans-serif">',
        f'<text x="{pad_l}" y="16" font-size="14" font-weight="bold" fill="#111">阶梯边际贡献（瀑布）</text>',
    ]
    # 净固定费用参考线（虚线）
    if net_fc > 0:
        ly = y(net_fc)
        parts.append(f'<line x1="{pad_l}" y1="{ly:.1f}" x2="{width - pad_r}" y2="{ly:.1f}" '
                     f'stroke="{TCL_AMBER}" stroke-width="1.5" stroke-dasharray="4 3"/>')
        parts.append(f'<text x="{width - pad_r}" y="{ly - 6:.1f}" font-size="10" fill="{TCL_AMBER}" '
                     f'text-anchor="end">净固定费 {net_fc:,.0f}</text>')
    # 每段：底座（透明）+ 贡献（有色）
    prev = 0.0
    for i, s in enumerate(segs):
        cx = pad_l + slot * i + slot / 2
        x0 = cx - bar_w / 2
        contrib = s['contributionAmount']
        if contrib >= 0:
            # 上浮
            base_y = y(prev)
            contrib_y = y(prev + contrib)
            parts.append(f'<rect x="{x0:.1f}" y="{contrib_y:.1f}" width="{bar_w:.1f}" '
                         f'height="{base_y - contrib_y:.2f}" fill="{TCL_RED}"/>')
        else:
            # 下浮（负贡献）
            base_y = y(prev)
            contrib_y = y(prev + contrib)  # contrib 为负，prev+contrib < prev，y 更大
            parts.append(f'<rect x="{x0:.1f}" y="{base_y:.1f}" width="{bar_w:.1f}" '
                         f'height="{contrib_y - base_y:.2f}" fill="#ea4335"/>')
        parts.append(f'<text x="{cx:.1f}" y="{height - pad_b + 16}" font-size="10" fill="#333" '
                     f'text-anchor="middle">{_esc(s["label"])}</text>')
        prev = s['cumulativeContribution']
    # x/y 轴
    parts.append(f'<line x1="{pad_l}" y1="{pad_t}" x2="{pad_l}" y2="{pad_t + plot_h}" stroke="#999" stroke-width="1"/>')
    parts.append(f'<line x1="{pad_l}" y1="{pad_t + plot_h}" x2="{width - pad_r}" y2="{pad_t + plot_h}" stroke="#999" stroke-width="1"/>')
    parts.append(f'<text x="12" y="{pad_t + plot_h / 2}" font-size="10" fill="#666" '
                 f'transform="rotate(-90 12 {pad_t + plot_h / 2})" text-anchor="middle">累计边际贡献（元）</text>')
    parts.append('</svg>')
    return '\n'.join(parts)


def cvp_svg(store_result, width=640, height=320, points=40):
    """量本利 CVP 折线图：收入线（y=销售额）vs 总成本线（变动+净固定费用）。

    交点即保本点，且保本点直接用引擎 result['breakevenSales']（净固定费用 ÷ 加权 CMR），
    与核心指标表口径一致——修复原 TS 版 generate_cvp_data 未扣补贴导致保本点偏大（389,623）的 bug。
    """
    r = store_result
    sales = r['totalSales']
    vc_rate = r['variableCostRate']
    net_fc = r['totalFixedCost'] - (r.get('totalSubsidy') or 0)

    if sales <= 0:
        return ''
    max_x = sales * 2
    pts = []
    for i in range(points + 1):
        s = max_x * i / points
        pts.append({'sales': s,
                    'revenue': s,
                    'totalCost': s * vc_rate + net_fc})
    max_y = max_x * 1.08

    pad_l, pad_r, pad_t, pad_b = 64, 16, 20, 40
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b

    def px(x):
        return pad_l + (x / max_x) * plot_w

    def py(v):
        return pad_t + plot_h - (v / max_y) * plot_h

    def polyline(name, color):
        coords = ' '.join(f"{px(p['sales']):.1f},{py(p[name]):.1f}" for p in pts)
        return f'<polyline points="{coords}" fill="none" stroke="{color}" stroke-width="2"/>'

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width * 1.2:g}" height="{height * 1.2:g}" '
        f'viewBox="0 0 {width} {height}" font-family="sans-serif">',
        f'<text x="{pad_l}" y="16" font-size="14" font-weight="bold" fill="#111">量本利分析（CVP）</text>',
        polyline('revenue', TCL_RED),
        polyline('totalCost', '#2563eb'),
    ]
    # 保本点标记：用引擎 result['breakevenSales']，与核心指标表一致
    bep = r.get('breakevenSales')
    if bep is not None and bep > 0:
        bep_y = bep * vc_rate + net_fc  # 保本销售额对应的总成本（= 收入）
        parts.append(f'<circle cx="{px(bep):.1f}" cy="{py(bep_y):.1f}" r="4" fill="{TCL_AMBER}"/>')
        parts.append(f'<text x="{px(bep):.1f}" y="{py(bep_y) - 8:.1f}" font-size="10" fill="{TCL_AMBER}" '
                     f'text-anchor="middle">保本点 {bep:,.0f}</text>')
    # 图例 + 轴
    parts.append(f'<line x1="{pad_l}" y1="{pad_t}" x2="{pad_l}" y2="{pad_t + plot_h}" stroke="#999" stroke-width="1"/>')
    parts.append(f'<line x1="{pad_l}" y1="{pad_t + plot_h}" x2="{width - pad_r}" y2="{pad_t + plot_h}" stroke="#999" stroke-width="1"/>')
    parts.append(f'<text x="12" y="{pad_t + plot_h / 2}" font-size="10" fill="#666" '
                 f'transform="rotate(-90 12 {pad_t + plot_h / 2})" text-anchor="middle">金额（元）</text>')
    parts.append(f'<text x="{pad_l}" y="{height - 8}" font-size="10" fill="#666">销售额（元）</text>')
    parts.append(f'<text x="{pad_l + 8}" y="{pad_t + 14}" font-size="10" fill="{TCL_RED}">— 收入</text>')
    parts.append(f'<text x="{pad_l + 8}" y="{pad_t + 28}" font-size="10" fill="#2563eb">— 总成本</text>')
    parts.append('</svg>')
    return '\n'.join(parts)


def _wrap_svg_code(svg):
    """用 ```svg 围栏包裹 SVG，并放大字号/线宽让图在平台预览框里更清晰。

    平台 markdown 渲染器对裸 <svg> 走 HTML sanitize（剥掉 rect/path/circle/line 等图形标签，
    只留 <text> 文字 → 现象是「只剩文字」）；而 ```svg 代码块会被前端识别为 SVG 图片专门渲染，
    rect/path/circle 等图形标签全部生效（已用「随便输出一个 svg 图片」实测验证）。
    """
    # 字号/线宽整体放大（原 font-size 10~14 → 14~19，stroke-width 1~2 → 1.4~2.8），
    # 让图在平台固定宽度的预览框里文字更清晰、线条更粗。
    svg = re.sub(r'font-size="(\d+(?:\.\d+)?)"',
                 lambda m: f'font-size="{(float(m.group(1)) * 1.4):g}"', svg)
    svg = re.sub(r'stroke-width="(\d+(?:\.\d+)?)"',
                 lambda m: f'stroke-width="{(float(m.group(1)) * 1.4):g}"', svg)
    return '```svg\n' + svg + '\n```'


def charts_svg(store_result):
    """阶梯瀑布 + CVP 两个 SVG，各包一层 ```svg 围栏（calc / goal_seek 意图用）。"""
    parts = []
    w = waterfall_svg(store_result)
    if w:
        parts.append(_wrap_svg_code(w))
    c = cvp_svg(store_result)
    if c:
        parts.append(_wrap_svg_code(c))
    return '\n\n'.join(parts)


def compare_bar_svg(cmp, width=640, height=280):
    """方案利润对比 → 柱状图 SVG（compare 意图用）。"""
    rows = cmp.get('rows') or []
    if not rows:
        return ''
    profits = [r['profit'] for r in rows]
    vmin = min(min(profits, default=0), 0)
    vmax = max(max(profits, default=0), 1)
    span = (vmax - vmin) or 1

    pad_l, pad_r, pad_t, pad_b = 64, 16, 20, 40
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b
    n = len(rows)
    slot = plot_w / n
    bar_w = slot * 0.5

    def y(v):
        return pad_t + plot_h - ((v - vmin) / span) * plot_h

    zero_y = y(0)
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width * 1.2:g}" height="{height * 1.2:g}" '
        f'viewBox="0 0 {width} {height}" font-family="sans-serif">',
        f'<text x="{pad_l}" y="16" font-size="14" font-weight="bold" fill="#111">方案利润对比</text>',
        f'<line x1="{pad_l}" y1="{zero_y:.1f}" x2="{width - pad_r}" y2="{zero_y:.1f}" '
        f'stroke="#999" stroke-width="1"/>',
    ]
    for i, r in enumerate(rows):
        cx = pad_l + slot * i + slot / 2
        x0 = cx - bar_w / 2
        p = r['profit']
        top = y(p)
        bottom = zero_y
        color = '#34a853' if p >= 0 else '#ea4335'
        y0 = min(top, bottom)
        h = abs(bottom - top)
        parts.append(f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{bar_w:.1f}" height="{h:.2f}" fill="{color}"/>')
        parts.append(f'<text x="{cx:.1f}" y="{height - pad_b + 16}" font-size="10" fill="#333" '
                     f'text-anchor="middle">{_esc(r["name"])}</text>')
        parts.append(f'<text x="{cx:.1f}" y="{min(top, bottom) - 6:.1f}" font-size="10" fill="#333" '
                     f'text-anchor="middle">{_wan(p)}</text>')
    parts.append(f'<line x1="{pad_l}" y1="{pad_t}" x2="{pad_l}" y2="{pad_t + plot_h}" stroke="#999" stroke-width="1"/>')
    parts.append(f'<line x1="{pad_l}" y1="{pad_t + plot_h}" x2="{width - pad_r}" y2="{pad_t + plot_h}" stroke="#999" stroke-width="1"/>')
    parts.append('</svg>')
    return _wrap_svg_code('\n'.join(parts))


# ── PNG 光栅化（纯标准库：struct + zlib + base64，零 matplotlib/PIL 依赖） ──
#
# 设计：灵犀平台更新后 markdown 渲染器会 sanitize 裸 <svg> 标签，导致图表消失。
# PNG 是图片、无脚本风险，`<img src="data:image/png;base64,...">` 是 markdown 基础元素，
# sanitizer 必定放行。数字仍 100% 由引擎绘制，不经 LLM。
# 图片内只用 5×7 点阵字体画数字与 ASCII（X/C/P/S 及金额），中文标题/说明放 markdown 行。

def _rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


TCL_RGB_RED = _rgb('#E4002B')
TCL_RGB_AMBER = _rgb('#f59e0b')
TCL_RGB_GRAY = _rgb('#999999')
TCL_RGB_BLUE = _rgb('#2563eb')
TCL_RGB_GREEN = _rgb('#34a853')
TCL_RGB_DARKRED = _rgb('#ea4335')
TCL_RGB_TEXT = _rgb('#333333')

# 5×7 点阵字体（数字 + 常用符号 + X/C/P/S 字母），1=亮
_FONT_5X7 = {
    '0': ('01110', '10001', '10011', '10101', '11001', '10001', '01110'),
    '1': ('00100', '01100', '00100', '00100', '00100', '00100', '01110'),
    '2': ('01110', '10001', '00001', '00010', '00100', '01000', '11111'),
    '3': ('11111', '00010', '00100', '00010', '00001', '10001', '01110'),
    '4': ('00010', '00110', '01010', '10010', '11111', '00010', '00010'),
    '5': ('11111', '10000', '11110', '00001', '00001', '10001', '01110'),
    '6': ('00110', '01000', '10000', '11110', '10001', '10001', '01110'),
    '7': ('11111', '00001', '00010', '00100', '01000', '01000', '01000'),
    '8': ('01110', '10001', '10001', '01110', '10001', '10001', '01110'),
    '9': ('01110', '10001', '10001', '01111', '00001', '00010', '01100'),
    '.': ('00000', '00000', '00000', '00000', '00000', '01100', '01100'),
    ',': ('00000', '00000', '00000', '00000', '00110', '00100', '01000'),
    '-': ('00000', '00000', '00000', '11111', '00000', '00000', '00000'),
    '+': ('00000', '00100', '00100', '11111', '00100', '00100', '00000'),
    '%': ('11001', '11010', '00010', '00100', '01000', '01011', '10011'),
    ' ': ('00000', '00000', '00000', '00000', '00000', '00000', '00000'),
    'X': ('10001', '10001', '01010', '00100', '01010', '10001', '10001'),
    'C': ('01110', '10001', '10000', '10000', '10000', '10001', '01110'),
    'P': ('11110', '10001', '10001', '11110', '10000', '10000', '10000'),
    'S': ('01111', '10000', '10000', '01110', '00001', '00001', '11110'),
}


class _Canvas:
    """RGB 帧缓冲 + 基础绘图（矩形/线段/折线/5×7 文本），编码为 PNG base64。"""

    def __init__(self, w, h, bg=(255, 255, 255)):
        self.w, self.h = w, h
        self.buf = bytearray(w * h * 3)
        for i in range(w * h):
            self.buf[i * 3] = bg[0]
            self.buf[i * 3 + 1] = bg[1]
            self.buf[i * 3 + 2] = bg[2]

    def _set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            i = (y * self.w + x) * 3
            self.buf[i] = c[0]
            self.buf[i + 1] = c[1]
            self.buf[i + 2] = c[2]

    def rect(self, x0, y0, w, h, c):
        x0, y0 = int(round(x0)), int(round(y0))
        w, h = max(int(round(w)), 1), max(int(round(h)), 1)
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                self._set(x, y, c)

    def line(self, x0, y0, x1, y1, c, width=1):
        x0, y0 = int(round(x0)), int(round(y0))
        x1, y1 = int(round(x1)), int(round(y1))
        dx, dy = abs(x1 - x0), abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        x, y = x0, y0
        while True:
            for i in range(width):
                for j in range(width):
                    self._set(x + i, y + j, c)
            if x == x1 and y == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x += sx
            if e2 < dx:
                err += dx
                y += sy

    def polyline(self, pts, c, width=2):
        for i in range(len(pts) - 1):
            self.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, width)

    def text(self, s, x, y, c, scale=1, anchor='left'):
        s = str(s)
        x, y = int(round(x)), int(round(y))
        total_w = len(s) * 6 * scale - scale
        if anchor == 'middle':
            x -= total_w // 2
        elif anchor == 'end':
            x -= total_w
        cx = x
        for ch in s:
            g = _FONT_5X7.get(ch)
            if g:
                for r in range(7):
                    row = g[r]
                    for col in range(5):
                        if row[col] == '1':
                            for sx in range(scale):
                                for sy in range(scale):
                                    self._set(cx + col * scale + sx, y + r * scale + sy, c)
            cx += 6 * scale

    def to_png_b64(self):
        sig = b'\x89PNG\r\n\x1a\n'

        def chunk(tag, data):
            return (struct.pack('>I', len(data)) + tag + data
                    + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

        ihdr = struct.pack('>IIBBBBB', self.w, self.h, 8, 2, 0, 0, 0)
        raw = bytearray()
        stride = self.w * 3
        for y in range(self.h):
            raw.append(0)  # filter: none
            raw += self.buf[y * stride:(y + 1) * stride]
        idat = zlib.compress(bytes(raw), 9)
        png = sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')
        return base64.b64encode(png).decode('ascii')


def _tier_label(label):
    """瀑布图柱下标签：取 '-' 后的系列字母（'智屏-P' → 'P'），单品类直接用原标签。"""
    s = str(label)
    return s.split('-')[-1] if '-' in s else s


def md_img(png_b64, alt='图表', width=640):
    return f'<img src="data:image/png;base64,{png_b64}" alt="{alt}" width="{width}"/>'


def waterfall_png(store_result, width=640, height=320):
    """阶梯边际贡献瀑布图（PNG 位图）+ 净固定费用参考线。"""
    step = store_result.get('stepChartData') or {}
    segs = step.get('segments') or []
    if not segs:
        return ''
    subsidy = store_result.get('totalSubsidy') or 0
    net_fc = (step.get('storeFC') or 0) - subsidy
    max_contrib = max(max((s['cumulativeContribution'] for s in segs), default=0), net_fc, 1)

    pad_l, pad_r, pad_t, pad_b = 64, 16, 30, 36
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b
    n = len(segs)
    slot = plot_w / n
    bar_w = slot * 0.55
    ymax = max_contrib * 1.1
    cv = _Canvas(width, height)

    def y(v):
        v = max(v, 0)
        return pad_t + plot_h - (v / ymax) * plot_h

    if net_fc > 0:
        ly = y(net_fc)
        cv.line(pad_l, ly, width - pad_r, ly, TCL_RGB_AMBER, 1)
        cv.text(f'{net_fc:,.0f}', width - pad_r, ly + 4, TCL_RGB_AMBER, 1, 'end')

    prev = 0.0
    for i, s in enumerate(segs):
        cx = pad_l + slot * i + slot / 2
        x0 = cx - bar_w / 2
        contrib = s['contributionAmount']
        color = TCL_RGB_RED if contrib >= 0 else TCL_RGB_DARKRED
        if contrib >= 0:
            top, bottom = y(prev + contrib), y(prev)
        else:
            top, bottom = y(prev), y(prev + contrib)
        cv.rect(x0, top, bar_w, max(bottom - top, 1), color)
        cv.text(_tier_label(s['label']), cx, height - pad_b + 4, TCL_RGB_TEXT, 1, 'middle')
        prev = s['cumulativeContribution']

    cv.line(pad_l, pad_t, pad_l, pad_t + plot_h, TCL_RGB_GRAY, 1)
    cv.line(pad_l, pad_t + plot_h, width - pad_r, pad_t + plot_h, TCL_RGB_GRAY, 1)
    cv.text('0', pad_l - 4, pad_t + plot_h + 2, _rgb('#666666'), 1, 'end')
    return cv.to_png_b64()


def cvp_png(store_result, width=640, height=320, points=40):
    """量本利 CVP 折线图（PNG）：收入线 vs 总成本线，交点 = 引擎 breakevenSales。"""
    r = store_result
    sales = r['totalSales']
    vc_rate = r['variableCostRate']
    net_fc = r['totalFixedCost'] - (r.get('totalSubsidy') or 0)
    if sales <= 0:
        return ''
    max_x = sales * 2
    pts = []
    for i in range(points + 1):
        s = max_x * i / points
        pts.append((s, s, s * vc_rate + net_fc))
    max_y = max_x * 1.08

    pad_l, pad_r, pad_t, pad_b = 64, 16, 30, 36
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b

    def px(x):
        return pad_l + (x / max_x) * plot_w

    def py(v):
        return pad_t + plot_h - (v / max_y) * plot_h

    cv = _Canvas(width, height)
    cv.polyline([(px(p[0]), py(p[1])) for p in pts], TCL_RGB_RED, 2)
    cv.polyline([(px(p[0]), py(p[2])) for p in pts], TCL_RGB_BLUE, 2)

    bep = r.get('breakevenSales')
    if bep is not None and bep > 0:
        bep_y = bep * vc_rate + net_fc
        bx, by = px(bep), py(bep_y)
        cv.rect(bx - 3, by - 3, 6, 6, TCL_RGB_AMBER)
        cv.text(f'{bep:,.0f}', bx, by - 8, TCL_RGB_AMBER, 1, 'middle')

    cv.line(pad_l, pad_t, pad_l, pad_t + plot_h, TCL_RGB_GRAY, 1)
    cv.line(pad_l, pad_t + plot_h, width - pad_r, pad_t + plot_h, TCL_RGB_GRAY, 1)
    cv.text('0', pad_l - 4, pad_t + plot_h + 2, _rgb('#666666'), 1, 'end')
    cv.text(f'{max_y:,.0f}', pad_l - 4, pad_t + 2, _rgb('#666666'), 1, 'end')
    # 图例（ASCII 颜色块 + 文字）
    cv.rect(pad_l + 8, pad_t + 6, 10, 3, TCL_RGB_RED)
    cv.text('revenue', pad_l + 22, pad_t + 8, TCL_RGB_RED, 1)
    cv.rect(pad_l + 8, pad_t + 16, 10, 3, TCL_RGB_BLUE)
    cv.text('cost', pad_l + 22, pad_t + 18, TCL_RGB_BLUE, 1)
    return cv.to_png_b64()


def compare_bar_png(cmp, width=640, height=280):
    """方案利润对比柱状图（PNG）。"""
    rows = cmp.get('rows') or []
    if not rows:
        return ''
    profits = [r['profit'] for r in rows]
    vmin = min(min(profits, default=0), 0)
    vmax = max(max(profits, default=0), 1)
    span = (vmax - vmin) or 1

    pad_l, pad_r, pad_t, pad_b = 64, 16, 30, 36
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b
    n = len(rows)
    slot = plot_w / n
    bar_w = slot * 0.5
    cv = _Canvas(width, height)

    def y(v):
        return pad_t + plot_h - ((v - vmin) / span) * plot_h

    zero_y = y(0)
    cv.line(pad_l, zero_y, width - pad_r, zero_y, TCL_RGB_GRAY, 1)
    for i, r in enumerate(rows):
        cx = pad_l + slot * i + slot / 2
        x0 = cx - bar_w / 2
        p = r['profit']
        top, bottom = y(p), zero_y
        color = TCL_RGB_GREEN if p >= 0 else TCL_RGB_DARKRED
        y0 = min(top, bottom)
        h = max(abs(bottom - top), 1)
        cv.rect(x0, y0, bar_w, h, color)
        cv.text(f'{p:,.0f}', cx, min(top, bottom) - 4, TCL_RGB_TEXT, 1, 'middle')
    cv.line(pad_l, pad_t, pad_l, pad_t + plot_h, TCL_RGB_GRAY, 1)
    return cv.to_png_b64()


def charts_md(store_result):
    """calc / goal_seek 用：瀑布 + CVP 两张 PNG 内嵌成 markdown 块。"""
    blocks = []
    w = waterfall_png(store_result)
    if w:
        blocks.append('#### 阶梯边际贡献（瀑布）\n\n' + md_img(w, '阶梯边际贡献瀑布图'))
    c = cvp_png(store_result)
    if c:
        blocks.append('#### 量本利分析（CVP）\n\n' + md_img(c, '量本利分析（CVP）图'))
    return '\n\n'.join(blocks)


def compare_md(cmp):
    """compare 用：方案利润对比 PNG 内嵌成 markdown 块。"""
    b = compare_bar_png(cmp)
    if not b:
        return ''
    return '#### 方案利润对比\n\n' + md_img(b, '方案利润对比图', width=560)