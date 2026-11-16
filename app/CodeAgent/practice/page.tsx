"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Spin, Typography, Tooltip, theme } from "antd";
import {
  LeftOutlined,
  RightOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import type { PreviewProblem } from "@/components/ProblemStatement";
import PracticeWorkbench from "./PracticeWorkbench";

/**
 * 主题 token 驱动的导航链接：默认 colorLink 文字，悬停切换为
 * colorLinkHover 文字 + colorBgTextHover 填充背景；
 * 内联样式写不了 :hover 伪类，用组件自身 hover 状态切换
 */
function TokenLink({
  href,
  disabled = false,
  children,
}: {
  href?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const { token } = theme.useToken();
  const [hovered, setHovered] = useState(false);
  const className = `inline-flex items-center p-2 text-[13px]${disabled ? " cursor-not-allowed" : ""}`;
  const style = {
    color: disabled ? token.colorTextQuaternary : token.colorText,
    backgroundColor:
      !disabled && hovered ? token.colorBgTextHover : "transparent",
  };

  // disabled 时渲染不可点的占位（宽度与可用态一致，工具栏不跳动）
  if (disabled || !href) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </Link>
  );
}

// CodeAgent 练习页主体：按 URL 中的 id 从题库接口拉取题目，展示与预览页一致的题面布局
function PracticeSection() {
  const searchParams = useSearchParams();
  const { token } = theme.useToken();
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
  // 头部导航条悬停态：移入时在三个按钮之间显示纵向分割线
  const [navHovered, setNavHovered] = useState(false);

  /** @description 当前题目的数字 id（用于上一题 / 下一题的边界判断） */
  const parsedId = id ? Number(id) : Number.NaN;
  const problemId = Number.isFinite(parsedId) ? parsedId : null;
  // 上一题 / 下一题的目标地址：undefined 表示不可用，标题、样式与跳转共用这份判断
  const prevHref =
    problemId !== null && problemId > 1
      ? `/CodeAgent/practice?id=${problemId - 1}`
      : undefined;
  const nextHref =
    problemId !== null ? `/CodeAgent/practice?id=${problemId + 1}` : undefined;

  // 头部导航：返回列表 / 上一题 / 下一题；链接始终可点，连续切换由
  // effect 的 cancelled 标记丢弃过期响应，不会产生结果错乱。
  // 越界 / 无 id 时 prevHref、nextHref 为 undefined，TokenLink 自动置为
  // disabled 占位（灰色不可点），宽度与可用态一致不跳动
  const navExtra = (
    <div
      style={{
        width: "fit-content",
        color: token.colorText,
        overflow: "hidden",
        backgroundColor: navHovered ? token.colorFillContent : "transparent",
      }}
      className={`rounded-lg overflow-hidden mb-2 cursor-pointer transition-colors flex items-center`}
      onMouseEnter={() => setNavHovered(true)}
      onMouseLeave={() => setNavHovered(false)}
    >
      <Tooltip title="返回题目列表">
        <TokenLink href="/CodeAgent/problems">
          <MenuUnfoldOutlined />
        </TokenLink>
      </Tooltip>
      {/* 纵向分割线：悬停时显现（Tailwind 类名需为字面量，动态拼接扫不到，故用 token 内联样式） */}
      <div
        className="w-px self-stretch transition-colors"
        style={{
          backgroundColor: navHovered ? token.colorBorderBg : "transparent",
        }}
      />
      <Tooltip title={prevHref ? "上一题" : "无上一题"}>
        <TokenLink href={prevHref} disabled={!prevHref}>
          <LeftOutlined />
        </TokenLink>
      </Tooltip>
      <div
        className="w-px self-stretch transition-colors"
        style={{
          backgroundColor: navHovered ? token.colorBorderBg : "transparent",
        }}
      />
      <Tooltip title={nextHref ? "下一题" : "无下一题"}>
        <TokenLink href={nextHref} disabled={!nextHref}>
          <RightOutlined />
        </TokenLink>
      </Tooltip>
    </div>
  );

  // 加载遮罩：半透明盖在当前内容上（工作台 / 错误提示），不卸载旧内容、避免切题闪烁
  const loadingOverlay = fetching ? (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
      style={{
        // 60% 透明度的主题容器色（color-mix 取代 CSS 变量 /60 写法）
        backgroundColor: `color-mix(in srgb, ${token.colorBgContainer} 60%, transparent)`,
      }}
    >
      <Spin size="large" />
      <Typography.Text type="secondary">正在加载题目…</Typography.Text>
    </div>
  ) : null;

  // 错误态的重试按钮（两个错误入口共用）
  const errorAction = (
    <Button size="small" onClick={() => setReloadTick((t) => t + 1)}>
      重试
    </Button>
  );

  useEffect(() => {
    // 每次拉取前先清掉旧错误，避免删 query / 重试时残留上一次的错误文案
    setError(null);

    if (!id) {
      setProblem(null);
      setFetching(false);
      return;
    }

    // 注意不把 problem 置回 undefined：已有旧题时保持显示，由遮罩提示加载中
    setFetching(true);
    // cancelled 标记：快速连切题目时丢弃过期响应，只有最后一次请求能写入状态
    let cancelled = false;
    // 超时兜底：接口挂起时自动中止，避免永远停在加载态
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    fetch(`/api/problems?id=${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const detail = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(
            detail?.error ?? `加载题目失败（HTTP ${res.status}）`,
          );
        }
        // 结构校验：必须是带 id 的对象（挡住数组 / { data: ... } 之类的包装）
        if (!detail || typeof detail !== "object" || !("id" in detail)) {
          throw new Error("接口返回的题目数据格式不正确");
        }
        setProblem(detail as PreviewProblem);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof DOMException && err.name === "AbortError"
            ? "加载超时，请重试"
            : err instanceof Error
              ? err.message
              : "加载题目失败";
        setError(message);
        setProblem(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [id, reloadTick]);

  return (
    <PageLayout
      // 工作台模式需要 overflow-hidden + rounded-tr-lg；错误 / 初次加载只需容器底色
      contentClassName={
        problem
          ? "overflow-hidden rounded-tr-lg bg-(--ant-color-bg-container)"
          : "bg-(--ant-color-bg-container)"
      }
      header={<PageHeader extra={navExtra} />}
    >
      {problem === undefined ? (
        // ① 首次进入：还没成功加载过任何题目，全屏 Spin
        <div className="flex justify-center py-24">
          <Spin />
        </div>
      ) : problem === null ? (
        // ② 无 id / 请求失败 / 未找到：错误提示 + 重试
        <div className="relative flex justify-center py-24">
          <Alert
            type="error"
            showIcon
            title={error ?? "未找到题目数据"}
            description="请从 CodeAgent 题库列表重新进入。"
            action={errorAction}
          />
          {loadingOverlay}
        </div>
      ) : (
        // ③ 已有题目：工作台；切题时保持旧题挂载，遮罩提示加载中
        <div className="relative h-full">
          <PracticeWorkbench key={problem.id} problem={problem} />
          {loadingOverlay}
        </div>
      )}
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
