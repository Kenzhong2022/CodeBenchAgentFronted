"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App as AntApp, Button, Spin } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  RealtimeKitProvider,
  useRealtimeKitClient,
} from "@cloudflare/realtimekit-react";
import { isValidRoomCode } from "@/lib/room-code";
import { clearLeaveGuard, setLeaveGuard } from "@/lib/leave-guard";
import EntryPanel from "./EntryPanel";
import PreJoin from "./PreJoin";
import Room from "./Room";

type JoinState =
  | { status: "idle" }
  | { status: "joining" }
  | { status: "prejoin" }
  | { status: "joined" }
  | { status: "error"; message: string };

/**
 * @description 会议流程编排层：管理空闲 → 接入中 → 进入前面板 → 通话中 → 出错 的状态机，
 *              负责换 token、初始化 RealtimeKit 与离开守卫；界面全部委托给
 *              EntryPanel / PreJoin / Room 三个展示组件
 * @param roomCode 9 位短房间号；null 表示展示创建入口
 */
export default function MeetingRoom({
  roomCode: initialRoomCode,
}: {
  roomCode: string | null;
}) {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [roomName, setRoomName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [state, setState] = useState<JoinState>(
    initialRoomCode ? { status: "joining" } : { status: "idle" },
  );
  const { modal } = AntApp.useApp();
  // 防止 React 严格模式下重复加入（重复 init 会浪费一个 token）
  const joinedRef = useRef(false);

  /** @description 用房间号或创建参数换 token 并初始化 meeting，成功后进入预览面板 */
  const join = useCallback(
    async (options?: { roomCode?: string; roomName?: string }) => {
      if (joinedRef.current) return;
      joinedRef.current = true;
      try {
        const res = await fetch("/api/realtime/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomCode: options?.roomCode,
            roomName: options?.roomName,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "无法加入通话");
        if (!data?.roomCode) throw new Error("房间号缺失");

        await initMeeting({ authToken: data.authToken });
        setRoomCode(data.roomCode);
        setRoomName(typeof data.roomName === "string" ? data.roomName : "");
        setIsHost(Boolean(data.isHost));
        // 短号写入地址栏：刷新 / 复制链接都能回到同一房间
        window.history.replaceState(
          null,
          "",
          `/CodeAgent/meeting?room=${data.roomCode}`,
        );
        // 先进入自绘面板确认设备，再真正加入房间
        setState({ status: "prejoin" });
      } catch (err) {
        joinedRef.current = false;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "无法加入通话",
        });
      }
    },
    [initMeeting],
  );

  // 从邀请链接进入：URL 已带房间号，直接加入。
  // 这里是在同步外部系统（换取 token 并初始化 RealtimeKit / 摄像头），
  // setState 都发生在 await 之后，不会产生同步级联渲染
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialRoomCode) void join({ roomCode: initialRoomCode });
  }, [initialRoomCode, join]);

  // 站内跳转（侧边栏 / 顶部导航 / 退出登录）前弹窗确认；
  // 离开只是退出通话，房间保留：房主凭房间号可随时回来，关闭需在房间里显式操作
  useEffect(() => {
    if (state.status !== "prejoin" && state.status !== "joined") return;
    const guard = async () => {
      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: "离开页面？",
          content: "离开页面会退出当前通话；房间会保留，凭房间号可以再次进入。",
          okText: "离开",
          cancelText: "取消",
          okButtonProps: { danger: true },
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmed) return false;
      if (state.status === "joined") await meeting.leave().catch(() => null);
      return true;
    };
    setLeaveGuard(guard);
    return () => clearLeaveGuard(guard);
  }, [state.status, meeting, modal]);

  // 刷新 / 关闭标签页前弹浏览器确认框，防止误关丢会议；
  // 房间不会因离开被关闭（关闭是房主在房间内的显式操作）
  useEffect(() => {
    if (state.status !== "prejoin" && state.status !== "joined") return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state.status]);

  // 房主关闭房间 / 预览阶段取消后回到创建入口
  const resetToIdle = useCallback(() => {
    joinedRef.current = false;
    setIsHost(false);
    setRoomCode(null);
    setRoomName("");
    setState({ status: "idle" });
    window.history.replaceState(null, "", "/CodeAgent/meeting");
  }, []);

  // 通话结束 / 主动挂断（含房主关闭、被踢出）后回到入口：清掉地址栏 room 参数，
  // 避免刷新或复制链接时误重进；disconnected / connected-meeting 是 SDK 的断线
  // 重连状态，不算离开，保持当前房间等待自动恢复
  useEffect(() => {
    if (state.status !== "joined" || !meeting) return;
    const onRoomLeft = (payload: { state: string }) => {
      if (
        payload.state === "connected-meeting" ||
        payload.state === "disconnected"
      ) {
        return;
      }
      resetToIdle();
    };
    meeting.self.on("roomLeft", onRoomLeft);
    return () => {
      meeting.self.removeListener("roomLeft", onRoomLeft);
    };
  }, [state.status, meeting, resetToIdle]);

  // 入口回调：创建 / 加入都走统一的 join 流程
  const handleCreate = useCallback(() => {
    setState({ status: "joining" });
    void join();
  }, [join]);

  const handleJoin = useCallback(
    (code: string) => {
      if (!isValidRoomCode(code)) return;
      setRoomCode(code);
      setState({ status: "joining" });
      void join({ roomCode: code });
    },
    [join],
  );

  if (state.status === "idle") {
    return <EntryPanel onCreate={handleCreate} onJoin={handleJoin} />;
  }

  if (state.status === "error") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-sm text-(--ant-color-error)">
            {state.message}
          </div>
          <div className="flex gap-3">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                joinedRef.current = false;
                setState({ status: "joining" });
                void join(roomCode ? { roomCode } : { roomName });
              }}
            >
              重试
            </Button>
            {/* 出口：放弃当前操作，回到创建 / 加入的选择页 */}
            <Button onClick={resetToIdle}>返回</Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "joining") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Spin />
        <span className="text-xs text-(--ant-color-text-tertiary)">
          正在接入通话…
        </span>
      </div>
    );
  }

  return (
    <RealtimeKitProvider value={meeting}>
      {state.status === "prejoin" ? (
        <PreJoin
          roomCode={roomCode}
          roomName={roomName}
          isHost={isHost}
          onEnter={() => setState({ status: "joined" })}
          onRename={setRoomName}
          onCancel={resetToIdle}
        />
      ) : (
        <Room
          roomCode={roomCode}
          roomName={roomName}
          isHost={isHost}
          onClosed={resetToIdle}
        />
      )}
    </RealtimeKitProvider>
  );
}
