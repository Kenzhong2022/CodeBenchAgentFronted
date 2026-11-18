"use client";

import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import ProblemList from "@/components/ProblemList";

// 题目管理页（后台管理中心）：通过游标分页接口逐页浏览题库并增删改查
export default function ProblemsPage() {
  return (
    <PageLayout>
      <ProblemList />
    </PageLayout>
  );
}
