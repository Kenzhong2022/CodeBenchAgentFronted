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
    <Card title="难度级别">
      {/* 用 antd Listy（List 已废弃）渲染难度入口：styles.item 清零默认内边距
          与底部分隔线，间距与条目样式统一交给 .difficulty-entry */}
      <Listy
        rowHoverable={false}
        items={DIFFICULTY_ENTRIES}
        rowKey={(entry) => entry.label}
        styles={{ item: { padding: 0, borderBottom: "none" } }}
        itemRender={(entry) => (
          <Link
            href={`/CodeAgent/problems?difficulty=${entry.label}`}
            className="difficulty-entry"
          >
            {/* 难度名用 Tag，预设色由 TAG_COLOR_MAP 配置映射决定 */}
            <Tag color={TAG_COLOR_MAP[entry.label]}>{entry.label}</Tag>
            <Typography.Text className="entry-desc">
              {entry.description}
            </Typography.Text>
            <Typography.Text className="entry-arrow">
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
          border-bottom: 1px solid var(--ant-color-border);
        }

        /* 子元素默认色 + hover 联动：后代选择器 (0,2,0) 压过 antd 的 .ant-typography (0,1,0)，
           :hover 变体 (0,3,0) 再压过默认规则；箭头用 margin-left:auto 顶到行尾 */
        .difficulty-entry .entry-desc {
          color: var(--ant-color-text-description);
          font-size: var(--ant-font-size-sm);
        }
        .difficulty-entry .entry-arrow {
          color: var(--ant-color-text-description);
          margin-left: auto;
        }
        .difficulty-entry:hover {
          color: var(--ant-color-primary);
        }
        .difficulty-entry:hover .entry-desc,
        .difficulty-entry:hover .entry-arrow {
          color: var(--ant-color-primary);
        }
      `}</style>
    </Card>
  );
}
