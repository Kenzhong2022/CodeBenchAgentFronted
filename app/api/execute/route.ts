import { NextResponse } from "next/server";
import { callPython, errorResponse, forwardJsonBody } from "@/lib/pythonApi";

// 代码执行 API：字段校验与沙箱执行均由 Python 服务端实现，本路由仅做转发。
// 请求体 {code, stdin?, test_cases?, test_imports?} 原样透传，响应含逐用例评测报告
export async function POST(req: Request): Promise<NextResponse> {
  const { ok, status, body } = await callPython(
    "/api/execute",
    await forwardJsonBody(req)
  );
  return ok ? NextResponse.json(body) : errorResponse(status, body);
}
