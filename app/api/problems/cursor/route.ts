import { NextResponse } from "next/server";

/**
 * @description Python 服务端（CodeBenchAgent FastAPI）地址：暂时连接线上部署
 *              （https://codebenchagent.vercel.app），本地开发可经 CODEBENCH_API_URL 覆盖回 127.0.0.1:8000
 */
// Worker 运行时模块加载阶段拿不到请求级环境变量，必须在请求时读取
function apiBase(): string {
  return process.env.CODEBENCH_API_URL ?? "https://codebenchagent.vercel.app";
}

/**
 * @description 游标分页获取题目列表：转发 GET /api/problems/cursor，按 id 递增翻页（keyset 分页），返回轻量列表字段
 * @param req 前端请求，可带 cursor（上一页返回的 next_cursor，首页省略）、limit（1-100，默认 20）、dataset_name 筛选
 * @returns {items, has_more, next_cursor}：items 为当前页题目；has_more 标记是否还有下一页；next_cursor 供下一次请求透传
 */
export async function GET(req: Request): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const search = new URLSearchParams();
  const cursor = params.get("cursor");
  if (cursor) search.set("cursor", cursor);
  const limit = params.get("limit");
  if (limit) search.set("limit", limit);
  const datasetName = params.get("dataset_name");
  if (datasetName) search.set("dataset_name", datasetName);

  // 后端未启动 / 网络不可达时 fetch 会抛 TypeError（如 ECONNREFUSED），兜底为 502
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/problems/cursor?${search.toString()}`, {
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: `后端服务不可用（${apiBase()}），请确认 FastAPI 服务已启动` },
      { status: 502 },
    );
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = (body as { detail?: string } | null)?.detail ?? "Python 服务端请求失败";
    return NextResponse.json({ error: detail }, { status: res.status });
  }
  return NextResponse.json(body);
}
