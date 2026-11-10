"use client";

import Link from "next/link";
import { Alert, Button, Card, Space, Spin, Tag, Typography } from "antd";
import { ArrowRightOutlined, ReloadOutlined } from "@ant-design/icons";

/**
 * @description 首页下部最近题目卡片：由父组件传入取数结果，本组件只负责渲染
 *              （recent 为 null 且无 error 表示加载中；空数组表示题库暂无题目）
 */

// 最近题目列表项（与 ProblemList 的列表项字段一致）
export type ProblemListItem = {
  id: string | number;
  dataset_name?: string | null;
  title?: string | null;
  difficulty?: string | null;
};

const DIFFICULTY_COLORS: Record<string, string> = {
  简单: "green",
  中等: "orange",
  困难: "red",
};

/**
 * @description 最近题目卡片的组件属性
 * @param recent 最近题目列表：null 表示仍在加载；[] 表示题库暂无题目
 * @param error 加载失败的错误信息（非空时展示错误提示与重试按钮）
 * @param onRetry 用户点击重试的回调（由父组件重新拉取数据）
 * @param maxCount 最多展示的条目数（截取列表前 N 条），默认 3
 */
type RecentProblemsProps = {
  recent: ProblemListItem[] | null;
  error: string | null;
  onRetry: () => void;
  maxCount?: number;
};

/**
 * @description 渲染最近题目列表：加载中 / 加载失败 / 空列表 / 题目条目四种状态；
 *              条目最多展示 maxCount 条，默认前三条
 */
export default function RecentProblems({
  recent,
  error,
  onRetry,
  maxCount = 3,
}: RecentProblemsProps) {
  return (
    <Card
      title="最近题目"
      extra={
        <Link href="/CodeAgent?tab=problems">
          全部题目 <ArrowRightOutlined />
        </Link>
      }
    >
      {recent === null && !error ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : error ? (
        <Alert
          type="error"
          showIcon
          title="加载失败"
          description={error}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
              重试
            </Button>
          }
        />
      ) : recent!.length === 0 ? (
        <Typography.Text type="secondary">题库暂无题目</Typography.Text>
      ) : (
        <Space orientation="vertical" size={8} style={{ width: "100%" }}>
          {recent!.slice(0, maxCount).map((item) => (
            <Link
              key={item.id}
              href={`/CodeAgent/practice?id=${item.id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-700 dark:hover:border-blue-500 dark:hover:bg-blue-950"
            >
              <Space wrap size={8}>
                <span className="font-medium">
                  {item.title || `题目 #${item.id}`}
                </span>
                {item.difficulty && DIFFICULTY_COLORS[item.difficulty] ? (
                  <Tag
                    color={DIFFICULTY_COLORS[item.difficulty]}
                    style={{ marginInlineEnd: 0 }}
                  >
                    {item.difficulty}
                  </Tag>
                ) : null}
              </Space>
              <Typography.Text type="secondary">
                {item.dataset_name ?? ""}
              </Typography.Text>
            </Link>
          ))}
        </Space>
      )}
    </Card>
  );
}
