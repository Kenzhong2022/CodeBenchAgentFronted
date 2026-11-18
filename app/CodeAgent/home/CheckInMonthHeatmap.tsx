"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import type { HeatmapTheme } from "./heatmapTheme";
import {
  commonTooltipFormatter,
  DAY_SHORT,
  fmtDate,
  getMonthInfo,
  makeCellStyle,
  type MonthCellData,
} from "./heatmapShared";

/**
 * @description 构造月视图 ECharts option：当月按周分行排列的月历格子，
 *              非本月位置放透明占位格，签到状态决定背景色与文字色
 */
function buildMonthOption({
  theme,
  today,
  getValue,
  monthInfo,
}: {
  theme: HeatmapTheme;
  today: Date;
  getValue: (d: Date) => number;
  monthInfo: ReturnType<typeof getMonthInfo>;
}): echarts.EChartsCoreOption {
  const { year, month, daysInMonth, offset, weekCount } = monthInfo;
  const weekLabels = Array.from(
    { length: weekCount },
    (_, i) => `第${i + 1}周`,
  );
  const data: MonthCellData[] = [];

  // 非本月占位格子（透明，不响应交互）
  for (let cell = 0; cell < weekCount * 7; cell++) {
    const dayOffset = cell - offset;
    if (dayOffset < 0 || dayOffset >= daysInMonth) {
      data.push({
        value: [cell % 7, Math.floor(cell / 7), -1],
        isPlaceholder: true,
        itemStyle: {
          color: "transparent",
          borderWidth: 0,
          borderColor: "transparent",
        },
        emphasis: {
          itemStyle: {
            color: "transparent",
            borderWidth: 0,
            borderColor: "transparent",
          },
        },
      });
    }
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    const cell = offset + day - 1;
    const x = cell % 7;
    const y = Math.floor(cell / 7);

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

    let textColor: string;
    if (isFuture) textColor = theme.textFaint;
    else if (!signed) textColor = theme.textMuted;
    else textColor = theme.textDark; // 主色底固定白字
    if (isToday && !isFuture) {
      textColor = signed ? theme.textTodayOnLight : theme.textTodayOnDark;
    }

    data.push({
      value: [x, y, v],
      date: fmtDate(d),
      dayNum: day,
      isToday,
      isFuture,
      signed,
      label: { color: textColor, fontWeight: isToday ? 700 : 600 },
      ...makeCellStyle(theme, color, theme.gapMonth, theme.radiusMonth),
    });
  }

  return {
    backgroundColor: "transparent",
    animationDuration: 500,
    // 同周视图：满足 heatmap 开发模式校验，颜色由逐项 itemStyle 覆盖
    visualMap: {
      show: false,
      seriesIndex: 0,
      min: 0,
      max: 1,
    },
    grid: { top: 28, bottom: 4, left: 4, right: 4 },
    xAxis: {
      type: "category",
      data: DAY_SHORT,
      position: "top",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: theme.axisLabelX, fontSize: 11, margin: 10 },
    },
    yAxis: {
      show: false,
      type: "category",
      data: weekLabels,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: theme.axisLabelY, fontSize: 10, margin: 10 },
    },
    tooltip: {
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      padding: [8, 12],
      textStyle: { color: theme.tooltipText, fontSize: 12 },
      formatter: (p: { data: MonthCellData }) => {
        if ("isPlaceholder" in p.data) return "";
        return commonTooltipFormatter(theme, p.data);
      },
    },
    /** 格子样式 */
    series: [
      {
        type: "heatmap",
        data,
        emphasis: { focus: "none" },
        label: {
          show: true,
          position: "inside",
          formatter: (p: { data: MonthCellData }) =>
            "isPlaceholder" in p.data ? "" : String(p.data.dayNum),
          fontSize: 11,
        },
      },
    ],
  };
}

/**
 * @description 月视图：月历热力（按周分行），容器高度 = 行数 × 行高 + 顶部轴 + 底部留白。
 *              图表初始化 / 销毁 / resize 均由本组件自理
 */
export default function CheckInMonthHeatmap({
  theme,
  today,
  getValue,
  monthInfo,
}: {
  theme: HeatmapTheme;
  today: Date;
  getValue: (d: Date) => number;
  monthInfo: ReturnType<typeof getMonthInfo>;
}) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  // 初始化 + ResizeObserver
  useEffect(() => {
    if (!el.current) return;
    // 高度已由 render 阶段的行内样式给定，此时 init 才能测到非零尺寸
    const c = echarts.getInstanceByDom(el.current) || echarts.init(el.current);
    chart.current = c;

    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current);

    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  // 数据 / 主题变化 → 重建 option
  useEffect(() => {
    if (!el.current) return;

    chart.current?.setOption(
      buildMonthOption({ theme, today, getValue, monthInfo }),
      true,
    );
  }, [theme, today, getValue, monthInfo]);

  return (
    <div
      ref={el}
      style={{
        width: "100%",
        // 月图高度 = 行数 × 行高 + 顶部周几轴(28) + 底部留白(4)；
        // 必须在 render 阶段就给定高度，否则 echarts.init 会因高度为 0 拒绝测量
        height: monthInfo.weekCount * theme.monthRowHeight + 28 + 4,
      }}
    />
  );
}
