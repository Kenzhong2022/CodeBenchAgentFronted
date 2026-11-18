"use client";

import PageLayout from "@/components/PageLayout";
import ProblemList from "@/components/ProblemList";

// CodeAgent 练习入口：题库列表（原 ?tab=problems，统一迁移为子路由）
export default function CodeAgentProblemsPage() {
  return (
    <PageLayout>
      <ProblemList />
    </PageLayout>
  );
}
