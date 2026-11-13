import { NextResponse } from "next/server";

/**
 * @description Python 服务端（CodeBenchAgent FastAPI）地址：本地开发默认 8000 端口，部署时通过环境变量覆盖
 */
// Worker 运行时模块加载阶段拿不到请求级环境变量，必须在请求时读取
export function apiBase(): string {
  return process.env.CODEBENCH_API_URL ?? "http://127.0.0.1:8000";
}

/**
 * @description 调用 Python 服务端接口（服务器对服务器请求，不涉及浏览器 CORS）
 * @param path Python 端路径（以 / 开头）
 * @param init fetch 配置（method / body 等）
 * @returns ok 是否成功、status HTTP 状态码、body 解析后的 JSON
 */
export async function callPython(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: unknown }> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, { cache: "no-store", ...init });
  } catch {
    // 后端未启动 / 网络不可达时 fetch 会抛 TypeError（如 ECONNREFUSED），兜底为 502
    return {
      ok: false,
      status: 502,
      body: { detail: `后端服务不可用（${apiBase()}），请确认 FastAPI 服务已启动` },
    };
  }
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

/**
 * @description 把 Python 端的 FastAPI 错误结构（{detail: ...}）转成前端统一的 {error: ...} 响应
 * @param status Python 端返回的 HTTP 状态码
 * @param body Python 端返回的响应体
 * @returns 统一错误格式的 NextResponse
 */
export function errorResponse(status: number, body: unknown): NextResponse {
  const detail = (body as { detail?: string } | null)?.detail;
  return NextResponse.json({ error: detail ?? "Python 服务端请求失败" }, { status });
}

/**
 * @description 构造转发用的 JSON 请求体配置：原样透传请求文本，保持 Python 端收到的结构与浏览器发出的一致
 * @param req 前端请求
 * @returns 可直接传给 callPython 的 init 片段
 */
export async function forwardJsonBody(req: Request): Promise<RequestInit> {
  const text = await req.text().catch(() => "");
  return {
    method: req.method,
    headers: { "Content-Type": "application/json" },
    body: text,
  };
}
