"use client";

import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import SubmissionManager from "./components/SubmissionManager";

// 提交管理：用户提交代码、评测状态与 Agent 反馈的增删改查
export default function ManagePage() {
  return (
    <PageLayout>
      <SubmissionManager />
    </PageLayout>
  );
}
