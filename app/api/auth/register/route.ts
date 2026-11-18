import { NextResponse } from "next/server";
import { callPython, errorResponse } from "@/lib/pythonApi";
import { gateTurnstile } from "@/lib/turnstile";

/**
 * @description 注册：先过 Turnstile 人机验证（action=register），再转发 Python 服务端；
 *   验证码消费、邮箱查重与账号创建均由 Python 服务端实现，本路由仅做转发
 */
export async function POST(request: Request): Promise<NextResponse> {
  const text = await request.text();
  let payload: { turnstileToken?: unknown } = {};
  try {
    payload = JSON.parse(text || "{}");
  } catch {
    // 保持空 payload：token 校验会拒绝缺失
  }
  const gate = await gateTurnstile(payload.turnstileToken, request, "register");
  if (!gate.ok) return gate.response;

  const { ok, status, body } = await callPython("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: text,
  });
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
