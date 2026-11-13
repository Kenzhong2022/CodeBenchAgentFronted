import { NextResponse } from "next/server";
import { callPython, errorResponse, forwardJsonBody } from "@/lib/pythonApi";

// 单个用户转发：局部更新与删除；业务校验由 Python 端实现

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  req: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;
  const { ok, status, body } = await callPython(
    `/api/users/${id}`,
    await forwardJsonBody(req)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}

export async function DELETE(
  _req: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;
  const { ok, status, body } = await callPython(
    `/api/users/${id}`,
    { method: "DELETE" }
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
