import { NextResponse } from "next/server";
import {
  callPythonRaw,
  errorResponse,
} from "@/lib/pythonApi";
import { gateTurnstile } from "@/lib/turnstile";

/**
 * @description 登录：先过 Turnstile 人机验证（action=login），再转发 Python 服务端；
 *   校验逻辑（密码散列比对、防邮箱枚举）由 Python 服务端实现，本路由仅做转发；
 *   Python 端成功后签发会话 JWT 写入 Set-Cookie（HttpOnly），原样透传给浏览器
 */
export async function POST(request: Request): Promise<NextResponse> {
  const text = await request.text();
  let payload: { turnstileToken?: unknown } = {};
  try {
    payload = JSON.parse(text || "{}");
  } catch {
    // 保持空 payload：token 校验会拒绝缺失
  }
  const gate = await gateTurnstile(payload.turnstileToken, request, "login");
  if (!gate.ok) return gate.response;

  const { ok, status, body, setCookies } = await callPythonRaw(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: text,
    }
  );
  if (!ok) return errorResponse(status, body);

  const next = NextResponse.json(body);
  for (const cookie of setCookies) next.headers.append("set-cookie", cookie);
  return next;
}
