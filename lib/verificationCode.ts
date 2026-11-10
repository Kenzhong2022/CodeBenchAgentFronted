/**
 * @description 生成随机 6 位数字验证码
 * @returns 六位数字字符串（保留前导零），如 "042517"
 */
export function generateVerificationCode(): string {
  // getRandomValues 在浏览器与 Node(19+) 均内置，随机性优于 Math.random
  const random = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  // 取模映射到 0~999999，模偏差约为百万分之一量级，可忽略
  return String(random % 1000000).padStart(6, "0");
}
