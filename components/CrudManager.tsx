"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  App as AntApp,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
} from "antd";

export type CrudField = {
  name: string;
  label: string;
  // password：表单用密码框，编辑时不回填（配合 editOptional 实现「留空表示不修改」）
  // date：仅展示的日期字段（表格用 render 格式化），筛选项自动推导为日期区间
  type?: "text" | "number" | "select" | "textarea" | "password" | "date";
  // type=select 时的枚举选项，限制只能从固定值中选择
  options?: { label: string; value: string | number }[];
  // 表单控件的占位文案
  placeholder?: string;
  // 表格列宽（px），列多时配合横向滚动使用
  width?: number;
  // 表格单元格自定义渲染（状态标签、时间格式化、关联数据展示等）
  render?: (value: unknown, row: Row) => ReactNode;
  // 是否出现在新增/编辑表单里，默认 true；created_at 等仅展示字段设为 false
  editable?: boolean;
  // 是否出现在表格列里，默认 true；password 等仅表单字段设为 false
  hideInTable?: boolean;
  // 筛选项覆盖：false 显式排除；传对象则按其配置渲染（未传时按 type 自动推导，见 deriveFilterFields）
  filter?: false | FilterField;
  // 是否必填，默认 true
  required?: boolean;
  // 编辑时该字段可留空：空值从提交中剔除（视为「不修改」），编辑时取消必填校验
  editOptional?: boolean;
  // 覆盖默认必填校验文案
  requiredMessage?: string;
  // 追加 antd Form 校验规则（如邮箱格式），与 required 规则叠加
  rules?: object[];
};

// 筛选字段配置（原 FilterForm）：支持文本/数字/下拉/日期区间
export type FilterField = {
  name: string;
  label: string;
  // 筛选项类型，默认 text
  type?: "text" | "number" | "select" | "dateRange";
  // type=select 时的枚举选项（值类型与 CrudField.options 一致）
  options?: { label: string; value: string | number }[];
  placeholder?: string;
  // 透传给具体 antd 表单组件的属性（如 allowClear、mode、showSearch、onChange 等）
  componentProps?: Record<string, any>;
};

// 筛选值：键为字段名，值为表单项当前值（dateRange 为 dayjs 数组）
export type FilterValues = Record<string, unknown>;

// 按字段配置推导筛选项（约定：select 枚举→下拉精确匹配，date→日期区间，text/number→输入框）：
// - filter:false 显式排除；filter 传对象则按其配置渲染（可覆盖 name/label/type 等）
// - 默认排除 textarea / password / hideInTable（纯表单字段）等不适合筛选的字段
export function deriveFilterFields(fields: CrudField[]): FilterField[] {
  const derived: FilterField[] = [];
  for (const field of fields) {
    if (field.filter === false) continue;
    if (field.filter) {
      // 显式指定的筛选项（完整 FilterField 配置）原样使用
      derived.push({ ...field.filter });
      continue;
    }
    if (
      field.hideInTable ||
      field.type === "password" ||
      field.type === "textarea"
    ) {
      continue;
    }
    if (field.type === "select") {
      derived.push({
        name: field.name,
        label: field.label,
        type: "select",
        options: field.options,
      });
    } else if (field.type === "date") {
      derived.push({
        name: field.name,
        label: field.label,
        type: "dateRange",
      });
    } else if (field.type === "number") {
      derived.push({ name: field.name, label: field.label, type: "number" });
    } else {
      // text 与未指定类型：文本搜索
      derived.push({ name: field.name, label: field.label });
    }
  }
  return derived;
}

// 按筛选字段配置渲染对应的表单控件
function renderFilterControl(field: FilterField) {
  const { type = "text", placeholder, options, componentProps } = field;
  if (type === "number") {
    return (
      <InputNumber
        style={{ width: "100%" }}
        placeholder={placeholder}
        {...componentProps}
      />
    );
  }
  if (type === "select") {
    return (
      <Select
        style={{ width: "100%" }}
        options={options}
        placeholder={placeholder ?? `请选择${field.label}`}
        allowClear
        {...componentProps}
      />
    );
  }
  if (type === "dateRange") {
    return (
      <DatePicker.RangePicker style={{ width: "100%" }} {...componentProps} />
    );
  }
  return (
    <Input
      placeholder={placeholder ?? `请输入${field.label}`}
      allowClear
      {...componentProps}
    />
  );
}

// 内嵌筛选栏（原 FilterForm）：查询时剔除空条件回调，重置时清空全部条件
function FilterBar({
  fields,
  onSearch,
}: {
  fields: FilterField[];
  onSearch: (values: FilterValues) => void;
}) {
  const [form] = Form.useForm();

  function submit() {
    const raw = form.getFieldsValue() as FilterValues;
    const values: FilterValues = {};
    for (const [key, value] of Object.entries(raw)) {
      const isEmpty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (!isEmpty) values[key] = value;
    }
    onSearch(values);
  }

  function reset() {
    form.resetFields();
    onSearch({});
  }

  return (
    <Form form={form} onFinish={submit}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        {fields.map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            style={{ marginBottom: 8, minWidth: 200 }}
          >
            {renderFilterControl(field)}
          </Form.Item>
        ))}
        {/* items-end 让按钮与输入框底对齐，空间不足时随表单项一起换行 */}
        <Form.Item style={{ marginBottom: 8 }}>
          <Space>
            <Button onClick={reset}>重置</Button>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
          </Space>
        </Form.Item>
      </div>
    </Form>
  );
}

// 行数据：自增主键表的 id 是数字，其余字段值类型不限
type Row = Record<string, unknown> & { id: string | number };

// 增删改查动作文案：可按需覆盖，未提供的字段使用默认值
export type CrudActionLabels = {
  create?: string; // 新增按钮 / 弹窗标题
  edit?: string; // 编辑按钮 / 弹窗标题
  remove?: string; // 删除按钮 / 确认框
  save?: string; // 弹窗保存按钮
  cancel?: string; // 弹窗/确认框取消按钮
  actionColumn?: string; // 操作列标题
  export?: string; // 导出按钮
  import?: string; // 导入按钮
};

const DEFAULT_ACTION_LABELS: Required<CrudActionLabels> = {
  create: "新增",
  edit: "编辑",
  remove: "删除",
  save: "保存",
  cancel: "取消",
  actionColumn: "操作",
  export: "导出",
  import: "导入",
};

// 工具栏按钮配置：各按钮开关 + extra 自定义插槽；未提供时默认导出/新增开启、导入关闭
export type CrudToolbar = {
  export?: boolean;
  import?: boolean;
  create?: boolean;
  extra?: ReactNode;
};

const DEFAULT_TOOLBAR: Required<Omit<CrudToolbar, "extra">> = {
  export: true,
  import: false,
  create: true,
};

// CSV 单元格转义：含逗号/引号/换行时加引号，内部引号双写
function toCsvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// CSV 文本解析为二维数组：与 toCsvCell 的导出转义互为逆操作
// （处理引号、双写引号、逗号、\r\n/\n 换行，去掉 BOM，跳过全空行）
function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  // 末尾无换行时补上最后一行
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ""));
}

// CSV 单元格值还原：number 转数字（失败抛错由调用方记失败行），
// select 按 options 匹配还原原始类型的 value，其余保留字符串
function coerceCsvValue(field: CrudField, raw: string): string | number {
  if (field.type === "number") {
    const num = Number(raw);
    if (Number.isNaN(num)) throw new Error(`${field.label}「${raw}」不是数字`);
    return num;
  }
  if (field.type === "select") {
    const hit = field.options?.find(
      (option) => String(option.value) === raw || option.label === raw,
    );
    if (hit) return hit.value;
  }
  return raw;
}

// 通用增删改查表格：支持受控（父组件传入 rows/onChange）或非受控（内部用 initialRows）；
// 可配置内嵌筛选栏（filterFields + onFilterSearch）与工具栏按钮（toolbar）
export default function CrudManager({
  title,
  fields,
  initialRows,
  rows: controlledRows,
  onChange,
  actionLabels,
  rowActions,
  hideActions,
  filterFields,
  onFilterSearch,
  toolbar,
  loading = false,
  paginated = false,
  total = 0,
  current = 1,
  pageSize = 10,
  onPageChange,
  onCreate,
  onUpdate,
  onDelete,
}: {
  title: string;
  fields: CrudField[];
  initialRows?: Row[];
  rows?: Row[];
  onChange?: (rows: Row[]) => void;
  actionLabels?: CrudActionLabels;
  // 操作列的扩展按钮（如「预览」），渲染在编辑/删除之前
  rowActions?: (row: Row) => ReactNode;
  // 操作列按钮隐藏开关（如预设管理暂不开放编辑：hideActions={{ edit: true }}）
  hideActions?: { edit?: boolean; remove?: boolean };
  // 内嵌筛选栏的字段配置；未传时由 fields 自动推导（见 deriveFilterFields），与 onFilterSearch 成对使用
  filterFields?: FilterField[];
  // 点击筛选栏查询（或回车）/重置时触发；undefined/空串/空数组的条件已剔除
  onFilterSearch?: (values: FilterValues) => void;
  // 工具栏按钮开关与自定义插槽，默认导出/新增开启、导入关闭
  toolbar?: CrudToolbar;
  // 表格加载态（父组件拉取数据时）
  loading?: boolean;
  // 服务端分页模式：分页参数由父组件提供，翻页只回调 onPageChange
  paginated?: boolean;
  // 记录总数（服务端分页）
  total?: number;
  // 当前页码，从 1 开始（服务端分页）
  current?: number;
  // 每页条数（服务端分页）
  pageSize?: number;
  // 翻页 / 修改每页条数回调（服务端分页）
  onPageChange?: (page: number, pageSize: number) => void;
  // 新增回调（回调模式）：异步失败（reject）时弹窗保持打开并提示错误；未提供则本地新增
  onCreate?: (values: Record<string, unknown>) => Promise<void> | void;
  // 编辑回调（回调模式）：参数为当前行与表单值；未提供则本地更新
  onUpdate?: (row: Row, values: Record<string, unknown>) => Promise<void> | void;
  // 删除回调（回调模式）：失败时确认框保持打开并提示错误；未提供则本地删除
  onDelete?: (row: Row) => Promise<void> | void;
}) {
  const labels = { ...DEFAULT_ACTION_LABELS, ...actionLabels };
  const toolbarConfig = { ...DEFAULT_TOOLBAR, ...toolbar };
  // 筛选字段：显式传入优先，否则按 fields 自动推导
  const resolvedFilterFields = filterFields ?? deriveFilterFields(fields);
  const { message, modal } = AntApp.useApp();
  const isControlled = controlledRows !== undefined;

  // 开发告警：同时传 rows 和 initialRows 语义冲突，以受控 rows 为准
  useEffect(() => {
    if (controlledRows !== undefined && initialRows !== undefined) {
      console.warn(
        "[CrudManager] 同时传入了 rows 和 initialRows；组件将以受控的 rows 为准，initialRows 会被忽略。",
      );
    }
  }, [controlledRows, initialRows]);

  // 受控模式：父组件管状态；非受控：自己维护
  const [localRows, setLocalRows] = useState<Row[]>(
    controlledRows ?? initialRows ?? [],
  );
  const rows = controlledRows ?? localRows;

  // 受控模式下，父组件数据变化同步到本地副本（保证一致性）
  useEffect(() => {
    if (isControlled) setLocalRows(controlledRows as Row[]);
  }, [controlledRows, isControlled]);

  // 非受控模式下，initialRows 变化时同步到本地（解决 tab 切换复用实例、或异步数据后到时 initialRows 不生效的问题）
  useEffect(() => {
    if (!isControlled && initialRows) setLocalRows(initialRows);
  }, [initialRows, isControlled]);
  const setRows = (updater: (prev: Row[]) => Row[]) => {
    const next = updater(rows);
    if (onChange) onChange(next);
    else setLocalRows(next);
  };

  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 参与新增/编辑表单的字段（date 仅展示，不进表单）
  const formFields = fields.filter(
    (field) => field.editable !== false && field.type !== "date",
  );

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    setOpen(true);
  }

  // 弹窗打开后再回填/清空表单；此时 Form 已挂载，避免 useForm 未连接告警。
  // 密码类字段不回填，留空表示不修改
  useEffect(() => {
    if (!open) return;
    if (editing) {
      const values: Record<string, unknown> = {};
      for (const field of fields) {
        if (field.editable !== false && field.type !== "password") {
          values[field.name] = editing[field.name];
        }
      }
      form.setFieldsValue(values);
    } else {
      form.resetFields();
    }
  }, [open, editing, fields, form]);

  async function submit() {
    let values: Record<string, string | number>;
    try {
      values = await form.validateFields();
    } catch {
      // 校验失败：Form.Item 已展示错误提示，无需额外处理
      return;
    }
    if (editing) {
      // editOptional 字段编辑时留空表示不修改：空值从提交中剔除
      for (const field of formFields) {
        const v = values[field.name];
        if (field.editOptional && (v === undefined || v === "")) {
          delete values[field.name];
        }
      }
    }
    // 回调模式：交给父组件异步处理，失败（reject）时保持弹窗打开并提示错误
    if (editing ? onUpdate : onCreate) {
      setSaving(true);
      try {
        if (editing) await onUpdate!(editing, values);
        else await onCreate!(values);
        message.success(`已${editing ? labels.edit : labels.create}${title}`);
        setOpen(false);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "保存失败");
      } finally {
        setSaving(false);
      }
      return;
    }
    // 本地模式：直接改行数据，经 onChange 交给父组件持久化
    if (editing) {
      setRows((prev) =>
        prev.map((row) =>
          row.id === editing.id ? { ...row, ...values } : row,
        ),
      );
      message.success(`已${labels.edit}${title}`);
    } else {
      setRows((prev) => [{ id: `row-${Date.now()}`, ...values }, ...prev]);
      message.success(`已${labels.create}${title}`);
    }
    setOpen(false);
  }

  function remove(row: Row) {
    modal.confirm({
      title: `${labels.remove}${title}`,
      content: fields[0]
        ? `确定${labels.remove}「${row[fields[0].name]}」吗？`
        : `确定${labels.remove}该条${title}吗？`,
      okButtonProps: { danger: true },
      okText: labels.remove,
      cancelText: labels.cancel,
      async onOk() {
        // 回调模式：异步删除，失败时抛错让确认框保持打开
        if (onDelete) {
          try {
            await onDelete(row);
            message.success(`已${labels.remove}`);
          } catch (err) {
            message.error(err instanceof Error ? err.message : "删除失败");
            throw err;
          }
          return;
        }
        setRows((prev) => prev.filter((item) => item.id !== row.id));
        message.success(`已${labels.remove}`);
      },
    });
  }

  // 导出当前数据为 CSV（带 BOM，保证 Excel 打开中文不乱码）；仅导出表格可见字段
  function exportCsv() {
    const tableFields = fields.filter((field) => !field.hideInTable);
    const header = tableFields
      .map((field) => toCsvCell(field.label))
      .join(",");
    const body = rows.map((row) =>
      tableFields.map((field) => toCsvCell(row[field.name])).join(","),
    );
    const csv = [header, ...body].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success(`已${labels.export}${title}`);
  }

  // 导入 CSV：与导出格式一致（首行为字段 label），解析后按新增行追加到表格开头，
  // 走现有 setRows→onChange/persist 流程；解析失败行收集后统一提示
  function importCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const table = parseCsv(String(reader.result ?? ""));
      if (table.length < 2) {
        message.warning("CSV 中没有可导入的数据行");
        return;
      }
      // 表头 label → 字段名；仅展示列（editable=false，如 created_at）不参与导入，
      // 避免把导出时的过期数据写回服务端
      const header = table[0];
      const colFields = header
        .map((label) =>
          fields.find(
            (field) => field.label === label && field.editable !== false,
          ),
        )
        .map((field, col) => (field ? { field, col } : null))
        .filter(
          (item): item is { field: CrudField; col: number } => item !== null,
        );
      if (colFields.length === 0) {
        message.warning("CSV 表头与表格字段不匹配，未导入任何数据");
        return;
      }
      const imported: Row[] = [];
      const failed: string[] = [];
      table.slice(1).forEach((cells, rowIndex) => {
        try {
          const record: Record<string, string | number> = {};
          for (const { field, col } of colFields) {
            record[field.name] = coerceCsvValue(field, cells[col] ?? "");
          }
          // id 加 rowIndex 后缀，保证同一批导入的多行 id 唯一
          imported.push({ id: `row-${Date.now()}-${rowIndex}`, ...record });
        } catch (err) {
          // 行号 +2：第 1 行是表头，数组下标从 0 起
          failed.push(
            `第 ${rowIndex + 2} 行：${err instanceof Error ? err.message : "解析失败"}`,
          );
        }
      });
      if (imported.length > 0) {
        setRows((prev) => [...imported, ...prev]);
        message.success(`已导入 ${imported.length} 条${title}`);
      }
      if (failed.length > 0) {
        const shown = failed.slice(0, 5).join("；");
        message.warning(
          `${failed.length} 行解析失败：${shown}${failed.length > 5 ? " 等" : ""}`,
          6,
        );
      }
    };
    reader.readAsText(file);
  }

  // 隐藏文件选择器：每次选择后重置 value，保证重复选择同一文件也能再次触发
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) importCsv(file);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 内嵌筛选栏（原 FilterForm）：有筛选项配置 + onFilterSearch 后显示 */}
      {resolvedFilterFields.length > 0 && onFilterSearch ? (
        <FilterBar fields={resolvedFilterFields} onSearch={onFilterSearch} />
      ) : null}

      <div className="flex items-center justify-between">
        <Typography.Text strong>
          {title}列表（{paginated ? total : rows.length}）
        </Typography.Text>
        <Space wrap>
          {toolbarConfig.extra}
          {toolbarConfig.import && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                {labels.import}
              </Button>
            </>
          )}
          {toolbarConfig.export && (
            <Button onClick={exportCsv}>{labels.export}</Button>
          )}
          {toolbarConfig.create && (
            <Button type="primary" onClick={openCreate}>
              {labels.create}
            </Button>
          )}
        </Space>
      </div>

      <Table<Row>
        rowKey="id"
        dataSource={rows}
        loading={loading}
        tableLayout="auto"
        // 宽度按内容撑开（min-width 100%），列总宽超出容器时出现横向滚动条
        scroll={{ x: "max-content" }}
        // 服务端分页由父组件提供参数并回调翻页；本地模式客户端分页
        pagination={
          paginated
            ? {
                current,
                pageSize,
                total,
                showSizeChanger: true,
                showTotal: (count) => `共 ${count} 条`,
                onChange: onPageChange,
              }
            : { pageSize: 10, hideOnSinglePage: true }
        }
        columns={[
          ...fields.filter((field) => !field.hideInTable).map((field) => ({
            title: field.label,
            dataIndex: field.name,
            key: field.name,
            width: field.width,
            render: field.render
              ? (value: unknown, record: Row) => field.render!(value, record)
              : // 长文本字段：单行省略展示，悬停浮层查看全文
                field.type === "textarea"
                ? (value: unknown) => (
                    <Typography.Text
                      ellipsis={{ tooltip: true }}
                      style={{ maxWidth: 240 }}
                    >
                      {String(value ?? "")}
                    </Typography.Text>
                  )
                : undefined,
          })),
          {
            title: labels.actionColumn,
            key: "action",
            // 横向滚动时操作列吸附在右侧
            fixed: "right",
            render: (_, row) => (
              <Space size={4} wrap={false}>
                {rowActions?.(row)}
                {!hideActions?.edit && (
                  <Button type="link" size="small" onClick={() => openEdit(row)}>
                    {labels.edit}
                  </Button>
                )}
                {!hideActions?.remove && (
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => remove(row)}
                  >
                    {labels.remove}
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? `${labels.edit}${title}` : `${labels.create}${title}`}
        open={open}
        okText={labels.save}
        cancelText={labels.cancel}
        okButtonProps={{ loading: saving }}
        onOk={submit}
        onCancel={() => setOpen(false)}
        destroyOnHidden
        styles={{ body: { maxHeight: "70vh", overflow: "auto" } }}
      >
        <Form form={form} layout="vertical">
          {fields
            .filter((field) => field.editable !== false)
            .map((field) => (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                rules={
                  field.required && !(editing && field.editOptional)
                    ? [
                        {
                          required: true,
                          message: field.requiredMessage ?? `请输入${field.label}`,
                        },
                        ...(field.rules ?? []),
                      ]
                    : (field.rules ?? [])
                }
              >
                {field.type === "number" ? (
                  <InputNumber style={{ width: "100%" }} />
                ) : field.type === "select" ? (
                  <Select
                    options={field.options}
                    placeholder={`请选择${field.label}`}
                  />
                ) : field.type === "textarea" ? (
                  <Input.TextArea rows={4} placeholder={field.placeholder} />
                ) : field.type === "password" ? (
                  <Input.Password
                    placeholder={
                      field.placeholder ??
                      (editing && field.editOptional
                        ? "留空表示不修改"
                        : undefined)
                    }
                    autoComplete="new-password"
                  />
                ) : (
                  <Input placeholder={field.placeholder} />
                )}
              </Form.Item>
            ))}
        </Form>
      </Modal>
    </div>
  );
}
