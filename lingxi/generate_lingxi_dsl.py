# -*- coding: utf-8 -*-
"""灵犀平台 3.0 chatflow DSL 生成器

读取 calc_engine.py（单一真相源）内嵌进 code 节点，生成可直接导入平台的 yml。

产物：lingxi/out/TCL门店盈利测算智能体.yml

运行：uv run python lingxi/generate_lingxi_dsl.py
"""

import os
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, 'out')
OUT_FILE = os.path.join(OUT_DIR, 'TCL门店盈利测算智能体.yml')

# 企业依赖包（从官方样例照抄，勿改 hash）
DEP_PACKAGE = 'tcl_tech/tcl_private:0.0.6@328a6f82d6bf9f1278f6cda5f20e3feed6eebf75213cc40ac9a852502b7b96fa'

# 模型（官方样例验证：DeepSeek-V4-Pro 与 V3.1 同 provider，仅 name 不同）
MODEL_NAME = 'DeepSeek-V4-Pro'
MODEL_PROVIDER = 'tcl_tech/tcl_private/vllm'


# 节点 id（全数字串，唯一即可）
NID_START = '1000000000001'
NID_IFELSE = '1000000000007'
NID_DOCEX = '1000000000008'
NID_EXTRACT = '1000000000002'
NID_CALC = '1000000000003'
NID_DIAGNOSE = '1000000000004'
NID_ANSWER = '1000000000005'

# ───────────────────────── 抽取节点 prompt ─────────────────────────

EXTRACT_PROMPT = (
    '你是「TCL门店盈利测算系统」的输入解析器。从用户输入中提取结构化的门店测算数据，'
    '严格遵守输出 schema。\n\n'
    '【输入来源】用户可能：①直接用文字描述；②上传 Excel/表格（系统已把它转成下方「文档内容」的 markdown 表格）。'
    '当「文档内容」非空时，**优先从文档内容的表格里读取数据**，用户文字只作补充或指令；'
    '文档内容为空时，从用户文字提取。\n\n'
    '【意图识别 intent】先判断用户要做什么：\n'
    '- calc：普通测算（默认）。只算利润/保本/诊断。\n'
    '- goal_seek：目标利润反推（用户提到「目标利润」「要做到多少」「达标」等）。'
    '此时需填 target_profit（目标利润额，元）。\n'
    '- compare：多方案对比（用户描述了「两个/多个方案」「对比」「提价 vs 扩量」等）。'
    '此时把每个方案填进 scenarios 数组。\n'
    '- chat：纯追问/闲聊（不涉及修改数据重算，如「为什么」「什么意思」「还行吗」，'
    '或纯寒暄），此时无需填写任何字段，其它字段留空。\n\n'
    '【修改重算（重要）】当用户提出**修改已有数据并重新计算**的需求时（如「把S系列毛利率改成10%」'
    '「X系列改成40万」「固定费用改成5万」「换成倒扣制」等），不要判为 chat，而应判为 calc，'
    '并且：**结合对话历史（上一轮的完整门店数据），把用户要求的增量修改合并进去，输出一份完整的新数据**。'
    '例如上一轮是 X30万/C28万/P24万/S5万（毛利30/22/15/8），用户说「S改成毛利10%」，'
    '则本次输出的 categories 应包含完整的 X/C/P/S（S 毛利改为 0.10，其余不变），而非只输出 S。\n'
    '若修改只作用于部分字段（如只改固定费用），品类结构应原样复现上一轮的值。\n\n'
    '字段约定：\n'
    '1. store_name：门店名称，未提及则给空字符串（修改重算时沿用上一轮）。\n'
    '2. categories：品类数组（calc/goal_seek 用）。每个品类：\n'
    '   - category：只能是 智屏 / 白电 / 空调 / CIoT\n'
    '   - cost_mode：「倒扣制」核算填 modeA，「顺加制」核算填 modeB，未说明默认 modeA\n'
    '   - variable_cost_rate：变动费用率（小数，如 0.115 表示 11.5%），未说明可不填\n'
    '   - X/C/P/S：四个系列，每个含 sales（销售额，元）、gross_margin（毛利率，小数，'
    '如 0.30 表示 30%）、volume（台数，可选）、subsidy（总部补贴，元，可选）\n'
    '3. store_fixed_costs：门店固定费用（元/月），含 场地费/展台/人力成本/日常费用/运营支持。\n'
    '4. scenarios：方案数组（compare 用）。每项含 name（方案名）、categories（同上结构）、'
    'store_fixed_costs（同上）。\n\n'
    '换算规则：「万」换算成元（3万 = 30000）；「%」换算成小数（30% = 0.30）；'
    '未提及的系列/费用填 0。用户可能只描述部分品类，只提取明确提到的。'
)

# 抽取节点 structured_output schema（JSON Schema）
_CAT_SCHEMA = {
    'type': 'object',
    'properties': {
        'category': {'type': 'string', 'enum': ['智屏', '白电', '空调', 'CIoT']},
        'cost_mode': {'type': 'string', 'enum': ['modeA', 'modeB']},
        'variable_cost_rate': {'type': 'number'},
        'X': {'type': 'object', 'properties': {
            'sales': {'type': 'number'}, 'gross_margin': {'type': 'number'},
            'volume': {'type': 'number'}, 'subsidy': {'type': 'number'}}},
        'C': {'type': 'object', 'properties': {
            'sales': {'type': 'number'}, 'gross_margin': {'type': 'number'},
            'volume': {'type': 'number'}, 'subsidy': {'type': 'number'}}},
        'P': {'type': 'object', 'properties': {
            'sales': {'type': 'number'}, 'gross_margin': {'type': 'number'},
            'volume': {'type': 'number'}, 'subsidy': {'type': 'number'}}},
        'S': {'type': 'object', 'properties': {
            'sales': {'type': 'number'}, 'gross_margin': {'type': 'number'},
            'volume': {'type': 'number'}, 'subsidy': {'type': 'number'}}},
    },
    'required': ['category'],
}
_FC_SCHEMA = {
    'type': 'object',
    'properties': {
        '场地费': {'type': 'number'}, '展台': {'type': 'number'},
        '人力成本': {'type': 'number'}, '日常费用': {'type': 'number'},
        '运营支持': {'type': 'number'},
    },
}
_SCENARIO_SCHEMA = {
    'type': 'object',
    'properties': {
        'name': {'type': 'string'},
        'categories': {'type': 'array', 'items': _CAT_SCHEMA},
        'store_fixed_costs': _FC_SCHEMA,
    },
    'required': ['name', 'categories'],
}

EXTRACT_SCHEMA = {
    'type': 'object',
    'properties': {
        'intent': {'type': 'string', 'enum': ['calc', 'goal_seek', 'compare', 'chat']},
        'store_name': {'type': 'string'},
        'target_profit': {'type': 'number'},
        'categories': {'type': 'array', 'items': _CAT_SCHEMA},
        'store_fixed_costs': _FC_SCHEMA,
        'scenarios': {'type': 'array', 'items': _SCENARIO_SCHEMA},
    },
    'required': ['intent'],
}

# ───────────────────────── 诊断节点 prompt ─────────────────────────

DIAGNOSE_PROMPT = (
    '你是 TCL 渠道财务领域的资深经营分析师。你负责撰写【诊断叙事】或回答【追问】。\n\n'
    '【铁律】系统已经把测算结果算好并在本次回复中直接展示（就是下面「已算好的结果」）。'
    '你**绝不能**说「请确认口径」「需要重新计算」「请系统重新生成」「我无法计算」之类的话，'
    '也**不允许自己计算、换算、推导或补充任何数字**。你唯一的工作是：基于已算好的结果，'
    '给出专业的诊断意见和经营建议。\n\n'
    '分两种情况：\n\n'
    '【情况一：下面是正常的测算结果（含「盈利状态」和「建议线索」）】\n'
    '输出 markdown 格式的诊断叙事：\n'
    '## 二、盈利诊断\n'
    '把每条线索用专业财务语言展开成可执行建议：讲清楚「问题是什么、为什么会这样、该做什么」。'
    '只能复述线索里已经出现的数字，绝不新算。\n'
    '## 四、一句话结论\n'
    '门店整体健康度 + 最紧急的一个动作。\n\n'
    '【情况二：下面是「（用户在进行追问…）」的说明】\n'
    '用户在追问。结合对话历史里上一轮已展示的核心指标表、阶梯表、诊断结论，直接回答用户的问题。'
    '只引用历史里已出现的数字；若追问涉及没有数据的假设（如「改成倒扣制会怎样」），'
    '诚实说明「需要用户补充数据后由系统重新测算」，而不是自己编数字。\n\n'
    f'已算好的结果（系统将直接展示给用户，你据此发言，禁止质疑或重算）：\n{{{{#{NID_CALC}.facts_text#}}}}\n\n'
    f'建议线索：\n{{{{#{NID_CALC}.guidance_text#}}}}\n\n'
    f'（图表已由系统生成，你无需处理图表。）'
)

# ───────────────────────── code 节点 main 包装 ─────────────────────────

MAIN_WRAPPER = r'''

# ---- code 节点入口 ----
# 有 doc_text（文档提取器输出的 markdown 表格）时，用 parse_markdown_table 精确解析覆盖数据，
# 否则用 LLM 抽取的 input（structured_output）。数字始终不经 LLM。
def main(input=None, doc_text=''):
    data = {}
    if isinstance(input, dict):
        data = input
    elif isinstance(input, str) and input.strip():
        try:
            data = json.loads(input)
        except Exception:
            data = {}
    if doc_text:
        parsed = parse_markdown_table(doc_text)
        if parsed:
            intent = data.get('intent') or 'calc'
            parsed['intent'] = intent
            if data.get('target_profit') is not None:
                parsed['target_profit'] = data['target_profit']
            data = parsed
    return route(data if data else {'intent': 'calc'})
'''


def read_engine_code():
    """读取计算引擎源码（引擎顶部已 import json，无需额外注入）"""
    with open(os.path.join(HERE, 'calc_engine.py'), 'r', encoding='utf-8') as f:
        src = f.read()
    return src + MAIN_WRAPPER


# ───────────────────────── 节点构造 ─────────────────────────

def _frame(node_id, data, position, width=242, height=90):
    """节点外层框架（Dify DSL 通用结构）"""
    return {
        'data': data,
        'height': height,
        'id': node_id,
        'position': position,
        'positionAbsolute': position,
        'selected': False,
        'sourcePosition': 'right',
        'targetPosition': 'left',
        'type': 'custom',
        'width': width,
    }


def _edge(source, target, source_type, target_type, source_handle='source'):
    return {
        'data': {'sourceType': source_type, 'targetType': target_type},
        'id': f'{source}-source-{target}-target',
        'source': source,
        'sourceHandle': source_handle,
        'target': target,
        'targetHandle': 'target',
        'type': 'custom',
    }


def make_start_node():
    data = {'selected': False, 'title': '用户输入', 'type': 'start', 'variables': []}
    return _frame(NID_START, data, {'x': 80, 'y': 282}, height=73)


def make_ifelse_node():
    """识别是否上传了文件（sys.files 非空）。Dify 标准 if-else 结构，照抄官方样例。"""
    data = {
        'cases': [{
            'case_id': 'true',
            'conditions': [{
                'comparison_operator': 'not empty',
                'id': 'f0000000-0000-4000-8000-0000000000f1',
                'value': '',
                'varType': 'array[file]',
                'variable_selector': ['sys', 'files'],
            }],
            'id': 'true',
            'logical_operator': 'and',
        }],
        'selected': False,
        'title': '是否上传文件',
        'type': 'if-else',
    }
    return _frame(NID_IFELSE, data, {'x': 380, 'y': 282}, height=88)


def make_doc_extractor_node():
    """文档提取器：把上传的 xlsx/csv/表格转成 markdown 文本，输出变量名 text。
    指向 sys.files（数组），故 is_array_file=true（与官方「课程工具」样例一致）。"""
    data = {
        'is_array_file': True,
        'selected': False,
        'title': '文档提取器',
        'type': 'document-extractor',
        'variable_selector': ['sys', 'files'],
    }
    return _frame(NID_DOCEX, data, {'x': 680, 'y': 150}, height=104)


def make_extract_node():
    data = {
        # 有文件时，把文档提取器的 text 作为 context 注入
        'context': {
            'enabled': True,
            'variable_selector': [NID_DOCEX, 'text'],
        },
        'memory': {
            'query_prompt_template': '{{#sys.query#}}',
            'role_prefix': {'assistant': '', 'user': ''},
            'window': {'enabled': True, 'size': 10},
        },
        'model': {
            'completion_params': {'temperature': 0.1},
            'mode': 'chat',
            'name': MODEL_NAME,
            'provider': MODEL_PROVIDER,
        },
        'prompt_template': [{
            'id': 'a0000000-0000-4000-8000-000000000001',
            'role': 'system',
            'text': EXTRACT_PROMPT,
        }],
        'reasoning_format': 'separated',
        'selected': False,
        'structured_output': {'schema': EXTRACT_SCHEMA},
        'structured_output_enabled': True,
        'title': '参数抽取',
        'type': 'llm',
        'vision': {'enabled': False},
    }
    return _frame(NID_EXTRACT, data, {'x': 980, 'y': 282}, height=88)


def make_calc_node(code):
    data = {
        'code': code,
        'code_language': 'python3',
        'outputs': {
            'facts_text': {'children': None, 'type': 'string'},
            'guidance_text': {'children': None, 'type': 'string'},
            'chart_svg': {'children': None, 'type': 'string'},
        },
        'selected': False,
        'title': '盈利测算',
        'type': 'code',
        'variables': [
            {
                'value_selector': [NID_EXTRACT, 'structured_output'],
                'value_type': 'object',
                'variable': 'input',
            },
            {
                'value_selector': [NID_DOCEX, 'text'],
                'value_type': 'array[string]',
                'variable': 'doc_text',
            },
        ],
    }
    return _frame(NID_CALC, data, {'x': 680, 'y': 282}, height=52)


def make_diagnose_node():
    data = {
        'context': {'enabled': False, 'variable_selector': []},
        'memory': {
            'query_prompt_template': '{{#sys.query#}}',
            'role_prefix': {'assistant': '', 'user': ''},
            'window': {'enabled': True, 'size': 10},
        },
        'model': {
            'completion_params': {'temperature': 0.4},
            'mode': 'chat',
            'name': MODEL_NAME,
            'provider': MODEL_PROVIDER,
        },
        'prompt_template': [{
            'id': 'a0000000-0000-4000-8000-000000000002',
            'role': 'system',
            'text': DIAGNOSE_PROMPT,
        }],
        'reasoning_format': 'separated',
        'selected': False,
        'title': '经营诊断',
        'type': 'llm',
        'vision': {'enabled': False},
    }
    return _frame(NID_DIAGNOSE, data, {'x': 980, 'y': 282}, height=88)


def make_answer_node():
    """answer 直接拼接：facts_text（引擎数字）+ LLM叙事 + chart_svg（引擎生成的内嵌 SVG 图表）"""
    answer = ('{{#%s.facts_text#}}\n\n' % NID_CALC
              + '{{#%s.text#}}\n\n' % NID_DIAGNOSE
              + '{{#%s.chart_svg#}}' % NID_CALC)
    data = {
        'answer': answer,
        'selected': False,
        'title': '直接回复',
        'type': 'answer',
        'variables': [],
    }
    return _frame(NID_ANSWER, data, {'x': 1280, 'y': 282}, height=103)


# ───────────────────────── 组装 ─────────────────────────

def _build_app(name, edges, nodes, description):
    return {
        'app': {
            'description': description,
            'icon': '🏪',
            'icon_background': '#FFEAD5',
            'mode': 'advanced-chat',
            'name': name,
            'use_icon_as_answer_icon': False,
        },
        'dependencies': [{
            'current_identifier': None,
            'type': 'package',
            'value': {'plugin_unique_identifier': DEP_PACKAGE, 'version': None},
        }],
        'kind': 'app',
        'version': '0.5.0',
        'workflow': {
            'conversation_variables': [],
            'environment_variables': [],
            'features': {
                'file_upload': {
                    'allowed_file_extensions': ['.XLSX', '.XLS', '.CSV', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP', '.SVG'],
                    'allowed_file_types': ['document', 'image'],
                    'allowed_file_upload_methods': ['local_file', 'remote_url'],
                    'enabled': True,
                    'fileUploadConfig': {
                        'audio_file_size_limit': 50, 'batch_count_limit': 5, 'file_size_limit': 15,
                        'image_file_batch_limit': 10, 'image_file_size_limit': 5,
                        'single_chunk_attachment_limit': 10, 'video_file_size_limit': 100,
                        'workflow_file_upload_limit': 10,
                    },
                    'image': {'enabled': False, 'number_limits': 3,
                              'transfer_methods': ['local_file', 'remote_url']},
                    'number_limits': 3,
                },
                'opening_statement': '我是 TCL 门店盈利测算助手。告诉我门店的品类销售结构（智屏/白电/空调/CIoT 的 X/C/P/S 四级销售额与毛利率）、'
                                     '变动费用率、固定费用，我就能算出利润、保本销售额、边际贡献，并给出经营建议。',
                'retriever_resource': {'enabled': False},
                'sensitive_word_avoidance': {'enabled': False},
                'speech_to_text': {'enabled': False},
                'suggested_questions': [
                    '帮我测算：智屏 X系列30万毛利率30%、C系列28万毛利率22%、P系列24万毛利率15%、S系列5万毛利率8%，'
                    '变动费用率11.5%，固定费用场地1.7万展台0.8万人力1万日常0.2万运营0.4万',
                    '目标利润10万，帮我反推要做到多少',
                    '对比提价策略和扩量策略两个方案',
                ],
                'suggested_questions_after_answer': {'enabled': True},
                'text_to_speech': {'enabled': False, 'language': '', 'voice': ''},
            },
            'graph': {
                'edges': edges,
                'nodes': nodes,
                'viewport': {'x': 0, 'y': 0, 'zoom': 1},
            },
            'rag_pipeline_variables': [],
        },
    }


def build_dsl():
    """单一零依赖版本：图表由 code 节点内嵌生成 SVG（无需 agent 插件、无需 mcp-server-chart）。
    支持上传 xlsx/csv 文件（if-else + 文档提取器转为 markdown 后喂给抽取节点）。"""
    code = read_engine_code()
    nodes = [
        make_start_node(),
        make_ifelse_node(),
        make_doc_extractor_node(),
        make_extract_node(),
        make_calc_node(code),
        make_diagnose_node(),
        make_answer_node(),
    ]
    edges = [
        _edge(NID_START, NID_IFELSE, 'start', 'if-else'),
        _edge(NID_IFELSE, NID_DOCEX, 'if-else', 'document-extractor', source_handle='true'),
        _edge(NID_IFELSE, NID_EXTRACT, 'if-else', 'llm', source_handle='false'),
        _edge(NID_DOCEX, NID_EXTRACT, 'document-extractor', 'llm'),
        _edge(NID_DOCEX, NID_CALC, 'document-extractor', 'code'),
        _edge(NID_EXTRACT, NID_CALC, 'llm', 'code'),
        _edge(NID_CALC, NID_DIAGNOSE, 'code', 'llm'),
        _edge(NID_DIAGNOSE, NID_ANSWER, 'llm', 'answer'),
    ]
    desc = 'TCL门店盈利测算：输入品类销售结构（X/C/P/S四级）与费用，实时测算门店利润、盈亏平衡点、边际贡献，' \
           '并给出经营诊断、SVG 图表（阶梯瀑布 + 量本利）与改进建议。支持上传 Excel/CSV 文件（自动转表格读取）。'
    return _build_app('TCL门店盈利测算智能体', edges, nodes, desc)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    dsl = build_dsl()
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        yaml.dump(dsl, f, allow_unicode=True, sort_keys=False, default_flow_style=False, width=4096)
    print(f'✅ 已生成 {OUT_FILE}（内嵌 SVG 图表，零插件依赖）')
    code_node = next(n for n in dsl['workflow']['graph']['nodes'] if n['data'].get('type') == 'code')
    print(f'   节点数：{len(dsl["workflow"]["graph"]["nodes"])}，边数：{len(dsl["workflow"]["graph"]["edges"])}')
    print(f'   code 节点内嵌引擎：{len(code_node["data"]["code"])} 字符')


if __name__ == '__main__':
    main()