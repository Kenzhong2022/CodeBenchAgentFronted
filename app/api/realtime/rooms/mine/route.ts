import { NextResponse } from "next/server";
import { callPython } from "@/lib/pythonApi";
import { clearUserRoom, getRoom, getUserRoom, isValidRoomCode } from "@/lib/room-code";

/**
 * @description 当前登录用户的会议关联（rtk:user:{userId}）：
 *   GET 查询是否有进行中的关联会议（进入会议页时弹窗询问是否重新加入，
 *   主要兜底异常退出——关浏览器等场景来不及解绑）；
 *   DELETE 解除绑定：主动退出（挂断 / 取消预览 / 离开页面）时由前端立即调用，
 *   用户在重连弹窗选「不回去」时也走这里。会议本身不受影响——
 *   关闭仍是房主在会议内的显式操作，解绑后的无主会议随短号 TTL 过期回收
 */

/** @description 转发 Cookie 校验登录态，返回当前用户或 null */
async function currentUser(request: Request) {
  const cookie = request.headers.get("cookie");
  const me = await callPython("/api/auth/me", {
    headers: cookie ? { cookie } : {},
  });
  return me.ok
    ? (me.body as { user?: { id?: string } }).user
    : undefined;
}

export async function GET(request: Request): Promise<NextResponse> {
  const user = await currentUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const code = await getUserRoom(user.id);
  if (!code) return NextResponse.json({ room: null });

  const room = await getRoom(code);
  // 关联的会议已过期 / 已关闭：指针失效，顺手清理，不再打扰用户
  if (!room || room.status === "closed") {
    await clearUserRoom(user.id, code);
    return NextResponse.json({ room: null });
  }

  return NextResponse.json({
    room: {
      roomCode: code,
      meetingId: room.meetingId,
      roomName: room.name,
      isHost: Boolean(room.ownerId) && room.ownerId === user.id,
      createdAt: room.createdAt,
    },
  });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const user = await currentUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  // 可选 roomCode：带上时只在当前关联正好指向该会议时清除，
  // 避免并发场景（如另一标签页已切到新会议）误删新关联
  const body = (await request.json().catch(() => null)) as {
    roomCode?: string;
  } | null;
  const roomCode =
    typeof body?.roomCode === "string" && isValidRoomCode(body.roomCode)
      ? body.roomCode
      : undefined;
  await clearUserRoom(user.id, roomCode);
  return NextResponse.json({ ok: true });
}
