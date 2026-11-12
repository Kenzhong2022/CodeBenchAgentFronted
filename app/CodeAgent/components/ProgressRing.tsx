"use client";

import { useMemo, type ReactNode } from "react";
import { theme as antdTheme, type GlobalToken } from "antd";
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

/**
 * @description 单个颜色断点：进度达到 until（%，不含）之前使用该颜色。
 *              color 支持纯色字符串，或 echarts 渐变对象
 *              （如 new echarts.graphic.LinearGradient(...)）
 */
export type RingColorStop = { until: number; color: string | object };

/**
 * @description 默认断点配色：token 驱动的三段式（红 / 橙 / 绿），
 *              颜色跟随亮 / 暗算法；可被 colors prop 整体覆盖
 */
function defaultColors(token: GlobalToken): RingColorStop[] {
  return [
    { until: 30, color: token.colorError }, // <30% 红
    { until: 60, color: token.colorWarning }, // <60% 橙
    { until: Infinity, color: token.colorSuccess }, // ≥60% 绿
  ];
}

/**
 * @description 构建圆环的 ECharts 配置（纯函数，便于复用与测试）
 * @param value 当前值
 * @param max 上限
 * @param colors 颜色断点（按 until 升序；pct 命中第一个 pct < until 的断点，
 *               全部未命中时取最后一个断点——调用方未配兜底断点时生效）
 * @param fullColor 进度 100% 时的颜色，缺省用命中的断点色
 * @param trackColor 未完成轨道色
 * @param tooltipLines hover 扇区时展示的 HTML 行
 * @param gradient true 时断点切换用渐变过渡（前一断点色 → 当前断点色）
 */
function buildRingOption(
  value: number,
  max: number,
  colors: RingColorStop[],
  fullColor: RingColorStop["color"] | undefined,
  trackColor: string,
  tooltipLines: string[],
  gradient: boolean,
): echarts.EChartsCoreOption {
  const clamp = (v: number, min: number, m: number) =>
    Math.max(min, Math.min(m, v));
  // max 为 0（无数据）时 0/0 = NaN，直接视为 0% 进度
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  const isFull = pct >= 100 - 1e-9;

  // 断点解析：升序排列后取第一个 pct < until 的断点，兜底取最后一个
  const stops = [...colors].sort((a, b) => a.until - b.until);
  const hitIndex = stops.findIndex((s) => pct < s.until);
  const stopIndex = hitIndex === -1 ? stops.length - 1 : hitIndex;
  const current = stops[stopIndex].color;

  // 颜色解析：满环优先 fullColor；gradient 开启时用 Linear 渐变
  // 在「前一断点色 → 当前断点色」之间平滑过渡，避免跨断点时颜色跳变
  let color: RingColorStop["color"] = current;
  if (isFull && fullColor !== undefined) {
    color = fullColor;
  } else if (gradient) {
    const previous = stops[stopIndex - 1]?.color ?? current;
    color = new echarts.graphic.LinearGradient(0, 0, 1, 0, [
      { offset: 0, color: previous as string },
      { offset: 1, color: current as string },
    ]);
  }

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
 * @param colors 颜色断点配置，默认 token 驱动的三段：<30% 红 / <60% 橙 / ≥60% 绿
 * @param fullColor 进度 100% 时的颜色，默认用命中的断点色
 * @param trackColor 未完成轨道色，缺省取 antd token colorFill
 * @param gradient 断点切换是否用渐变过渡，默认 false（硬切）
 */
export default function ProgressRing({
  value,
  max,
  size = 100,
  children,
  tooltipLines = [],
  colors,
  fullColor,
  trackColor,
  gradient = false,
}: {
  value: number;
  max: number;
  size?: number;
  children?: ReactNode;
  tooltipLines?: string[];
  colors?: RingColorStop[];
  fullColor?: RingColorStop["color"];
  /** 未完成轨道色，缺省取 antd token colorFill（跟随亮 / 暗算法） */
  trackColor?: string;
  /** true 时断点切换用渐变过渡（前一断点色 → 当前断点色） */
  gradient?: boolean;
}) {
  // 未传 trackColor 时用主题 token colorFill 兜底，跟随亮 / 暗算法自动切换
  const { token } = antdTheme.useToken();
  const resolvedTrackColor = trackColor ?? token.colorFill;
  // 未传 colors 时用 token 红橙绿断点；token / colors 引用变化才重建
  const resolvedColors = useMemo(
    () => colors ?? defaultColors(token),
    [colors, token],
  );
  // option 用 useMemo 缓存，依赖变化时才重新构建并触发重绘
  const option = useMemo(
    () =>
      buildRingOption(
        value,
        max,
        resolvedColors,
        fullColor,
        resolvedTrackColor,
        tooltipLines,
        gradient,
      ),
    [value, max, resolvedColors, fullColor, resolvedTrackColor, tooltipLines, gradient],
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
