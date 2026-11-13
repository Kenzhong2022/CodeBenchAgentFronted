import { NextResponse } from "next/server";
import { callPython, errorResponse, forwardJsonBody } from "@/lib/pythonApi";

/**
 * @description 注册：验证码消费、邮箱查重与账号创建均由 Python 服务端实现，本路由仅做转发
 */
export async function POST(request: Request): Promise<NextResponse> {
  const { ok, status, body } = await callPython(
    "/api/auth/register",
    await forwardJsonBody(request)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
