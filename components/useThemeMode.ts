"use client";

import { useCallback, useEffect, useState } from "react";

/** 主题模式：亮色 / 暗色 / 跟随系统 */
export type ThemeMode = "light" | "dark" | "system";

const KEY = "cb_theme";
const EVENT = "cb-theme-change";
const DARK_MQ = "(prefers-color-scheme: dark)";

export function getThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function setThemeMode(mode: ThemeMode): void {
  window.localStorage.setItem(KEY, mode);
  // 同页其他 hook 实例（跨标签页用 storage 事件即可，不另处理）
  window.dispatchEvent(new Event(EVENT));
}

/** 该模式当前是否应渲染暗色 */
function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia(DARK_MQ).matches;
}

/**
 * 主题模式 hook：返回当前模式、解析出的暗色状态与切换函数。
 * 同时把结果同步到 <html> 的类上，驱动 globals.css 的 CSS 变量：
 * - 强制暗色：html.dark
 * - 强制亮色：html.cb-light（用于在系统暗色时锁定亮色）
 * - 跟随系统：两个类都不加，走 prefers-color-scheme 媒体查询
 */
export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [dark, setDark] = useState(false);

  const refresh = useCallback(() => {
    const m = getThemeMode();
    setModeState(m);
    setDark(resolveDark(m));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    const mq = window.matchMedia(DARK_MQ);
    mq.addEventListener("change", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      mq.removeEventListener("change", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark" || (mode === "system" && dark));
    root.classList.toggle("cb-light", mode === "light");
  }, [mode, dark]);

  const setMode = useCallback((m: ThemeMode) => setThemeMode(m), []);

  return { mode, dark, setMode };
}
