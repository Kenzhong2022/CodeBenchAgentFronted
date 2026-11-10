import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

/**
 * @description 生成密码散列（scrypt + 随机盐），格式 "salt:hash" 的 hex 字符串
 * @param password 明文密码
 * @returns 存入数据库的散列字符串
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * @description 校验明文密码是否与存储的散列匹配
 * @param password 明文密码
 * @param stored 数据库中的 "salt:hash" 散列字符串
 * @returns 是否匹配
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
