"use client";

import { useMemo, type ReactNode } from "react";
import * as echarts from "echarts/core";
import { TooltipComponent } from "echarts/components";
import { PieChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { useECharts } from "@/lib/useECharts";

// 按需注册本组件用到的 ECharts 能力（模块级执行一次，重复调用幂等）
echarts.use([PieChart, TooltipComponent, CanvasRenderer]);

// 内半径占比：中央插槽（children）可用直径与圆环共用此值，保证同源
const INNER_RATIO = 0.64;
const OUTER_RATIO = 0.82;
// 未完成部分的默认轨道色
const DEFAULT_TRACK_COLOR = "#1e293b";

/**
 * @description 单个颜色断点：进度达到 until（%，不含）之前使用该颜色。
 *              color 支持纯色字符串，或 echarts 渐变对象
 *              （如 new echarts.graphic.LinearGradient(...)）
 */
export type RingColorStop = { until: number; color: string | object };

// 默认断点配色：三段式，低进度警示、高进度健康，可被 colors prop 整体覆盖
const DEFAULT_COLORS: RingColorStop[] = [
  { until: 30, color: "#fde047" }, // <30% 黄
  { until: 60, color: "#f97316" }, // <60% 橙
  { until: Infinity, color: "#22c55e" }, // ≥60% 绿
];

/**
 * @description 构建圆环的 ECharts 配置（纯函数，便于复用与测试）
 * @param value 当前值
 * @param max 上限
 * @param colors 颜色断点（按 until 升序；pct 命中第一个 pct < until 的断点，
 *               全部未命中时取最后一个断点——调用方未配兜底断点时生效）
 * @param fullColor 进度 100% 时的颜色，缺省用命中的断点色
 * @param trackColor 未完成轨道色
 * @param tooltipLines hover 扇区时展示的 HTML 行
 */
function buildRingOption(
  value: number,
  max: number,
  colors: RingColorStop[],
  fullColor: RingColorStop["color"] | undefined,
  trackColor: string,
  tooltipLines: string[],
): echarts.EChartsCoreOption {
  const clamp = (v: number, min: number, m: number) =>
    Math.max(min, Math.min(m, v));
  const pct = clamp((value / max) * 100, 0, 100);
  const isFull = pct >= 100 - 1e-9;

  // 断点解析：升序排列后取第一个 pct < until 的断点，兜底取最后一个
  const stops = [...colors].sort((a, b) => a.until - b.until);
  const stop = stops.find((s) => pct < s.until) ?? stops[stops.length - 1];
  const color = isFull && fullColor !== undefined ? fullColor : stop.color;

  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15,23,42,.94)",
      borderColor: "#334155",
      textStyle: { color: "#e2e8f0" },
      formatter: () => tooltipLines.join(""),
      // tooltip DOM 挂到 body：组件尺寸小且父容器常有 overflow 裁剪，
      // 默认渲染在图表容器内会被截断，挂到 body 后不受任何祖先容器限制
      appendTo: () => document.body,
    },
    series: [
      {
        type: "pie",
        radius: [`${INNER_RATIO * 100}%`, `${OUTER_RATIO * 100}%`],
        center: ["50%", "50%"],
        startAngle: 90,
        clockwise: true,
        animationDuration: 900,
        animationEasing: "cubicOut",
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: false },
        data: [
          {
            value: pct,
            itemStyle: {
              color,
              borderRadius: isFull ? 0 : 10,
            },
          },
          {
            value: 100 - pct,
            itemStyle: {
              color: trackColor,
              borderRadius: 100 - pct >= 100 ? 0 : 10,
            },
          },
        ],
      },
    ],
  };
}

/**
 * @description 通用圆环进度组件：ECharts 圆环 + 中央插槽，与内容解耦。
 *              中央内容由调用方通过 children 自由定制（头像、数字、文字均可），
 *              hover 圆环时通过 tooltip 展示 tooltipLines
 * @param value 当前值
 * @param max 上限
 * @param size 组件边长（正方形），默认 100
 * @param children 中央插槽内容（自动限制在内圈直径内并居中）
 * @param tooltipLines hover 展示的 HTML 行（每行一段 HTML 字符串）
 * @param colors 颜色断点配置，默认三段：<30% 黄 / <60% 橙 / ≥60% 绿
 * @param fullColor 进度 100% 时的颜色，默认用命中的断点色
 * @param trackColor 未完成轨道色，默认深灰蓝
 */
export default function ProgressRing({
  value,
  max,
  size = 100,
  children,
  tooltipLines = [],
  colors,
  fullColor,
  trackColor = DEFAULT_TRACK_COLOR,
}: {
  value: number;
  max: number;
  size?: number;
  children?: ReactNode;
  tooltipLines?: string[];
  colors?: RingColorStop[];
  fullColor?: RingColorStop["color"];
  trackColor?: string;
}) {
  // option 用 useMemo 缓存，依赖变化时才重新构建并触发重绘
  const option = useMemo(
    () =>
      buildRingOption(
        value,
        max,
        colors ?? DEFAULT_COLORS,
        fullColor,
        trackColor,
        tooltipLines,
      ),
    [value, max, colors, fullColor, trackColor, tooltipLines],
  );
  // 实例创建 / resize / 销毁由 useECharts 统一管理
  const chartRef = useECharts(option);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* 圆环进度条 */}
      <div ref={chartRef} style={{ width: "100%", height: "100%" }} />

      {/* 中央插槽：限制在内圈直径内居中，不挡 tooltip 交互 */}
      {children && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: `${INNER_RATIO * 100}%`,
            height: `${INNER_RATIO * 100}%`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
