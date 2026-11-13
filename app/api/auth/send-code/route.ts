import { NextResponse } from "next/server";
import { callPython, errorResponse, forwardJsonBody } from "@/lib/pythonApi";

/**
 * @description 发送注册验证码：验证码生成、Redis 存储冷却与 SMTP 发送均由 Python 服务端实现，本路由仅做转发
 */
export async function POST(request: Request): Promise<NextResponse> {
  const { ok, status, body } = await callPython(
    "/api/auth/send-code",
    await forwardJsonBody(request)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
