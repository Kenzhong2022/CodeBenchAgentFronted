"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App as AntApp, Button, Input, Select } from "antd";
import {
  AudioMutedOutlined,
  AudioOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { useRealtimeKitMeeting } from "@cloudflare/realtimekit-react";
import { formatRoomCode } from "@/lib/room-code";
import DisabledIcon from "@/components/DisabledIcon";
import UnderlineInput from "@/components/UnderlineInput";

/**
 * @description 进入前面板：自绘设备预览（摄像头画面 / 麦克风与摄像头开关 / 设备切换 / 昵称），
 *              房主可在此修改房间名称；媒体与改名等自身业务内聚在组件里，
 *              「进入 / 取消 / 改名成功」通过回调上抛给编排层（MeetingRoom）
 */
export default function PreJoin({
  roomCode,
  roomName,
  isHost,
  onEnter,
  onRename,
  onCancel,
}: {
  roomCode: string | null;
  roomName: string;
  isHost: boolean;
  /** @description meeting.join() 成功后通知编排层切到通话界面 */
  onEnter: () => void;
  /** @description 房主改名成功后通知编排层同步（分享文案 / 通话顶栏） */
  onRename: (name: string) => void;
  /** @description 取消预览：释放预览轨道由组件完成，回入口由编排层处理 */
  onCancel: () => void;
}) {
  const { meeting } = useRealtimeKitMeeting();
  const self = meeting.self;
  const { message } = AntApp.useApp();
  const [videoEnabled, setVideoEnabled] = useState(self.videoEnabled);
  const [audioEnabled, setAudioEnabled] = useState(self.audioEnabled);
  const [displayName, setDisplayName] = useState(self.name ?? "");
  const [devices, setDevices] = useState<{
    audio: MediaDeviceInfo[];
    video: MediaDeviceInfo[];
    speaker: MediaDeviceInfo[];
  }>({ audio: [], video: [], speaker: [] });
  const [current, setCurrent] = useState<
    Partial<{
      audio: MediaDeviceInfo;
      video: MediaDeviceInfo;
      speaker: MediaDeviceInfo;
    }>
  >({});
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  // 房间名称输入框：房主失焦 / 回车时保存，非房主只读
  const [roomNameDraft, setRoomNameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // RealtimeKit 的 enableVideo / enableAudio 不允许并发重入（在途再调会抛
  // ERR1100）：Strict Mode 双挂载与快速连点都会触发，这里按媒体类型记录
  // 在途调用去重
  const mediaOpRef = useRef<{ video?: Promise<unknown>; audio?: Promise<unknown> }>({});
  const runMediaOp = useCallback(
    (
      kind: "video" | "audio",
      op: () => Promise<unknown>,
      onError?: () => void,
    ) => {
      if (mediaOpRef.current[kind]) return;
      mediaOpRef.current[kind] = op()
        .catch(() => onError?.())
        .finally(() => {
          mediaOpRef.current[kind] = undefined;
        });
    },
    [],
  );
  // 预设决定加入后能否改昵称
  const canEditName = self.permissions.canEditDisplayName !== false;

  // 注册预览画面并订阅媒体状态；确保进面板时摄像头 / 麦克风处于开启状态
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    self.registerVideoElement(el, true);
    if (!self.videoEnabled) runMediaOp("video", () => self.enableVideo());
    if (!self.audioEnabled) runMediaOp("audio", () => self.enableAudio());

    let mounted = true;
    const refreshDevices = async () => {
      try {
        const [audio, video, speaker] = await Promise.all([
          self.getAudioDevices(),
          self.getVideoDevices(),
          self.getSpeakerDevices(),
        ]);
        if (!mounted) return;
        setDevices({ audio, video, speaker });
        setCurrent(self.getCurrentDevices());
      } catch {
        // 媒体尚未就绪时忽略，等 deviceUpdate 再刷新
      }
    };
    void refreshDevices();

    const onVideoUpdate = (payload: { videoEnabled: boolean }) =>
      setVideoEnabled(payload.videoEnabled);
    const onAudioUpdate = (payload: { audioEnabled: boolean }) =>
      setAudioEnabled(payload.audioEnabled);
    const onDeviceUpdate = () => {
      setCurrent(self.getCurrentDevices());
      void refreshDevices();
    };
    self.addListener("videoUpdate", onVideoUpdate);
    self.addListener("audioUpdate", onAudioUpdate);
    self.addListener("deviceUpdate", onDeviceUpdate);
    return () => {
      mounted = false;
      self.removeListener("videoUpdate", onVideoUpdate);
      self.removeListener("audioUpdate", onAudioUpdate);
      self.removeListener("deviceUpdate", onDeviceUpdate);
      self.deregisterVideoElement(el, true);
    };
  }, [self, runMediaOp]);

  // 确认进入：昵称 + 加入；加入成功后由编排层切到通话界面
  const enterMeeting = useCallback(async () => {
    setJoining(true);
    setError("");
    try {
      if (canEditName && displayName.trim()) self.setName(displayName.trim());
      await meeting.join();
      onEnter();
    } catch (err) {
      setError(err instanceof Error ? err.message : "进入通话失败");
      setJoining(false);
    }
  }, [canEditName, displayName, meeting, onEnter, self]);

  const toggleVideo = useCallback(() => {
    runMediaOp(
      "video",
      () => (videoEnabled ? self.disableVideo() : self.enableVideo()),
      () => message.error("摄像头操作失败，请检查浏览器权限"),
    );
  }, [message, runMediaOp, self, videoEnabled]);

  const toggleAudio = useCallback(() => {
    runMediaOp(
      "audio",
      () => (audioEnabled ? self.disableAudio() : self.enableAudio()),
      () => message.error("麦克风操作失败，请检查浏览器权限"),
    );
  }, [message, runMediaOp, self, audioEnabled]);

  const switchDevice = useCallback(
    async (deviceId?: string) => {
      const device = [
        ...devices.audio,
        ...devices.video,
        ...devices.speaker,
      ].find((item) => item.deviceId === deviceId);
      if (!device) return;
      try {
        await self.setDevice(device);
      } catch {
        message.error("切换设备失败");
      }
    },
    [devices, message, self],
  );

  const deviceOptions = (list: MediaDeviceInfo[], kindLabel: string) =>
    list.map((device, index) => ({
      value: device.deviceId,
      label: device.label || `${kindLabel} ${index + 1}`,
    }));

  // 房主保存房间名称：失焦 / 回车触发，成功后上抛给编排层（分享文案 / 通话顶栏）
  const saveRoomName = useCallback(async () => {
    const next = roomNameDraft.trim().slice(0, 40);
    if (!next || next === roomName || !roomCode) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/realtime/rooms/${roomCode}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "修改房间名称失败");
      onRename(next);
      message.success("房间名称已更新");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "修改房间名称失败");
      setRoomNameDraft(roomName);
    } finally {
      setRenaming(false);
    }
  }, [message, onRename, roomCode, roomName, roomNameDraft]);

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-4">
      <div className="grid w-full max-w-3xl gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
        {/* 左侧：摄像头预览 + 开关 + 设备选择 */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            {!videoEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-(--ant-color-text-tertiary)">
                <VideoCameraOutlined style={{ fontSize: 28 }} />
                <span className="text-xs">摄像头未开启</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              icon={
                audioEnabled ? (
                  <AudioOutlined />
                ) : (
                  /* AudioMutedOutlined 自带斜线，只需标红 */
                  <span style={{ color: "#ef4444" }}>
                    <AudioMutedOutlined />
                  </span>
                )
              }
              onClick={toggleAudio}
            >
              {audioEnabled ? "关闭麦克风" : "开启麦克风"}
            </Button>
            <Button
              icon={
                videoEnabled ? (
                  <VideoCameraOutlined />
                ) : (
                  <DisabledIcon>
                    <VideoCameraOutlined />
                  </DisabledIcon>
                )
              }
              onClick={toggleVideo}
            >
              {videoEnabled ? "关闭摄像头" : "开启摄像头"}
            </Button>
          </div>
          <Select
            size="small"
            placeholder="麦克风"
            value={current.audio?.deviceId}
            onChange={switchDevice}
            options={deviceOptions(devices.audio, "麦克风")}
          />
          <Select
            size="small"
            placeholder="摄像头"
            value={current.video?.deviceId}
            onChange={switchDevice}
            options={deviceOptions(devices.video, "摄像头")}
          />
          <Select
            size="small"
            placeholder="扬声器"
            value={current.speaker?.deviceId}
            onChange={switchDevice}
            options={deviceOptions(devices.speaker, "扬声器")}
          />
        </div>

        {/* 右侧：房间信息 + 昵称 + 进入按钮 */}
        <div className="flex flex-col justify-center gap-4">
          <div>
            {/* 会议名称：点击即改，失焦 / 回车保存；空时占位显示默认会议名称 */}
            <UnderlineInput
              disabled={!isHost || renaming}
              maxLength={40}
              value={roomNameDraft}
              placeholder={roomName || "视频通话"}
              onChange={(e) => setRoomNameDraft(e.target.value)}
              onBlur={() => void saveRoomName()}
              onPressEnter={(e) => e.currentTarget.blur()}
            />
            <div className="mt-1 text-xs text-(--ant-color-text-secondary)">
              房间号：
              <code>{roomCode ? formatRoomCode(roomCode) : ""}</code>
            </div>
            {isHost && (
              <div className="mt-1 text-xs text-(--ant-color-text-tertiary)">
                点击名称可修改，失焦或回车保存；清空则保持默认名称
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 text-xs text-(--ant-color-text-secondary)">
              参会昵称
            </div>
            <Input
              spellCheck={false}
              autoFocus
              value={displayName}
              disabled={!canEditName}
              placeholder="你的昵称"
              onChange={(e) => setDisplayName(e.target.value)}
              onPressEnter={() => void enterMeeting()}
            />
          </div>
          <Button
            type="primary"
            size="large"
            block
            loading={joining}
            onClick={() => void enterMeeting()}
          >
            进入
          </Button>
          {error && (
            <div className="text-xs text-(--ant-color-error)">{error}</div>
          )}
          <Button type="text" block onClick={onCancel}>
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}
