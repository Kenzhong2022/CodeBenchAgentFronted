"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { Button, Space, Typography, theme } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";
import { fetchRows } from "@/lib/tableClient";
import BannerCard from "./BannerCard";
import DifficultyEntriesCard from "./DifficultyEntriesCard";
import RecentProblemsCard, { type ProblemListItem } from "./RecentProblemsCard";
import SubmissionStatsCard, { type SubmissionRow } from "./SubmissionStatsCard";
import UserProfileCard from "./UserProfileCard";
import CheckInHeatmapCard from "./CheckInHeatmapCard";

/**
 * @description CodeAgent 首页容器：负责拉取最近题目数据，按左右布局渲染——
 *              左侧主内容（上 BannerCard 横幅，中部「统计卡片 / 最近题目 / 难度入口」），
 *              右侧用户信息与打卡热力图侧栏
 */
export default function HomeContainer() {
  const { token } = theme.useToken();
  const [recent, setRecent] = useState<ProblemListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  /** @description 打卡数据源：YYYY-MM-DD → 当天提交次数；null 表示未加载完成（热力图先用内置模拟兜底） */
  const [checkInValues, setCheckInValues] = useState<Record<
    string,
    number
  > | null>(null);

  /** @description submissions 全量行：打卡热力图与统计卡片共用同一次拉取 */
  const [submissionRows, setSubmissionRows] = useState<SubmissionRow[] | null>(
    null,
  );

  /** @description 题库总题目数量：传给统计卡片的「通过数 / 总题目数」展示；null 表示未加载 */
  const [problemTotal, setProblemTotal] = useState<number | null>(null);

  // 轻量拉取题库总数：count_only=1 走 Supabase 精确计数，不拉题目内容
  useEffect(() => {
    let cancelled = false;
    fetch("/api/problems?count_only=1")
      .then((res) => res.json())
      .then((body: { count?: number }) => {
        if (!cancelled) setProblemTotal(body.count ?? null);
      })
      .catch((err: Error) => {
        console.error("[problems] 题目总数加载失败", err);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  // 拉取提交记录表：一份原始行同时供统计卡片与打卡热力图（按本地日期聚合提交次数）；
  // fetchRows 返回无类型的 TableRow，此处按子组件导出的 SubmissionRow 标记真实数据源
  useEffect(() => {
    let cancelled = false;
    fetchRows("submissions")
      .then((rows) => {
        if (cancelled) return;
        const typedRows = rows as SubmissionRow[];
        setSubmissionRows(typedRows);
        const byDay: Record<string, number> = {};
        for (const row of typedRows) {
          const key = dayjs(row.created_at).format("YYYY-MM-DD");
          byDay[key] = (byDay[key] ?? 0) + 1;
        }
        setCheckInValues(byDay);
      })
      .catch((err: Error) => {
        console.error("[checkin] 提交记录加载失败", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div className="flex gap-4 h-full overflow-hidden">
      {/* 左：主内容区 */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-auto">
        {/* 上：欢迎横幅 */}
        <div className="flex-1">
          <BannerCard />
        </div>
        {/* 统计组件：总提交数量 / 总通过题目数量 / 提交通过率（数据复用 submissions 拉取） */}
        <SubmissionStatsCard
          rows={submissionRows}
          totalProblems={problemTotal ?? undefined}
        />
        {/* 中：行动号召文案 + 最近题目 + 难度入口（三栏布局） */}
        <div className="flex gap-4 flex-1">
          {/* 中右：最近题目（flex-1 占满剩余宽度，min-w-0 防止内容撑破容器） */}
          <div className="flex-1 min-w-0">
            <RecentProblemsCard
              recent={recent}
              error={error}
              onRetry={() => setReloadTick((t) => t + 1)}
            />
          </div>
          {/* 中右：最近题目（flex-1 占满剩余宽度，min-w-0 防止内容撑破容器） */}
          <div className="flex-1 min-w-0">
            <DifficultyEntriesCard />
          </div>
        </div>
      </div>
      {/* 右：侧栏，用户头部卡片在最上方，其后为打卡热力图与难度入口 */}
      <div className="w-[320px] shrink-0 flex flex-col gap-4 overflow-auto">
        <UserProfileCard />
        {/* 打卡热力图：数据来自 submissions 表；未加载完成时组件内部用模拟数据占位 */}
        <CheckInHeatmapCard values={checkInValues ?? undefined} />
      </div>
    </div>
  );
}
