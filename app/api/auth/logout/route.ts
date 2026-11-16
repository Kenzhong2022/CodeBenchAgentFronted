import { NextResponse } from "next/server";
import { callPythonRaw, errorResponse } from "@/lib/pythonApi";

/**
 * @description 退出登录：Python 端返回清除会话 Cookie 的 Set-Cookie，原样透传给浏览器；
 *   前端 localStorage 登录标记由调用方（TopNav）另行清除
 */
export async function POST(): Promise<NextResponse> {
  const { ok, status, body, setCookies } = await callPythonRaw(
    "/api/auth/logout",
    { method: "POST" }
  );
  if (!ok) return errorResponse(status, body);

  const next = NextResponse.json(body);
  for (const cookie of setCookies) next.headers.append("set-cookie", cookie);
  return next;
}
