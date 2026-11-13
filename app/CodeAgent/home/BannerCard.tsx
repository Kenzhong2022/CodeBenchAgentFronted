"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, Space, Typography, theme } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";

const XP_INIT = 356;
const XP_MAX = 1000;
const XP_STEP_MAX = 3;

export default function BannerCard() {
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
    <div className="h-full relative flex items-center gap-2 overflow-hidden rounded-xl p-4 text-white">
      {/* 1. 视频 */}
      <video
        className="absolute inset-0 h-full w-full object-fill"
        src="/videos/CodeAgent/home/banner_coder.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />

      {/* 2. 遮罩：从左到右压暗，左边文字区域最暗，右侧保留视频画面 */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/75 via-black/40 to-black/10" />

      {/* 3. 文字层：去掉 mixBlendMode，用白字 + 阴影 */}
      <div className="relative z-10 min-w-0 flex-1 p-2">
        <Typography.Title
          level={1}
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#fff",
            marginTop: 0,
            textShadow: "0 2px 10px rgba(0,0,0,.55), 0 1px 2px rgba(0,0,0,.7)",
          }}
        >
          Ready for more?
        </Typography.Title>

        <Typography.Paragraph
          style={{
            color: "rgba(255,255,255,.88)",
            fontSize: 30,
            maxWidth: 560,
            textShadow: "0 1px 6px rgba(0,0,0,.5)",
          }}
        >
          Pick up the next task on your path and earn more XP
        </Typography.Paragraph>

        <Space size={12}>
          <Link href="/">
            <Button type="primary" icon={<PlayCircleOutlined />} size="large">
              Start Learning
            </Button>
          </Link>
        </Space>
      </div>
    </div>
  );
}
