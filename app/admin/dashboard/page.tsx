"use client";

import { Card, Empty } from "antd";
import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";

/**
 * 后台仪表盘（占位页）：具体内容与数据结构尚未定义，
 * 待需求明确后替换为实际模块
 */
export default function AdminDashboardPage() {
  return (
    <PageLayout
      header={
        <PageHeader title="仪表盘" description="后台运营数据总览（规划中）。" />
      }
    >
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="仪表盘模块规划中，待明确内容与数据结构后开发"
        />
      </Card>
    </PageLayout>
  );
}
