"use client";

import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import ProblemList from "@/components/ProblemList";

// 题目列表页：通过游标分页接口逐页浏览题库
export default function ProblemsPage() {
  return (
    <PageLayout
      header={<PageHeader />}
      contentClassName="bg-(--ant-color-bg-container)"
    >
      <ProblemList />
    </PageLayout>
  );
}
