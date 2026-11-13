"use client";

import { Card, Empty } from "antd";
import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";

/**
 * 用户管理（占位页）：具体内容与 accounts 表交互方式尚未定义，
 * 待需求明确后替换为实际模块
 */
export default function AdminUsersPage() {
  return (
    <PageLayout
      header={
        <PageHeader title="用户管理" description="账号信息管理（规划中）。" />
      }
    >
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="用户管理模块规划中，待明确内容与数据结构后开发"
        />
      </Card>
    </PageLayout>
  );
}
