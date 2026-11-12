"use client";

import { Card, Statistic } from "antd";
import ProgressRing from "./ProgressRing";

/**
 * @description 提交记录行类型：子组件自行声明所需字段并导出，
 *              父组件导入后为 fetchRows 的无类型数据源做标记（as）再传入
 */
export type SubmissionRow = {
  id: string | number;
  problem_id: string | number;
  status: string;
  created_at: string;
};

/** @description 统计数据：总提交数 / 通过题目数（去重）/ AC 提交数 / 提交通过率 */
export type SubmissionStats = {
  total: number;
  passedProblems: number;
  passedSubmissions: number;
  passRate: number;
};

/**
 * @description 从提交记录行聚合出统计：
 *              总提交数量 = 全部行数；总通过题目数量 = AC 提交的 problem_id 去重数；
 *              提交通过率 = AC 提交数 / 总提交数（百分比，保留两位小数）
 */
export function computeSubmissionStats(rows: SubmissionRow[]): SubmissionStats {
  let acCount = 0;
  const passedProblems = new Set<string>();
  for (const row of rows) {
    if (String(row.status) === "AC") {
      acCount++;
      passedProblems.add(String(row.problem_id));
    }
  }
  return {
    total: rows.length,
    passedProblems: passedProblems.size,
    passedSubmissions: acCount,
    passRate: rows.length ? (acCount / rows.length) * 100 : 0,
  };
}

/**
 * @description 提交统计卡片组：三张 borderless Card + Statistic（左侧）与通过率进度环（右侧），
 *              数据由父组件传入（CodeAgentHome 已统一拉取 submissions，避免重复请求）；
 *              rows 为 null / undefined 时按空数组处理，统计值显示 0。
 *              环形中央文字颜色可由外部通过 textColor / textMutedColor 控制（默认亮白 / 灰）
 */
export default function SubmissionStats({
  rows = null,
  totalProblems,
  textColor = "var(--ant-color-text-label)",
  textMutedColor = "var(--ant-color-text-description)",
}: {
  rows?: SubmissionRow[] | null;
  /** 题库总题目数量：传入后「总通过题目数量」展示为 通过数 / 总题目数 */
  totalProblems?: number;
  /** 环形中央主文字颜色（Pass Rate 与百分比） */
  textColor?: string;
  /** 环形中央弱化文字颜色（通过数 / 总数一行） */
  textMutedColor?: string;
}) {
  const stats = computeSubmissionStats(rows ?? []);
  const statsStyle = {
    content: {
      color: "var(--ant-color-success)",
      fontSize: 36,
      fontWeight: 700,
      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
    },
    title: { fontSize: 24 },
  };
  return (
    <div className="flex gap-4">
      <Card variant="borderless" className="flex-2">
        <Statistic title="总提交数量" value={stats.total} styles={statsStyle} />
      </Card>
      <Card variant="borderless" className="flex-2">
        <Statistic
          title="总通过题目数量"
          value={
            totalProblems === undefined
              ? stats.passedProblems
              : `${stats.passedProblems} / ${totalProblems}`
          }
          styles={statsStyle}
        />
      </Card>
      <Card variant="borderless" className="flex-3">
        <div className="flex items-start gap-4">
          <Statistic
            className="flex-1"
            title="提交通过率"
            value={stats.passRate}
            precision={2}
            suffix="%"
            styles={statsStyle}
          />
          <ProgressRing
            value={stats.passedSubmissions}
            max={stats.total}
            size={160}
            tooltipLines={[
              `<div>提交：${stats.total} 次</div>`,
              `<div>通过：${stats.passedProblems} 次</div>`,
              `<div>通过率：${stats.passRate.toFixed(1)}%</div>`,
            ]}
          >
            <div style={{ textAlign: "center", lineHeight: 1.2 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                  color: textColor,
                }}
              >
                Pass Rate
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                  color: textColor,
                }}
              >
                {stats.passRate.toFixed(1)}%
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: textMutedColor,
                }}
              >
                {stats.passedProblems} / {stats.total}
              </div>
            </div>
          </ProgressRing>
        </div>
      </Card>
    </div>
  );
}
