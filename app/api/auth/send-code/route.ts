import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getRedis } from "@/lib/redisClient";
import { generateVerificationCode } from "@/lib/verificationCode";
import { getSupabase } from "@/lib/supabase";

const CODE_TTL_SECONDS = 300; // 验证码有效期 5 分钟
const RESEND_COOLDOWN_SECONDS = 60; // 重发冷却，防止邮件轰炸
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @description 发送注册验证码：生成 6 位验证码存入 Redis（key = 邮箱，TTL 300s），
 *   并通过 Gmail SMTP 发送到用户邮箱；60 秒内不允许重复发送
 */
export async function POST(request: Request) {
  const { email } = (await request.json()) as { email?: string };

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "请输入合法的邮箱地址" }, { status: 400 });
  }

  // 已注册的邮箱不再发码，引导直接登录
  const { data: existing } = await getSupabase()
    .from("accounts")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
  }

  const redis = getRedis();

  // 重发冷却：SET NX EX 仅在无冷却键时成功
  const cooldown = await redis.set(`cooldown:${email}`, "1", {
    ex: RESEND_COOLDOWN_SECONDS,
    nx: true,
  });
  if (!cooldown) {
    return NextResponse.json(
      { error: `发送过于频繁，请 ${RESEND_COOLDOWN_SECONDS} 秒后再试` },
      { status: 429 },
    );
  }

  const code = generateVerificationCode();
  await redis.set(email, code, { ex: CODE_TTL_SECONDS });

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"CodeBench" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "CodeBench 注册验证码",
      html: `
        <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif">
          <h2 style="color:#171717">CodeBench 注册验证码</h2>
          <p>您的验证码为（${CODE_TTL_SECONDS / 60} 分钟内有效）：</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1677ff">${code}</p>
          <p style="color:#999;font-size:12px">如果这不是您本人的操作，请忽略本邮件。</p>
        </div>
      `,
    });
  } catch (err) {
    // 发送失败立即作废验证码，避免用户反复重试时命中冷却却收不到邮件
    await redis.del(email, `cooldown:${email}`);
    const message = err instanceof Error ? err.message : "邮件发送失败";
    return NextResponse.json({ error: `验证码邮件发送失败: ${message}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, ttl: CODE_TTL_SECONDS });
}
