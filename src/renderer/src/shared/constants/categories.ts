/** 统一品类列表 */
export const CATEGORIES = ['智屏', '白电', '空调', 'CIoT'] as const
export type Category = (typeof CATEGORIES)[number]

/** 品类颜色（TCL 品牌色系） */
export const CATEGORY_COLORS: Record<string, string> = {
  '智屏': '#E4002B',
  '白电': '#ea4335',
  '空调': '#fbbc05',
  'CIoT': '#34a853',
}

/** 品类名称规范化为中文显示名（兼容旧数据英文/旧名） */
const NAME_MAP: Record<string, string> = {
  '智屏': '智屏', 'tv': '智屏', 'TV': '智屏',
  '白电': '白电', 'appliance': '白电', '冰洗': '白电',
  '空调': '空调', 'ac': '空调', 'AC': '空调',
  'CIoT': 'CIoT', 'ciot': 'CIoT', 'Ciot': 'CIoT', '门锁': 'CIoT',
}

export function normalizeCategoryName(key: string): string {
  return NAME_MAP[key] || key
}
