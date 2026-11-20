/**
 * @description Cloudflare RealtimeKit REST 的服务端共享客户端：
 *   统一读取 Worker secret、拼接 v4 地址、解析 v4 风格响应（{success, data, errors}）。
 *   仅限服务端使用（API Routes），严禁前端直连 CF API
 */

type RtkResult<T> = {
  success?: boolean;
  data?: T;
  errors?: { message?: string }[];
};

/**
 * @description 读取 RealtimeKit 三个环境变量；Worker 运行时模块加载阶段读不到
 *              请求级环境变量，必须在请求内调用本函数
 */
export function rtkEnv():
  | { accountId: string; appId: string; apiToken: string }
  | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const appId = process.env.REALTIMEKIT_APP_ID;
  const apiToken = process.env.CLOUDFLARE_REALTIME_API_TOKEN;
  return accountId && appId && apiToken
    ? { accountId, appId, apiToken }
    : null;
}

/**
 * @description 调用 RealtimeKit REST API；失败时抛错（message 优先取 CF 返回的
 *              errors[0].message，例如对内置预设执行修改会被 CF 拒绝并带原因）
 */
export async function rtkFetch<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const env = rtkEnv();
  if (!env) throw new Error("通话服务未配置");
  const { accountId, appId, apiToken } = env;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}${path}`,
    {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${apiToken}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
  );
  const json = (await res.json().catch(() => null)) as RtkResult<T> | null;
  if (!res.ok || !json?.success || json.data === undefined) {
    throw new Error(json?.errors?.[0]?.message ?? `RealtimeKit ${res.status}`);
  }
  return json.data as T;
}

/** @description 预设列表条目（官方 schema：不含 config，详情接口才有） */
export type PresetListItem = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

/**
 * @description 获取应用内全部预设名。签发参会人 token 前用它校验目标
 *              preset_name 是否真实存在——预设是 App 级资源，名称写错或预设
 *              被删除时，Add Participant 会报难以理解的错误，提前校验可以
 *              给出明确指引
 */
export async function listPresetNames(): Promise<string[]> {
  const data = await rtkFetch<PresetListItem[] | { presets?: PresetListItem[] }>(
    "GET",
    "/presets?per_page=100",
  );
  const items = Array.isArray(data) ? data : (data.presets ?? []);
  return items
    .map((item) => item.name)
    .filter((name): name is string => Boolean(name));
}
