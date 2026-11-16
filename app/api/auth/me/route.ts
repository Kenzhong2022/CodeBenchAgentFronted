import { NextResponse } from "next/server";
import { callPython, errorResponse, forwardCookies } from "@/lib/pythonApi";

/**
 * @description 当前登录用户：浏览器 Cookie 原样转发给 Python 端验签，
 *   未登录 / 过期由 Python 返回 401，转成统一 {error} 结构
 */
export async function GET(req: Request): Promise<NextResponse> {
  const { ok, status, body } = await callPython("/api/auth/me", {
    ...forwardCookies(req),
  });
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
