import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redisClient";
import { getSupabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

interface RegisterBody {
  name?: string;
  email?: string;
  code?: string;
  password?: string;
}

/**
 * @description 注册：消费 Redis 中的验证码（匹配成功才删除，一次性使用），
 *   匹配则写入 accounts 表完成注册
 */
export async function POST(request: Request) {
  const { name, email, code, password } = (await request.json()) as RegisterBody;

  if (!name?.trim()) {
    return NextResponse.json({ error: "请输入用户名" }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "请输入合法的邮箱地址" }, { status: 400 });
  }
  if (!code || !CODE_RE.test(code)) {
    return NextResponse.json({ error: "验证码应为 6 位数字" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "密码长度至少 6 位" }, { status: 400 });
  }

  const redis = getRedis();
  const stored = await redis.get(email);

  if (stored === null) {
    return NextResponse.json({ error: "验证码已过期或未发送，请重新获取" }, { status: 400 });
  }

  // 注意：@upstash/redis 会把纯数字字符串反序列化成 number，比较前统一转字符串
  if (String(stored) !== code) {
    // 不匹配不消费，用户可用同一验证码重试
    return NextResponse.json({ error: "验证码不匹配" }, { status: 400 });
  }

  // 匹配成功才消费（删除）
  const deleted = await redis.del(email);
  if (deleted !== 1) {
    return NextResponse.json({ error: "验证码消费失败，请重新获取" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
  }

  const { data: created, error } = await supabase
    .from("accounts")
    .insert({ email, name: name.trim(), password_hash: hashPassword(password) })
    .select("id, email, name, created_at")
    .single();

  if (error) {
    // 唯一约束冲突（并发注册）等
    if (error.code === "23505") {
      return NextResponse.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
    }
    return NextResponse.json({ error: `注册失败: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: created });
}
