import { NextResponse } from "next/server";

/**
 * 服务端 Turnstile siteverify 网关：浏览器 → 本后端 → siteverify，
 * 绝不在浏览器端直接调 siteverify。校验通过（success + action + hostname）才放行
 * 后续业务转发；令牌一次性消费，验证失败必须让前端重置组件重新获取
 */

// 前端部署主机名白名单（siteverify 返回的 hostname 必须命中）：
// 默认仅本地开发，生产环境通过 TURNSTILE_HOSTNAMES 配置，切勿包含 localhost
const EXPECTED_HOSTNAMES = new Set(
  (process.env.TURNSTILE_HOSTNAMES ?? "localhost,127.0.0.1")
    .split(",")
    .map((hostname) => hostname.trim())
    .filter(Boolean)
);

type GateResult =
  | { ok: true; token: string }
  | { ok: false; response: NextResponse };

/**
 * @description 校验请求体中的 turnstileToken；通过返回 ok:true，
 *              失败返回可直接 return 的 403 响应（errorResponse 统一格式）
 * @param rawToken 请求体里的 turnstileToken 字段（未传 / 类型不对一律拒绝）
 * @param request 原始请求，用于提取客户端 IP（X-Forwarded-For）作为 remoteip
 * @param expectedAction 约定的 action（login / register / send_code），须与前端组件配置一致
 */
export async function gateTurnstile(
  rawToken: unknown,
  request: Request,
  expectedAction: string
): Promise<GateResult> {
  const fail = (message: string): GateResult => ({
    ok: false,
    // 注意不用 errorResponse：它按 FastAPI 的 body.detail 取文案，会丢失网关消息
    response: NextResponse.json({ error: message }, { status: 403 }),
  });

  if (
    typeof rawToken !== "string" ||
    rawToken.length === 0 ||
    rawToken.length > 2048
  ) {
    return fail("请先完成人机验证");
  }

  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    // 密钥未配置时失败关闭：业务接口不放行，提示配置缺失
    console.error("[turnstile] 服务端未配置 TURNSTILE_SECRET");
    return fail("人机验证暂不可用，请稍后重试");
  }

  const remoteip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  let result: {
    success?: boolean;
    action?: string;
    hostname?: string;
    "error-codes"?: string[];
  };
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(10_000),
        body: new URLSearchParams({
          secret,
          response: rawToken,
          ...(remoteip ? { remoteip } : {}),
        }),
      }
    );
    if (!res.ok) throw new Error(`siteverify ${res.status}`);
    result = await res.json();
  } catch (err) {
    console.error("[turnstile] siteverify 请求失败", err);
    return fail("人机验证未通过，请重试");
  }

  if (
    !result.success ||
    result.action !== expectedAction ||
    !EXPECTED_HOSTNAMES.has(result.hostname ?? "")
  ) {
    // 打印 Cloudflare 原始失败原因：用于区分密钥错误 / action 错配 / 域名未授权 / token 无效过期
    console.warn("[turnstile] siteverify 未通过", {
      errorCodes: result["error-codes"],
      expectedAction,
      action: result.action,
      hostname: result.hostname,
      expectedHostnames: [...EXPECTED_HOSTNAMES],
    });
    return fail("人机验证未通过，请重试");
  }
  return { ok: true, token: rawToken };
}
