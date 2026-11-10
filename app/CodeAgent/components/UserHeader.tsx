"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, Space, Typography } from "antd";
import { RocketOutlined } from "@ant-design/icons";
import ExperienceAvatar from "./ExperienceAvatar";

const XP_INIT = 356;
const XP_MAX = 1000;
const XP_STEP_MAX = 3;

/**
 * @description 用户信息头部卡片：经验环头像（rAF 模拟经验增长）+ 用户名、等级经验
 *              与个人中心入口；作为右侧侧栏的第一个头部组件
 */
export default function UserHeader() {
  const [exp, setExp] = useState(XP_INIT);
  const expRef = useRef(exp);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let cur = expRef.current;
    const FRAME_MS = 1000 / 60;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      last = now;
      cur = Math.min(XP_MAX, cur + 1 + Math.floor(Math.random() * XP_STEP_MAX));
      setExp(cur);
      if (cur >= XP_MAX) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const level = Math.min(Math.floor(exp / 100) + 1, XP_MAX / 100);

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl p-4"
      style={{ background: "var(--ant-color-bg-container)" }}
    >
      <ExperienceAvatar raw={exp} rawMax={XP_MAX} size={160} />
      <Typography.Title
        level={4}
        style={{ color: "var(--ant-color-text)", margin: 0 }}
      >
        用户名称：张三
      </Typography.Title>
      <Typography.Paragraph
        style={{
          color: "var(--ant-color-text-description)",
          fontSize: 12,
          margin: 0,
        }}
      >
        Level {level} {exp}/{XP_MAX}
      </Typography.Paragraph>
      <Space size={24}>
        <Link href="/CodeAgent?tab=problems">
          <Button type="primary" ghost icon={<RocketOutlined />}>
            个人中心
          </Button>
        </Link>
      </Space>
    </div>
  );
}
