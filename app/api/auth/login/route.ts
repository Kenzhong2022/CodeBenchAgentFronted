import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @description 登录：按邮箱查询 accounts 表并校验密码，成功则更新 last_login_at
 */
export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "请输入合法的邮箱地址" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "请输入密码" }, { status: 400 });
  }

  const { data: account, error } = await getSupabase()
    .from("accounts")
    .select("id, email, name, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: `查询失败: ${error.message}` }, { status: 500 });
  }

  // 用户不存在与密码错误统一提示，避免邮箱枚举
  if (!account || !verifyPassword(password, account.password_hash)) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  await getSupabase()
    .from("accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", account.id);

  return NextResponse.json({
    ok: true,
    user: { id: account.id, email: account.email, name: account.name },
  });
}
