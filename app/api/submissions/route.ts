import { NextResponse } from "next/server";
import {
  callPython,
  errorResponse,
  forwardCookies,
  forwardJsonBody,
} from "@/lib/pythonApi";

// 提交记录 API：字段校验与数据库操作均由 Python 服务端实现，本路由仅做转发；
// mine=true 时 Python 端按会话 Cookie 过滤当前登录用户的提交，Cookie 需原样转发

export async function GET(req: Request): Promise<NextResponse> {
  const search = new URL(req.url).searchParams.toString();
  const { ok, status, body } = await callPython(
    `/api/submissions${search ? `?${search}` : ""}`,
    { ...forwardCookies(req) }
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}

export async function POST(req: Request): Promise<NextResponse> {
  const { ok, status, body } = await callPython(
    "/api/submissions",
    await forwardJsonBody(req)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const id = new URL(req.url).searchParams.get("id");
  const { ok, status, body } = await callPython(
    `/api/submissions?id=${encodeURIComponent(id ?? "")}`,
    await forwardJsonBody(req)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const id = new URL(req.url).searchParams.get("id");
  const { ok, status, body } = await callPython(
    `/api/submissions?id=${encodeURIComponent(id ?? "")}`,
    { method: "DELETE" }
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
