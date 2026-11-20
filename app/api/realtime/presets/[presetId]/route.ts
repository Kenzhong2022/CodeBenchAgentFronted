import { NextResponse } from "next/server";
import { callPython } from "@/lib/pythonApi";
import { rtkFetch, rtkEnv } from "@/lib/realtime-kit";

/**
 * @description 单个 RealtimeKit 预设的转发层：详情 / 删除。
 *   编辑（PATCH）暂未开放，前端无入口；内置预设被 CF 拒绝删除时，
 *   其错误信息会原样透传给前端展示
 */

async function currentUser(request: Request) {
  const cookie = request.headers.get("cookie");
  const me = await callPython("/api/auth/me", {
    headers: cookie ? { cookie } : {},
  });
  return me.ok
    ? (me.body as { user?: { id?: string } }).user
    : undefined;
}

function fail(err: unknown): NextResponse {
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "请求失败" },
    { status: 502 },
  );
}

/** @description 读取详情（含完整权限 config，供编辑弹窗回填） */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ presetId: string }> },
): Promise<NextResponse> {
  const user = await currentUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const { presetId } = await params;
  try {
    const data = await rtkFetch<Record<string, unknown>>(
      "GET",
      `/presets/${presetId}`,
    );
    return NextResponse.json({ preset: data });
  } catch (err) {
    return fail(err);
  }
}

/** @description 删除预设；内置预设会被 CF 拒绝 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ presetId: string }> },
): Promise<NextResponse> {
  const user = await currentUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const { presetId } = await params;
  try {
    const data = await rtkFetch<Record<string, unknown>>(
      "DELETE",
      `/presets/${presetId}`,
    );
    return NextResponse.json({ preset: data });
  } catch (err) {
    return fail(err);
  }
}
