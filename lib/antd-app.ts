/**
 * @description App.useApp() 实例的模块级桥：由 <AntdAppBridge> 在挂载时写入，
 *              让非 React 模块（如 fetch 拦截器）也能拿到与当前主题一致的 message 实例
 */
import type { useAppProps } from "antd/es/app/context";

let appInstance: useAppProps | null = null;

export function setAntdApp(instance: useAppProps | null): void {
  appInstance = instance;
}

export function getAntdApp(): useAppProps | null {
  return appInstance;
}
