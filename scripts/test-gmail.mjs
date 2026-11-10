// Gmail SMTP 发送测试脚本（ESM 版本）
// 运行：node script/test-gmail.mjs
import nodemailer from "nodemailer";

// 本项目的环境变量放在 .env.local（Next.js 约定），dotenv 默认只读 .env，需显式指定路径
import { config } from "dotenv";
config({ path: ".env.local" });

async function testSend() {
  // 1. 打印一下，确认环境变量被成功读取
  console.log("正在使用发件人:", process.env.SMTP_USER);

  // 2. 创建传输器
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 3. 发送
  try {
    const info = await transporter.sendMail({
      from: `"测试项目" <${process.env.SMTP_USER}>`,
      to: "你的另一个邮箱@example.com", // 改成你自己的 QQ/163 邮箱测试接收
      subject: "SMTP 配置成功测试",
      text: "恭喜！如果你看到这封邮件，说明你的 Gmail SMTP 配置完全正确。",
    });
    console.log("✅ 邮件发送成功！消息ID:", info.messageId);
  } catch (error) {
    console.error("❌ 发送失败，错误原因:", error.message);
  }
}

testSend();
