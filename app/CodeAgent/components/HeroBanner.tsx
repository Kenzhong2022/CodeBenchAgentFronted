"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, Space, Typography, theme } from "antd";
import { RocketOutlined, PlayCircleOutlined } from "@ant-design/icons";
import ExperienceAvatar from "./ExperienceAvatar";
import ProgressRing from "./ProgressRing";

const SUBMIT_COUNT = 50;
const PASS_COUNT = 42;

const XP_INIT = 356;
const XP_MAX = 1000;
const XP_STEP_MAX = 3;

/**
 * @description 首页上部欢迎横幅：左侧经验环头像，右侧标题、简介与入口按钮；
 *              背景色取自 antd 主题 token（colorBgSpotlight），切换暗色算法时自动适配
 */
export default function HeroBanner() {
  const { token } = theme.useToken();

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
      className="flex items-center gap-2 rounded-xl p-4 text-white"
      style={{ background: "var(--ant-layout-header-bg)" }}
    >
      <div className="flex-1 min-w-0 p-2">
        <Typography.Title
          level={2}
          style={{ color: token.colorPrimaryText, marginTop: 0 }}
        >
          Ready for more?
        </Typography.Title>
        <Typography.Paragraph
          style={{
            color: "contrast-color(var(--ant-layout-header-bg))",
            fontSize: 16,
            maxWidth: 560,
          }}
        >
          Pick up the next task on your path and earn more XP
        </Typography.Paragraph>
        <Space size={12}>
          <Link href="/">
            <Button type="primary" icon={<PlayCircleOutlined />}>
              Start Learning
            </Button>
          </Link>
        </Space>
      </div>

      <ProgressRing
        value={PASS_COUNT}
        max={SUBMIT_COUNT}
        size={160}
        tooltipLines={[
          `<div>提交：${SUBMIT_COUNT} 次</div>`,
          `<div>通过：${PASS_COUNT} 次</div>`,
          `<div>通过率：${((PASS_COUNT / SUBMIT_COUNT) * 100).toFixed(1)}%</div>`,
        ]}
      >
        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              color: "#f8fafc",
              textShadow: "0 1px 6px rgba(0,0,0,.55)",
            }}
          >
            {((PASS_COUNT / SUBMIT_COUNT) * 100).toFixed(1)}%
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#cbd5e1",
              textShadow: "0 1px 4px rgba(0,0,0,.55)",
            }}
          >
            {PASS_COUNT} / {SUBMIT_COUNT}
          </div>
        </div>
      </ProgressRing>
    </div>
  );
}
