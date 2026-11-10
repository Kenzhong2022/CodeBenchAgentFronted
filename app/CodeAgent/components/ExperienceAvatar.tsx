"use client";

import ProgressRing, { type RingColorStop } from "./ProgressRing";

// 每级所需经验值：等级 = floor(经验 / 100) + 1，最高为 rawMax / 100 级
const LEVEL_STEP = 100;

/**
 * @description 构造 echarts 线性渐变的纯对象形式（等价 new echarts.graphic.LinearGradient），
 *              从左上到右下过渡，弧段上呈现渐进色效果
 */
function gradient(from: string, to: string): RingColorStop["color"] {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 1,
    y2: 1,
    colorStops: [
      { offset: 0, color: from },
      { offset: 1, color: to },
    ],
  };
}

// 经验环分段渐变配色：低进度黄、中段橙、高进度绿，可整体替换
const XP_COLORS: RingColorStop[] = [
  { until: 30, color: gradient("#fde047", "#eab308") }, // <30% 黄
  { until: 60, color: gradient("#fb923c", "#ea580c") }, // <60% 橙
  { until: Infinity, color: gradient("#4ade80", "#16a34a") }, // ≥60% 绿
];

// 满 100% 时的金黄渐变（亮金 → 深金）
const XP_FULL_COLOR = gradient("#fde047", "#f59e0b");

/**
 * @description 经验环头像：复用 ProgressRing 圆环，中央插槽放头像图片，
 *              百分比文字叠在头像底部；满级时进度变金色并显示 MAX 文案。
 *              hover 通过 ECharts tooltip 展示等级、经验值与进度
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
  const pct = Math.max(0, Math.min(100, (raw / rawMax) * 100));
  const isFull = pct >= 100 - 1e-9;
  const pctText = (Math.round(pct * 10) / 10).toFixed(1);
  const level = Math.min(
    Math.floor(raw / LEVEL_STEP) + 1,
    Math.floor(rawMax / LEVEL_STEP),
  );

  return (
    <ProgressRing
      value={raw}
      max={rawMax}
      size={size}
      // 分段渐变配色 + 满级金黄渐变（不随 ProgressRing 默认断点色变化）
      colors={XP_COLORS}
      fullColor={XP_FULL_COLOR}
      tooltipLines={[
        `<div>等级：Lv.${level}${isFull ? "（MAX）" : ""}</div>`,
        `<div>经验值：${raw} / ${rawMax}</div>`,
        `<div>进度：${pctText}%</div>`,
      ]}
    >
      {/* 中央头像：占插槽的 85%，圆形裁切 */}
      <div
        style={{
          width: "85%",
          height: "85%",
          borderRadius: "50%",
          overflow: "hidden",
          position: "relative",
          background: isFull
            ? "radial-gradient(circle at 50% 35%, #3b2f0b, #1c1503 80%)"
            : "radial-gradient(circle at 50% 35%, #1e293b, #0b1120 80%)",
          boxShadow: isFull ? "inset 0 0 0 3px rgba(251, 191, 36, .85)" : "none",
        }}
      >
        {/* 头像层：铺满并裁切，默认取 public 下的 wcr.jpeg */}
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
            padding: `${size * 0.085}px 8px ${size * 0.04}px`,
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
    </ProgressRing>
  );
}
