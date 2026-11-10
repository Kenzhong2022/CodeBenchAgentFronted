/**
 * 原子测试 2：消费验证码（命令行输入比对，匹配才消费）
 * 运行：node scripts/code-consume.mjs <验证码>
 * 示例：node scripts/code-consume.mjs 464151
 *
 * 前置：先运行 code-generate.mjs 在 Redis 中写入验证码。
 * 流程：GET 读取验证码 -> 与命令行输入比对 -> 匹配才 DEL 删除 ->
 *   删除计数校验 -> 重复读取确认返回 null（保证不可复用）。
 * 不匹配时不删除，直接报错退出。
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getRedis } from "../lib/redisClient.ts";

const EMAIL = "3206780382ly@gmail.com";

async function testConsumeCode(input) {
  const redis = getRedis();

  const stored = await redis.get(EMAIL);
  if (stored === null) {
    throw new Error(`Redis 中无验证码可消费（key=${EMAIL}），请先运行 code-generate.mjs`);
  }

  // 注意：@upstash/redis 反序列化会把纯数字字符串 parse 成 number，需统一转字符串比较
  const code = String(stored);
  if (!/^\d{6}$/.test(code)) {
    throw new Error(`读到的验证码格式非法: ${code}`);
  }

  // 比对命令行输入，不匹配则不消费（不删除）
  if (input !== code) {
    throw new Error(`验证码不匹配: 输入=${input}, 实际=${code}（已保留，未消费）`);
  }

  const deleted = await redis.del(EMAIL);
  if (deleted !== 1) {
    throw new Error(`删除验证码失败: del 返回 ${deleted}`);
  }

  const again = await redis.get(EMAIL);
  if (again !== null) {
    throw new Error(`验证码删除后仍可读到: ${again}（未一次性消费）`);
  }

  console.log(`[消费测试] 通过 -> 输入 ${input} 与存储值匹配，已删除，重复读取返回 null`);
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    throw new Error("用法: node scripts/code-consume.mjs <6位验证码>");
  }
  await testConsumeCode(input);
  console.log("消费测试通过 ✅");
}

main().catch((err) => {
  console.error("测试失败 ❌:", err.message);
  process.exit(1);
});
