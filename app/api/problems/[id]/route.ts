import { NextResponse } from "next/server";
import { callPython, errorResponse, forwardJsonBody } from "@/lib/pythonApi";

// 单个题目转发：局部更新与删除；业务校验由 Python 端实现

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(
  req: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;
  const { ok, status, body } = await callPython(
    `/api/problems/${id}`,
    await forwardJsonBody(req)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}

export async function DELETE(
  _req: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params;
  const { ok, status, body } = await callPython(`/api/problems/${id}`, {
    method: "DELETE",
  });
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
