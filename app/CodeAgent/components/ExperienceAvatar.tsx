"use client";

import { useMemo } from "react";
import * as echarts from "echarts/core";
import { TooltipComponent } from "echarts/components";
import { PieChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { useECharts } from "@/lib/useECharts";

// 按需注册本组件用到的 ECharts 能力（模块级执行一次，重复调用幂等）
echarts.use([PieChart, TooltipComponent, CanvasRenderer]);

// 每级所需经验值：等级 = floor(经验 / 100) + 1，最高为 rawMax / 100 级
const LEVEL_STEP = 100;

// 内半径占比：ECharts 圆环与中心头像直径共用此值，保证同源
const INNER_RATIO = 0.64;
const OUTER_RATIO = 0.82;

// 进度环渐变色（未满级）
const PROGRESS_GRADIENT = [
  { offset: 0, color: "#22d3ee" },
  { offset: 0.5, color: "#60a5fa" },
  { offset: 1, color: "#a855f7" },
];
// 满级金色渐变
const FULL_GRADIENT = [
  { offset: 0, color: "#fde047" },
  { offset: 1, color: "#f59e0b" },
];

/**
 * @description 构建经验环圆环的 ECharts 配置（纯函数，便于复用与测试）
 * @param raw 当前经验值
 * @param rawMax 经验上限
 */
function buildDonutOption(
  raw: number,
  rawMax: number,
): echarts.EChartsCoreOption {
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));
  const pct = clamp((raw / rawMax) * 100, 0, 100);
  const isFull = pct >= 100 - 1e-9;
  const gradient = isFull ? FULL_GRADIENT : PROGRESS_GRADIENT;
  const pctText = (Math.round(pct * 10) / 10).toFixed(1);
  const level = Math.min(
    Math.floor(raw / LEVEL_STEP) + 1,
    Math.floor(rawMax / LEVEL_STEP),
  );

  return {
    backgroundColor: "transparent",
    // 内置 tooltip：hover 圆环扇区时展示等级、经验值与进度
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15,23,42,.94)",
      borderColor: "#334155",
      textStyle: { color: "#e2e8f0" },
      formatter: () =>
        [
          `<div>等级：Lv.${level}${isFull ? "（MAX）" : ""}</div>`,
          `<div>经验值：${raw} / ${rawMax}</div>`,
          `<div>进度：${pctText}%</div>`,
        ].join(""),
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
              color: new echarts.graphic.LinearGradient(0, 0, 1, 1, gradient),
              borderRadius: isFull ? 0 : 10,
            },
          },
          {
            value: 100 - pct,
            itemStyle: {
              color: "#1e293b",
              borderRadius: 100 - pct >= 100 ? 0 : 10,
            },
          },
        ],
      },
    ],
  };
}

/**
 * @description 经验环头像组件：ECharts 圆环进度条（useECharts 统一管理实例）+
 *              中心头像撑满内圈，百分比文字叠在头像底部；满级时进度变金色并显示 MAX 文案。
 *              hover 通过 antd Tooltip 展示等级、经验值与进度
 * @param raw 当前经验值
 * @param rawMax 经验上限
 * @param src 头像图片地址（默认取 public 下的默认头像 /wcr.jpeg）
 * @param size 组件边长（正方形），默认 160
 */
export default function ExperienceAvatar({
  raw,
  rawMax,
  src = "/wcr.jpeg",
  size = 160,
}: {
  raw: number;
  rawMax: number;
  src?: string;
  size?: number;
}) {
  // option 用 useMemo 缓存，经验值变化时才重新构建并触发重绘
  const option = useMemo(() => buildDonutOption(raw, rawMax), [raw, rawMax]);
  // 实例创建 / resize / 销毁由 useECharts 统一管理
  const chartRef = useECharts(option);

  const pct = Math.max(0, Math.min(100, (raw / rawMax) * 100));
  const isFull = pct >= 100 - 1e-9;
  const pctText = (Math.round(pct * 10) / 10).toFixed(1);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* 圆环进度条 */}
      <div ref={chartRef} style={{ width: "100%", height: "100%" }} />

      {/* 中心头像：直径等于内圈直径，圆形裁切 */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `${INNER_RATIO * 85}%`,
          aspectRatio: "1",
          borderRadius: "50%",
          overflow: "hidden",
          pointerEvents: "none",
          background: isFull
            ? "radial-gradient(circle at 50% 35%, #3b2f0b, #1c1503 80%)"
            : "radial-gradient(circle at 50% 35%, #1e293b, #0b1120 80%)",
          boxShadow: isFull
            ? "inset 0 0 0 3px rgba(251, 191, 36, .85)"
            : "none",
        }}
      >
        {/* 头像层：铺满内圈并裁切，默认取 public 下的 wcr.jpeg */}
        <img
          src={src}
          alt="头像"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />

        {/* 百分比文字：叠在头像底部 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: `${size * 0.1}px 10px ${size * 0.05}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            textAlign: "center",
            background:
              "linear-gradient(to top, rgba(2,6,23,.88) 0%, rgba(2,6,23,.55) 45%, rgba(2,6,23,0) 100%)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: size * 0.075,
              fontWeight: 700,
              lineHeight: 1,
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              color: isFull ? "#fde047" : "#f8fafc",
              textShadow: "0 1px 6px rgba(0,0,0,.55)",
            }}
          >
            {pctText}%
          </div>
          <div
            style={{
              fontSize: size * 0.038,
              color: isFull ? "#fbbf24" : "#cbd5e1",
              textShadow: "0 1px 4px rgba(0,0,0,.55)",
            }}
          >
            {isFull ? "MAX · 已满级" : `${raw} / ${rawMax}`}
          </div>
        </div>
      </div>
    </div>
  );
}
