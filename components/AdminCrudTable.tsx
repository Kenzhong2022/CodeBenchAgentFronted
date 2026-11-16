"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  message,
} from "antd";
import type { TableProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";

/**
 * 弹窗表单字段配置：由父组件声明，组件按配置生成新增 / 编辑表单
 */
export interface CrudFormField {
  name: string;
  label: string;
  /** 新增时是否必填 */
  required?: boolean;
  type?: "text" | "password" | "textarea";
  placeholder?: string;
  /**
   * 编辑时该字段可留空：空值会从提交中剔除（父组件视为"不修改"），
   * 典型场景如创建时必填的初始密码、编辑时留空表示不重置
   */
  editOptional?: boolean;
  /** 覆盖默认校验文案 */
  requiredMessage?: string;
  /** 追加 antd Form 校验规则（如邮箱格式），与 required 规则叠加 */
  rules?: object[];
}

/**
 * 通用后台管理表格（受控组件）：
 * - 数据源与分页状态由父组件提供（dataSource / total / current / pageSize）
 * - 搜索、翻页、增删改等用户行为只回调父组件事件（onSearch / onPageChange / onCreate...），
 *   由父组件请求接口后更新数据源，组件自身不发起任何请求
 * - 表单弹窗由 formFields 配置生成；增删改回调 reject（抛错）时弹窗不关闭，
 *   由父组件在回调内部 message 提示错误原因
 */
export interface AdminCrudTableProps<T extends { id: string }> {
  /** 表格列定义（操作列由组件自动追加在最后） */
  columns: TableProps<T>["columns"];
  dataSource: T[] | null;
  loading?: boolean;
  /** 记录总数（服务端分页） */
  total: number;
  current: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  /** 搜索框占位文案；传入即渲染搜索框，回车 / 点击触发 onSearch */
  searchPlaceholder?: string;
  /** 关键字搜索（空字符串表示清空筛选） */
  onSearch: (keyword: string) => void;
  /** 工具栏右侧自定义筛选区（如状态下拉），随搜索框同行渲染 */
  toolbarExtra?: React.ReactNode;
  createLabel: string;
  formFields: CrudFormField[];
  onCreate: (values: Record<string, unknown>) => Promise<void>;
  onUpdate: (record: T, values: Record<string, unknown>) => Promise<void>;
  onDelete: (record: T) => Promise<void>;
}

export default function AdminCrudTable<T extends { id: string }>({
  columns,
  dataSource,
  loading = false,
  total,
  current,
  pageSize,
  onPageChange,
  searchPlaceholder,
  onSearch,
  toolbarExtra,
  createLabel,
  formFields,
  onCreate,
  onUpdate,
  onDelete,
}: AdminCrudTableProps<T>) {
  const [form] = Form.useForm();
  // editing 为 null 表示新增模式，非 null 为正在编辑的行；
  // modalOpen 与 editing 分离：新增时 editing 为 null 但弹窗仍需打开
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (record: T) => {
    setEditing(record);
    setModalOpen(true);
  };

  const close = () => {
    setModalOpen(false);
    setEditing(null);
  };

  // 表单值回填：等 Modal 内容挂载（Form 与 useForm 实例连接）后再写入，
  // 避免 setFieldsValue 在挂载前调用触发 useForm 未连接告警；
  // 新增模式则清空表单
  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      // 密码类字段不回填，留空表示不修改
      const fields: Record<string, unknown> = {};
      for (const field of formFields) {
        if (field.type !== "password") {
          fields[field.name] = (editing as Record<string, unknown>)[field.name];
        }
      }
      form.setFieldsValue(fields);
    } else {
      form.resetFields();
    }
  }, [modalOpen, editing, formFields, form]);

  /** 提交：编辑时空的 editOptional 字段剔除后交给父组件；失败保持弹窗打开 */
  const handleSubmit = async (raw: Record<string, unknown>) => {
    const values: Record<string, unknown> = { ...raw };
    if (editing) {
      for (const field of formFields) {
        const v = values[field.name];
        if (field.editOptional && (v === undefined || v === "")) {
          delete values[field.name];
        }
      }
    }
    setSaving(true);
    try {
      if (editing) {
        await onUpdate(editing, values);
        message.success("已保存");
      } else {
        await onCreate(values);
        message.success("已创建");
      }
      close();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: T) => {
    setDeletingId(record.id);
    try {
      await onDelete(record);
      message.success("已删除");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  // 操作列：编辑 / 删除，追加在父组件传入列的最后
  const actionColumn: TableProps<T>["columns"] = [
    {
      title: "操作",
      key: "__actions",
      width: 140,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            style={{ paddingInline: 4 }}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该条记录？"
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
            onConfirm={() => handleDelete(record)}
          >
            <Button
              type="link"
              size="small"
              danger
              style={{ paddingInline: 4 }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      {/* 工具栏：搜索 + 自定义筛选 + 新增按钮 */}
      <Space className="mb-4" wrap>
        {searchPlaceholder && (
          <Input.Search
            allowClear
            placeholder={searchPlaceholder}
            style={{ width: 280 }}
            onSearch={onSearch}
          />
        )}
        {toolbarExtra}
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {createLabel}
        </Button>
      </Space>

      <Table<T>
        rowKey="id"
        size="middle"
        columns={[...(columns ?? []), ...actionColumn]}
        dataSource={dataSource ?? []}
        loading={loading}
        scroll={{ x: true }}
        pagination={{
          current,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => `共 ${count} 条`,
          onChange: onPageChange,
        }}
      />

      {/* 新增 / 编辑弹窗：字段由 formFields 配置生成。
          不能用 forceRender：它会让 Dialog 在 SSR 阶段输出隐藏的
          .ant-modal-root DOM，与客户端 portal 渲染不一致导致水合失败；
          关闭状态（open=false）下 Modal 本身不渲染任何 DOM，同样安全。
          表单回填延迟到弹窗打开后的 effect 中执行（见上方 useEffect） */}
      <Modal
        title={editing ? "编辑" : createLabel}
        open={modalOpen}
        onCancel={close}
        footer={null}
        width={480}
      >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {formFields.map((field) => {
              // 编辑模式下 editOptional 字段取消必填（留空表示不修改该字段）
              const requiredActive = Boolean(
                field.required && !(editing && field.editOptional),
              );
              return (
                <Form.Item
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  rules={
                    requiredActive
                      ? [
                          {
                            required: true,
                            message:
                              field.requiredMessage ?? `请输入${field.label}`,
                          },
                          ...(field.rules ?? []),
                        ]
                      : (field.rules ?? [])
                  }
                >
                  {field.type === "password" ? (
                    <Input.Password
                      placeholder={
                        field.placeholder ??
                        (editing && field.editOptional
                          ? "留空表示不修改"
                          : undefined)
                      }
                      autoComplete="new-password"
                    />
                  ) : field.type === "textarea" ? (
                    <Input.TextArea
                      placeholder={field.placeholder}
                      autoSize={{ minRows: 2, maxRows: 6 }}
                    />
                  ) : (
                    <Input placeholder={field.placeholder} />
                  )}
                </Form.Item>
              );
            })}
            <Space className="w-full justify-end">
              <Button onClick={close}>取消</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                保存
              </Button>
            </Space>
          </Form>
      </Modal>
    </Card>
  );
}
