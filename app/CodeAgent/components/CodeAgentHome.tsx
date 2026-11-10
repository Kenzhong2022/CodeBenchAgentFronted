"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Space, Typography, theme } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";
import HeroBanner from "./HeroBanner";
import DifficultyEntries from "./DifficultyEntries";
import RecentProblems, { type ProblemListItem } from "./RecentProblems";
import UserHeader from "./UserHeader";

/**
 * @description CodeAgent 首页容器：负责拉取最近题目数据，按左右布局渲染——
 *              左侧主内容（上 HeroBanner 横幅，中部「行动号召 / 最近题目 / 难度入口」三栏），
 *              右侧预留侧栏区域，后续填充实际内容
 */
export default function CodeAgentHome() {
  const { token } = theme.useToken();
  const [recent, setRecent] = useState<ProblemListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // 拉取最新一批题目，传给下部最近题目卡片
  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch("/api/problems/cursor?limit=6")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "加载题目失败");
        return body as { items: ProblemListItem[] };
      })
      .then((body) => {
        if (!cancelled) setRecent(body.items);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setRecent([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  return (
    /* 外层布局框架：左侧主内容占满剩余宽度，右侧预留侧栏 */
    <div className="flex gap-6 h-full">
      {/* 左：主内容区 */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* 上：欢迎横幅 */}
        <HeroBanner />
        {/* 中：行动号召文案 + 最近题目 + 难度入口（三栏布局） */}
        <div className="flex gap-6 flex-1">
          {/* 中右：最近题目（flex-1 占满剩余宽度，min-w-0 防止内容撑破容器） */}
          <div className="flex-1 min-w-0">
            <RecentProblems
              recent={recent}
              error={error}
              onRetry={() => setReloadTick((t) => t + 1)}
            />
          </div>
          {/* 中右：最近题目（flex-1 占满剩余宽度，min-w-0 防止内容撑破容器） */}
          <div className="flex-1 min-w-0">
            <DifficultyEntries />
          </div>
        </div>
      </div>
      {/* 右：侧栏，用户头部卡片在最上方，其后为难度入口 */}
      <div className="w-[320px] shrink-0 flex flex-col gap-6">
        <UserHeader />
        <DifficultyEntries />
      </div>
    </div>
  );
}
