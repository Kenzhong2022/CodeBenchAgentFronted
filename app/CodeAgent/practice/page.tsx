"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Divider, Space, Spin, Typography, Tooltip } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import type { PreviewProblem } from "@/components/ProblemStatement";
import PracticeWorkbench from "./PracticeWorkbench";

// CodeAgent 练习页主体：按 URL 中的 id 从题库接口拉取题目，展示与预览页一致的题面布局
function PracticeSection() {
  const searchParams = useSearchParams();
  // 当前题目 id 完全由 URL 驱动：上一题 / 下一题是真实的 <a> 链接（?id=N），
  // 点击即路由切换，地址栏与实际题目始终一致，刷新 / 分享 / 中键新开均可
  const id = searchParams.get("id");
  // undefined 表示仍在请求中；null 表示未找到
  const [problem, setProblem] = useState<PreviewProblem | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  // 是否有题目请求在途：切题时工作台保持挂载显示旧题，仅盖遮罩提示；
  // problem === undefined 仅表示首次进入尚未加载过任何题目
  const [fetching, setFetching] = useState(false);

  /** @description 当前题目的数字 id（用于上一题 / 下一题的边界判断） */
  const problemId = id ? Number(id) : null;

  /**
   * @description 上一题 / 下一题链接样式：可用时渲染 <Link>（主题色 + hover 变色），
   *              越界或无 id 时渲染灰色占位 span（不可点），两者宽度形态一致不跳动
   */

  // 头部导航：上一题 / 下一题，Space 用竖分隔符隔开；链接始终可点，
  // 连续切换由 effect 的 cancelled 标记丢弃过期响应，不会产生结果错乱
  const navLinkClass =
    "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[13px] transition-colors hover:bg-(--ant-button-link-hover-bg) hover:text-(--ant-btn-text-color-hover)";
  const navDisabledClass =
    "inline-flex items-center gap-1 text-[13px] text-(--ant-color-text-quaternary) cursor-not-allowed";
  const navExtra = (
    <Space>
      <Tooltip title={problemId && problemId > 1 ? "上一题" : "无上一题"}>
        {problemId && problemId > 1 ? (
          <Link
            href={`/CodeAgent/practice?id=${problemId - 1}`}
            className={navLinkClass}
          >
            <LeftOutlined />
          </Link>
        ) : (
          <div className={navDisabledClass}>
            <LeftOutlined />
          </div>
        )}
      </Tooltip>

      <Tooltip title={problemId ? "下一题" : "无下一题"}>
        {problemId ? (
          <Link
            href={`/CodeAgent/practice?id=${problemId + 1}`}
            className={navLinkClass}
          >
            <RightOutlined />
          </Link>
        ) : (
          <div className={navDisabledClass}>
            <RightOutlined />
          </div>
        )}
      </Tooltip>
    </Space>
  );

  // 加载遮罩：半透明盖在当前内容上（工作台 / 错误提示），不卸载旧内容、避免切题闪烁
  const loadingOverlay = fetching ? (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-(--ant-color-bg-container)/60">
      <Spin size="large" />
      <Typography.Text type="secondary">正在加载题目…</Typography.Text>
    </div>
  ) : null;

  useEffect(() => {
    if (!id) {
      setProblem(null);
      setFetching(false);
      return;
    }
    setError(null);
    // 注意不把 problem 置回 undefined：已有旧题时保持显示，由遮罩提示加载中
    setFetching(true);
    // cancelled 标记：快速连切题目时丢弃过期响应，只有最后一次请求能写入状态
    let cancelled = false;
    fetch(`/api/problems?id=${encodeURIComponent(id)}`)
      .then(async (res) => {
        const detail = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(detail?.error ?? "加载题目失败");
        }
        setProblem(detail as PreviewProblem);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setProblem(null);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadTick]);

  if (problem === undefined) {
    return (
      <PageLayout
        header={
          <PageHeader
            title="在线练习"
            description="正在加载题目…"
            extra={navExtra}
          />
        }
      >
        <div className="flex justify-center py-24">
          <Spin />
        </div>
      </PageLayout>
    );
  }
  if (!problem) {
    return (
      <PageLayout
        header={
          <PageHeader
            title="在线练习"
            description="加载失败或题目不存在。"
            extra={navExtra}
          />
        }
      >
        <div className="relative">
          <Alert
            type="error"
            showIcon
            message={error ?? "未找到题目数据"}
            description="请从 CodeAgent 题库列表重新进入。"
            action={
              <Button size="small" onClick={() => setReloadTick((t) => t + 1)}>
                重试
              </Button>
            }
          />
          {loadingOverlay}
        </div>
      </PageLayout>
    );
  }
  return (
    <PageLayout
      // 工作台模式：内容区不随页面滚动（Splitter 内部各自滚动），高度填满标题区以下剩余空间
      contentClassName="overflow-hidden"
      header={
        <PageHeader backHref="/CodeAgent?tab=problems" extra={navExtra} />
      }
    >
      {/* 切题时工作台保持挂载显示旧题（key 未变不重建），请求在途由遮罩提示；
          新数据到达后 key 变化触发销毁重建，代码 / 输出 / 用例结果等状态自动归零 */}
      <div className="relative h-full">
        <PracticeWorkbench key={problem.id} problem={problem} />
        {loadingOverlay}
      </div>
    </PageLayout>
  );
}

// 练习页：按 URL 中的 id 从服务端题库接口拉取题目（useSearchParams 需要 Suspense 边界）
export default function CodeAgentPracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticeSection />
    </Suspense>
  );
}
