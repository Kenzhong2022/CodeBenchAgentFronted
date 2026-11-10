"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";

/**
 * @description ECharts 实例生命周期统一入口：容器挂载后惰性初始化，
 *              option 变化时整体替换配置（notMerge），容器尺寸变化时通过
 *              ResizeObserver 自动 resize，组件卸载时销毁实例。
 *              业务组件只负责产出 option 对象，不再自行管理实例
 * @param option 图表配置对象（建议用 useMemo 缓存，避免每次渲染触发重绘）
 * @returns 图表容器 ref，由调用方挂到实际容器元素上
 */
export function useECharts(option: echarts.EChartsCoreOption) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);

  // option 变化：初始化（惰性）→ 整体替换配置 → 跟踪容器尺寸变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    instanceRef.current ??= echarts.init(container);
    const chart = instanceRef.current;
    chart.setOption(option, true);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [option]);

  // 组件卸载时销毁实例（独立 effect，避免 option 变化误触发）
  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return containerRef;
}
