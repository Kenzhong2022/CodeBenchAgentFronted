"use client";

import type { ReactNode } from "react";
import { ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { useThemeMode } from "./useThemeMode";

// DatePicker 等日期组件的月/星期文案与周起始日来自 dayjs，需与 ConfigProvider 一并设为中文
dayjs.locale("zh-cn");

// 全局 antd 中文文案 + 布局配置；主题算法跟随 useThemeMode（亮/暗/跟随系统）
export default function AntdConfigProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { dark } = useThemeMode();
  const algorithm = dark ? theme.darkAlgorithm : theme.defaultAlgorithm;
  // ConfigProvider 内部无法用 useToken 读到自身算法的 token（hook 在它外面，
  // 只能拿到默认亮色算法的值，暗色模式不会跟随），用 getDesignToken 按当前算法静态计算
  const baseToken = theme.getDesignToken({ algorithm });
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm,
        // colorLink 是 antd 全局 <a> 重置样式（:where(.css-x) a { color: var(--ant-color-link) }）
        // 的唯一颜色来源，在此改源头即可覆盖所有链接默认色，无需逐处打样式补丁
        token: {
          colorLink: baseToken.colorBgTextActive,
          colorLinkHover: baseToken.colorBgTextActive,
        },
        components: {
          Layout: {
            // 顶栏高度显式声明为 64，不依赖组件默认值；TopNav 与 Suspense fallback 共用
            headerHeight: 64,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
