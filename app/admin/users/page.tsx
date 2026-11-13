"use client";

import { useCallback, useEffect, useState } from "react";
import { Typography, message } from "antd";
import dayjs from "dayjs";
import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import AdminCrudTable, {
  type CrudFormField,
} from "@/components/AdminCrudTable";

/** 用户行：与 Python 端 /api/users 返回列一致 */
interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  last_login_at: string | null;
  created_at: string;
}

// 表单字段配置：创建时必填初始密码，编辑时留空表示不修改
const FORM_FIELDS: CrudFormField[] = [
  { name: "name", label: "用户名", required: true, placeholder: "登录展示名" },
  {
    name: "email",
    label: "邮箱",
    required: true,
    requiredMessage: "请输入邮箱",
    rules: [{ type: "email", message: "邮箱格式不正确" }],
    placeholder: "user@example.com",
  },
  {
    name: "password",
    label: "初始密码",
    required: true,
    type: "password",
    editOptional: true,
  },
  { name: "avatar", label: "头像地址", type: "text", placeholder: "https://…" },
];

// 用户管理页：数据与增删改全部走 /api/users（Next 转发 Python /api/users）
export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  /** @description 统一错误提取：转发层错误结构为 { error: string } */
  const request = useCallback(
    async (init: RequestInit & { url: string }) => {
      const { url, ...options } = init;
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (body as { error?: string } | null)?.error ?? "请求失败"
        );
      }
      return body;
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (keyword) params.set("keyword", keyword);
      const body = (await request({
        url: `/api/users?${params.toString()}`,
      })) as { items: AdminUser[]; total: number };
      setRows(body.items);
      setTotal(body.total);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载用户失败");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, request]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageLayout
      header={
        <PageHeader
          title="用户管理"
          description="查询、创建、编辑与删除用户账号；操作即时写入 accounts 表。"
        />
      }
    >
      <AdminCrudTable<AdminUser>
        columns={[
          {
            title: "用户名",
            dataIndex: "name",
            width: 160,
            render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
          },
          { title: "邮箱", dataIndex: "email", width: 240 },
          {
            title: "最后登录",
            dataIndex: "last_login_at",
            width: 180,
            render: (value: string | null) =>
              value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "—",
          },
          {
            title: "创建时间",
            dataIndex: "created_at",
            width: 180,
            render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
          },
        ]}
        dataSource={rows}
        loading={loading}
        total={total}
        current={page}
        pageSize={pageSize}
        onPageChange={(next, nextSize) => {
          setPage(next);
          setPageSize(nextSize);
        }}
        searchPlaceholder="按用户名 / 邮箱搜索"
        onSearch={(value) => {
          setKeyword(value);
          setPage(1);
        }}
        createLabel="新增用户"
        formFields={FORM_FIELDS}
        onCreate={async (values) => {
          await request({ url: "/api/users", method: "POST", body: JSON.stringify(values) });
          await load();
        }}
        onUpdate={async (record, values) => {
          await request({
            url: `/api/users/${record.id}`,
            method: "PATCH",
            body: JSON.stringify(values),
          });
          await load();
        }}
        onDelete={async (record) => {
          await request({ url: `/api/users/${record.id}`, method: "DELETE" });
          await load();
        }}
      />
    </PageLayout>
  );
}
