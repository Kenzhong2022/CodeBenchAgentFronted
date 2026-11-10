// Upstash Redis 连通性测试脚本（ESM 版本）
// 运行：node script/test-redis.mjs
import { Redis } from "@upstash/redis";

// 本项目的环境变量放在 .env.local（Next.js 约定），dotenv 默认只读 .env，需显式指定路径
import { config } from "dotenv";
config({ path: ".env.local" });

async function testRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  console.log("正在连接 Redis:", url);
  if (!url || !token) {
    console.error("❌ 缺少 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 环境变量");
    return;
  }

  const redis = new Redis({ url, token });

  try {
    // 1. 写入一个测试键（带 60 秒过期，避免测试数据留在库里）
    await redis.set("foo", "bar", { ex: 60 });
    console.log("✅ set foo=bar 成功");

    // 2. 读回验证
    const value = await redis.get("foo");
    console.log(value === "bar" ? "✅ get foo 校验一致" : `❌ get foo 返回异常: ${value}`);
  } catch (error) {
    console.error("❌ Redis 操作失败:", error.message);
  }
}

testRedis();
