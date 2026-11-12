"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import type { HeatmapTheme } from "./heatmapTheme";
import {
  commonTooltipFormatter,
  DAY_LABELS,
  fmtDate,
  makeCellStyle,
  type WeekCell,
} from "./heatmapShared";

/**
 * @description 构造周视图 ECharts option：本周一 ~ 周日共 7 格，
 *              签到状态决定背景色（主色 / 弱化填充），文字用富文本两行（周几 + 日期）
 */
function buildWeekOption({
  theme,
  today,
  getValue,
}: {
  theme: HeatmapTheme;
  today: Date;
  getValue: (d: Date) => number;
}): echarts.EChartsCoreOption {
  const dow = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);

  const data: WeekCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(0, 0, 0, 0);

    const isToday = d.getTime() === today.getTime();
    const isFuture = d > today;
    const v = isFuture ? 0 : getValue(d);
    const signed = v > 0;

    // 签到模式：已签到 = 主色底（配白字），未签到 / 未来 = 弱化填充
    const color = isFuture
      ? theme.colorFuture
      : signed
        ? theme.colorSigned
        : theme.colorEmpty;

    data.push({
      value: [i, 0, v],
      dayName: DAY_LABELS[i],
      dayNum: d.getDate(),
      date: fmtDate(d),
      isToday,
      isFuture,
      signed,
      ...makeCellStyle(theme, color, theme.gapWeek, theme.radiusWeek),
    });
  }

  return {
    backgroundColor: "transparent",
    animationDuration: 500,
    // 必须存在一个指向本系列的 visualMap 才能通过 heatmap 的开发模式校验
    // （HeatmapView.render 要求 eachTargetSeries 命中本系列）。颜色不受影响：
    // 数据项 itemStyle 的视觉优先级(4500)高于 visualMap(4000)，逐项 itemStyle.color 会覆盖映射结果。
    visualMap: {
      show: false,
      seriesIndex: 0,
      min: 0,
      max: 1,
    },
    grid: { top: 0, bottom: 0, left: 0, right: 0 },
    xAxis: { type: "category", data: DAY_LABELS, show: false },
    yAxis: { type: "category", data: [""], show: false },
    tooltip: {
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      padding: [8, 12],
      textStyle: { color: theme.tooltipText, fontSize: 12 },
      formatter: (p: { data: WeekCell }) => commonTooltipFormatter(theme, p.data),
    },
    series: [
      {
        type: "heatmap",
        data,
        emphasis: { focus: "none" },
        label: {
          show: true,
          // 格子内富文本标签：{样式名|内容} 语法，样式定义在下方 rich 中
          formatter: (p: { data: WeekCell }) => {
            const d = p.data;
            // 未来日期：只显示日期数字，用最弱的 future 样式
            if (d.isFuture) return `{numFuture|${d.dayNum}}`;
            // 两档文字：已签到（主色底）用白字系列，未签到格用自适应弱化字
            const dayStyle = d.signed ? "dayDark" : "dayLight";
            const numStyle = d.signed ? "numDark" : "numLight";
            // 两行：周几（小字）+ 日期数字（大字）
            const lines = [
              `{${dayStyle}|${d.dayName}}`,
              `{${numStyle}|${d.dayNum}}`,
            ];

            return lines.join("\n");
          },
          rich: {
            dayDark: {
              fontSize: 11,
              color: theme.textDark,
              lineHeight: 15,
              opacity: 0.7,
            },
            dayLight: { fontSize: 11, color: theme.textMuted, lineHeight: 15 },
            numDark: {
              fontSize: 18,
              fontWeight: 700,
              color: theme.textDark,
              lineHeight: 22,
            },
            numLight: {
              fontSize: 18,
              fontWeight: 700,
              color: theme.textPrimary,
              lineHeight: 22,
            },
            numFuture: {
              fontSize: 18,
              fontWeight: 700,
              color: theme.textFaint,
              lineHeight: 22,
            },
            todayDark: {
              fontSize: 10,
              color: theme.textDark,
              lineHeight: 15,
              opacity: 0.8,
            },
            todayLight: {
              fontSize: 10,
              color: theme.textTodayOnDark,
              lineHeight: 15,
            },
          },
        },
      },
    ],
  };
}

/**
 * @description 周视图：七格大卡（周一 ~ 周日），容器高度随宽度自适应。
 *              图表初始化 / 销毁 / resize 均由本组件自理
 */
export default function CheckInWeekHeatmap({
  theme,
  today,
  getValue,
}: {
  theme: HeatmapTheme;
  today: Date;
  getValue: (d: Date) => number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  // 初始化 + ResizeObserver（只在宽度变化时重算高度，避免高度回写造成死循环）
  useEffect(() => {
    if (!el.current) return;
    const c = echarts.getInstanceByDom(el.current) || echarts.init(el.current);
    chart.current = c;

    const syncHeight = () => {
      const w = el.current?.clientWidth || 0;
      if (w > 0) {
        el.current!.style.height =
          Math.max(60, Math.min(104, Math.round(w / 7))) + "px";
      }
    };

    let lastWidth = 0;
    const ro = new ResizeObserver(() => {
      const w = el.current?.clientWidth || 0;
      if (w === lastWidth) return; // 高度变化引起的回调直接跳过
      lastWidth = w;
      syncHeight();
      c.resize();
    });
    ro.observe(el.current);
    syncHeight();

    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  // 数据 / 主题变化 → 重建 option
  useEffect(() => {
    chart.current?.setOption(buildWeekOption({ theme, today, getValue }), true);
  }, [theme, today, getValue]);

  return <div ref={el} style={{ width: "100%" }} />;
}
