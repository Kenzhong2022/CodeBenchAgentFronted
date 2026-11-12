"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { App as AntApp, Button, Form, Input } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { setSessionUser } from "@/lib/session";

/** 登录表单数据类型 */
interface LoginForm {
  email: string;
  password: string;
}

/**
 * 登录页：左右布局 —— 左侧品牌视觉（login_bg.jpg + 标语），右侧登录表单。
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

  async function handleLogin(values: LoginForm) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "登录失败");
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* 左侧品牌面板：移动端隐藏 */}
      <div className="relative hidden h-screen aspect-3/4 overflow-hidden md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login_bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-fill"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/30" />
        <div className="absolute top-8 left-10 text-2xl font-bold tracking-tight text-white">
          CodeBench
        </div>
        <div className="absolute top-8 right-10">
          <Link
            href="/"
            className="link-reset text-sm text-white/80 hover:text-white"
          >
            返回首页
          </Link>
        </div>
        <p className="absolute top-1/2 left-1/2 w-[420px] -translate-x-1/2 -translate-y-1/2 text-center text-3xl leading-relaxed font-medium text-white">
          查看每天分享的精彩时刻，随时随地练习编程。
        </p>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex w-full items-center justify-center px-8 md:w-2/5">
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
