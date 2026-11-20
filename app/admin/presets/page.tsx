"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { App as AntApp, Button, Drawer, Tabs, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import PageLayout from "@/components/PageLayout";
import CrudManager from "@/components/CrudManager";
import type { CrudField } from "@/components/CrudManager";

/**
 * @description 通话预设管理：列表 / 新建 / 查看 / 删除（编辑暂未开放），数据走
 *   /api/realtime/presets（服务端转发 CF Preset API，前端严禁直连）。
 *   表格与新建表单复用通用 CrudManager 组件；查看视图用 Tabs 分类渲染
 *   （基本信息 / 会议形态 / 权限，ui 不展示），对象作分组标题、叶子值作
 *   「标签 | 值」行，不直接展示 JSON。
 *   业务边界：内置预设（group_call_host 等）不可修改与删除——CF 会拒绝，
 *   其错误信息原样展示；token 签发前服务端会校验预设存在性
 */

type PresetRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

type PresetDetail = Json;

/** @description 查看视图的分类段（ui 段不展示） */
const SECTIONS = [
  { key: "config", label: "媒体与会议形态" },
  { key: "permissions", label: "权限" },
  { key: "ui", label: "UI 主题" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

/** @description 查看视图跳过的段（design_tokens 细节对管理无用） */
const HIDDEN_VIEW_SECTIONS: SectionKey[] = ["ui"];

/** @description 新建表单三段 JSON 的校验规则：留空跳过，非空必须可解析 */
function jsonRule(): object {
  return {
    validator: (_rule: unknown, value: unknown) => {
      const text = typeof value === "string" ? value.trim() : "";
      if (!text) return Promise.resolve();
      try {
        JSON.parse(text);
        return Promise.resolve();
      } catch {
        return Promise.reject(new Error("不是合法的 JSON"));
      }
    },
  };
}

// CrudManager 表格/新建表单字段：三段 JSON 为纯表单字段（hideInTable）
const PRESET_FIELDS: CrudField[] = [
  {
    name: "name",
    label: "预设名称",
    required: true,
    placeholder: "如 group_call_guest（签发 token 时的 preset_name）",
    render: (value) => (
      <Typography.Text strong>{String(value ?? "")}</Typography.Text>
    ),
  },
  {
    name: "id",
    label: "预设 ID",
    editable: false,
    render: (value) => (
      <Typography.Text
        copyable
        className="text-xs text-(--ant-color-text-tertiary)"
      >
        {String(value ?? "")}
      </Typography.Text>
    ),
  },
  {
    name: "created_at",
    label: "创建时间",
    type: "date",
    editable: false,
    render: (value) =>
      value ? dayjs(String(value)).format("YYYY-MM-DD HH:mm") : "—",
  },
  {
    name: "updated_at",
    label: "更新时间",
    type: "date",
    editable: false,
    render: (value) =>
      value ? dayjs(String(value)).format("YYYY-MM-DD HH:mm") : "—",
  },
  {
    name: "config",
    label: "媒体与会议形态（config）",
    type: "textarea",
    required: false,
    hideInTable: true,
    placeholder:
      '{"view_type": "GROUP_CALL", "media": {...}, "max_video_streams": {...}}，留空使用默认值',
    rules: [jsonRule()],
  },
  {
    name: "permissions",
    label: "权限开关（permissions）",
    type: "textarea",
    required: false,
    hideInTable: true,
    placeholder:
      '{"kick_participant": true, "chat": {...}, "polls": {...}}，留空使用默认值',
    rules: [jsonRule()],
  },
  {
    name: "ui",
    label: "UI 主题（ui）",
    type: "textarea",
    required: false,
    hideInTable: true,
    placeholder: '{"design_tokens": {"theme": "darkest", ...}}，留空使用默认值',
    rules: [jsonRule()],
  },
];

/** @description 统一错误提取：转发层错误结构为 { error: string } */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = (await res.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!res.ok) {
    throw new Error(body?.error ?? "请求失败");
  }
  return body as T;
}

/* ------------------------------------------------------------------ */
/* 查看视图：结构化渲染（标签字典 / 分组标题 / 枚举值映射）              */
/* ------------------------------------------------------------------ */

/** @description 叶子字段的中文标签，key 为 dot path；未收录的字段回退为原始 key */
const LABELS: Record<string, string> = {
  "config.view_type": "会议形态",
  "config.media.video.quality": "视频发布质量",
  "config.media.video.frame_rate": "视频发布帧率",
  "config.media.video.simulcast": "视频多码率分层（simulcast）",
  "config.media.screenshare.quality": "屏幕共享发布质量",
  "config.media.screenshare.frame_rate": "屏幕共享发布帧率",
  "config.max_video_streams.desktop": "桌面端同时渲染视频流数",
  "config.max_video_streams.mobile": "移动端同时渲染视频流数",
  "config.max_screenshare_count": "同时屏幕共享人数上限",
  "permissions.accept_waiting_requests": "可接受等待室请求",
  "permissions.can_accept_production_requests": "可接受制作请求",
  "permissions.can_edit_display_name": "可修改自己显示名",
  "permissions.can_edit_meeting_title": "可修改会议标题",
  "permissions.can_spotlight": "可设置焦点画面",
  "permissions.kick_participant": "可移除参会人",
  "permissions.pin_participant": "可钉选参会人",
  "permissions.can_record": "可录制会议",
  "permissions.can_livestream": "可开启直播",
  "permissions.can_change_participant_permissions": "可修改他人权限",
  "permissions.show_participant_list": "可查看参会人列表",
  "permissions.hidden_participant": "隐身参会人（对他人不可见）",
  "permissions.is_recorder": "录制机器人身份",
  "permissions.recorder_type": "录制器类型",
  "permissions.waiting_room_type": "等待室模式",
  "permissions.disable_participant_audio": "可强制静音他人音频",
  "permissions.disable_participant_video": "可强制关闭他人视频",
  "permissions.disable_participant_screensharing": "可强制停止他人共享",
  "permissions.media.video.can_produce": "发布视频",
  "permissions.media.audio.can_produce": "发送音频",
  "permissions.media.screenshare.can_produce": "屏幕共享",
  "permissions.chat.public.can_send": "可发送群聊消息",
  "permissions.chat.public.text": "群聊文本消息",
  "permissions.chat.public.files": "群聊文件消息",
  "permissions.chat.private.can_send": "可发送私聊消息",
  "permissions.chat.private.can_receive": "可接收私聊消息",
  "permissions.chat.private.text": "私聊文本消息",
  "permissions.chat.private.files": "私聊文件消息",
  "permissions.polls.can_create": "可创建投票",
  "permissions.polls.can_vote": "可参与投票",
  "permissions.polls.can_view": "可查看投票",
  "permissions.plugins.can_start": "可启动插件",
  "permissions.plugins.can_close": "可关闭插件",
  "permissions.plugins.can_edit_config": "可编辑插件配置",
  "permissions.connected_meetings.can_alter_connected_meetings":
    "可管理分组会议",
  "permissions.connected_meetings.can_switch_connected_meetings":
    "可切换分组会议",
  "permissions.connected_meetings.can_switch_to_parent_meeting": "可返回主会议",
};

/** @description 对象节点的分组标题，key 为 dot path；未收录回退为原始 key */
const GROUPS: Record<string, string> = {
  "config.media": "媒体发布参数",
  "config.media.video": "视频",
  "config.media.screenshare": "屏幕共享",
  "config.max_video_streams": "视频流渲染上限",
  "permissions.media": "发言权限",
  "permissions.chat": "聊天",
  "permissions.chat.public": "群聊",
  "permissions.chat.private": "私聊",
  "permissions.polls": "投票",
  "permissions.plugins": "插件",
  "permissions.connected_meetings": "分组会议（Connected Meetings）",
};

/** @description 枚举值的中文映射，key 为字段名（按后缀匹配） */
const ENUMS: Record<string, Record<string, string>> = {
  view_type: {
    GROUP_CALL: "群组通话",
    WEBINAR: "研讨会",
    AUDIO_ROOM: "音频房",
    LIVESTREAM: "直播",
  },
  quality: { sd: "标清", hd: "高清（720p）", fhd: "全高清（1080p）" },
  can_produce: { ALLOWED: "允许", NOT_ALLOWED: "禁止" },
  waiting_room_type: {
    SKIP: "免等待直接进入",
    SKIP_ON_ACCEPT: "主持人接受后进入",
    SKIP_ON_REJECT: "拒绝后进入",
  },
  recorder_type: { NONE: "无", RECORDER: "录制器" },
};

/** @description 叶子值渲染：布尔用标签，枚举查表，帧率带单位，其余原样 */
function formatLeaf(path: string, value: Json): ReactNode {
  const suffix = path.split(".").pop() ?? "";
  if (typeof value === "boolean") {
    return (
      <Tag color={value ? "green" : "default"} style={{ marginInlineEnd: 0 }}>
        {value ? "开启" : "关闭"}
      </Tag>
    );
  }
  if (value === null || value === "") {
    return <Typography.Text type="secondary">未设置</Typography.Text>;
  }
  if (suffix === "frame_rate" && typeof value === "number") {
    return <span>{value} 帧/秒</span>;
  }
  const mapped = ENUMS[suffix]?.[String(value)];
  if (mapped) {
    return <span>{mapped}</span>;
  }
  return <span>{String(value)}</span>;
}

/** @description 递归渲染一层对象：叶子聚成标签-值行卡片，子对象作分组标题递归 */
function renderObject(path: string, obj: Record<string, Json>): ReactNode {
  const entries = Object.entries(obj);
  const leaves = entries.filter(
    ([, v]) => v === null || typeof v !== "object" || Array.isArray(v),
  );
  const groups = entries.filter(
    ([, v]) =>
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).length > 0,
  );
  return (
    <>
      {leaves.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-lg border border-(--ant-color-border-secondary)">
          {leaves.map(([key, value]) => {
            const childPath = `${path}.${key}`;
            return (
              <div
                key={childPath}
                className="flex items-center justify-between gap-4 border-b border-(--ant-color-border-secondary) px-3 py-2 last:border-b-0"
              >
                <span className="shrink-0 text-xs text-(--ant-color-text-secondary)">
                  {LABELS[childPath] ?? key}
                </span>
                <span className="text-right text-xs">
                  {formatLeaf(childPath, value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {groups.map(([key, value]) => {
        const childPath = `${path}.${key}`;
        return (
          <div key={childPath} className="mb-3">
            <Typography.Text strong className="text-xs">
              {GROUPS[childPath] ?? key}
            </Typography.Text>
            <div className="mt-1">
              {renderObject(childPath, value as Record<string, Json>)}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** @description 查看视图主体：顶层 Tabs 分类，跳过 ui 段 */
function PresetDetailView({ detail }: { detail: PresetDetail | null }) {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    return <Typography.Text type="secondary">未获取到预设详情</Typography.Text>;
  }
  const record = detail as Record<string, Json> & {
    name?: string;
    id?: string;
    created_at?: string;
    updated_at?: string;
  };

  const metaRows: [string, ReactNode][] = [
    ["预设名称", record.name ?? "—"],
    [
      "预设 ID",
      <Typography.Text key="id" copyable className="text-xs">
        {record.id ?? "—"}
      </Typography.Text>,
    ],
    [
      "创建时间",
      record.created_at
        ? dayjs(record.created_at).format("YYYY-MM-DD HH:mm:ss")
        : "—",
    ],
    [
      "更新时间",
      record.updated_at
        ? dayjs(record.updated_at).format("YYYY-MM-DD HH:mm:ss")
        : "—",
    ],
  ];

  const tabItems = [
    {
      key: "meta",
      label: "基本信息",
      children: (
        <div className="overflow-hidden rounded-lg border border-(--ant-color-border-secondary)">
          {metaRows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 border-b border-(--ant-color-border-secondary) px-3 py-2 last:border-b-0"
            >
              <span className="shrink-0 text-xs text-(--ant-color-text-secondary)">
                {label}
              </span>
              <span className="text-right text-xs">{value}</span>
            </div>
          ))}
        </div>
      ),
    },
    ...SECTIONS.filter(({ key }) => !HIDDEN_VIEW_SECTIONS.includes(key)).map(
      ({ key, label }) => {
        const value = record[key];
        return {
          key,
          label,
          children:
            value !== undefined &&
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            Object.keys(value).length > 0 ? (
              renderObject(key, value as Record<string, Json>)
            ) : (
              <Typography.Text type="secondary">
                （未设置，使用默认值）
              </Typography.Text>
            ),
        };
      },
    ),
  ];

  return <Tabs items={tabItems} size="small" />;
}

export default function AdminPresetsPage() {
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState<PresetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<{
    preset: PresetRow;
    detail: PresetDetail | null;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = await request<{ items: PresetRow[] }>(
        "/api/realtime/presets",
      );
      setRows(body.items);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载预设失败");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  /** @description 查看：拉详情后用 Tabs 结构化渲染（编辑功能暂未提供） */
  const openDetail = useCallback(
    async (row: Record<string, unknown> & { id: string | number }) => {
      try {
        const body = await request<{ preset: unknown }>(
          `/api/realtime/presets/${row.id}`,
        );
        setViewing({
          preset: row as unknown as PresetRow,
          detail: body.preset as PresetDetail,
        });
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载预设详情失败");
      }
    },
    [message],
  );

  /** @description 新建：三段 JSON 文本解析回对象后提交（空段不提交，用 CF 默认值） */
  const onCreate = useCallback(
    async (values: Record<string, unknown>) => {
      const body: Record<string, unknown> = {
        name: String(values.name ?? "").trim(),
      };
      for (const key of ["config", "permissions", "ui"] as const) {
        const text =
          typeof values[key] === "string" ? (values[key] as string).trim() : "";
        if (text) body[key] = JSON.parse(text);
      }
      await request("/api/realtime/presets", {
        method: "POST",
        body: JSON.stringify(body),
      });
      message.success("预设已创建");
      await load();
    },
    [load, message],
  );

  /** @description 删除：内置预设会被 CF 拒绝，错误原样透传 */
  const onDelete = useCallback(
    async (row: Record<string, unknown> & { id: string | number }) => {
      await request(`/api/realtime/presets/${row.id}`, { method: "DELETE" });
      message.success("预设已删除");
      await load();
    },
    [load, message],
  );

  return (
    <PageLayout>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex shrink-0 items-center gap-2 text-xs text-(--ant-color-text-secondary)">
          <Tag color="orange">内置预设不可改删，编辑暂未开放</Tag>
        </div>
        <div className="min-h-0 flex-1">
          <CrudManager
            title="通话预设"
            fields={PRESET_FIELDS}
            rows={rows}
            onChange={(nextRows) => setRows(nextRows as unknown as PresetRow[])}
            loading={loading}
            actionLabels={{ create: "新建预设" }}
            toolbar={{
              export: false,
              create: true,
              extra: (
                <Button icon={<ReloadOutlined />} onClick={() => void load()}>
                  刷新
                </Button>
              ),
            }}
            hideActions={{ edit: true }}
            rowActions={(row) => (
              <Button
                type="link"
                size="small"
                onClick={() => void openDetail(row)}
              >
                查看
              </Button>
            )}
            onCreate={onCreate}
            onDelete={onDelete}
          />
        </div>
      </div>

      <Drawer
        open={viewing !== null}
        size={620}
        title={viewing ? `查看预设：${viewing.preset.name}` : ""}
        onClose={() => setViewing(null)}
      >
        {viewing && <PresetDetailView detail={viewing.detail} />}
      </Drawer>
    </PageLayout>
  );
}
