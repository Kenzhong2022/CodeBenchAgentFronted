"use client";

import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import SubmissionManager from "./components/SubmissionManager";

/**
 * 提交管理（后台）：本模块唯一的提交管理页面，SubmissionManager 就近维护在
 * components/ 下；通过 GET /api/submissions 拉取全部用户的提交记录（不带 mine 过滤），
 * 支持按评测状态 / 题目标题 / 提交时间筛选，以及记录的增删改维护
 */
export default function AdminSubmissionsPage() {
  return (
    <PageLayout header={<PageHeader />}>
      <SubmissionManager />
    </PageLayout>
  );
}
