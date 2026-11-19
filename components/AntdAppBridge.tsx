"use client";

import { useEffect } from "react";
import { App } from "antd";
import { getAntdApp, setAntdApp } from "@/lib/antd-app";

/**
 * @description 根级 <App> 的桥：挂载时把 App.useApp() 实例写入模块单例，
 *              并安装全局 401 拦截（window.fetch 包装，会话过期统一软提示）。
 *              必须渲染在 <App> 内部，否则 useApp 拿不到 context 化的 message
 */

let interceptorInstalled = false;

/** @description 401 提示去重：2 秒内多个并发请求只弹一次 */
let last401ToastAt = 0;

/**
 * @description 排除登录 / 会话接口：登录失败（输错密码）、未登录轮询 me
 *              也会返回 401，这些场景页面已有自己的处理，不能弹「请先登录」
 */
function isAuthEndpoint(url: string): boolean {
  try {
    return new URL(url, window.location.origin).pathname.startsWith("/api/auth/");
  } catch {
    return false;
  }
}

function notifyUnauthorized(): void {
  const now = Date.now();
  if (now - last401ToastAt < 2000) return;
  last401ToastAt = now;
  // 实例由本组件挂载时写入单例，正常情况下必能取到
  getAntdApp()?.message?.warning("请先登录后再操作");
}

export default function AntdAppBridge() {
  const app = App.useApp();

  useEffect(() => {
    setAntdApp(app);
    return () => setAntdApp(null);
  }, [app]);

  useEffect(() => {
    if (interceptorInstalled) return;
    interceptorInstalled = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      const input = args[0];
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input?.url ?? "";
      if (res.status === 401 && !isAuthEndpoint(url)) notifyUnauthorized();
      return res;
    };
  }, []);

  return null;
}
