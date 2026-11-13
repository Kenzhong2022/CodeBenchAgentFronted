import { NextResponse } from "next/server";
import { callPython, errorResponse, forwardJsonBody } from "@/lib/pythonApi";

// 用户管理转发：分页列表与创建；业务校验由 Python 端 /api/users 实现

export async function GET(req: Request): Promise<NextResponse> {
  const search = new URL(req.url).searchParams.toString();
  const { ok, status, body } = await callPython(
    `/api/users${search ? `?${search}` : ""}`
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}

export async function POST(req: Request): Promise<NextResponse> {
  const { ok, status, body } = await callPython(
    "/api/users",
    await forwardJsonBody(req)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
