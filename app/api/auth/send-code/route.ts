import { NextResponse } from "next/server";
import { callPython, errorResponse } from "@/lib/pythonApi";
import { gateTurnstile } from "@/lib/turnstile";

/**
 * @description 发送注册验证码：先过 Turnstile 人机验证（action=send_code，防邮件轰炸），
 *   再转发 Python 服务端；验证码生成、Redis 存储冷却与 SMTP 发送均由 Python 服务端实现
 */
export async function POST(request: Request): Promise<NextResponse> {
  const text = await request.text();
  let payload: { turnstileToken?: unknown } = {};
  try {
    payload = JSON.parse(text || "{}");
  } catch {
    // 保持空 payload：token 校验会拒绝缺失
  }
  const gate = await gateTurnstile(
    payload.turnstileToken,
    request,
    "send_code"
  );
  if (!gate.ok) return gate.response;

  const { ok, status, body } = await callPython("/api/auth/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: text,
  });
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
