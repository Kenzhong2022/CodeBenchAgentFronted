import type { ReactNode } from "react";

/**
 * @description 禁用态图标：红色 + 全局 .slash-overlay 斜线（见 globals.css），
 *              包在 @ant-design/icons 图标外层使用，表示「摄像头关闭」等开关的关闭态；
 *              图标自带斜线的（如 AudioMutedOutlined）不要套用，会出双斜线
 */
export default function DisabledIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="slash-overlay relative inline-flex"
      style={{ color: "#ef4444" }}
    >
      {children}
    </span>
  );
}
