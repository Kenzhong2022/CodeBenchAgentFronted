"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { App, ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import AntdAppBridge from "./AntdAppBridge";
import { useThemeMode } from "./useThemeMode";

dayjs.locale("zh-cn");

export default function AntdConfigProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { dark } = useThemeMode();
  const algorithm = dark ? theme.darkAlgorithm : theme.defaultAlgorithm;

  // 与 colorLink 共用同一份算法 token；useMemo 避免每次 render 重复计算
  const baseToken = useMemo(
    () => theme.getDesignToken({ algorithm }),
    [algorithm],
  );

  return (
    <>
      {/* 全局滚动条：颜色取自当前算法 token，亮/暗自动跟随 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            * {
              scrollbar-width: thin; /* Firefox */
              scrollbar-color: ${baseToken.colorFillSecondary} ${baseToken.colorFillQuaternary};
            }
            ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            ::-webkit-scrollbar-track {
              background: ${baseToken.colorFillQuaternary};
            }
            ::-webkit-scrollbar-thumb {
              background: ${baseToken.colorFillSecondary};
              border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb:hover {
              background: ${baseToken.colorFill};
            }
            ::-webkit-scrollbar-corner {
              background: ${baseToken.colorFillQuaternary};
            }
          `,
        }}
      />
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm,
          token: {
            colorLink: baseToken.colorBgTextActive,
            colorLinkHover: baseToken.colorBgTextActive,
          },
          components: {
            Layout: {
              headerHeight: 64,
            },
          },
        }}
      >
        {/* 根级 App：全站任何组件都能 App.useApp()，message 弹层跟随主题 */}
        <App>
          <AntdAppBridge />
          {children}
        </App>
      </ConfigProvider>
    </>
  );
}
