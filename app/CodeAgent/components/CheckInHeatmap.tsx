"use client";

import { useCallback, useMemo } from "react";
import { theme as antdTheme } from "antd";
import CheckInMonthHeatmap from "./CheckInMonthHeatmap";
import {
  buildDefaultTheme,
  mergeTheme,
  type HeatmapTheme,
} from "./heatmapTheme";
import { fmtDate, getMonthInfo } from "./heatmapShared";

/** @description 日期 → 数值键（YYYYMMDD），作模拟随机种子 */
function dayKey(d: Date) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** @description 种子伪随机数发生器（LCG），同一种子序列可复现 */
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * @description 默认模拟数据源：同一天每次调用结果一致，
 *              后续接接口时传 values / getValue 覆盖
 */
function defaultGetValue(date: Date) {
  const rand = seededRandom(dayKey(date));
  return rand() < 0.62 ? Math.floor(rand() * 100) + 1 : 0;
}

/**
 * @description 打卡日历：负责数据源解析与本月统计，月视图由
 *              [CheckInMonthHeatmap](./CheckInMonthHeatmap.tsx) 渲染
 *              （周视图 [CheckInWeekHeatmap](./CheckInWeekHeatmap.tsx) 暂时下线，组件保留备用）。
 *              数据源优先级 getValue(date) > values['YYYY-MM-DD'] > 内置模拟；
 *              颜色默认从 antd 主题 token 派生（跟随亮 / 暗算法），可通过 theme prop 浅覆盖
 */
export default function CheckInHeatmap({
  getValue,
  values,
  theme,
  showStats = true,
}: {
  /** 自定义数据源，优先级最高 */
  getValue?: (date: Date) => number;
  /** 按日期字符串查表（getValue 未传时生效） */
  values?: Record<string, number>;
  /** 覆盖默认主题的任意字段 */
  theme?: Partial<HeatmapTheme>;
  showStats?: boolean;
}) {
  const { token } = antdTheme.useToken();
  /** @description 主题：token 随明暗算法变化时重建；未传 override 时引用稳定，不会误触发子组件 setOption effect */
  const resolvedTheme = useMemo(
    () => mergeTheme(buildDefaultTheme(token), theme),
    [token, theme],
  );

  /** @description 今天：真实系统日期归一化到 0 点；空依赖保证引用稳定 */
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthInfo = useMemo(() => getMonthInfo(today), [today]);

  /** @description 数据源解析：getValue(date) > values['YYYY-MM-DD'] > 内置模拟 */
  const resolveValue = useCallback(
    (date: Date) => {
      if (getValue) return getValue(date);
      if (values) return values[fmtDate(date)] || 0;
      return defaultGetValue(date);
    },
    [getValue, values],
  );

  /** @description 本月统计：签到天数 / 最长连续天数 / 打卡率（只累计到今天为止） */
  const stats = useMemo(() => {
    const { year, month, daysInMonth } = monthInfo;
    let total = 0,
      cur = 0,
      maxStreak = 0,
      valid = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      d.setHours(0, 0, 0, 0);
      if (d > today) break;
      valid++;
      if (resolveValue(d) > 0) {
        total++;
        cur++;
        if (cur > maxStreak) maxStreak = cur;
      } else {
        cur = 0;
      }
    }
    return {
      total,
      maxStreak,
      rate: valid ? Math.round((total / valid) * 100) : 0,
    };
  }, [monthInfo, today, resolveValue]);

  const monthRangeText = `${monthInfo.year}年${monthInfo.month + 1}月`;

  /** @description 外壳样式：颜色硬编码为 antd CSS 变量（跟随亮 / 暗算法），与图表同源 */
  return (
    <div className="w-full rounded-lg border border-(--ant-color-border-secondary) bg-(--ant-color-bg-container) px-4 pb-[14px] pt-4 text-(--ant-color-text)">
      <div className="mb-2 mt-1 flex items-baseline gap-2 text-xs font-medium text-(--ant-color-text-secondary)">
        本月签到
        <span className="text-[11px] font-normal text-(--ant-color-text-tertiary)">
          {monthRangeText}
        </span>
      </div>
      <div className="rounded-lg border border-(--ant-color-border-secondary) bg-(--ant-color-bg-layout) px-[10px] py-2">
        <CheckInMonthHeatmap
          theme={resolvedTheme}
          today={today}
          getValue={resolveValue}
          monthInfo={monthInfo}
        />
      </div>

      {showStats && (
        <div className="mt-[14px] flex flex-wrap gap-[12px] border-t border-(--ant-color-split) pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-lg font-bold text-(--ant-color-primary)">
              {stats.total}
            </span>
            <span className="text-[11px] text-(--ant-color-text-tertiary)">
              本月签到天数
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-lg font-bold text-(--ant-color-primary)">
              {stats.maxStreak}
            </span>
            <span className="text-[11px] text-(--ant-color-text-tertiary)">
              最长连续
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-lg font-bold text-(--ant-color-primary)">
              {stats.rate}%
            </span>
            <span className="text-[11px] text-(--ant-color-text-tertiary)">
              打卡率
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
