"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App as AntApp, Button, Form, Input } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import AuthBrandPanel from "@/components/AuthBrandPanel";
import Turnstile from "@/components/Turnstile";
import { setSessionUser } from "@/lib/session";

/** 登录表单数据类型 */
interface LoginForm {
  email: string;
  password: string;
}

/**
 * 登录页：左右布局 —— 左侧品牌视觉（images/login/ 轮播图 + 标语），右侧登录表单。
 * 表单：邮箱 + 密码两个输入框；提交「登录」；另有两个按钮：
 * 「使用 Google 登录」（未开放）与「创建新账户」（跳转注册）。
 */
/** 登录页外壳：<AntApp> 必须先渲染，useApp 只能在其内部子组件中调用 */
export default function LoginPage() {
  return (
    <AntApp>
      <LoginView />
    </AntApp>
  );
}

function LoginView() {
  const router = useRouter();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  // Turnstile 人机验证令牌：一次性消费，提交失败后重置组件重取
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  async function handleLogin(values: LoginForm) {
    if (!captchaToken) {
      message.warning("请先完成人机验证");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, turnstileToken: captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "登录失败");
        // 令牌已被 siteverify 消费，重置组件重新获取
        setCaptchaReset((k) => k + 1);
        return;
      }
      message.success(`欢迎回来，${data.user.name}！`);
      // 写入轻量登录态，TopNav 头据此弹出菜单而非跳转登录页
      setSessionUser(data.user);
      // 稍作停留让成功提示可见，再跳转首页
      await new Promise((r) => setTimeout(r, 600));
      router.push("/");
    } catch {
      message.error("网络错误，请稍后重试");
      setCaptchaReset((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-(--ant-layout-body-bg)">
      {/* 左侧品牌面板：移动端隐藏 */}
      <AuthBrandPanel slogan="查看每天分享的精彩时刻，随时随地练习编程。" showBackLink />

      {/* 右侧登录表单 */}
      <div className="flex-1 flex w-full items-center justify-center px-8 md:w-2/5 bg-(--ant-layout-body-bg)">
        <div className="w-full max-w-[400px] py-16">
          <h1 className="mb-8 text-2xl font-bold text-gray-900">
            登录 CodeBench
          </h1>

          <Form<LoginForm>
            layout="vertical"
            size="large"
            onFinish={handleLogin}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "请输入邮箱" },
                { type: "email", message: "邮箱格式不正确" },
              ]}
            >
              <Input placeholder="邮箱" autoComplete="email" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password
                placeholder="密码"
                autoComplete="current-password"
              />
            </Form.Item>

            {/* Turnstile 人机验证：token 随登录请求提交给服务端 siteverify */}
            <Form.Item className="mb-2">
              <Turnstile
                action="login"
                onToken={setCaptchaToken}
                resetKey={captchaReset}
              />
            </Form.Item>

            {/* submit 按钮 */}
            <Form.Item className="mt-2 mb-2">
              <Button type="primary" htmlType="submit" block loading={loading}>
                登录
              </Button>
            </Form.Item>
            <div className="mb-8 text-center">
              <span className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                忘记密码了？
              </span>
            </div>

            {/* 两个附加按钮 */}
            <Button
              block
              size="large"
              onClick={() => message.info("Google 登录即将上线")}
            >
              <GoogleOutlined /> 使用 Google 登录
            </Button>
            <Button
              block
              size="large"
              className="mt-4"
              onClick={() => router.push("/register")}
            >
              创建新账户
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
