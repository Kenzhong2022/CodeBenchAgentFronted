"use client";

import { Card, theme, Typography } from "antd";
import PageLayout from "@/components/PageLayout";

// 颜色分组清单：按用途归类，key 与 antd token 变量名一致
const COLOR_GROUPS: { title: string; tokens: string[] }[] = [
  {
    title: "品牌主色 Primary",
    tokens: [
      "colorPrimary",
      "colorPrimaryBg",
      "colorPrimaryBgHover",
      "colorPrimaryBorder",
      "colorPrimaryBorderHover",
      "colorPrimaryHover",
      "colorPrimaryActive",
      "colorPrimaryText",
      "colorPrimaryTextHover",
      "colorPrimaryTextActive",
    ],
  },
  {
    title: "成功色 Success",
    tokens: [
      "colorSuccess",
      "colorSuccessBg",
      "colorSuccessBgHover",
      "colorSuccessBorder",
      "colorSuccessBorderHover",
      "colorSuccessHover",
      "colorSuccessActive",
      "colorSuccessText",
      "colorSuccessTextHover",
      "colorSuccessTextActive",
    ],
  },
  {
    title: "警戒色 Warning",
    tokens: [
      "colorWarning",
      "colorWarningBg",
      "colorWarningBgHover",
      "colorWarningBorder",
      "colorWarningBorderHover",
      "colorWarningHover",
      "colorWarningActive",
      "colorWarningText",
      "colorWarningTextHover",
      "colorWarningTextActive",
    ],
  },
  {
    title: "错误色 Error",
    tokens: [
      "colorError",
      "colorErrorBg",
      "colorErrorBgHover",
      "colorErrorBgFilledHover",
      "colorErrorBgActive",
      "colorErrorBorder",
      "colorErrorBorderHover",
      "colorErrorHover",
      "colorErrorActive",
      "colorErrorText",
      "colorErrorTextHover",
      "colorErrorTextActive",
    ],
  },
  {
    title: "信息色 Info",
    tokens: [
      "colorInfo",
      "colorInfoBg",
      "colorInfoBgHover",
      "colorInfoBorder",
      "colorInfoBorderHover",
      "colorInfoHover",
      "colorInfoActive",
      "colorInfoText",
      "colorInfoTextHover",
      "colorInfoTextActive",
    ],
  },
  {
    title: "超链接色 Link",
    tokens: ["colorLink", "colorLinkHover", "colorLinkActive"],
  },
  {
    title: "背景色 Background",
    tokens: [
      "colorBgLayout",
      "colorBgContainer",
      "colorBgElevated",
      "colorBgSpotlight",
      "colorBgBlur",
      "colorBgSolid",
      "colorBgSolidHover",
      "colorBgSolidActive",
      "colorBgMask",
      "colorBgContainerDisabled",
    ],
  },
  {
    title: "文本色 Text",
    tokens: [
      "colorText",
      "colorTextSecondary",
      "colorTextTertiary",
      "colorTextQuaternary",
      "colorTextHeading",
      "colorTextLabel",
      "colorTextDescription",
      "colorTextPlaceholder",
      "colorTextDisabled",
      "colorTextLightSolid",
      "colorTextBase",
      "colorWhite",
    ],
  },
  {
    title: "边框色 Border",
    tokens: [
      "colorBorder",
      "colorBorderSecondary",
      "colorBorderDisabled",
      "colorBorderBg",
      "colorSplit",
    ],
  },
  {
    title: "填充色 Fill",
    tokens: [
      "colorFill",
      "colorFillSecondary",
      "colorFillTertiary",
      "colorFillQuaternary",
      "colorFillContent",
      "colorFillContentHover",
      "colorFillAlter",
      "colorBgTextHover",
      "colorBgTextActive",
    ],
  },
  {
    title: "图标与控件交互色 Icon / Control",
    tokens: [
      "colorIcon",
      "colorIconHover",
      "colorHighlight",
      "colorOutline",
      "controlOutline",
      "controlTmpOutline",
      "controlItemBgHover",
      "controlItemBgActive",
      "controlItemBgActiveHover",
      "controlItemBgActiveDisabled",
      "colorWarningOutline",
      "colorErrorOutline",
      "colorWarningAffix",
      "colorErrorAffix",
    ],
  },
  {
    title: "预设色板 Preset Colors",
    tokens: [
      "volcano",
      "gold",
      "orange",
      "yellow",
      "lime",
      "green",
      "cyan",
      "blue",
      "geekblue",
      "purple",
      "magenta",
      "pink",
    ],
  },
];

/**
 * @description 色系预览页：按分组列举 antd 主题中全部颜色 token，
 *              上方色块为颜色预览（跟随当前主题算法），下方展示变量名
 */
export default function ColorsPage() {
  const { token } = theme.useToken();
  // token 的键是有限集合，此处用字符串键做动态取值，值统一按颜色字符串处理
  const colorTokenMap = token as unknown as Record<string, string>;

  return (
    <PageLayout
      title="色系"
      description="antd 主题全部颜色 token 预览，颜色随当前主题算法（亮色 / 暗色 / 紧凑）自动变化"
    >
      <div className="flex flex-col gap-4">
        {COLOR_GROUPS.map((group) => (
          <Card key={group.title} title={group.title} size="small">
            <div className="flex flex-wrap gap-4">
              {group.tokens.map((tokenKey) => (
                <div key={tokenKey} className="w-[120px]">
                  {/* 颜色预览：背景即该 token 的当前取值 */}
                  <div
                    className="h-12 rounded-md"
                    style={{
                      background: colorTokenMap[tokenKey],
                      border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  />
                  {/* 变量名展示在颜色下方 */}
                  <Typography.Text
                    code
                    className="mt-1 block text-center"
                    style={{ fontSize: 12, wordBreak: "break-all" }}
                  >
                    {tokenKey}
                  </Typography.Text>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
