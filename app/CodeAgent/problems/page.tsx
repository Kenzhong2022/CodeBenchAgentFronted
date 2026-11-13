"use client";

import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import ProblemList from "@/components/ProblemList";

// CodeAgent 练习入口：题库列表（原 ?tab=problems，统一迁移为子路由）
export default function CodeAgentProblemsPage() {
  return (
    <PageLayout
      header={
        <PageHeader
          title="选择题目"
          description="从题库中选择题目进入在线练习。"
        />
      }
    >
      <ProblemList
        itemHref={(item) => `/CodeAgent/practice?id=${item.id}`}
        actionLabel="开始练习"
      />
    </PageLayout>
  );
}
