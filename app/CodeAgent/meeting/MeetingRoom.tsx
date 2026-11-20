"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App as AntApp, Button, Spin } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  RealtimeKitProvider,
  useRealtimeKitClient,
  type LeaveRoomState,
} from "@cloudflare/realtimekit-react";
import { isValidRoomCode } from "@/lib/room-code";
import { clearLeaveGuard, setLeaveGuard } from "@/lib/leave-guard";
import MeetingHall from "./MeetingHall";
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
 *              MeetingHall / PreJoin / Room 三个展示组件
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

  /** @description 解除用户与指定房间的关联：主动退出（挂断 / 取消预览 /
   *  离开页面 / 房间被关闭）时调用；异常退出（关浏览器等）来不及调用，
   *  关联保留，靠下次进入会议页的重连弹窗兜底。
   *  返回 Promise 供退出流程等待：解绑落地后再回入口，否则入口的
   *  「查询关联房间」可能在 DELETE 在途时读到旧指针，误弹重连询问 */
  const unbindRoom = useCallback((code: string | null): Promise<void> => {
    if (!code) return Promise.resolve();
    // 带上 roomCode 条件解绑：另一标签页已切到新房间时不误删新关联
    return fetch("/api/realtime/rooms/mine", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: code }),
    })
      .then(() => undefined)
      .catch(() => undefined);
  }, []);

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

  /*
   * 从邀请链接进入：URL 已带房间号，直接加入。
   * 这里是在同步外部系统（换取 token 并初始化 RealtimeKit / 摄像头），
   * setState 都发生在 await 之后，不会产生同步级联渲染
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialRoomCode) void join({ roomCode: initialRoomCode });
  }, [initialRoomCode, join]);

  /*
   * 站内跳转（侧边栏 / 顶部导航 / 退出登录）前弹窗确认；
   * 确认离开即主动退出：退出通话并解除本房间关联，房间保留
   * （房主凭房间号可随时回来，关闭需在房间里显式操作）
   */
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
      // 跳转后组件卸载、roomLeft 监听可能来不及触发，这里直接解除关联；
      // 等待解绑落地再放行跳转，避免回到会议页时关联查询读到旧指针
      await unbindRoom(roomCode);
      return true;
    };
    setLeaveGuard(guard);
    return () => clearLeaveGuard(guard);
  }, [state.status, meeting, modal, roomCode, unbindRoom]);

  /*
   * 刷新 / 关闭标签页前弹浏览器确认框，防止误关丢会议；
   * 房间不会因离开被关闭（关闭是房主在房间内的显式操作）
   */
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

  /*
   * roomLeft 事件的 state 语义（LeaveRoomState，由 @cloudflare/realtimekit-react
   * 从 @cloudflare/realtimekit 转发导出）：
   * - left：自己主动离开（官方 UI 的「离开」按钮 / 站内跳转前的 meeting.leave）
   * - ended：会议被结束——房主在官方 UI 点「为所有人结束会议」或被 kickAll，
   *          房主与所有参与者都会收到此状态
   * - kicked：被房主单独移出会议
   * - rejected：申请发言（waitlist）被拒绝
   * - stageLeft：主动下台（livestream 场景）
   * - failed：房间节点故障且 SDK 重连耗尽，需重新加入
   * - disconnected / connected-meeting：断线与重连中，SDK 会自动恢复，不算离开
   * 除 disconnected / connected-meeting 外都视为「本次通话已退出」：
   * 解除房间关联并回到入口。被动退出（ended / kicked）弹窗告知原因，
   * 自己主动离开（left）无需提示。关浏览器等异常退出不会触发 roomLeft，
   * 关联保留由进入会议页时的重连弹窗兜底
   */
  useEffect(() => {
    if (state.status !== "joined" || !meeting) return;
    const onRoomLeft = (payload: { state: LeaveRoomState }) => {
      if (
        payload.state === "connected-meeting" ||
        payload.state === "disconnected"
      ) {
        return;
      }
      if (payload.state === "ended") {
        modal.info({
          title: "会议已结束",
          content: isHost ? "你已为所有人结束本次通话" : "房主已结束本次通话",
        });
      } else if (payload.state === "kicked") {
        modal.warning({ title: "你已被移出会议" });
      }
      /*
       * 解绑落地后再回入口：入口 effect 会立刻查询关联房间，
       * DELETE 在途时会被查询到、误弹「是否重新加入」
       */
      void unbindRoom(roomCode).then(() => {
        resetToIdle();
      });
    };
    meeting.self.on("roomLeft", onRoomLeft);
    return () => {
      meeting.self.removeListener("roomLeft", onRoomLeft);
    };
  }, [state.status, meeting, roomCode, isHost, modal, unbindRoom, resetToIdle]);

  /*
   * 进入会议页（无房间号参数）时查询当前用户的关联房间：有进行中的房间就弹窗
   * 询问「重新加入 / 解绑」——主动退出已在退出时解绑，弹窗主要兜底异常退出
   * （关浏览器等来不及解绑的场景）。重新加入则沿用原关联；解绑只是删除关联指针，
   * 房间本身保留（关闭仍是房主在房间内的显式操作）。邀请链接直达（?room=）
   * 不询问：用户意图明确，由 token 接口自动切换关联
   */
  useEffect(() => {
    if (initialRoomCode || state.status !== "idle") return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/realtime/rooms/mine").catch(() => null);
      if (!res?.ok || cancelled) return;
      const data = (await res.json().catch(() => null)) as {
        room?: { roomCode: string; roomName: string; isHost: boolean } | null;
      } | null;
      if (cancelled || !data?.room) return;
      const { roomCode, roomName, isHost } = data.room;
      modal.confirm({
        title: "你有一个进行中的通话",
        content: `${isHost ? "你创建的房间" : "你加入的房间"}「${roomName || "视频通话"}」（${roomCode}）仍在进行中，是否重新加入？`,
        okText: "重新加入",
        cancelText: "取消",
        onOk: () => {
          setState({ status: "joining" });
          void join({ roomCode });
        },
        onCancel: () => {
          // 用户选择不回去：按房间号条件解除关联，留在入口面板
          unbindRoom(roomCode);
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [initialRoomCode, state.status, modal, join, unbindRoom]);

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
    return <MeetingHall onCreate={handleCreate} onJoin={handleJoin} />;
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
          /*
           * 取消预览也是主动退出：token 已签发、关联已写入，这里解除；
           * 等解绑落地再回入口，避免入口关联查询读到旧指针误弹重连询问
           */
          onCancel={() => {
            void unbindRoom(roomCode).then(() => {
              resetToIdle();
            });
          }}
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
