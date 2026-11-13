"use client";

import { useState, type ReactNode } from "react";
import { Button, Space, Typography, theme } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

/**
 * @description 页面头部组件：由各页面自行组合进 PageLayout 的 header 插槽——
 *              传 backHref 时渲染「返回列表」按钮（替代标题），否则渲染标题；
 *              description 为标题下方的辅助说明（可省略）；
 *              extra 为「返回列表」右侧的自定义操作区（如上一题 / 下一题按钮），
 *              事件由父组件注册后经此传入，头部组件只负责展示
 */
export default function PageHeader({
  title,
  description,
  backHref,
  extra,
}: {
  title?: string;
  description?: string;
  backHref?: string;
  /** 「返回列表」右侧的自定义操作区（任意 ReactNode，通常是一组按钮） */
  extra?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="hover:bg-(--ant-button-link-hover-bg) rounded-md">
      {backHref ? (
        <Space size={8}>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(backHref)}
            style={{ paddingInline: 0, fontWeight: 600, fontSize: 18 }}
          >
            返回列表
          </Button>
          {extra}
        </Space>
      ) : (
        title && (
          <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            {title}
          </Typography.Title>
        )
      )}
      {description && (
        <Typography.Text type="secondary"> {description}</Typography.Text>
      )}
    </div>
  );
}
