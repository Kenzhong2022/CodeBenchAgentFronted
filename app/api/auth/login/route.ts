import { NextResponse } from "next/server";
import {
  callPythonRaw,
  errorResponse,
  forwardJsonBody,
} from "@/lib/pythonApi";

/**
 * @description 登录：校验逻辑（密码散列比对、防邮箱枚举）由 Python 服务端实现，本路由仅做转发；
 *   Python 端成功后签发会话 JWT 写入 Set-Cookie（HttpOnly），原样透传给浏览器
 */
export async function POST(request: Request): Promise<NextResponse> {
  const { ok, status, body, setCookies } = await callPythonRaw(
    "/api/auth/login",
    await forwardJsonBody(request)
  );
  if (!ok) return errorResponse(status, body);

  const next = NextResponse.json(body);
  for (const cookie of setCookies) next.headers.append("set-cookie", cookie);
  return next;
}
