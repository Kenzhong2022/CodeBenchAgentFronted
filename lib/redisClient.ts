import { Redis } from "@upstash/redis";

// 仅服务端使用：凭据从环境变量读取，不会打包到浏览器。
// 用惰性单例而不是模块顶层创建——CI 构建环境没有 .env.local，
// 顶层 new Redis 会在 next build 收集页面数据时因缺少环境变量直接抛错。
let client: Redis | null = null;

/**
 * @description 获取全局唯一的 Upstash Redis 客户端：首次调用时读取环境变量并创建，后续复用同一实例
 * @returns Redis 实例
 */
export function getRedis(): Redis {
  if (!client) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "缺少 UPSTASH_REDIS_REST_URL 或 UPSTASH_REDIS_REST_TOKEN 环境变量（服务端）",
      );
    }
    client = new Redis({ url, token });
  }
  return client;
}
