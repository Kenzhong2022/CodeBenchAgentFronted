import { NextResponse } from "next/server";
import { callPython } from "@/lib/pythonApi";
import {
  closeRoom,
  isCodeStoreConfigured,
  isValidRoomCode,
} from "@/lib/room-code";

/**
 * @description 房主关闭房间：关闭后该短号不再签发 token。
 * @throws 503 短号服务未配置
 * @throws 401 未登录
 * @throws 400 房间号格式错误
 * @throws 404 房间号不存在或已过期
 * @throws 403 非房主
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/realtime/rooms/[code]/close">,
): Promise<NextResponse> {
  const { code } = await ctx.params;
  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: "房间号无效" }, { status: 400 });
  }
  if (!isCodeStoreConfigured()) {
    return NextResponse.json({ error: "短号服务未配置" }, { status: 503 });
  }

  // 与 token 签发一致：用 HttpOnly 会话向 Python 端确认身份
  const cookie = request.headers.get("cookie");
  const me = await callPython("/api/auth/me", {
    headers: cookie ? { cookie } : {},
  });
  const user = me.ok
    ? (me.body as { user?: { id?: string } }).user
    : undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const result = await closeRoom(code, user.id);
  if (result === "not-found") {
    return NextResponse.json(
      { error: "房间号不存在或已过期" },
      { status: 404 },
    );
  }
  if (result === "forbidden") {
    return NextResponse.json(
      { error: "只有房主可以关闭房间" },
      { status: 403 },
    );
  }
  return NextResponse.json({ ok: true });
}
