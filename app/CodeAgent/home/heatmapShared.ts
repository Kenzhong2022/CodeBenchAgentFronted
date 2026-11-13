import * as echarts from "echarts/core";
import { HeatmapChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { HeatmapTheme } from "./heatmapTheme";

// 按需注册 ECharts 能力（模块级执行一次，重复调用幂等；周 / 月组件共享）
echarts.use([
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

// ================= 工具 =================
const pad = (n: number) => String(n).padStart(2, "0");

/** @description 日期 → `YYYY-MM-DD` 字符串（模拟数据查表 / 格子 date 字段用） */
export const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** @description 由"今天"推算当月信息：天数、月初偏移（周一 = 0）、需要几行周 */
export function getMonthInfo(today: Date) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7; // 周一 = 0
  const weekCount = Math.ceil((offset + daysInMonth) / 7);
  return { year, month, daysInMonth, offset, weekCount };
}

/**
 * @description 颜色向白色插值，模拟 CSS brightness()，用于格子 hover 提亮
 */
function lighten(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export const DAY_LABELS = [
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
  "周日",
];

/** @description 周 / 月视图共用的周几缩写 */
export const DAY_SHORT = ["一", "二", "三", "四", "五", "六", "日"];

// ================= 格子样式 =================
interface CellStyle {
  itemStyle: {
    color?: string;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
  };
  emphasis: {
    itemStyle: { color?: string; borderColor?: string; borderWidth?: number };
  };
}

/**
 * @description 构造格子公共样式：itemStyle.color 为背景色，
 *              emphasis.itemStyle.color 为 hover 提亮后的背景色；
 *              缝隙用 borderWidth + panelBg 描边模拟
 */
export function makeCellStyle(
  theme: HeatmapTheme,
  color: string,
  gap: number,
  radius: number,
): CellStyle {
  return {
    /** 格子样式 */
    itemStyle: {
      color,
      borderRadius: radius,
      borderWidth: gap,
      borderColor: theme.panelBg,
    },
    /** 格子悬停样式 */
    emphasis: {
      itemStyle: {
        color: color,
        borderColor: theme.panelBg,
      },
    },
  };
}

// ================= option 数据单元类型 =================
export interface BaseCell {
  value: [number, number, number];
  date: string;
  isToday: boolean;
  isFuture: boolean;
  signed: boolean;
}

export interface WeekCell extends BaseCell {
  dayName: string;
  dayNum: number;
}

export interface MonthCell extends BaseCell {
  dayNum: number;
  label: { color: string; fontWeight: number };
}

export interface PlaceholderCell extends CellStyle {
  value: [number, number, number];
  isPlaceholder: true;
}

export type MonthCellData = MonthCell | PlaceholderCell;

/**
 * @description 周 / 月视图共用的 tooltip 内容：未来 → 未到，未签到 → 未签到，
 *              已签到 → 强调色"已签到"，今天追加" · 今天"后缀
 */
export function commonTooltipFormatter(theme: HeatmapTheme, d: BaseCell) {
  if (d.isFuture)
    return `${d.date}<br/><span style="color:${theme.tooltipMuted}">未到</span>`;
  const tag = d.isToday ? " · 今天" : "";
  if (!d.signed)
    return `${d.date}${tag}<br/><span style="color:${theme.tooltipMuted}">未签到</span>`;
  return `${d.date}${tag}<br/><span style="color:${theme.tooltipAccent}">已签到</span>`;
}
