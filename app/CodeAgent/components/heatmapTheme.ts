import type { GlobalToken } from "antd";

/**
 * @description 打卡热力图主题：所有颜色 / 尺寸集中在此定义为单一数据源，
 *              ECharts option 与组件外壳共用同一份对象，改一个字段两处同步。
 *              颜色默认从 antd 主题 token 派生（buildDefaultTheme），
 *              跟随 ConfigProvider 的亮 / 暗算法自动切换；
 *              调用方通过 <CheckInHeatmap theme={{ accent: '#f59e0b' }} /> 浅覆盖任意字段
 */
export interface HeatmapTheme {
  // ---- 主色 ----
  /** 强调色（统计数字、标题条渐变起点），默认取 colorPrimary */
  accent: string;
  /** 强调副色（标题条 / 切换按钮渐变终点），默认取 geekblue 预设色 */
  accentSecondary: string;
  /** 图表面板底色，也是格子缝隙色，默认取 colorBgLayout */
  panelBg: string;
  // ---- 状态色 ----
  /** 未签到，默认取 colorFillTertiary */
  colorEmpty: string;
  /** 未来日期，默认取 colorFillQuaternary（比未签到更弱） */
  colorFuture: string;
  /** 已签到格子颜色，默认取 colorPrimary */
  colorSigned: string;

  // ---- 文字色 ----
  /** 普通格子文字，默认取 colorText */
  textPrimary: string;
  /** 次级文字（周几标签等），默认取 colorTextSecondary */
  textSecondary: string;
  /** 弱化文字，默认取 colorTextTertiary */
  textMuted: string;
  /** 最弱文字（未来日期数字），默认取 colorTextQuaternary */
  textFaint: string;
  /** 强调色格子（亮底）上的文字，默认取 colorTextLightSolid */
  textDark: string;
  /** 今天（亮底格子上的强调字），默认取 colorWhite */
  textTodayOnLight: string;
  /** 今天（普通格子上的强调字），默认取 colorPrimaryText */
  textTodayOnDark: string;

  // ---- 坐标轴 ----
  axisLabelX: string;
  axisLabelY: string;

  // ---- Tooltip ----
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipAccent: string;
  tooltipMuted: string;

  // ---- 卡片外壳 ----
  cardBg: string;
  cardBorder: string;
  divider: string;

  // ---- 尺寸（与主题算法无关，保持固定）----
  /** 周视图格子间隙（borderWidth） */
  gapWeek: number;
  /** 月视图格子间隙 */
  gapMonth: number;
  radiusWeek: number;
  radiusMonth: number;
  /** 月历每行格子高度 */
  monthRowHeight: number;
  /** hover 提亮强度 0~1 */
  lightenAmount: number;
}

/**
 * @description 从 antd 全局 token 派生默认主题。token 是亮 / 暗算法解析后的实际色值
 *              （ECharts canvas 无法解析 var()，必须传实值而非 CSS 变量）
 */
export function buildDefaultTheme(token: GlobalToken): HeatmapTheme {
  return {
    accent: token.colorPrimary,
    accentSecondary: token.geekblue,
    panelBg: token.colorBgLayout,

    colorEmpty: token.colorFillTertiary,
    colorFuture: token.colorFillQuaternary,
    colorSigned: token.colorPrimary,

    textPrimary: token.colorText,
    textSecondary: token.colorTextSecondary,
    textMuted: token.colorTextTertiary,
    textFaint: token.colorTextQuaternary,
    textDark: token.colorTextLightSolid,
    textTodayOnLight: token.colorWhite,
    textTodayOnDark: token.colorPrimaryText,

    axisLabelX: token.colorTextSecondary,
    axisLabelY: token.colorTextTertiary,

    tooltipBg: token.colorBgElevated,
    tooltipBorder: token.colorBorderSecondary,
    tooltipText: token.colorText,
    tooltipAccent: token.colorPrimary,
    tooltipMuted: token.colorTextTertiary,

    cardBg: token.colorBgContainer,
    cardBorder: token.colorBorderSecondary,
    divider: token.colorSplit,

    gapWeek: 6,
    gapMonth: 4,
    radiusWeek: 12,
    radiusMonth: 8,
    monthRowHeight: 46,
    lightenAmount: 0.3,
  };
}

/**
 * @description 浅合并主题：未传 override 时返回 base 同一引用，保证 useMemo 依赖稳定
 */
export function mergeTheme(
  base: HeatmapTheme,
  override?: Partial<HeatmapTheme>,
): HeatmapTheme {
  if (!override) return base;
  return { ...base, ...override };
}
