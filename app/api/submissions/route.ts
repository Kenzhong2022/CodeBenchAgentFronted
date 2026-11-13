import { NextResponse } from "next/server";
import { callPython, errorResponse, forwardJsonBody } from "@/lib/pythonApi";

// 提交记录 API：字段校验与数据库操作均由 Python 服务端实现，本路由仅做转发

export async function GET(): Promise<NextResponse> {
  const { ok, status, body } = await callPython("/api/submissions");
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
