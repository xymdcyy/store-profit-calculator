export default function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-10" onClick={onClose}>
      <div className="surface-elevated w-[750px] max-w-[95vw] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-light)] sticky top-0 bg-white z-10 rounded-t-[var(--radius-lg)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">使用帮助 — TCL门店盈利测算</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] transition-all btn-press">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6 text-[13px] text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">一、系统概述</h3>
            <p>本系统用于门店经营模拟测算，提供<b className="text-[var(--text-primary)]">门店简洁模式</b>和<b className="text-[var(--text-primary)]">财务专业模式</b>两种使用模式。</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1">
              <li><b className="text-[var(--text-primary)]">简洁模式</b>：面向门店店长和战区经理，KPI 卡片 + CVP 图 + 阶梯图 + 智能诊断</li>
              <li><b className="text-[var(--text-primary)]">专业模式</b>：面向财务人员与管理层，敏感性分析 + 多期间趋势 + 价值驱动瀑布 + 目标反算</li>
              <li>支持<b className="text-[var(--text-primary)]">单品类</b>和<b className="text-[var(--text-primary)]">多品类（智屏/白电/空调/CIoT）</b>两种测算</li>
              <li>支持<b className="text-[var(--text-primary)]">倒扣制和顺加制</b>两种核算模式</li>
              <li><b className="text-[var(--text-primary)]">Excel 导入导出</b>，导出的报告与导入模板格式完全一致</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">二、快速开始</h3>
            <p>系统启动后自动加载示例数据，您可以直接查看分析结果。录入自己的数据有三种方式：</p>
            <ol className="list-decimal pl-5 mt-1.5 space-y-1.5">
              <li><b className="text-[var(--text-primary)]">下载模板 → 填写 → 导入</b>：点击顶部"下载模板"获取标准 Excel，填写后点击"导入 Excel"上传。</li>
              <li><b className="text-[var(--text-primary)]">手动填写</b>：直接在页面的产品结构表格、变动费用、固定费用面板中输入数据，所有图表和 KPI 实时更新。</li>
              <li><b className="text-[var(--text-primary)]">加载示例</b>：点击"加载示例"恢复内置的示例数据。</li>
            </ol>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">三、单品类测算</h3>
            <h4 className="text-xs font-semibold text-[var(--text-primary)] mt-3 mb-1">3.1 产品结构（四个产品系列）</h4>
            <p>在表格中填写四个产品系列（名称可自定义，点击系列名可修改）的<b className="text-[var(--text-primary)]">销售额（元）</b>、<b className="text-[var(--text-primary)]">销量（台）</b>、<b className="text-[var(--text-primary)]">毛利率</b>。毛利率直接输入百分数，如 30% 填 <code className="bg-[var(--bg)] px-1 rounded text-[11px]">30</code>。</p>

            <h4 className="text-xs font-semibold text-[var(--text-primary)] mt-3 mb-1">3.2 变动费用</h4>
            <p>系统支持<b className="text-[var(--text-primary)]">倒扣制核算法（模式A）</b>和<b className="text-[var(--text-primary)]">顺加制核算法（模式B）</b>两种核算模式。</p>

            <h4 className="text-xs font-semibold text-[var(--text-primary)] mt-3 mb-1">3.3 固定费用（5 项）</h4>
            <p>场地费、展台、人力成本、日常费用、运营支持。以 <b className="text-[var(--text-primary)]">元/月</b> 为单位填写。鼠标悬停可显示 <b className="text-[var(--text-primary)]">−/+ 快捷按钮</b>。</p>

            <h4 className="text-xs font-semibold text-[var(--text-primary)] mt-3 mb-1">3.4 KPI 卡片</h4>
            <table className="w-full text-[11px] border-collapse mt-1">
              <thead><tr className="bg-[var(--bg)]">
                <th className="text-left py-1.5 px-2 border border-[var(--border-light)] font-medium">指标</th>
                <th className="text-left py-1.5 px-2 border border-[var(--border-light)] font-medium">公式</th>
                <th className="text-left py-1.5 px-2 border border-[var(--border-light)] font-medium">含义</th>
              </tr></thead>
              <tbody>
                <tr><td className="py-1 px-2 border border-[var(--border-light)] font-medium">销售额保本点</td><td className="py-1 px-2 border border-[var(--border-light)]">固定费用 ÷ 加权 CMR</td><td className="py-1 px-2 border border-[var(--border-light)]">刚好覆盖所有成本的月销售额</td></tr>
                <tr><td className="py-1 px-2 border border-[var(--border-light)] font-medium">保本毛利率</td><td className="py-1 px-2 border border-[var(--border-light)]">变动费率 + 固定费率</td><td className="py-1 px-2 border border-[var(--border-light)]">保本时所需的最低综合毛利率</td></tr>
                <tr><td className="py-1 px-2 border border-[var(--border-light)] font-medium">门店利润</td><td className="py-1 px-2 border border-[var(--border-light)]">（销售额 × 加权 CMR）+ 补贴 - 固定费用</td><td className="py-1 px-2 border border-[var(--border-light)]">当月净利润，含总部补贴</td></tr>
                <tr><td className="py-1 px-2 border border-[var(--border-light)] font-medium">日常边际贡献</td><td className="py-1 px-2 border border-[var(--border-light)]">边际贡献额 + 总部补贴</td><td className="py-1 px-2 border border-[var(--border-light)]">扣除固定费用前的利润贡献</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">四、多品类综合测算</h3>
            <p>点击顶部 <b className="text-[var(--text-primary)]">"多品类综合测算"</b> Tab 进入。支持智屏、白电、空调、CIoT 四大品类，自动计算三层加权 CMR。</p>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">五、财务专业模式（侧边栏导航）</h3>
            <p>在启动界面选择"财务专业模式"进入，左侧导航栏包含以下页面：</p>

            <h4 className="text-xs font-semibold text-[var(--text-primary)] mt-3 mb-1">5.1 测算输入</h4>
            <p>与简洁版相同的输入功能，支持金额/点位双模式切换。</p>

            <h4 className="text-xs font-semibold text-[var(--text-primary)] mt-3 mb-1">5.2 结果展示</h4>
            <p>利润概览 + KPI 卡片 + 费率分析 + 智能诊断。</p>

            <h4 className="text-xs font-semibold text-[var(--text-primary)] mt-3 mb-1">5.3 图表可视化</h4>
            <p>包含以下图表：</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li><b className="text-[var(--text-primary)]">价值驱动瀑布</b>：9 项完整链条（销售额→变动成本→毛利→变动费用→边际贡献→补贴→贡献净额→固定费用→利润），附带加权 CMR、盈亏平衡点、安全边际率指标卡</li>
              <li><b className="text-[var(--text-primary)]">量本利分析（CVP）</b>：收入/成本/利润线 + 保本点标注</li>
              <li><b className="text-[var(--text-primary)]">系列边际贡献</b>：按 CMR 排序的柱状图</li>
              <li><b className="text-[var(--text-primary)]">收入结构饼图</b> + <b className="text-[var(--text-primary)]">费用构成堆叠图</b></li>
            </ul>

            <h4 className="text-xs font-semibold text-[var(--text-primary)] mt-3 mb-1">5.4 敏感性分析</h4>
            <p>双维度 What-if 热力图：</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>行：销售额变动（-20% ~ +20%）</li>
              <li>列：CMR 变动（-3 ~ +3 百分点）</li>
              <li>单元格颜色：<span className="text-emerald-600">绿色</span>=盈利，<span className="text-amber-600">黄色</span>=临界，<span className="text-red-600">红色</span>=亏损</li>
              <li>红框标注当前基准点，一眼看清安全区间</li>
            </ul>

            <h4 className="text-xs font-semibold text-[var(--text-primary)] mt-3 mb-1">5.5 趋势分析</h4>
            <p>多期间数据对比：</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>输入期间名称（如"2026年1月"），点击"保存当前测算"存储当期数据</li>
              <li>修改参数后保存下一期，积累多期数据</li>
              <li>双 Y 轴趋势图：左轴=销售额/利润（柱状），右轴=毛利率/CMR（折线）</li>
              <li>明细表格展示所有期间的详细指标对比</li>
            </ul>

            <h4 className="text-xs font-semibold text-[var(--text-primary)] mt-3 mb-1">5.6 历史记录 & 方案对比</h4>
            <p>管理已保存的方案，支持加载、删除、批量对比。</p>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">六、目标反算（Goal Seek）</h3>
            <p>在输入页面底部的"目标反算"面板中：</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li><b className="text-[var(--text-primary)]">目标利润额</b>：输入想要达到的月利润（元）</li>
              <li><b className="text-[var(--text-primary)]">目标利润率</b>：输入目标利润率（%），与利润额联动</li>
              <li><b className="text-[var(--text-primary)]">可行性评分</b>：环形进度条，0-100 分，反映目标可达成难度</li>
              <li><b className="text-[var(--text-primary)]">三种方案</b>：保守（主要靠提量）、均衡（三管齐下）、激进（主要靠降费提利）</li>
              <li><b className="text-[var(--text-primary)]">Plan A/B/C</b>：分别从销售额、毛利率、费用三个维度计算所需变动</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">七、Excel 导入与导出</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>点击顶部 <b className="text-[var(--text-primary)]">"下载模板"</b>，选择倒扣制或顺加制</li>
              <li>填写完成后，点击 <b className="text-[var(--text-primary)]">"导入 Excel"</b> 选择文件</li>
              <li>点击 <b className="text-[var(--text-primary)]">"导出报告"</b> 导出当前方案为 Excel</li>
            </ol>
            <p className="text-[11px] text-amber-600 mt-2">注意：导入后请点击 <b>"保存方案"</b> 持久化到数据库。</p>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">八、小贴士</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>输入框中按 <b className="text-[var(--text-primary)]">Tab</b> 可快速跳转下一个输入框</li>
              <li>修改任意数据后，所有图表和指标 <b className="text-[var(--text-primary)]">实时更新</b></li>
              <li>导出的 Excel 可以直接作为导入模板使用</li>
              <li>KPI 卡片 <b className="text-[var(--text-primary)]">悬停可查看计算公式</b>和详细说明</li>
              <li>固定费用输入框 <b className="text-[var(--text-primary)]">悬停显示 −/+ 按钮</b>，可快速增减 100 元</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
