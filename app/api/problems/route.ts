import { NextResponse } from "next/server";
import { callPython, errorResponse, forwardJsonBody } from "@/lib/pythonApi";

/**
 * @description 新增题目：转发 POST /api/problems，业务校验由 Python 端实现
 * @param req 前端请求，JSON body 为题目完整字段（dataset_name / prompt / test_cases 必填）
 * @returns {ok, data}：data 为新建的题目
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { ok, status, body } = await callPython(
    "/api/problems",
    await forwardJsonBody(req)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}

/**
 * @description 获取题目（只读）：全部逻辑由 Python 服务端实现，本路由仅做转发。
 *   带 id 时转发单条查询（预览页使用）；count_only=1 时转发精确计数；
 *   否则转发列表查询并解包 {count, data} 为数组
 * @param req 前端请求（可带 id / count_only / dataset_name / limit / offset 查询参数）
 * @returns 单条题目对象或题目数组
 */
export async function GET(req: Request): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const id = params.get("id");

  // count_only=1：题库精确总数，供统计卡片使用
  if (!id && params.get("count_only")) {
    const { ok, status, body } = await callPython("/api/problems/count");
    return ok ? NextResponse.json(body) : errorResponse(status, body);
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
