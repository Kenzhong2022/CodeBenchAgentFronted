import { NextResponse } from "next/server";
import { callPython, errorResponse, forwardJsonBody } from "@/lib/pythonApi";

// 通用 CRUD 转发：表白名单、列白名单与数据校验均由 Python 服务端实现（未知表返回 404）

type RouteContext = { params: Promise<{ table: string }> };

export async function GET(
  _req: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  const { table } = await params;
  const { ok, status, body } = await callPython(`/api/crud/${table}`);
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}

export async function POST(
  req: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  const { table } = await params;
  const { ok, status, body } = await callPython(
    `/api/crud/${table}`,
    await forwardJsonBody(req)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}

export async function PATCH(
  req: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  const { table } = await params;
  const { ok, status, body } = await callPython(
    `/api/crud/${table}`,
    await forwardJsonBody(req)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}

export async function DELETE(
  req: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  const { table } = await params;
  const id = new URL(req.url).searchParams.get("id");
  const { ok, status, body } = await callPython(
    `/api/crud/${table}?id=${encodeURIComponent(id ?? "")}`
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
