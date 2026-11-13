import { NextResponse } from "next/server";
import { callPython, errorResponse, forwardJsonBody } from "@/lib/pythonApi";

/**
 * @description 登录：校验逻辑（密码散列比对、防邮箱枚举）由 Python 服务端实现，本路由仅做转发
 */
export async function POST(request: Request): Promise<NextResponse> {
  const { ok, status, body } = await callPython(
    "/api/auth/login",
    await forwardJsonBody(request)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
