import { NextResponse } from "next/server";
import { callPython, errorResponse } from "@/lib/pythonApi";

/**
 * @description 游标分页获取题目列表：转发 GET /api/problems/cursor，按 id 递增翻页（keyset 分页），返回轻量列表字段。
 *   后端地址与错误转换统一走 lib/pythonApi（apiBase 单一来源，不再各文件自行降级）
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

  const { ok, status, body } = await callPython(
    `/api/problems/cursor?${search.toString()}`
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
