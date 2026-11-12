import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * @description Python 服务端（CodeBenchAgent FastAPI）地址：本地开发默认 8000 端口，部署时通过环境变量覆盖
 */
// Worker 运行时模块加载阶段拿不到请求级环境变量，必须在请求时读取
function apiBase(): string {
  return process.env.CODEBENCH_API_URL ?? "http://127.0.0.1:8000";
}

/**
 * @description 调用 Python 服务端接口（服务器对服务器请求，不涉及浏览器 CORS）
 * @param path Python 端路径（以 / 开头）
 * @param init fetch 配置（method / body 等）
 * @returns ok 是否成功、status HTTP 状态码、body 解析后的 JSON
 */
async function callPython(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${apiBase()}${path}`, { cache: "no-store", ...init });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

/**
 * @description 把 Python 端的 FastAPI 错误结构（{detail: ...}）转成前端统一的 {error: ...} 响应
 * @param status Python 端返回的 HTTP 状态码
 * @param body Python 端返回的响应体
 * @returns 统一错误格式的 NextResponse
 */
function errorResponse(status: number, body: unknown): NextResponse {
  const detail = (body as { detail?: string } | null)?.detail;
  return NextResponse.json({ error: detail ?? "Python 服务端请求失败" }, { status });
}

/**
 * @description 获取题目（只读）：带 id 时转发单条查询（预览页使用），否则转发列表查询并解包 {count, data} 为数组
 * @param req 前端请求（可带 id / dataset_name / limit / offset 查询参数）
 * @returns 单条题目对象或题目数组
 */
export async function GET(req: Request): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const id = params.get("id");

  // count_only=1：直接向 Supabase 做精确计数（head 请求不拉数据），供统计卡片获取题库总数
  if (!id && params.get("count_only")) {
    const { count, error } = await getSupabase()
      .from("problems")
      .select("id", { count: "exact", head: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: count ?? 0 });
  }

  if (id) {
    const { ok, status, body } = await callPython(`/api/problems/${id}`);
    return ok ? NextResponse.json(body) : errorResponse(status, body);
  }

  const search = new URLSearchParams();
  const datasetName = params.get("dataset_name");
  if (datasetName) search.set("dataset_name", datasetName);
  // 提交管理页需要全量题目做标题映射，默认拉取 1000 条
  search.set("limit", params.get("limit") ?? "1000");
  search.set("offset", params.get("offset") ?? "0");

  const { ok, status, body } = await callPython(`/api/problems?${search.toString()}`);
  if (!ok) return errorResponse(status, body);
  const data = (body as { data?: unknown[] } | null)?.data ?? [];
  return NextResponse.json(data);
}
