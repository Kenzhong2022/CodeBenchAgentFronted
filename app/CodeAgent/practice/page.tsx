"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Divider, Spin, Typography, Tooltip, theme } from "antd";
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
function TokenLink({ href, children }: { href: string; children: ReactNode }) {
  const { token } = theme.useToken();
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      className="inline-flex items-center p-2 text-[13px] "
      style={{
        color: token.colorText,
        backgroundColor: hovered ? token.colorBgTextHover : "transparent",
      }}
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
  const problemId = id ? Number(id) : null;

  // 头部导航：返回列表 / 上一题 / 下一题；链接始终可点，连续切换由
  // effect 的 cancelled 标记丢弃过期响应，不会产生结果错乱。
  // 可用项用 TokenLink（token 配色 + hover 反馈），越界 / 无 id 时渲染
  // 灰色占位（不可点），两者宽度形态一致不跳动
  const navDisabledStyle = {
    color: token.colorTextQuaternary,
    fontSize: 13,
    gap: 4,
  };
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
      <Tooltip title={problemId && problemId > 1 ? "上一题" : "无上一题"}>
        {problemId && problemId > 1 ? (
          <TokenLink href={`/CodeAgent/practice?id=${problemId - 1}`}>
            <LeftOutlined />
          </TokenLink>
        ) : (
          <div
            className="inline-flex items-center cursor-not-allowed"
            style={navDisabledStyle}
          >
            <LeftOutlined />
          </div>
        )}
      </Tooltip>
      <div
        className="w-px self-stretch transition-colors"
        style={{
          backgroundColor: navHovered ? token.colorBorderBg : "transparent",
        }}
      />
      <Tooltip title={problemId ? "下一题" : "无下一题"}>
        {problemId ? (
          <TokenLink href={`/CodeAgent/practice?id=${problemId + 1}`}>
            <RightOutlined />
          </TokenLink>
        ) : (
          <div
            className="inline-flex items-center cursor-not-allowed"
            style={navDisabledStyle}
          >
            <RightOutlined />
          </div>
        )}
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
            title={error ?? "未找到题目数据"}
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
      contentClassName="overflow-hidden rounded-tr-lg bg-(--ant-color-bg-container)"
      header={<PageHeader extra={navExtra} />}
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
