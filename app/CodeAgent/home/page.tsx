"use client";

import PageLayout from "@/components/PageLayout";
import HomeContainer from "./HomeContainer";

// CodeAgent 首页：总览与快捷入口（原 ?tab=home，统一迁移为子路由）
export default function CodeAgentHomePage() {
  return (
    <PageLayout>
      <HomeContainer />
    </PageLayout>
  );
}
