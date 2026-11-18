"use client";

import { useEffect, useRef } from "react";

// Turnstile 站点密钥（公开值，仅用于前端渲染组件，不涉及验证能力）
const SITE_KEY = "0x4AAAAAAGGlQTWbjhEZGFdF";

type TurnstileApi = {
  render: (el: HTMLElement, params: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __onTurnstileLoad?: () => void;
  }
}

/**
 * @description Cloudflare Turnstile 人机验证组件（显式渲染）：
 *              token 通过 onToken 上抛，验证过期 / 出错时置空；
 *              resetKey 变化时重置组件（令牌一次性消费，每次提交失败后需重取）
 * @param action 与后端 siteverify 约定的动作标识（login / register / send_code）
 * @param onToken token 变化回调；null 表示当前没有可用令牌
 * @param resetKey 变更触发组件重置（重新 challenge）
 */
export default function Turnstile({
  action,
  onToken,
  resetKey = 0,
}: {
  action: string;
  onToken: (token: string | null) => void;
  resetKey?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  // 同步最新回调到 ref：challenge 回调闭包始终调用最新 onToken
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  // 加载 / 渲染：脚本全局只注入一次，onload 回调渲染本组件实例
  useEffect(() => {
    let cancelled = false;
    const render = () => {
      if (cancelled || !containerRef.current || widgetIdRef.current !== null) {
        return;
      }
      widgetIdRef.current = window.turnstile!.render(containerRef.current, {
        sitekey: SITE_KEY,
        action,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      window.__onTurnstileLoad = render;
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__onTurnstileLoad";
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      onTokenRef.current(null);
    };
  }, [action]);

  // resetKey 变化（提交失败后）→ 重置组件重新获取令牌
  useEffect(() => {
    if (resetKey === 0 || widgetIdRef.current === null) return;
    window.turnstile?.reset(widgetIdRef.current);
    onTokenRef.current(null);
  }, [resetKey]);

  return <div ref={containerRef} />;
}
