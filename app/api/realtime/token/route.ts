import { NextResponse } from "next/server";
import { callPython } from "@/lib/pythonApi";
import { listPresetNames } from "@/lib/realtime-kit";
import {
  clearUserRoom,
  createRoomCode,
  getRoom,
  getUserRoom,
  isCodeStoreConfigured,
  isValidRoomCode,
  setUserRoom,
} from "@/lib/room-code";

/**
 * @description 1v1 通话会议的令牌签发：浏览器 → 本路由 → Cloudflare RealtimeKit REST。
 *   API Token 只保存在服务端（Worker secret），浏览器只拿到短期的 participant token。
 *   请求体可带 9 位短会议号：带上则加入已有会议，不带则先创建会议再加入。
 */

type RtkResult<T> = {
  success?: boolean;
  data?: T;
  errors?: { message?: string }[];
};

/**
 * @description 调用 RealtimeKit REST API，返回 Cloudflare v4 风格的 JSON 响应。
 * @param accountId Cloudflare 账户 ID
 * @param appId RealtimeKit 应用 ID
 * @param apiToken RealtimeKit API Token
 * @param path API 路径（如 /participate）
 * @param body 请求体
 * @returns 响应体（成功时为 T，失败时抛出异常）
 */
async function rtkPost<T>(
  accountId: string,
  appId: string,
  apiToken: string,
  path: string,
  body: unknown,
): Promise<T> {
  console.log(`==== 调用 RealtimeKit API ====${accountId}${appId}${path}`);
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  const json = (await res.json().catch(() => null)) as RtkResult<T> | null;
  if (!res.ok || !json?.success || !json.data) {
    throw new Error(json?.errors?.[0]?.message ?? `RealtimeKit ${res.status}`);
  }
  return json.data;
}

/**
 * @description 一个用户同一时间只能关联一个会议：进入新会议前释放旧关联。
 *              只解除关联不关闭会议——会议关闭是房主的显式操作（会议内「关闭会议」按钮），
 *              临时切换后凭会议号仍可回到自己的会议；无主会议随短号 TTL 过期回收
 * @param userId 当前用户 ID
 * @param nextRoomCode 即将进入的会议号，与旧关联相同时不做处理
 */
async function releasePreviousRoom(
  userId: string,
  nextRoomCode: string,
): Promise<void> {
  const previousCode = await getUserRoom(userId);
  if (!previousCode || previousCode === nextRoomCode) return;
  await clearUserRoom(userId);
}

/**
 * @description 处理 POST 请求，返回 1v1 通话会议的令牌。
 * @param request 包含 roomCode（加入）或 roomName（创建）的 JSON 请求体
 * @returns 包含 meetingId、roomCode、roomName、isHost 和 authToken 的 JSON 响应
 * @throws 503 通话服务或短号服务未配置
 * @throws 401 未登录
 * @throws 400 会议号格式错误
 * @throws 404 会议号不存在或已过期
 * @throws 410 会议已关闭
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Worker 运行时模块加载阶段读不到请求级环境变量，必须在请求内读取
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const appId = process.env.REALTIMEKIT_APP_ID;
  const apiToken = process.env.CLOUDFLARE_REALTIME_API_TOKEN;
  if (!accountId || !appId || !apiToken) {
    return NextResponse.json({ error: "通话服务未配置" }, { status: 503 });
  }

  // 用现有 HttpOnly 会话向 Python 端确认身份，未登录不允许创建 / 加入会议
  const cookie = request.headers.get("cookie");
  const me = await callPython("/api/auth/me", {
    headers: cookie ? { cookie } : {},
  });
  const user = me.ok
    ? (me.body as { user?: { id?: string; email?: string; name?: string } })
        .user
    : undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    roomCode?: string;
    roomName?: string;
  } | null;
  const requestedRoomCode =
    typeof payload?.roomCode === "string" ? payload.roomCode.trim() : undefined;
  // 创建会议时可自定义名称；不传或为空时使用「用户名 + 视频会议」
  const requestedRoomName =
    typeof payload?.roomName === "string"
      ? payload.roomName.trim().slice(0, 40)
      : "";

  if (requestedRoomCode && !isValidRoomCode(requestedRoomCode)) {
    return NextResponse.json({ error: "会议号无效" }, { status: 400 });
  }

  try {
    let meetingId = "";
    let roomCode = "";
    let roomName: string;
    let isHost = false;
    let presetName: string;

    if (requestedRoomCode) {
      // 短号换回会议记录；关闭 / 过期时不再签发 token
      const room = await getRoom(requestedRoomCode);
      if (!room) {
        return NextResponse.json(
          { error: "会议号不存在或已过期" },
          { status: 404 },
        );
      }
      if (room.status === "closed") {
        return NextResponse.json({ error: "会议已关闭" }, { status: 410 });
      }
      // 房主判定规则：RoomRecord.ownerId 是创建会议时固化的创建者 user.id（见
      // lib/room-code.ts），此处比对当前用户——相等即房主（含房主断线重进），
      // 不等即参与者；前端 UI 与 close / rename 接口都以此身份为准
      isHost = Boolean(room.ownerId) && room.ownerId === user.id;
      meetingId = room.meetingId;
      roomCode = requestedRoomCode;
      roomName = room.name || "视频通话";
      presetName = isHost
        ? (process.env.REALTIMEKIT_HOST_PRESET ?? "group_call_host")
        : (process.env.REALTIMEKIT_PRESET ?? "group_call_participant");
    } else {
      if (!isCodeStoreConfigured()) {
        return NextResponse.json(
          { error: "短号服务未配置" },
          { status: 503 },
        );
      }
      roomName =
        requestedRoomName || `${user.name ?? user.email ?? "用户"}的视频会议`;
      isHost = true;
      // 创建者即房主，签发时使用房主预设
      presetName =
        process.env.REALTIMEKIT_HOST_PRESET ?? "group_call_host";
    }

    // 在产生任何副作用（建会 / 写短号 / 加参会人）之前校验预设存在：预设是
    // App 级资源，名称写错或被删除时 Add Participant 只会报模糊错误，这里
    // 提前查询预设列表给出明确指引；列表拉取失败不阻断，交给后续兜底
    try {
      const presetNames = await listPresetNames();
      if (presetNames.length > 0 && !presetNames.includes(presetName)) {
        return NextResponse.json(
          {
            error: `通话预设「${presetName}」不存在于 RealtimeKit 应用（当前可用：${presetNames.join("、")}），请到 Dashboard → Realtime → Presets 检查或设置 REALTIMEKIT_*_PRESET 环境变量`,
          },
          { status: 502 },
        );
      }
    } catch {
      // 预设校验失败不阻断签发流程
    }

    // 加入模式在上方已拿到 meetingId；创建模式此刻才建会并写短号
    if (!meetingId) {
      meetingId = (
        await rtkPost<{ id: string }>(accountId, appId, apiToken, "/meetings", {
          title: roomName,
        })
      ).id;
      // 创建者即房主：createRoomCode 会把 user.id 固化进 RoomRecord.ownerId
      roomCode = await createRoomCode(meetingId, user.id, roomName);
    }

    // 每次加入都重新签发 token：participant token 不能复用
    const participant = await rtkPost<{ token?: string; authToken?: string }>(
      accountId,
      appId,
      apiToken,
      `/meetings/${meetingId}/participants`,
      {
        custom_participant_id: user.id,
        // 房主使用带管理能力的预设，普通参与者使用普通预设；预设已在
        // 上方对照 App 的 Presets 列表校验过
        preset_name: presetName,
        name: user.name ?? user.email ?? "用户",
      },
    );

    // 一个用户只关联一个会议。关联的解除方式分两类：
    // ① 不带会议号进入会议页时，前端弹窗由用户选择「重新加入 / 不加入并解绑」，
    //    解绑走 DELETE /api/realtime/rooms/mine（只删指针不关会议）；
    // ② 邀请链接直达加入（意图明确，无需询问）：此处自动把关联切到新会议，
    //    同会议重入时 releasePreviousRoom 自动跳过。两种情况都只动关联指针，
    //    会议关闭仍是房主在会议内的显式操作
    await releasePreviousRoom(user.id, roomCode);
    await setUserRoom(user.id, roomCode);

    return NextResponse.json({
      meetingId,
      roomCode,
      roomName,
      isHost,
      authToken: participant.token ?? participant.authToken,
    });
  } catch (err) {
    console.error("[realtimekit] 创建通话失败", err);
    return NextResponse.json(
      { error: "无法加入通话，请稍后重试" },
      { status: 502 },
    );
  }
}
