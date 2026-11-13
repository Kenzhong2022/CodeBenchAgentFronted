"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageLayout from "@/components/PageLayout";
import HomeContainer from "./home/HomeContainer";
import ProblemList from "@/components/ProblemList";

// 由侧边栏子菜单的 tab 参数决定显示首页还是题库列表
function CodeAgentSection() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  if (tab === "problems") {
    return (
      <ProblemList
        itemHref={(item) => `/CodeAgent/practice?id=${item.id}`}
        actionLabel="开始练习"
      />
    );
  }
  return <HomeContainer />;
}

// CodeAgent 页面：按 tab 参数分发首页 / 练习两个子模块
export default function CodeAgentPage() {
  return (
    <PageLayout>
      <Suspense fallback={null}>
        <CodeAgentSection />
      </Suspense>
    </PageLayout>
  );
}
