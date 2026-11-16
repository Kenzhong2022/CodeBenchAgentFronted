"use client";

import type { ReactNode } from "react";
import { Button, Tooltip, theme } from "antd";

/** 消息角色：用户提问 / 助手回复 */
export type ChatRole = "user" | "assistant";

/** 气泡底部的操作按钮配置（如复制、重新生成），由父组件按消息注入 */
export type ChatBubbleAction = {
  key: string;
  title: string;
  icon: ReactNode;
  onClick: () => void;
};

/** 单条对话消息 */
export type ChatMessageData = {
  id: string;
  role: ChatRole;
  content: string;
};

/**
 * @description 对话气泡：按角色决定左右对齐与配色，底部可挂一组操作按钮
 * @param message 消息内容
 * @param actions 底部操作按钮配置，不传则不渲染按钮区
 */
export default function ChatBubbleCard({
  message,
  actions,
}: {
  message: ChatMessageData;
  actions?: ChatBubbleAction[];
}) {
  const { token } = theme.useToken();
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[75%]">
        <div
          className="whitespace-pre-wrap break-words rounded-lg border px-3 py-2 text-[13px] leading-6"
          style={{
            backgroundColor: isUser
              ? token.colorPrimaryBg
              : token.colorFillQuaternary,
            borderColor: isUser ? token.colorPrimaryBorder : token.colorBorderSecondary,
            color: token.colorText,
          }}
        >
          {message.content}
        </div>
        {actions && actions.length > 0 && (
          <div
            className={`mt-1 flex items-center gap-1 ${isUser ? "justify-end" : "justify-start"}`}
          >
            {actions.map((action) => (
              <Tooltip key={action.key} title={action.title}>
                <Button
                  type="text"
                  size="small"
                  icon={action.icon}
                  aria-label={action.title}
                  onClick={action.onClick}
                />
              </Tooltip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
