/**
 * 原子测试 1：生成验证码并写入 Redis
 * 运行：node scripts/code-generate.mjs
 *
 * 流程：generateVerificationCode 生成 6 位验证码 ->
 *   写入 Redis（key = 邮箱，TTL 300 秒）-> 回读校验一致。
 * 通过后 Redis 中保留该验证码，供 code-consume.mjs 消费。
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getRedis } from "../lib/redisClient.ts";
import { generateVerificationCode } from "../lib/verificationCode.ts";

const EMAIL = "3206780382ly@gmail.com";
const TTL_SECONDS = 300;

async function testGenerateCode() {
  const redis = getRedis();
  const code = generateVerificationCode();

  if (!/^\d{6}$/.test(code)) {
    throw new Error(`生成的验证码格式非法: ${code}`);
  }

  await redis.set(EMAIL, code, { ex: TTL_SECONDS });
  const stored = await redis.get(EMAIL);

  // 注意：@upstash/redis 反序列化会把纯数字字符串 parse 成 number，需统一转字符串比较
  if (String(stored) !== code) {
    throw new Error(`回读不一致: 写入=${code}, 读出=${stored}`);
  }

  console.log(`[生成测试] 通过 -> key=${EMAIL}, code=${code}, ttl=${TTL_SECONDS}s`);
}

async function main() {
  await testGenerateCode();
  console.log("生成测试通过 ✅");
}

main().catch((err) => {
  console.error("测试失败 ❌:", err.message);
  process.exit(1);
});
