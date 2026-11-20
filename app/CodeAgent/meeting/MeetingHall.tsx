"use client";

import { useCallback, useState } from "react";
import { Card, Input, Modal } from "antd";
import { VideoCameraOutlined, PlusOutlined } from "@ant-design/icons";
import { isValidRoomCode } from "@/lib/room-code";

/**
 * @description 会议大厅：会议模块的入口聚合页——当前提供「创建房间 / 加入房间」
 *              两个动作（纯展示层，动作通过回调上抛给编排层 MeetingRoom），
 *              未来历史记录、快速会议等入口功能也归这里扩展
 */
export default function MeetingHall({
  onCreate,
  onJoin,
}: {
  /** @description 点击创建卡片：由编排层走创建流程 */
  onCreate: () => void;
  /** @description 弹窗提交 9 位房间号：由编排层走加入流程 */
  onJoin: (code: string) => void;
}) {
  // 加入房间弹窗：输入对方分享的 9 位短号
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  // 校验通过后上抛房间号
  const submitJoin = useCallback(() => {
    if (!isValidRoomCode(joinCode)) return;
    setJoinOpen(false);
    onJoin(joinCode);
  }, [joinCode, onJoin]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex w-full max-w-2xl flex-col items-center gap-5">
        {/* 不限行列：放不下时自动换到下一行 */}
        <div
          className="grid w-full gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          <Card className="card-hover cursor-pointer" onClick={onCreate}>
            <Card.Meta
              avatar={
                <VideoCameraOutlined
                  className="text-(--ant-color-text-secondary)"
                  style={{ fontSize: 36 }}
                />
              }
              title={<span className="text-sm font-medium">创建通话房间</span>}
              description={
                <span className="text-xs">
                  生成新的房间号，进入后可修改房间名称并分享邀请链接
                </span>
              }
            />
          </Card>
          <Card
            className="card-hover cursor-pointer"
            onClick={() => {
              setJoinCode("");
              setJoinOpen(true);
            }}
          >
            <Card.Meta
              avatar={
                <PlusOutlined
                  className="text-(--ant-color-text-secondary)"
                  style={{ fontSize: 36 }}
                />
              }
              title={<span className="text-sm font-medium">加入通话房间</span>}
              description={
                <span className="text-xs">
                  输入对方分享的 9 位房间号加入通话
                </span>
              }
            />
          </Card>
        </div>
      </div>

      <Modal
        open={joinOpen}
        title="加入通话房间"
        okText="加入"
        cancelText="取消"
        okButtonProps={{ disabled: !isValidRoomCode(joinCode) }}
        onOk={submitJoin}
        onCancel={() => setJoinOpen(false)}
      >
        <Input
          autoFocus
          inputMode="numeric"
          maxLength={9}
          value={joinCode}
          placeholder="请输入 9 位房间号"
          onChange={(e) =>
            setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 9))
          }
          onPressEnter={submitJoin}
        />
        <div className="mt-2 text-xs text-(--ant-color-text-tertiary)">
          房间号由房主分享，共 9 位数字
        </div>
      </Modal>
    </div>
  );
}
