#!/usr/bin/env node
/**
 * Turnstile 反向验证测试脚本：模拟机器的几种攻击路径，验证 /api/auth/* 网关拦截能力。
 *
 * 用法：
 *   node scripts/turnstile-test.mjs                       # 基础测试（无 token / 假 token）
 *   node scripts/turnstile-test.mjs --base http://localhost:3000
 *   # 可选：从浏览器 DevTools 复制真实 token 跑高级用例
 *   node scripts/turnstile-test.mjs --replay-token <未使用的真实token>   # 重放攻击
 *   node scripts/turnstile-test.mjs --sendcode-token <发码token>         # action 错配
 *   node scripts/turnstile-test.mjs --valid-token <未使用的真实token>    # 正向对照
 *
 * 判定约定：403 = 被人机验证拦截；400/401/200 等 = 通过网关进入业务逻辑。
 * 结果同时输出到控制台并写入 scripts/turnstile-test-report.md；有 FAIL 时退出码为 1。
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
function argValue(name) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")
    ? argv[i + 1]
    : undefined;
}

const BASE = (argValue("--base") ?? "http://localhost:3000").replace(/\/$/, "");
const VALID_TOKEN = argValue("--valid-token");
const REPLAY_TOKEN = argValue("--replay-token");
const SENDCODE_TOKEN = argValue("--sendcode-token");

const ENDPOINTS = [
  { path: "/api/auth/login", label: "登录", action: "login" },
  { path: "/api/auth/register", label: "注册", action: "register" },
  { path: "/api/auth/send-code", label: "发码", action: "send_code" },
];

const results = [];

async function call(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  let message = "";
  try {
    message = (await res.json())?.error ?? "";
  } catch {
    message = "";
  }
  return { status: res.status, message };
}

function record(id, name, endpoint, description, got, expected, pass, note) {
  results.push({
    id,
    name,
    endpoint,
    description,
    got,
    expected,
    pass,
    note,
  });
}

/** T1/T2：无 token 与伪造 token，三个接口都应 403 */
for (const ep of ENDPOINTS) {
  const noToken = await call(ep.path, { email: "a@b.c", password: "x" });
  record(
    "T1",
    "无 token 直连",
    `${ep.label} ${ep.path}`,
    "脚本不带 turnstileToken 直接调用接口",
    `${noToken.status} ${noToken.message}`,
    "403",
    noToken.status === 403,
    noToken.status === 403 ? "未携带凭据被拒绝" : "接口未拦截无凭据请求"
  );

  const fake = await call(ep.path, {
    email: "a@b.c",
    password: "x",
    turnstileToken: "fake-token-from-bot-script",
  });
  record(
    "T2",
    "伪造 token",
    `${ep.label} ${ep.path}`,
    "脚本伪造任意字符串充当 turnstileToken",
    `${fake.status} ${fake.message}`,
    "403",
    fake.status === 403,
    fake.status === 403 ? "无效凭据被 siteverify 拒绝" : "伪造凭据未被拦截"
  );
}

/** T0：正向对照——携带真实未使用 token 应放行进入业务逻辑（状态码非 403） */
if (VALID_TOKEN) {
  const ok = await call("/api/auth/login", {
    email: "a@b.c",
    password: "x",
    turnstileToken: VALID_TOKEN,
  });
  record(
    "T0",
    "正向对照（真实 token）",
    "登录 /api/auth/login",
    "真实浏览器签发的未使用 token，应通过网关进入业务逻辑",
    `${ok.status} ${ok.message}`,
    "非 403（业务错误，如 401/400）",
    ok.status !== 403,
    ok.status !== 403 ? "网关正常放行真实用户" : "真实 token 被误拦"
  );
} else {
  record(
    "T0",
    "正向对照（真实 token）",
    "登录 /api/auth/login",
    "携带真实未使用 token 应放行（非 403）",
    "跳过",
    "非 403",
    null,
    "需 --valid-token <未使用的真实 token>（浏览器 Network 复制，勿先提交）"
  );
}

/** T3：重放攻击——同一 token 第二次使用必须被拒 */
if (REPLAY_TOKEN) {
  const first = await call("/api/auth/login", {
    email: "a@b.c",
    password: "x",
    turnstileToken: REPLAY_TOKEN,
  });
  const second = await call("/api/auth/login", {
    email: "a@b.c",
    password: "x",
    turnstileToken: REPLAY_TOKEN,
  });
  const pass = first.status !== 403 && second.status === 403;
  record(
    "T3",
    "重放攻击",
    "登录 /api/auth/login",
    "同一真实 token 连续使用两次，第二次应 403（一次性消费）",
    `第一次 ${first.status}，第二次 ${second.status}`,
    "第一次非 403，第二次 403",
    pass,
    pass
      ? "令牌一次性消费验证成立"
      : "token 可能已被提前消费（第一次即 403），请重新获取未使用的 token 再跑"
  );
} else {
  record(
    "T3",
    "重放攻击",
    "登录 /api/auth/login",
    "同一真实 token 连续使用两次，第二次应 403（一次性消费）",
    "跳过",
    "第一次非 403，第二次 403",
    null,
    "需 --replay-token <未使用的真实 token>"
  );
}

/** T4：action 错配——拿 send_code 的 token 打 login 必须 403 */
if (SENDCODE_TOKEN) {
  const mismatch = await call("/api/auth/login", {
    email: "a@b.c",
    password: "x",
    turnstileToken: SENDCODE_TOKEN,
  });
  record(
    "T4",
    "action 错配",
    "登录 /api/auth/login",
    "携带 send_code action 的合法 token 调用登录接口",
    `${mismatch.status} ${mismatch.message}`,
    "403",
    mismatch.status === 403,
    mismatch.status === 403 ? "action 比对生效" : "action 校验缺失"
  );
} else {
  record(
    "T4",
    "action 错配",
    "登录 /api/auth/login",
    "携带 send_code action 的合法 token 调用登录接口（应 403）",
    "跳过",
    "403",
    null,
    "需 --sendcode-token <发码接口的真实 token>"
  );
}

// ---- 汇总输出 ----
const passCount = results.filter((r) => r.pass === true).length;
const failCount = results.filter((r) => r.pass === false).length;
const skipCount = results.filter((r) => r.pass === null).length;
const now = new Date().toLocaleString("zh-CN", { hour12: false });

console.log("\n===== Turnstile 反向验证结果 =====");
for (const r of results) {
  const mark = r.pass === true ? "PASS" : r.pass === false ? "FAIL" : "SKIP";
  console.log(`[${mark}] ${r.id} ${r.name} (${r.endpoint}) -> ${r.got}`);
}
console.log(
  `\n通过 ${passCount} / 失败 ${failCount} / 跳过 ${skipCount}，报告已写入 scripts/turnstile-test-report.md\n`
);

const md = `# Turnstile 反向验证报告

- **测试时间**：${now}
- **目标服务**：${BASE}
- **结论**：通过 ${passCount}，失败 ${failCount}，跳过 ${skipCount}
  （SKIP = 需要真实 token 的高级用例，见各行"说明"；403 = 被人机验证拦截，非 403 = 通过网关进入业务逻辑）

| 编号 | 用例 | 接口 | 攻击描述 | 实际结果 | 预期 | 判定 | 说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
${results
  .map(
    (r) =>
      `| ${r.id} | ${r.name} | ${r.endpoint} | ${r.description} | ${r.got} | ${r.expected} | ${
        r.pass === true ? "通过" : r.pass === false ? "失败" : "跳过"
      } | ${r.note} |`
  )
  .join("\n")}

## 高级用例取 token 方法

在浏览器登录/注册页完成一次验证，DevTools → Network → 找到对应请求 → 复制请求体里的 \`turnstileToken\`：
- T3 重放：复制一个**未提交过**的登录 token，运行 \`node scripts/turnstile-test.mjs --replay-token <token>\`
- T4 错配：复制注册页发码请求的 token，运行 \`node scripts/turnstile-test.mjs --sendcode-token <token>\`
- T0 正向：复制一个未提交过的登录 token，运行 \`node scripts/turnstile-test.mjs --valid-token <token>\`
`;

const scriptDir = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(scriptDir, "turnstile-test-report.md"), md, "utf8");

if (failCount > 0) process.exitCode = 1;
