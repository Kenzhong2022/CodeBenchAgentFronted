"use client";

import Link from "next/link";
import { Button, Space, Typography, theme } from "antd";
import { RocketOutlined, PlayCircleOutlined } from "@ant-design/icons";
import ExperienceAvatar from "./ExperienceAvatar";

/**
 * @description 首页上部欢迎横幅：左侧经验环头像，右侧标题、简介与入口按钮；
 *              背景色取自 antd 主题 token（colorBgSpotlight），切换暗色算法时自动适配
 */
export default function HeroBanner() {
  const { token } = theme.useToken();

  return (
    <div
      className="flex items-center gap-10 rounded-xl p-4 text-white"
      style={{ background: "var(--ant-layout-header-bg)" }}
    >
      {/* 左：经验环头像 */}
      <ExperienceAvatar raw={356} rawMax={1000} size={160} />

      {/* 右：标题、简介与入口按钮 */}
      <div className="flex-1">
        <Typography.Title level={4} style={{ color: "#fff", marginTop: 0 }}>
          用户名称：张三
        </Typography.Title>
        <Typography.Paragraph
          style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, maxWidth: 560 }}
        >
          Level 1 
          356/1000
        </Typography.Paragraph>
        <Space size={24}>
          <Link href="/CodeAgent?tab=problems">
            <Button type="primary" ghost icon={<RocketOutlined />}>
              个人中心
            </Button>
          </Link>
        </Space>
      </div>
    </div>
  );
}
