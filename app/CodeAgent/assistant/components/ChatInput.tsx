"use client";

import { useState } from "react";
import { Button, Input, Select } from "antd";
import { ArrowUpOutlined } from "@ant-design/icons";

/** 输入框附带的模型配置：功能开关 + 当前选中的模型 */
export type ChatModelConfig = {
  /** 是否开启深度思考 */
  deepThink: boolean;
  /** 是否开启联网搜索 */
  webSearch: boolean;
  /** 当前选中的模型 */
  model: string;
};

/** 默认模型配置：功能全关，使用 Deepseek */
export const DEFAULT_MODEL_CONFIG: ChatModelConfig = {
  deepThink: false,
  webSearch: false,
  model: "Deepseek",
};

// 功能开关按钮配置表：key 对应 ChatModelConfig 中的布尔字段
const FEATURE_TOGGLES: { key: "deepThink" | "webSearch"; label: string }[] = [
  { key: "deepThink", label: "深度思考" },
  { key: "webSearch", label: "联网搜索" },
];

// 可选模型列表
const MODEL_OPTIONS = [
  { value: "Deepseek", label: "Deepseek" },
  { value: "Qwen", label: "Qwen" },
  { value: "Kimi", label: "Kimi" },
];

/**
 * @description 对话输入框：Enter 发送、Shift + Enter 换行，空白内容不触发发送；
 *              深度思考 / 联网搜索开关与模型选择由外部 config 受控管理，
 *              父组件发送请求时可一并读取
 * @param config 模型配置（功能开关 + 选中模型）
 * @param onConfigChange 配置变化回调
 * @param onSend 点击发送或回车时的回调，参数为去掉首尾空白的文本
 * @param loading 是否正在等待回复（期间禁止再次发送）
 * @param placeholder 输入提示
 * @param contentWidth 输入框宽度，默认 80%，居中展示（与 ChatContent 的消息区宽度对应）
 */
export default function ChatInput({
  config,
  onConfigChange,
  onSend,
  loading = false,
  placeholder = "输入问题，Enter 发送，Shift + Enter 换行",
  contentWidth = "80%",
}: {
  config: ChatModelConfig;
  onConfigChange: (config: ChatModelConfig) => void;
  onSend: (text: string) => void;
  loading?: boolean;
  placeholder?: string;
  contentWidth?: string;
}) {
  const [text, setText] = useState("");

  /** @description 发送当前输入并清空 */
  function handleSend() {
    const value = text.trim();
    if (!value || loading) return;
    onSend(value);
    setText("");
  }

  /** @description 切换单个功能开关 */
  function toggleFeature(key: "deepThink" | "webSearch") {
    onConfigChange({ ...config, [key]: !config[key] });
  }

  return (
    <div
      className="m-auto shrink-0 bg-(--ant-color-bg-container) p-3 rounded-lg"
      style={{ width: contentWidth, boxShadow: "var(--ant-box-shadow-card)" }}
    >
      <Input.TextArea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onPressEnter={(event) => {
          if (event.shiftKey) return;
          event.preventDefault();
          handleSend();
        }}
        placeholder={placeholder}
        autoSize={{ minRows: 1, maxRows: 5 }}
        variant="filled"
      />
      <div className="flex items-end p-2 gap-2">
        {FEATURE_TOGGLES.map((feature) => (
          <Button
            shape="round"
            key={feature.key}
            color={config[feature.key] ? "primary" : "default"}
            variant="outlined"
            onClick={() => toggleFeature(feature.key)}
          >
            {feature.label}
          </Button>
        ))}

        <Select
          value={config.model}
          onChange={(model) => onConfigChange({ ...config, model })}
          style={{ width: 120, marginLeft: "auto" }}
          popupMatchSelectWidth={false}
          placement="topRight"
          options={MODEL_OPTIONS}
        />
        <Button
          shape="round"
          type="primary"
          icon={<ArrowUpOutlined />}
          loading={loading}
          disabled={!text.trim()}
          onClick={handleSend}
        ></Button>
      </div>
    </div>
  );
}
