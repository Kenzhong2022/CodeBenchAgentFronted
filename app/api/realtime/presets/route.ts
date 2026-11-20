import { NextResponse } from "next/server";
import { callPython } from "@/lib/pythonApi";
import { rtkFetch, rtkEnv, type PresetListItem } from "@/lib/realtime-kit";

/**
 * @description RealtimeKit 预设管理转发层（后台管理页专用）：
 *   浏览器 → 本路由 → CF Preset API，前端永远不直连 CF。
 *   列表 / 新建；内置预设的修改与删除会被 CF 拒绝，错误原样透传给前端展示
 */

/** @description Cookie 转发校验登录态（/api/auth/me 无角色字段，暂只做登录门禁） */
async function currentUser(request: Request) {
  const cookie = request.headers.get("cookie");
  const me = await callPython("/api/auth/me", {
    headers: cookie ? { cookie } : {},
  });
  return me.ok
    ? (me.body as { user?: { id?: string } }).user
    : undefined;
}

/** @description 统一错误出口：业务错误原样透传（保留 CF 的拒绝原因） */
function fail(err: unknown): NextResponse {
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "请求失败" },
    { status: 502 },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const user = await currentUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  if (!rtkEnv()) {
    return NextResponse.json({ error: "通话服务未配置" }, { status: 503 });
  }
  try {
    // 官方 schema：GET /presets 返回 data 数组 + paging（end/start_offset、
    // total_count），支持 page_no / per_page / search 查询参数；per_page 调大
    // 避免默认分页截断预设列表
    const data = await rtkFetch<PresetListItem[] | { presets?: PresetListItem[] }>(
      "GET",
      "/presets?per_page=100",
    );
    const items = Array.isArray(data) ? data : (data.presets ?? []);
    return NextResponse.json({ items });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  // 创建体支持官方 schema 的 name / config / permissions / ui 四段
  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    config?: unknown;
    permissions?: unknown;
    ui?: unknown;
  } | null;
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "预设名称不能为空" }, { status: 400 });
  }
  const pick = (v: unknown) =>
    v !== undefined && v !== null && !(typeof v === "object" && Object.keys(v as object).length === 0)
      ? v
      : undefined;
  try {
    const data = await rtkFetch<{ id: string; name: string }>("POST", "/presets", {
      name,
      ...(pick(payload?.config) !== undefined ? { config: payload?.config } : {}),
      ...(pick(payload?.permissions) !== undefined ? { permissions: payload?.permissions } : {}),
      ...(pick(payload?.ui) !== undefined ? { ui: payload?.ui } : {}),
    });
    return NextResponse.json({ preset: data });
  } catch (err) {
    return fail(err);
  }
}
