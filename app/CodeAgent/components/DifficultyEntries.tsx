"use client";

import Link from "next/link";
import { Card, Listy, Space, Tag, Typography, theme } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";

// antd 的 TagProps["color"] 是 LiteralUnion（字面量补全但放行任意 string，
// 因为其还支持 "#ef4444" 这类自定义色值），预设名写错不会报编译错；
// 这里只接受状态色，自行收窄为严格联合类型，写错即报错
type DifficultyTagColor = "success" | "warning" | "error";

// 难度 → Tag 预设色的对象配置映射：新增难度时在此补充即可
const TAG_COLOR_MAP: Record<string, DifficultyTagColor> = {
  简单: "success",
  中等: "warning",
  困难: "error",
};

// 难度入口清单：背景色与题库列表的难度 Tag 保持一致（简单绿 / 中等橙 / 困难红）
// 背景色用行内样式（style 优先级最高，可覆盖 antd 注入的未分层样式），
// 因此只能存真实 CSS 色值而非 Tailwind 类名；hover 变亮由 .difficulty-entry 的 filter 承担
const DIFFICULTY_ENTRIES = [
  {
    label: "简单",
    description: "基础语法与简单",
    color: "#22c55e", // green-500
  },
  {
    label: "中等",
    description: "常见算法与组合",
    color: "#f97316", // orange-500
  },
  {
    label: "困难",
    description: "复杂算法与综合",
    color: "#ef4444", // red-500
  },
];

/**
 * @description 首页中部难度入口：按简单 / 中等 / 困难三个难度跳转题库
 *              （difficulty 参数附加在地址上，供题库列表做难度筛选）
 */
export default function DifficultyEntries() {
  const { token } = theme.useToken();
  return (
    <Card title="Difficulty">
      {/* 用 antd Listy（List 已废弃）渲染难度入口：styles.item 清零默认内边距
          与底部分隔线，间距与条目样式统一交给 .difficulty-entry */}
      <Listy
        rowHoverable={false}
        items={DIFFICULTY_ENTRIES}
        rowKey={(entry) => entry.label}
        styles={{ item: { padding: 0, borderBottom: "none" } }}
        itemRender={(entry) => (
          <Link
            href={`/CodeAgent?tab=problems&difficulty=${entry.label}`}
            // .link-reset 现在是 all: unset（压过 Tailwind 工具类），布局样式全部改由
            // .difficulty-entry 提供，取值统一来自 antd token（见下方 style jsx global）
            className="difficulty-entry"
            // 背景用真实色值；同时把该颜色挂为 CSS 变量，hover 光晕据此变色
            style={
              {
                backgroundColor: "var(--ant-btn-bg-color)",
                color: "var(--ant-color-text)",
                // hover 光晕依赖此变量（见下方 .difficulty-entry:hover）
                "--entry-color": entry.color,
              } as React.CSSProperties
            }
          >
            {/* 难度名用 Tag，预设色由 TAG_COLOR_MAP 配置映射决定 */}
            <Tag color={TAG_COLOR_MAP[entry.label]}>{entry.label}</Tag>
            <Typography.Text
              style={{
                color: "var(--ant-color-text-description)",
                fontSize: "var(--ant-font-size-sm)",
              }}
            >
              {entry.description}
            </Typography.Text>
            <Typography.Text
              style={{
                color: "var(--ant-color-text-description)",
                marginLeft: "auto",
              }}
            >
              <ArrowRightOutlined />
            </Typography.Text>
          </Link>
        )}
      />
      {/* 全局 class + token 插值：hover / 圆角 / 内边距 / 过渡都跟随主题（参照 TopNav 的写法） */}
      <style jsx global>{`
        .difficulty-entry {
          color: var(--ant-color-text);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2px;
          width: 100%;
          padding: ${token.paddingXS}px 0px;
          margin-bottom: ${token.paddingXS}px;
          border-radius: ${token.borderRadiusLG}px;
          text-decoration: none;
          cursor: pointer;
          transition: all ${token.motionDurationMid} ${token.motionEaseOut};
        }
        .difficulty-entry:hover {
          filter: brightness(1.1);
          /* 光晕颜色取自元素自身的 --entry-color（绿/橙/红各不相同），
             color-mix 掺入透明度模拟 token 的柔和阴影，随主题切换无需额外变量 */
          box-shadow: 0 6px 16px 0
            color-mix(in srgb, var(--entry-color) 45%, transparent);
          background-color: var(--ant-btn-bg-color);
        }
      `}</style>
    </Card>
  );
}
