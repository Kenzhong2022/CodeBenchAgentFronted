"use client";

import PageLayout from "@/components/PageLayout";
import AssistantContainer from "./AssistantContainer";

// CodeAgent 智能助手：对话式展示页（内容区可滚动，输入框固定在底部）
export default function CodeAgentAssistantPage() {
  return (
    <PageLayout contentClassName="overflow-hidden rounded-lg bg-(--ant-color-bg-container)">
      <AssistantContainer />
    </PageLayout>
  );
}
