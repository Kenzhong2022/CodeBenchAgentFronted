"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageLayout from "@/components/PageLayout";

// UI Kit 基于 Web Components / WebRTC，必须在浏览器端加载，关闭 SSR
const MeetingRoom = dynamic(() => import("./MeetingRoom"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-(--ant-color-text-tertiary)">
      正在加载会议组件…
    </div>
  ),
});

/**
 * @description 1v1 视频 / 语音会议页：Suspense 是 useSearchParams 在预渲染阶段的
 *              必要边界；房间号由 MeetingRoom 写入地址栏以便分享
 */
export default function MeetingPage() {
  return (
    <PageLayout card={false}>
      <div className="h-full min-h-0">
        <Suspense fallback={null}>
          <MeetingRoom roomCode={useSearchParams().get("room")} />
        </Suspense>
      </div>
    </PageLayout>
  );
}
