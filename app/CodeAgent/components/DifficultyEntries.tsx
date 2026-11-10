"use client";

import Link from "next/link";
import { Space, Typography } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";

// 难度入口清单：背景色与题库列表的难度 Tag 保持一致（简单绿 / 中等橙 / 困难红）
// 背景色用行内样式（style 优先级最高，可覆盖 antd 注入的未分层样式），
// 因此只能存真实 CSS 色值而非 Tailwind 类名；hover 变亮由 hover:brightness-110 滤镜承担
const DIFFICULTY_ENTRIES = [
  {
    label: "简单",
    description: "基础语法与简单逻辑题",
    color: "#22c55e", // green-500
  },
  {
    label: "中等",
    description: "常见算法与组合运用题",
    color: "#f97316", // orange-500
  },
  {
    label: "困难",
    description: "复杂算法与综合设计题",
    color: "#ef4444", // red-500
  },
];

/**
 * @description 首页中部难度入口：按简单 / 中等 / 困难三个难度跳转题库
 *              （difficulty 参数附加在地址上，供题库列表做难度筛选）
 */
export default function DifficultyEntries() {
  return (
    <div className="flex flex-col text-white p-2 rounded-lg bg-(--ant-layout-header-bg)">
      <Typography.Title
        level={5}
        style={{ color: "rgba(255,255,255,.9)", marginBottom: 16 }}
      >
        Difficulty
      </Typography.Title>
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        {DIFFICULTY_ENTRIES.map((entry) => (
          <Link
            key={entry.label}
            href={`/CodeAgent?tab=problems&difficulty=${entry.label}`}
            className={`link-reset flex items-center justify-between rounded-lg px-4 py-2 transition-all duration-200 hover:brightness-110 hover:drop-shadow-lg`}
            style={{ backgroundColor: entry.color }}
          >
            <Space size={8}>
              {/* 难度名做成半透明白色圆片，在实色背景上仍然清晰 */}
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-medium">
                {entry.label}
              </span>
              <Typography.Text style={{ color: "rgba(255,255,255,.9)" }}>
                {entry.description}
              </Typography.Text>
            </Space>
            <Typography.Text style={{ color: "rgba(255,255,255,.9)" }}>
              <ArrowRightOutlined />
            </Typography.Text>
          </Link>
        ))}
      </Space>
    </div>
  );
}
