"use client";

import { useEffect, useRef, useState } from "react";
import { FloatButton } from "antd";
import { VerticalAlignBottomOutlined } from "@ant-design/icons";
import ChatBubbleCard, {
  type ChatBubbleAction,
  type ChatMessageData,
} from "./ChatBubbleCard";

/**
 * @description 对话内容区：渲染气泡列表，新消息到达后自动滚动到底部；
 *              上翻离开底部时显示「回到底部」悬浮按钮（由底部哨兵的实时可见性驱动）
 * @param messages 消息列表
 * @param actionsOf 按消息生成底部操作按钮，返回空数组则不渲染
 * @param contentWidth 消息列表宽度，默认 80%，居中展示
 */
export default function ChatContent({
  messages,
  actionsOf,
  contentWidth = "80%",
}: {
  messages: ChatMessageData[];
  actionsOf?: (message: ChatMessageData) => ChatBubbleAction[];
  contentWidth?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // 底部哨兵是否在可视范围内：IntersectionObserver 实时更新，
  // false 时显示「回到底部」悬浮按钮
  const [atBottom, setAtBottom] = useState(true);

  /**
   * @description 滚动到消息区最底部：直接把 scrollTop 设为上限，
   *              一次性吃满容器 padding-bottom（scrollIntoView 对齐的是
   *              内容边缘，会把 padding 漏在外面，最后一条消息贴边无留白）
   */
  function scrollToBottom() {
    const root = scrollRef.current;
    if (!root) return;
    root.scrollTop = root.scrollHeight;
  }

  // 消息数量变化时滚到底部，保证最新一条始终可见
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // IntersectionObserver 监听底部哨兵，实时同步「是否在最底部」状态
  // （root 指向自身滚动容器，保证判定基于消息区而非整个视口）
  useEffect(() => {
    const root = scrollRef.current;
    const target = bottomRef.current;
    if (!root || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          console.log(entry.isIntersecting);
          setAtBottom(entry.isIntersecting);
        }
      },
      { root, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="flex h-full flex-col gap-4 overflow-y-auto p-4"
      >
        <div className="mx-auto" style={{ width: contentWidth }}>
          {messages.map((message) => (
            <ChatBubbleCard
              key={message.id}
              message={message}
              actions={actionsOf?.(message)}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      {/* 回到底部：离开底部时出现；绝对定位在消息区右下角，
          覆盖 FloatButton 默认的 fixed 定位（避免钉在视口上） */}
      {!atBottom && (
        <FloatButton
          icon={<VerticalAlignBottomOutlined />}
          style={{
            position: "absolute",
            bottom: 16,
            right: "10%",
          }}
          onClick={scrollToBottom}
        />
      )}
    </div>
  );
}
